import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WhatsAppSettings {
  api_url: string;
  api_key: string;
  instance_name: string;
  group_id: string;
  channel_id: string;
  send_to_channel: boolean;
  enabled: boolean;
  notify_new_pool: boolean;
  notify_result: boolean;
  broadcast_open_pools: boolean;
  broadcast_interval_minutes: number;
}

async function getSettings(supabaseAdmin: any): Promise<WhatsAppSettings | null> {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_settings")
    .select("*")
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as WhatsAppSettings;
}

async function sendToDestination(settings: WhatsAppSettings, destination: string, message: string): Promise<{ success: boolean; error?: string }> {
  const url = `${settings.api_url.replace(/\/$/, "")}/message/sendText/${settings.instance_name}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: settings.api_key,
      },
      body: JSON.stringify({
        number: destination,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return { success: false, error: `Evolution API [${response.status}]: ${errorText}` };
    }

    const result = await response.json();
    console.log("WhatsApp message sent to", destination, ":", result);
    return { success: true };
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
    return { success: false, error: String(err) };
  }
}

async function sendWhatsAppMessage(settings: WhatsAppSettings, message: string): Promise<{ success: boolean; error?: string; results?: any[] }> {
  if (!settings.enabled || !settings.api_url || !settings.api_key || !settings.instance_name) {
    return { success: false, error: "WhatsApp não configurado ou desabilitado" };
  }

  const results: { destination: string; success: boolean; error?: string }[] = [];

  // Send to group
  if (settings.group_id) {
    const groupResult = await sendToDestination(settings, settings.group_id, message);
    results.push({ destination: "group", ...groupResult });
  }

  // Send to channel
  if (settings.send_to_channel && settings.channel_id) {
    const channelResult = await sendToDestination(settings, settings.channel_id, message);
    results.push({ destination: "channel", ...channelResult });
  }

  if (results.length === 0) {
    return { success: false, error: "Nenhum destino configurado (grupo ou canal)" };
  }

  const anySuccess = results.some(r => r.success);
  const errors = results.filter(r => !r.success).map(r => `${r.destination}: ${r.error}`);

  return {
    success: anySuccess,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    results,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { type, data } = await req.json();

    // Auth check - only admins or internal calls
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub;
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Internal call (from other edge functions or cron) - allow if no auth header
      // This is secured by the fact that edge functions are not publicly callable without the anon key
    }

    const settings = await getSettings(supabaseAdmin);
    if (!settings) {
      return new Response(JSON.stringify({ error: "WhatsApp settings not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (type) {
      case "new_pool": {
        if (!settings.notify_new_pool) {
          return new Response(JSON.stringify({ success: false, reason: "Notificação de novo bolão desabilitada" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { title, price, prize, draw_date } = data;
        const dateStr = draw_date ? new Date(draw_date).toLocaleDateString("pt-BR") : "A definir";
        const message = `🎰 *NOVO BOLÃO DISPONÍVEL!* 🎰\n\n` +
          `📌 *${title}*\n` +
          `💰 Cota: R$ ${Number(price).toFixed(2)}\n` +
          `🏆 Prêmio estimado: R$ ${Number(prize).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
          `📅 Sorteio: ${dateStr}\n\n` +
          `🔗 Acesse e garanta suas cotas agora!`;
        result = await sendWhatsAppMessage(settings, message);
        break;
      }

      case "result": {
        if (!settings.notify_result) {
          return new Response(JSON.stringify({ success: false, reason: "Notificação de resultado desabilitada" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { title, numbers, prize } = data;
        const message = `🏆 *RESULTADO DO BOLÃO* 🏆\n\n` +
          `📌 *${title}*\n` +
          `🔢 Números sorteados: *${numbers}*\n` +
          (prize ? `💰 Prêmio: R$ ${Number(prize).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` : "") +
          `\nAcesse a plataforma para verificar se você ganhou! 🍀`;
        result = await sendWhatsAppMessage(settings, message);
        break;
      }

      case "broadcast_open": {
        if (!settings.broadcast_open_pools) {
          return new Response(JSON.stringify({ success: false, reason: "Divulgação periódica desabilitada" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: openPools } = await supabaseAdmin
          .from("pools")
          .select("*, lottery_types(*)")
          .eq("status", "open")
          .order("created_at", { ascending: false });

        if (!openPools || openPools.length === 0) {
          return new Response(JSON.stringify({ success: true, reason: "Nenhum bolão aberto" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let message = `🎯 *BOLÕES EM ABERTO* 🎯\n\n`;
        for (const pool of openPools) {
          const dateStr = pool.draw_date ? new Date(pool.draw_date).toLocaleDateString("pt-BR") : "A definir";
          message += `📌 *${pool.title}*\n`;
          message += `   💰 Cota: R$ ${Number(pool.price_per_quota).toFixed(2)}`;
          if (pool.prize_amount) {
            message += ` | 🏆 R$ ${Number(pool.prize_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
          }
          message += `\n   📅 ${dateStr}\n\n`;
        }
        message += `🔗 Acesse agora e participe!`;
        result = await sendWhatsAppMessage(settings, message);
        break;
      }

      case "custom": {
        const { message } = data;
        if (!message) {
          return new Response(JSON.stringify({ error: "Mensagem não informada" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await sendWhatsAppMessage(settings, message);
        break;
      }

      case "test": {
        const message = `✅ *Teste de conexão* ✅\n\nIntegração com Evolution API funcionando corretamente! 🚀`;
        result = await sendWhatsAppMessage(settings, message);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Tipo desconhecido: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
