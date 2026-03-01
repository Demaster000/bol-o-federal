import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getEfiToken(): Promise<string> {
  const clientId = Deno.env.get("EFI_CLIENT_ID");
  const clientSecret = Deno.env.get("EFI_CLIENT_SECRET");
  const certBase64 = Deno.env.get("EFI_CERTIFICATE_BASE64");

  if (!clientId || !clientSecret || !certBase64) {
    throw new Error("EFI credentials not configured");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  // EFI API uses OAuth2 client_credentials
  const response = await fetch("https://pix.api.efipay.com.br/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`EFI auth failed [${response.status}]: ${errBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user
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

    const { pool_id, quantity } = await req.json();
    if (!pool_id || !quantity || quantity < 1) {
      return new Response(
        JSON.stringify({ error: "pool_id and quantity required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const totalAmount = quantity * pool.price_per_quota;

    // Get EFI token
    const efiToken = await getEfiToken();

    // Create PIX charge via EFI
    const txid = crypto.randomUUID().replace(/-/g, "").substring(0, 26);

    const chargeResponse = await fetch(
      `https://pix.api.efipay.com.br/v2/cob/${txid}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${efiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          calendario: { expiracao: 1800 }, // 30 minutes
          valor: {
            original: totalAmount.toFixed(2),
          },
          chave: Deno.env.get("EFI_PIX_KEY") || "", // PIX key configured in EFI
          infoAdicionais: [
            { nome: "Pool", valor: pool.title },
            { nome: "Cotas", valor: String(quantity) },
          ],
        }),
      }
    );

    if (!chargeResponse.ok) {
      const errBody = await chargeResponse.text();
      console.error("EFI charge error:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to create PIX charge", details: errBody }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const charge = await chargeResponse.json();

    // Generate QR Code
    const locId = charge.loc?.id;
    let qrCode = "";
    let qrCodeImage = "";

    if (locId) {
      const qrResponse = await fetch(
        `https://pix.api.efipay.com.br/v2/loc/${locId}/qrcode`,
        {
          headers: { Authorization: `Bearer ${efiToken}` },
        }
      );
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        qrCode = qrData.qrcode || "";
        qrCodeImage = qrData.imagemQrcode || "";
      }
    }

    // Save pix_payment record
    const { data: pixPayment, error: insertError } = await supabaseAdmin
      .from("pix_payments")
      .insert({
        user_id: userId,
        pool_id,
        quantity,
        total_amount: totalAmount,
        txid,
        loc_id: locId ? String(locId) : null,
        qr_code: qrCode,
        qr_code_image: qrCodeImage,
        efi_charge_id: charge.txid || txid,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert pix_payment error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save payment record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        payment_id: pixPayment.id,
        qr_code: qrCode,
        qr_code_image: qrCodeImage,
        txid,
        total_amount: totalAmount,
        expires_at: pixPayment.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
