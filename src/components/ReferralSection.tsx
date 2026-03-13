import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Users, Gift, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const ReferralSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, rewarded: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      // Get referral stats
      const { data: referrals } = await supabase
        .from('referrals')
        .select('id, status')
        .eq('referrer_id', user.id);

      if (referrals) {
        setStats({
          total: referrals.length,
          rewarded: referrals.filter(r => r.status === 'rewarded').length,
        });
      }
    };

    fetchData();
  }, [user]);

  const referralLink = `https://sortecompartilhada.com.br/login?mode=register&ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: 'Link copiado!', description: 'Compartilhe com seus amigos.' });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = async () => {
    const text = `🎰 Participe dos melhores bolões de loteria! Use meu link e quando você comprar, eu ganho 1 cota grátis do mesmo sorteio!\n\n${referralLink}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sorte Compartilhada - Indicação', text });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  if (!referralCode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-foreground text-lg">Programa de Indicação</h2>
          <p className="text-xs text-muted-foreground">Indique amigos e ganhe cotas grátis!</p>
        </div>
      </div>

      <div className="rounded-lg bg-card border border-border p-3 space-y-1">
        <p className="text-sm text-muted-foreground">Como funciona:</p>
        <p className="text-sm text-foreground">
          Quando seu amigo se cadastrar pelo seu link e <strong>comprar cotas</strong>, 
          você ganha <strong className="text-primary">1 cota grátis</strong> do mesmo sorteio!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="font-display font-bold text-lg text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Indicados</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <Gift className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="font-display font-bold text-lg text-primary">{stats.rewarded}</p>
          <p className="text-[10px] text-muted-foreground">Cotas ganhas</p>
        </div>
      </div>

      {/* Link */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Seu link de indicação:</p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralLink}
            className="bg-muted text-xs font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Button
        onClick={handleShare}
        className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar Link
      </Button>
    </motion.div>
  );
};

export default ReferralSection;
