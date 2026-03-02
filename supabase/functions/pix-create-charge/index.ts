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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");

    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: "Mercado Pago não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "user@example.com";

    const { pool_id, quantity } = await req.json();
    if (!pool_id || !quantity || quantity < 1) {
      return new Response(
        JSON.stringify({ error: "pool_id and quantity required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pool info
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: pool, error: poolError } = await supabaseAdmin
      .from("pools")
      .select("*")
      .eq("id", pool_id)
      .single();

    if (poolError || !pool) {
      return new Response(JSON.stringify({ error: "Pool not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pool.status !== "open") {
      return new Response(
        JSON.stringify({ error: "Pool is not open for purchases" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAmount = quantity * pool.price_per_quota;

    // Create PIX payment via Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(totalAmount.toFixed(2)),
        description: `${pool.title} - ${quantity} cota(s)`,
        payment_method_id: "pix",
        payer: {
          email: userEmail,
        },
      }),
    });

    if (!mpResponse.ok) {
      const errBody = await mpResponse.text();
      console.error("Mercado Pago error:", errBody);
      return new Response(
        JSON.stringify({ error: "Falha ao criar cobrança PIX", details: errBody }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpPayment = await mpResponse.json();

    const qrCode =
      mpPayment.point_of_interaction?.transaction_data?.qr_code || "";
    const qrCodeBase64 =
      mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 || "";
    const qrCodeImage = qrCodeBase64
      ? `data:image/png;base64,${qrCodeBase64}`
      : "";
    const mpPaymentId = String(mpPayment.id);

    // Save pix_payment record
    const { data: pixPayment, error: insertError } = await supabaseAdmin
      .from("pix_payments")
      .insert({
        user_id: userId,
        pool_id,
        quantity,
        total_amount: totalAmount,
        txid: mpPaymentId,
        efi_charge_id: mpPaymentId,
        qr_code: qrCode,
        qr_code_image: qrCodeImage,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert pix_payment error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save payment record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        payment_id: pixPayment.id,
        qr_code: qrCode,
        qr_code_image: qrCodeImage,
        txid: mpPaymentId,
        total_amount: totalAmount,
        expires_at: pixPayment.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating PIX charge:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
