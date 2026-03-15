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
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeIntervalMinutes(interval: number | null | undefined): number {
  if (!interval || Number.isNaN(interval)) return 60;
  return Math.max(5, Math.floor(interval));
}

function shouldRunScheduledBroadcast(intervalMinutes: number, now = new Date()): boolean {
  const interval = normalizeIntervalMinutes(intervalMinutes);
  const totalMinutes = Math.floor(now.getTime() / (1000 * 60));
  const remainder = totalMinutes % interval;
  return remainder === 0 || remainder === 1 || (interval > 5 && remainder === interval - 1);
}

async function getSettings(supabase: any): Promise<WhatsAppSettings | null> {
  const { data, error } = await supabase
    .from("whatsapp_settings")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as WhatsAppSettings;
}

async function sendToDestination(settings: WhatsAppSettings, destination: string, message: string) {
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
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function sendWhatsAppMessage(settings: WhatsAppSettings, message: string) {
  if (!settings.enabled) {
    return { success: false, error: "WhatsApp desabilitado" };
  }

  const results: any[] = [];

  if (settings.group_id) {
    const r = await sendToDestination(settings, settings.group_id, message);
    results.push({ destination: "group", ...r });
  }

  if (settings.send_to_channel && settings.channel_id) {
    const jid = settings.channel_id.includes("@")
      ? settings.channel_id
      : `${settings.channel_id}@newsletter`;

    const r = await sendToDestination(settings, jid, message);
    results.push({ destination: "channel", ...r });
  }

  const anySuccess = results.some(r => r.success);

  return {
    success: anySuccess,
    results,
  };
}

async function sendBroadcastOpenPools(supabase: any, settings: WhatsAppSettings) {
  const { data: pools } = await supabase
    .from("pools")
    .select("*, lottery_types(*)")
    .eq("status", "open");

  if (!pools || pools.length === 0) {
    return { success: true, reason: "Nenhum bolão aberto" };
  }

  const siteUrl = (settings.site_url || "").replace(/\/$/, "");

  const results: any[] = [];

  for (const pool of pools) {
    const drawDate = pool.draw_date ? new Date(pool.draw_date) : null;

    const link = siteUrl ? `${siteUrl}/?pool=${pool.id}` : "";

    let deadline = "A definir";

    if (drawDate) {
      const minus5h = new Date(drawDate.getTime() - 5 * 60 * 60 * 1000);
      deadline = formatDateTimeBR(minus5h);
    }

    const msg =
`Valor da cota: R$ ${Number(pool.price_per_quota).toFixed(2)}
Participe: ${link}

📌 Como funciona:
• Faça o Pix pelo site e guarde o comprovante.
• Não é necessário enviar comprovante (salvo em caso de prêmio).
• Pix feito em outra chave será devolvido.
• Participação válida: Até ${deadline}

📆 Apostas e lista de participantes serão divulgadas antes do sorteio no grupo.

💸 Prêmio:
• 10% administrador | 90% participantes.
• Prêmios < R$ 600 podem ser reinvestidos.

✅ Ao pagar, você concorda com as regras.
⚠️ Bolão independente, não oficial da Caixa.`;

    const r = await sendWhatsAppMessage(settings, msg);
    results.push(r);
  }

  return { success: results.some(r => r.success), results };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { type, data } = body;

    const settings = await getSettings(supabase);

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
          return new Response(JSON.stringify({ success: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { id, price, draw_date } = data;

        const siteUrl = (settings.site_url || "").replace(/\/$/, "");
        const link = siteUrl ? `${siteUrl}/?pool=${id}` : "";

        let deadline = "A definir";

        if (draw_date) {
          const d = new Date(draw_date);
          const minus5h = new Date(d.getTime() - 5 * 60 * 60 * 1000);
          deadline = formatDateTimeBR(minus5h);
        }

        const message =
`Valor da cota: R$ ${Number(price).toFixed(2)}
Participe: ${link}

Participação válida até ${deadline}`;

        result = await sendWhatsAppMessage(settings, message);

        break;
      }

      case "result": {

        if (!settings.notify_result) {
          return new Response(JSON.stringify({ success: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { title, numbers, prize } = data;

        const message =
`🏆 RESULTADO DO BOLÃO

${title}

Números: ${numbers}

Prêmio: R$ ${Number(prize).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

        result = await sendWhatsAppMessage(settings, message);

        break;
      }

      case "broadcast_open": {

        result = await sendBroadcastOpenPools(supabase, settings);

        break;
      }

      case "scheduled_broadcast": {

        const interval = normalizeIntervalMinutes(settings.broadcast_interval_minutes);

        if (!shouldRunScheduledBroadcast(interval)) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        result = await sendBroadcastOpenPools(supabase, settings);

        break;
      }

      case "custom": {

        const { message } = data;

        result = await sendWhatsAppMessage(settings, message);

        break;
      }

      case "test": {

        result = await sendWhatsAppMessage(
          settings,
          "✅ Integração WhatsApp funcionando"
        );

        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Tipo inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  }
});