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
  site_url: string;
}

function formatDateTimeBR(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeIntervalMinutes(interval: number | null | undefined): number {
  if (!interval || Number.isNaN(interval)) return 60;
  return Math.max(5, Math.floor(interval));
}

function shouldRunScheduledBroadcast(intervalMinutes: number, now = new Date()): boolean {
  const interval = normalizeIntervalMinutes(intervalMinutes);
  // Check if we should run based on the last broadcast time
  // We use a more lenient approach: run if it's been at least interval minutes since last run
  const totalMinutes = Math.floor(now.getTime() / (1000 * 60));
  // Allow execution within a 2-minute window to account for cron timing variations
  const remainder = totalMinutes % interval;
  return remainder === 0 || remainder === 1 || (interval > 5 && remainder === interval - 1);
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

async function sendBroadcastOpenPools(supabaseAdmin: any, settings: WhatsAppSettings): Promise<{ success: boolean; reason?: string; results?: any[]; error?: string }> {
  const { data: openPools } = await supabaseAdmin
    .from("pools")
    .select("*, lottery_types(*)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (!openPools || openPools.length === 0) {
    return { success: true, reason: "Nenhum bolão aberto" };
  }

  const siteUrl = (settings.site_url || "").replace(/\/$/, "");
  const allMessages: string[] = [];

  for (const pool of openPools) {
    const drawDate = pool.draw_date ? new Date(pool.draw_date) : null;
    const poolLink = siteUrl ? `${siteUrl}/?pool=${pool.id}` : "Acesse o site";

    let deadlineCotas = "A definir";
    if (drawDate) {
      const minus5h = new Date(drawDate.getTime() - 5 * 60 * 60 * 1000);
      deadlineCotas = formatDateTimeBR(minus5h);
    }

    const msg = `Valor da cota: R$ ${Number(pool.price_per_quota).toFixed(2)}\n` +
      `Participe: ${poolLink}\n\n` +
      `📌 Como funciona:\n` +
      `• Faça o Pix pelo site e guarde o comprovante.\n` +
      `• Não é necessário enviar comprovante (salvo em caso de prêmio).\n` +
      `• Pix feito em outra chave será devolvido.\n` +
      `• Participação válida: Até ${deadlineCotas}\n\n` +
      `📆 Apostas e lista de participantes serão divulgadas antes do sorteio no grupo.\n\n` +
      `💸 Prêmio:\n` +
      `• 10% administrador | 90% participantes.\n` +
      `• Prêmios < R$ 600 podem ser reinvestidos.\n\n` +
      `✅ Ao pagar, você concorda com as regras.\n` +
      `⚠️ Bolão independente, não oficial da Caixa.`;

    allMessages.push(msg);
  }

  const broadcastResults: any[] = [];
  for (const msg of allMessages) {
    const r = await sendWhatsAppMessage(settings, msg);
    broadcastResults.push(r);
  }

  const anySuccess = broadcastResults.some(r => r.success);
  return { success: anySuccess, results: broadcastResults };
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

  // Send to channel (newsletter)
  if (settings.send_to_channel && settings.channel_id) {
    const channelJid = settings.channel_id.includes("@") ? settings.channel_id : `${settings.channel_id}@newsletter`;
    const channelResult = await sendToDestination(settings, channelJid, message);
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

    // Auth check - only admins or internal/cron calls (service role key only)
    const authHeader = req.headers.get("Authorization");
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader?.replace("Bearer ", "") || "";

    // Only service role key is treated as internal/cron call (anon key is public, not trusted)
    const isInternalCall = token === svcKey;

    if (!isInternalCall) {
      // It's a user JWT — validate admin role using getClaims
      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader! } },
      });
      const jwtToken = authHeader!.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(jwtToken);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub as string;
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
        const { id, title, price, prize, draw_date } = data;
        const siteUrl = (settings.site_url || "").replace(/\/$/, "");
        const poolLink = siteUrl ? `${siteUrl}/?pool=${id}` : "Acesse o site";
        
        let deadlineCotas = "A definir";
        if (draw_date) {
          const drawDate = new Date(draw_date);
          const minus5h = new Date(drawDate.getTime() - 5 * 60 * 60 * 1000);
          deadlineCotas = formatDateTimeBR(minus5h);
        }

        const message = `Valor da cota: R$ ${Number(price).toFixed(2)}\n` +
          `Participe: ${poolLink}\n\n` +
          `📌 Como funciona:\n` +
          `• Faça o Pix pelo site e guarde o comprovante.\n` +
          `• Não é necessário enviar comprovante (salvo em caso de prêmio).\n` +
          `• Pix feito em outra chave será devolvido.\n` +
          `• Participação válida: Até ${deadlineCotas}\n\n` +
          `📆 Apostas e lista de participantes serão divulgadas antes do sorteio no grupo.\n\n` +
          `💸 Prêmio:\n` +
          `• 10% administrador | 90% participantes.\n` +
          `• Prêmios < R$ 600 podem ser reinvestidos.\n\n` +
          `✅ Ao pagar, você concorda com as regras.\n` +
          `⚠️ Bolão independente, não oficial da Caixa.`;
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
        const prizeNum = Number(prize) || 0;
        const hasPrize = prizeNum > 0;

        const message = hasPrize
          ? `🏆 *RESULTADO DO BOLÃO* 🏆\n\n` +
            `📌 *${title}*\n` +
            `🔢 Números sorteados: *${numbers}*\n` +
            `💰 Prêmio: R$ ${prizeNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` +
            `Acesse a plataforma para verificar se você ganhou! 🍀`
          : `📊 *RESULTADO DO BOLÃO* 📊\n\n` +
            `📌 *${title}*\n` +
            `🔢 Números sorteados: *${numbers}*\n\n` +
            `Infelizmente não tivemos ganhadores desta vez. 😔\n` +
            `Mas não desanime! A sorte pode estar no próximo bolão. 🍀\n` +
            `Continue tentando, sua vez vai chegar! 💪🔥`;
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

        result = await sendBroadcastOpenPools(supabaseAdmin, settings);
        
        try {
          await supabaseAdmin
            .from("whatsapp_broadcast_log")
            .insert({
              broadcast_type: "open_pools",
              last_run_at: new Date().toISOString(),
              success: result.success,
              message: result.error || result.reason || "Broadcast sent successfully",
            });
        } catch (logErr) {
          console.error("Failed to log broadcast:", logErr);
        }
        break;
      }

      case "scheduled_broadcast": {
        if (!settings.broadcast_open_pools) {
          return new Response(JSON.stringify({ success: true, reason: "Divulgação periódica desabilitada" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const interval = normalizeIntervalMinutes(settings.broadcast_interval_minutes);
        if (!shouldRunScheduledBroadcast(interval)) {
          return new Response(JSON.stringify({ success: true, reason: `Fora da janela do intervalo (${interval} min)` }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        result = await sendBroadcastOpenPools(supabaseAdmin, settings);
        
        try {
          await supabaseAdmin
            .from("whatsapp_broadcast_log")
            .insert({
              broadcast_type: "open_pools",
              last_run_at: new Date().toISOString(),
              success: result.success,
              message: result.error || result.reason || "Scheduled broadcast sent successfully",
            });
        } catch (logErr) {
          console.error("Failed to log scheduled broadcast:", logErr);
        }
        break;
      }

      case "custom": {
        const { message } = data || {};
        if (!message || typeof message !== "string" || message.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Mensagem não informada" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Limit message length to prevent abuse
        const sanitizedMessage = message.trim().slice(0, 4096);
        result = await sendWhatsAppMessage(settings, sanitizedMessage);
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
