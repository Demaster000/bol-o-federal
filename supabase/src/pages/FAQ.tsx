import Header from '@/components/Header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Shield, CreditCard, Trophy, Users } from 'lucide-react';

const faqs = [
  {
    category: 'Como Funciona',
    icon: HelpCircle,
    items: [
      { q: 'O que é o Sorte Compartilhada?', a: 'O Sorte Compartilhada é uma plataforma de bolões da Loteria Federal. Reunimos várias pessoas para comprar bilhetes juntas, aumentando as chances de ganhar com cotas acessíveis.' },
      { q: 'Como participo de um bolão?', a: 'Basta criar uma conta, escolher um bolão disponível na página inicial, selecionar a quantidade de cotas desejada e realizar o pagamento via PIX. Após a confirmação do pagamento, suas cotas estão garantidas!' },
      { q: 'O que são cotas?', a: 'Cotas são frações de participação em um bolão. Quanto mais cotas você comprar, maior será sua parte proporcional do prêmio em caso de vitória.' },
      { q: 'Posso comprar mais de uma cota?', a: 'Sim! Você pode comprar quantas cotas quiser em cada bolão. Não há limite de compra por participante.' },
    ],
  },
  {
    category: 'Pagamentos',
    icon: CreditCard,
    items: [
      { q: 'Como funciona o pagamento?', a: 'O pagamento é feito exclusivamente via PIX. Ao comprar cotas, você receberá um QR Code para realizar o pagamento. A confirmação é automática e leva apenas alguns segundos.' },
      { q: 'O QR Code expira?', a: 'Sim, o QR Code PIX é válido por 30 minutos. Após esse período, você precisará gerar um novo.' },
      { q: 'O pagamento é seguro?', a: 'Sim! Utilizamos a API do Mercado Pago para processar pagamentos, garantindo total segurança nas transações.' },
    ],
  },
  {
    category: 'Prêmios',
    icon: Trophy,
    items: [
      { q: 'Como recebo meu prêmio?', a: 'Quando um bolão é premiado, você receberá uma notificação. Acesse "Meus Bolões" no Dashboard, clique em "Receber Prêmio" e preencha seus dados (CPF, chave PIX). O pagamento será processado pelo administrador.' },
      { q: 'Qual a taxa sobre o prêmio?', a: 'É cobrada uma taxa de administração de 10% sobre o prêmio total. O restante é dividido proporcionalmente entre os participantes de acordo com suas cotas.' },
      { q: 'Como é calculado meu prêmio?', a: 'Seu prêmio = (Prêmio Total × 90%) × (Suas Cotas ÷ Total de Cotas Vendidas). Exemplo: em um prêmio de R$ 10.000 com 100 cotas vendidas e você tendo 5 cotas, seu prêmio seria R$ 450,00.' },
    ],
  },
  {
    category: 'Segurança',
    icon: Shield,
    items: [
      { q: 'Meus dados estão seguros?', a: 'Sim! Utilizamos criptografia e as melhores práticas de segurança para proteger seus dados pessoais e financeiros.' },
      { q: 'Como posso confiar nos resultados?', a: 'Os resultados são baseados nos sorteios oficiais da Loteria Federal, verificáveis publicamente. Após o sorteio, publicamos os números e o valor do prêmio para total transparência.' },
      { q: 'Posso ver o histórico de bolões?', a: 'Sim! Na página de Resultados você pode ver todos os bolões finalizados com números sorteados e valores distribuídos.' },
    ],
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-2">
            Perguntas <span className="text-gradient-gold">Frequentes</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Tudo que você precisa saber sobre o Sorte Compartilhada</p>
        </div>

        <div className="space-y-6">
          {faqs.map((section) => (
            <div key={section.category} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                <section.icon className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-foreground text-sm sm:text-base">{section.category}</h2>
              </div>
              <Accordion type="multiple" className="px-2">
                {section.items.map((item, i) => (
                  <AccordionItem key={i} value={`${section.category}-${i}`} className="border-border">
                    <AccordionTrigger className="text-sm text-foreground hover:text-primary px-3 py-3">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground px-3 pb-4 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
