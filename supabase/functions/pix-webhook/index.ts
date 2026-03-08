import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function grantReferralReward(supabaseAdmin: any, userId: string, poolId: string) {
  try {
    const { data: referral } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_id, status")
      .eq("referred_id", userId)
      .single();

    if (!referral || !referral.referrer_id) return;

    const { data: existingReward } = await supabaseAdmin
      .from("referral_rewards")
      .select("id")
      .eq("referral_id", referral.id)
      .eq("pool_id", poolId)
      .single();

    if (existingReward) return;

    const { data: pool } = await supabaseAdmin
      .from("pools")
      .select("price_per_quota, title, status")
      .eq("id", poolId)
      .single();

    if (!pool || pool.status !== "open") return;

    const { data: bonusPurchase } = await supabaseAdmin
      .from("pool_purchases")
      .insert({
        pool_id: poolId,
        user_id: referral.referrer_id,
        quantity: 1,
        total_paid: 0,
      })
      .select("id")
      .single();

    if (bonusPurchase) {
      await supabaseAdmin.from("referral_rewards").insert({
        referral_id: referral.id,
        referrer_id: referral.referrer_id,
        pool_id: poolId,
        purchase_id: bonusPurchase.id,
      });

      if (referral.status === "pending") {
        await supabaseAdmin
          .from("referrals")
          .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
          .eq("id", referral.id);
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: referral.referrer_id,
        message: `🎉 Você ganhou 1 cota grátis no bolão "${pool.title}" porque seu indicado comprou cotas!`,
        pool_id: poolId,
      });
    }
  } catch (e) {
    console.error("Referral reward error:", e);
  }
}

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
      console.warn("Failed to fetch MP payment (may be test):", await mpResponse.text());
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
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

    // Update payment status - use conditional update to prevent race condition with polling
    const { data: updated, error: updateErr } = await supabase
      .from("pix_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .single();

    // Only create purchase if we were the one to update (prevents duplicates)
    if (!updated || updateErr) {
      console.log(`Payment ${payment.id} already processed, skipping purchase creation`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("pool_purchases")
      .insert({
        pool_id: payment.pool_id,
        user_id: payment.user_id,
        quantity: payment.quantity,
        total_paid: payment.total_amount,
      })
      .select("id")
      .single();

    if (purchaseError) {
      console.error("Failed to create purchase:", purchaseError);
      await supabase
        .from("pix_payments")
        .update({ status: "error" })
        .eq("id", payment.id);
    } else {
      console.log(`Payment confirmed for MP id: ${mpPaymentId}, purchase created`);
      // Grant referrer bonus quota
      await grantReferralReward(supabase, payment.user_id, payment.pool_id);
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
