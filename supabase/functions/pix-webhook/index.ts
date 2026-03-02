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

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("MP webhook received:", JSON.stringify(body));

    // Mercado Pago IPN sends: { action: "payment.updated", data: { id: "123456" } }
    // or query params: ?topic=payment&id=123456
    const action = body.action || "";
    const mpPaymentId = body.data?.id ? String(body.data.id) : null;

    if (!mpPaymentId || !action.includes("payment")) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
      console.error("MP_ACCESS_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment status with Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      { headers: { Authorization: `Bearer ${mpAccessToken}` } }
    );

    if (!mpResponse.ok) {
      console.error("Failed to fetch MP payment:", await mpResponse.text());
      return new Response(JSON.stringify({ error: "Failed to verify" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpPayment = await mpResponse.json();

    if (mpPayment.status !== "approved") {
      console.log(`Payment ${mpPaymentId} status: ${mpPayment.status}, skipping`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment approved — update our records
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: payment, error: findError } = await supabase
      .from("pix_payments")
      .select("*")
      .eq("txid", mpPaymentId)
      .eq("status", "pending")
      .single();

    if (findError || !payment) {
      console.log(`No pending payment found for MP id: ${mpPaymentId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment status
    await supabase
      .from("pix_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.id);

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from("pool_purchases")
      .insert({
        pool_id: payment.pool_id,
        user_id: payment.user_id,
        quantity: payment.quantity,
        total_paid: payment.total_amount,
      });

    if (purchaseError) {
      console.error("Failed to create purchase:", purchaseError);
      await supabase
        .from("pix_payments")
        .update({ status: "error" })
        .eq("id", payment.id);
    } else {
      console.log(`Payment confirmed for MP id: ${mpPaymentId}, purchase created`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
