import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';

const WHATSAPP_LINK = 'https://chat.whatsapp.com/DuEM6vpNAVeELSP4wuIamg';
const STORAGE_KEY = 'whatsapp_popup_last_shown';

const WhatsAppPopup = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastShown = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    if (lastShown === today) return;

    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, today);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-card border-border w-[92vw] max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/10 p-6 pb-4">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] shadow-lg">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="font-display text-xl text-center text-foreground">
              Junte-se à nossa comunidade! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-sm mt-2">
              Entre na nossa comunidade do WhatsApp e fique por dentro de tudo!
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#25D366] mt-0.5">✅</span>
              <span>Resultados dos sorteios em tempo real</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#25D366] mt-0.5">✅</span>
              <span>Novos bolões e promoções exclusivas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#25D366] mt-0.5">✅</span>
              <span>Dicas e estratégias para aumentar suas chances</span>
            </li>
          </ul>

          <div className="flex flex-col gap-2">
            <Button
              asChild
              className="w-full bg-[#25D366] hover:bg-[#1fb855] text-white font-semibold h-11"
            >
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Entrar na Comunidade
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-muted-foreground text-xs"
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppPopup;
