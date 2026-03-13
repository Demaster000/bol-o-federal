# Correção: Mensagens de WhatsApp Enviadas em Triplicidade

## Problema Identificado

As mensagens de divulgação automática no WhatsApp estavam sendo disparadas **3 vezes** para cada bolão em aberto. Isso ocorria quando a divulgação periódica era acionada.

## Causa Raiz

O bug foi causado por **dois problemas combinados**:

### 1. **Múltiplos Agendamentos de Cron (Duplicação de Jobs)**

Foram criadas **3 migrações** que agendavam jobs de cron:

- **20260307000000_setup_whatsapp_cron.sql**: Agendou `whatsapp-periodic-broadcast` a cada minuto (`* * * * *`)
- **20260307000002_improve_whatsapp_scheduling.sql**: Tentou desagendar o job anterior, mas criou `whatsapp-periodic-broadcast-v2` a cada 5 minutos (`*/5 * * * *`)
- **20260308175752_ceb18070-ff25-4c9c-b366-581e1dee7bdb.sql**: Apenas redefiniu a função, mas não limpou os jobs anteriores

**Resultado**: Ambos os jobs (`whatsapp-periodic-broadcast` e `whatsapp-periodic-broadcast-v2`) estavam ativos e disparando a mesma função.

### 2. **Lógica de Verificação de Intervalo Muito Permissiva**

A função `shouldRunScheduledBroadcast()` tinha a seguinte lógica:

```typescript
return remainder === 0 || remainder === 1 || (interval > 5 && remainder === interval - 1);
```

Isso permitia que a função executasse em **3 momentos diferentes** dentro de cada intervalo:
- Quando `remainder === 0` (minuto exato)
- Quando `remainder === 1` (1 minuto depois)
- Quando `remainder === interval - 1` (1 minuto antes, para intervalos > 5 min)

Combinado com os múltiplos jobs de cron, isso resultava em **até 3 disparos** para cada bolão.

## Solução Implementada

### 1. **Correção da Lógica de Intervalo** (`supabase/functions/whatsapp-send/index.ts`)

Simplificamos a função `shouldRunScheduledBroadcast()` para ser **rigorosa**:

```typescript
function shouldRunScheduledBroadcast(intervalMinutes: number, now = new Date()): boolean {
  const interval = normalizeIntervalMinutes(intervalMinutes);
  const totalMinutes = Math.floor(now.getTime() / (1000 * 60));
  // Dispara apenas no minuto exato do intervalo (ex: se interval=60, dispara quando totalMinutes % 60 == 0)
  // Isso evita que disparos em segundos diferentes ou pequenas variações de cron causem envios múltiplos
  return totalMinutes % interval === 0;
}
```

Agora a função dispara **apenas** quando `totalMinutes % interval === 0`, eliminando os disparos extras.

### 2. **Limpeza de Jobs de Cron Duplicados** (Nova migração: `20260312000000_fix_duplicate_cron_jobs.sql`)

Criamos uma nova migração que:

1. **Desagenda todos os jobs conhecidos**:
   - `whatsapp-periodic-broadcast`
   - `whatsapp-periodic-broadcast-v2`

2. **Reagenda apenas um job**:
   - Nome: `whatsapp-periodic-broadcast`
   - Frequência: A cada minuto (`* * * * *`)
   - A função agora tem lógica rigorosa para verificar se deve realmente executar

3. **Garante a versão correta da função trigger**:
   - Define a função `trigger_whatsapp_broadcast()` com tratamento de erros adequado

## Arquivos Modificados

1. **supabase/functions/whatsapp-send/index.ts**
   - Modificada a função `shouldRunScheduledBroadcast()` (linhas 43-49)

2. **supabase/migrations/20260312000000_fix_duplicate_cron_jobs.sql** (NOVO)
   - Limpa jobs de cron duplicados
   - Reagenda o job correto
   - Garante a função trigger correta

## Como Aplicar a Correção

1. **Atualizar o código da Edge Function**:
   - Substitua o arquivo `supabase/functions/whatsapp-send/index.ts` com a versão corrigida

2. **Executar a migração de limpeza**:
   - Execute a migração `20260312000000_fix_duplicate_cron_jobs.sql` no seu banco Supabase
   - Isso limpará os jobs duplicados e agendará apenas o correto

3. **Testar**:
   - Habilite a divulgação periódica nas configurações de WhatsApp
   - Defina um intervalo pequeno (ex: 5 minutos) para testar rapidamente
   - Verifique se as mensagens são enviadas apenas uma vez por intervalo

## Resultado Esperado

Após aplicar a correção:

- ✅ Mensagens de divulgação serão enviadas **apenas uma vez** por intervalo
- ✅ Sem duplicação de jobs de cron
- ✅ Sem disparos múltiplos em segundos diferentes
- ✅ Comportamento previsível e confiável

## Notas Adicionais

- A função `sendWhatsAppMessage()` envia para **grupo** e **canal** (se habilitado), mas isso é correto e intencional
- O problema era a **frequência de disparo**, não o destino das mensagens
- A correção mantém a compatibilidade com todas as funcionalidades existentes
