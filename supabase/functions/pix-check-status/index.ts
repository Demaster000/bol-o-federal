import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { payment_id } = await req.json();

    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First check local DB
    const { data: payment, error } = await supabase
      .from("pix_payments")
      .select("id, status, paid_at, expires_at, txid")
      .eq("id", payment_id)
      .eq("user_id", userId)
      .single();

    if (error || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already paid or error, return immediately
    if (payment.status !== "pending") {
      return new Response(
        JSON.stringify({ status: payment.status, paid_at: payment.paid_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ status: "expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check Mercado Pago directly for faster confirmation
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (mpAccessToken && payment.txid) {
      try {
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${payment.txid}`,
          { headers: { Authorization: `Bearer ${mpAccessToken}` } }
        );
        if (mpResponse.ok) {
          const mpPayment = await mpResponse.json();
          if (mpPayment.status === "approved") {
            // Update in DB via service role
            const supabaseAdmin = createClient(
              supabaseUrl,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );
            await supabaseAdmin
              .from("pix_payments")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("id", payment.id);

            // Create purchase
            await supabaseAdmin.from("pool_purchases").insert({
              pool_id: (await supabaseAdmin.from("pix_payments").select("pool_id, user_id, quantity, total_amount").eq("id", payment.id).single()).data!.pool_id,
              user_id: userId,
              quantity: (await supabaseAdmin.from("pix_payments").select("quantity").eq("id", payment.id).single()).data!.quantity,
              total_paid: (await supabaseAdmin.from("pix_payments").select("total_amount").eq("id", payment.id).single()).data!.total_amount,
            });

            return new Response(
              JSON.stringify({ status: "paid", paid_at: new Date().toISOString() }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (e) {
        console.error("MP check error:", e);
      }
    }

    return new Response(
      JSON.stringify({ status: "pending" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check status error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
