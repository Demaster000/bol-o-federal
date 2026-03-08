import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Carlos M.',
    prize: 'R$ 2.500,00',
    text: 'Participei do bolão da Mega-Sena e ganhei! O pagamento foi super rápido e o processo é muito transparente.',
    lottery: 'Mega-Sena',
  },
  {
    name: 'Ana P.',
    prize: 'R$ 1.200,00',
    text: 'Melhor plataforma de bolões! Já participei de vários e sempre recebo meus prêmios direitinho.',
    lottery: 'Lotofácil',
  },
  {
    name: 'Roberto S.',
    prize: 'R$ 3.800,00',
    text: 'Indiquei para toda minha família. As cotas são acessíveis e a chance de ganhar é real!',
    lottery: 'Federal',
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-10 sm:py-16 bg-card/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="mb-6 sm:mb-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            O que dizem nossos <span className="text-gradient-gold">Ganhadores</span>
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Histórias reais de quem já ganhou com o Sorte Compartilhada
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="relative rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-secondary text-secondary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.lottery}</p>
                    </div>
                  </div>
                </div>
                <span className="font-display font-bold text-sm text-gradient-gold">{t.prize}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
