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

    const { data: payment, error } = await supabase
      .from("pix_payments")
      .select("id, status, paid_at, expires_at, txid, pool_id, quantity, total_amount")
      .eq("id", payment_id)
      .eq("user_id", userId)
      .single();

    if (error || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status !== "pending") {
      return new Response(
        JSON.stringify({ status: payment.status, paid_at: payment.paid_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date() > new Date(payment.expires_at)) {
      return new Response(
        JSON.stringify({ status: "expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Mercado Pago directly for faster confirmation
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
            const supabaseAdmin = createClient(
              supabaseUrl,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );

            const paidAt = new Date().toISOString();
            // Use conditional update to prevent race condition with webhook
            const { data: updated, error: updateErr } = await supabaseAdmin
              .from("pix_payments")
              .update({ status: "paid", paid_at: paidAt })
              .eq("id", payment.id)
              .eq("status", "pending")
              .select("id")
              .single();

            // Only create purchase if we were the one to update (prevents duplicates)
            if (updated && !updateErr) {
              await supabaseAdmin.from("pool_purchases").insert({
                pool_id: payment.pool_id,
                user_id: userId,
                quantity: payment.quantity,
                total_paid: payment.total_amount,
              });
            }

            return new Response(
              JSON.stringify({ status: "paid", paid_at: paidAt }),
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
