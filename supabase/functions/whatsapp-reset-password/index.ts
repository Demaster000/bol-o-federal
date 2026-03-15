import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, "");
  // Add country code if missing
  if (digits.length === 11 || digits.length === 10) {
    digits = "55" + digits;
  }
  return digits;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { action, phone, code, new_password } = await req.json();

    // Get WhatsApp settings for sending
    const { data: settings } = await supabaseAdmin
      .from("whatsapp_settings")
      .select("*")
      .limit(1)
      .single();

    if (!settings || !settings.enabled || !settings.api_url || !settings.api_key || !settings.instance_name) {
      return new Response(
        JSON.stringify({ error: "WhatsApp não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "request_code": {
        if (!phone) {
          return new Response(
            JSON.stringify({ error: "Telefone é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const normalizedPhone = normalizePhone(phone);

        // Find user by phone in profiles
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, phone")
          .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`);

        // Also try matching with common formats
        let profile = profiles?.[0];
        if (!profile) {
          // Try matching by normalized digits
          const { data: allProfiles } = await supabaseAdmin
            .from("profiles")
            .select("user_id, phone");
          
          profile = allProfiles?.find((p: any) => {
            if (!p.phone) return false;
            const pNormalized = p.phone.replace(/\D/g, "");
            return pNormalized === normalizedPhone || 
                   pNormalized === normalizedPhone.replace(/^55/, "") ||
                   "55" + pNormalized === normalizedPhone;
          });
        }

        if (!profile) {
          return new Response(
            JSON.stringify({ error: "Nenhuma conta encontrada com este número de WhatsApp" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Invalidate previous codes for this user
        await supabaseAdmin
          .from("password_reset_codes")
          .update({ used: true })
          .eq("user_id", profile.user_id)
          .eq("used", false);

        // Generate and store new code
        const resetCode = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await supabaseAdmin.from("password_reset_codes").insert({
          user_id: profile.user_id,
          phone: normalizedPhone,
          code: resetCode,
          expires_at: expiresAt.toISOString(),
        });

        // Send via WhatsApp
        const message =
          `🔐 *Sorte Compartilhada*\n\n` +
          `Seu código para redefinir a senha:\n\n` +
          `*${resetCode}*\n\n` +
          `⏰ Este código expira em 10 minutos.\n` +
          `Se você não solicitou, ignore esta mensagem.`;

        const url = `${settings.api_url.replace(/\/$/, "")}/message/sendText/${settings.instance_name}`;
        const whatsappResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: settings.api_key,
          },
          body: JSON.stringify({
            number: normalizedPhone,
            text: message,
          }),
        });

        if (!whatsappResponse.ok) {
          const errorText = await whatsappResponse.text();
          console.error("Evolution API error:", whatsappResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: "Erro ao enviar WhatsApp. Tente novamente." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Cleanup expired codes
        await supabaseAdmin.rpc("cleanup_expired_reset_codes");

        return new Response(
          JSON.stringify({ success: true, message: "Código enviado via WhatsApp" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify_and_reset": {
        if (!phone || !code || !new_password) {
          return new Response(
            JSON.stringify({ error: "Telefone, código e nova senha são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const normalizedPhone = normalizePhone(phone);

        // Find the valid code
        const { data: resetData } = await supabaseAdmin
          .from("password_reset_codes")
          .select("*")
          .eq("code", code)
          .eq("used", false)
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1);

        const resetEntry = resetData?.find((r: any) => {
          const rNorm = r.phone.replace(/\D/g, "");
          return rNorm === normalizedPhone || 
                 rNorm === normalizedPhone.replace(/^55/, "") ||
                 "55" + rNorm === normalizedPhone;
        });

        if (!resetEntry) {
          return new Response(
            JSON.stringify({ error: "Código inválido ou expirado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update password via admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          resetEntry.user_id,
          { password: new_password }
        );

        if (updateError) {
          console.error("Error updating password:", updateError);
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar senha. Tente novamente." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Mark code as used
        await supabaseAdmin
          .from("password_reset_codes")
          .update({ used: true })
          .eq("id", resetEntry.id);

        return new Response(
          JSON.stringify({ success: true, message: "Senha atualizada com sucesso!" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("WhatsApp reset error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
