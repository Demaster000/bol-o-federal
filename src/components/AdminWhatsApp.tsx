import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, TestTube, Save, Eye, EyeOff } from 'lucide-react';

interface WhatsAppSettings {
  id: string;
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

const AdminWhatsApp = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingCustom, setSendingCustom] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .limit(1)
      .single();
    if (data) setSettings(data as unknown as WhatsAppSettings);
    if (error) console.error('Error fetching WhatsApp settings:', error);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('whatsapp_settings')
      .update({
        api_url: settings.api_url,
        api_key: settings.api_key,
        instance_name: settings.instance_name,
        group_id: settings.group_id,
        channel_id: settings.channel_id,
        send_to_channel: settings.send_to_channel,
        enabled: settings.enabled,
        notify_new_pool: settings.notify_new_pool,
        notify_result: settings.notify_result,
        broadcast_open_pools: settings.broadcast_open_pools,
        broadcast_interval_minutes: settings.broadcast_interval_minutes,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', settings.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: `Falha ao salvar: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Configurações salvas!' });
    }
  };

  const callWhatsApp = async (type: string, data: any = {}) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    const res = await fetch(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, data }),
      }
    );
    return res.json();
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await callWhatsApp('test');
      if (result.success) {
        toast({ title: 'Teste enviado!', description: 'Verifique o grupo do WhatsApp.' });
      } else {
        toast({ title: 'Erro no teste', description: result.error || result.reason, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' });
    }
    setTesting(false);
  };

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const result = await callWhatsApp('broadcast_open');
      if (result.success) {
        toast({ title: 'Divulgação enviada!', description: result.reason || 'Bolões abertos divulgados no grupo.' });
      } else {
        toast({ title: 'Aviso', description: result.error || result.reason, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' });
    }
    setBroadcasting(false);
  };

  const handleSendCustom = async () => {
    if (!customMessage.trim()) return;
    setSendingCustom(true);
    try {
      const result = await callWhatsApp('custom', { message: customMessage });
      if (result.success) {
        toast({ title: 'Mensagem enviada!' });
        setCustomMessage('');
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' });
    }
    setSendingCustom(false);
  };

  if (loading) return <div className="text-muted-foreground text-center py-8">Carregando...</div>;
  if (!settings) return <div className="text-muted-foreground text-center py-8">Erro ao carregar configurações.</div>;

  const isConfigured = settings.api_url && settings.api_key && settings.instance_name && (settings.group_id || (settings.send_to_channel && settings.channel_id));

  return (
    <div className="space-y-6">
      {/* Connection Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Evolution API
            </h3>
            <p className="text-sm text-muted-foreground">Configure a conexão com a Evolution API para envio de mensagens via WhatsApp.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{settings.enabled ? 'Ativo' : 'Inativo'}</span>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>URL da API *</Label>
            <Input
              className="bg-muted"
              placeholder="https://sua-evolution-api.com"
              value={settings.api_url}
              onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>API Key *</Label>
            <div className="relative">
              <Input
                className="bg-muted pr-10"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Sua chave de API"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome da Instância *</Label>
            <Input
              className="bg-muted"
              placeholder="minha-instancia"
              value={settings.instance_name}
              onChange={(e) => setSettings({ ...settings, instance_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>ID do Grupo/Comunidade *</Label>
            <Input
              className="bg-muted"
              placeholder="5511999999999@g.us"
              value={settings.group_id}
              onChange={(e) => setSettings({ ...settings, group_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Formato: número@g.us (grupo) ou ID da comunidade</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          {isConfigured && (
            <Button variant="outline" onClick={handleTest} disabled={testing || !settings.enabled}>
              <TestTube className="mr-1.5 h-4 w-4" />
              {testing ? 'Enviando...' : 'Testar Conexão'}
            </Button>
          )}
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display text-lg font-bold text-foreground">Notificações Automáticas</h3>

        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
          <div className="space-y-0.5">
            <Label>Novo Bolão Criado</Label>
            <p className="text-xs text-muted-foreground">Envia mensagem ao criar um novo bolão.</p>
          </div>
          <Switch
            checked={settings.notify_new_pool}
            onCheckedChange={(v) => setSettings({ ...settings, notify_new_pool: v })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
          <div className="space-y-0.5">
            <Label>Resultado Publicado</Label>
            <p className="text-xs text-muted-foreground">Envia resultado do sorteio ao grupo.</p>
          </div>
          <Switch
            checked={settings.notify_result}
            onCheckedChange={(v) => setSettings({ ...settings, notify_result: v })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
          <div className="space-y-0.5">
            <Label>Divulgação Periódica</Label>
            <p className="text-xs text-muted-foreground">Envia lista de bolões abertos periodicamente.</p>
          </div>
          <Switch
            checked={settings.broadcast_open_pools}
            onCheckedChange={(v) => setSettings({ ...settings, broadcast_open_pools: v })}
          />
        </div>

        {settings.broadcast_open_pools && (
          <div className="space-y-2 pl-4 border-l-2 border-primary/30">
            <Label>Intervalo de Divulgação (minutos)</Label>
            <Input
              className="bg-muted w-32"
              type="number"
              min="5"
              value={settings.broadcast_interval_minutes}
              onChange={(e) => setSettings({ ...settings, broadcast_interval_minutes: parseInt(e.target.value) || 60 })}
            />
            <p className="text-xs text-muted-foreground">Mínimo: 5 minutos. A divulgação periódica precisa ser disparada manualmente ou via cron externo.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">⚠️ Lembre-se de salvar após alterar as configurações.</p>
      </div>

      {/* Manual Actions */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display text-lg font-bold text-foreground">Ações Manuais</h3>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBroadcast}
            disabled={broadcasting || !settings.enabled || !isConfigured}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {broadcasting ? 'Enviando...' : 'Divulgar Bolões Abertos'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Mensagem Personalizada</Label>
          <Textarea
            className="bg-muted"
            placeholder="Digite uma mensagem para enviar ao grupo..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleSendCustom}
            disabled={sendingCustom || !customMessage.trim() || !settings.enabled || !isConfigured}
            className="bg-gradient-gold text-secondary-foreground hover:opacity-90"
          >
            <Send className="mr-1.5 h-4 w-4" />
            {sendingCustom ? 'Enviando...' : 'Enviar Mensagem'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminWhatsApp;
