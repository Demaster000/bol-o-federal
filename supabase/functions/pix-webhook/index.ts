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

  // EFI sends webhooks as POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("PIX webhook received:", JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // EFI sends: { pix: [{ txid, valor, horario, ... }] }
    const pixArray = body.pix || [];

    for (const pix of pixArray) {
      const txid = pix.txid;
      if (!txid) continue;

      // Find the pending payment
      const { data: payment, error: findError } = await supabase
        .from("pix_payments")
        .select("*")
        .eq("txid", txid)
        .eq("status", "pending")
        .single();

      if (findError || !payment) {
        console.log(`No pending payment found for txid: ${txid}`);
        continue;
      }

      // Update payment status to paid
      await supabase
        .from("pix_payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payment.id);

      // Create the actual purchase record
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
        // Revert payment status
        await supabase
          .from("pix_payments")
          .update({ status: "error" })
          .eq("id", payment.id);
        continue;
      }

      console.log(`Payment confirmed for txid: ${txid}, purchase created`);
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
