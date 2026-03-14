# Correção: Ferramenta "Convite para Comunidade" - WhatsApp

## Problema Identificado

O erro **400 (Bad Request)** ocorria quando o usuário tentava enviar convites em massa através da ferramenta "Convite para Comunidade" no painel administrativo. O erro era retornado pela Edge Function do Supabase com a mensagem:

```
POST https://gnghwduomveqebgclnth.supabase.co/functions/v1/whatsapp-send 400 (Bad Request)
```

### Causa Raiz

No arquivo `AdminWhatsApp.tsx` (linha 183), o frontend envia uma requisição com o tipo `send_bulk`:

```typescript
const result = await callWhatsApp('send_bulk', { message: finalMessage, numbers });
```

Porém, a Edge Function (`whatsapp-send/index.ts`) **não tinha implementado** o case para `send_bulk`. O switch statement só reconhecia os tipos:
- `new_pool`
- `result`
- `broadcast_open`
- `scheduled_broadcast`
- `custom`
- `test`

Quando um tipo desconhecido era enviado, a função retornava erro 400 com a mensagem "Tipo desconhecido: send_bulk".

## Solução Implementada

Foi adicionado um novo case `send_bulk` na Edge Function que:

1. **Valida os dados recebidos**:
   - Verifica se a mensagem foi fornecida e não está vazia
   - Verifica se o array de números foi fornecido e contém pelo menos um número

2. **Processa os números**:
   - Remove caracteres não-numéricos de cada número
   - Valida se cada número tem pelo menos 10 dígitos (padrão brasileiro: DDD + número)

3. **Envia as mensagens**:
   - Itera sobre cada número válido
   - Chama a função `sendToDestination()` para enviar a mensagem individualmente
   - Registra o resultado de cada envio (sucesso ou erro)

4. **Retorna o resultado consolidado**:
   - Conta quantos envios foram bem-sucedidos e quantos falharam
   - Retorna uma mensagem resumida com as estatísticas
   - Inclui os detalhes de cada envio no array `results`

## Código Adicionado

```typescript
case "send_bulk": {
  const { message, numbers } = data || {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Mensagem não informada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return new Response(JSON.stringify({ error: "Nenhum número fornecido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Limit message length to prevent abuse
  const sanitizedMessage = message.trim().slice(0, 4096);
  
  // Send to each number individually
  const sendResults: { number: string; success: boolean; error?: string }[] = [];
  for (const number of numbers) {
    const cleanNumber = String(number).replace(/\D/g, "");
    if (cleanNumber.length >= 10) {
      const sendResult = await sendToDestination(settings, cleanNumber, sanitizedMessage);
      sendResults.push({
        number: cleanNumber,
        success: sendResult.success,
        error: sendResult.error,
      });
    }
  }

  const successCount = sendResults.filter(r => r.success).length;
  const failureCount = sendResults.filter(r => !r.success).length;
  
  result = {
    success: successCount > 0,
    message: `Convites enviados: ${successCount} sucesso, ${failureCount} falha(s)`,
    results: sendResults,
  };
  break;
}
```

## Como Instalar a Correção

1. Localize o arquivo `supabase/supabase/functions/whatsapp-send/index.ts` no seu projeto
2. Abra o arquivo e encontre o case `"test"` (por volta da linha 369)
3. Adicione o novo case `"send_bulk"` **antes** do case `"test"`
4. Salve o arquivo
5. Faça o deploy da Edge Function no Supabase (via CLI ou dashboard)

## Teste da Correção

Após fazer o deploy:

1. Acesse o painel administrativo
2. Vá para a guia **WHATSAPP**
3. Na seção **Convite para Comunidade**:
   - Anexe um arquivo `.txt` com números de telefone
   - Digite a mensagem de convite
   - Cole o link do convite
   - Clique em **Enviar Convites**

A ferramenta agora deve processar e enviar os convites sem retornar erro 400.

## Melhorias Implementadas

- ✅ Validação robusta de entrada (mensagem e números)
- ✅ Limpeza de números (remove caracteres especiais)
- ✅ Envio individual com tratamento de erro por número
- ✅ Resposta consolidada com estatísticas
- ✅ Limite de tamanho de mensagem (4096 caracteres) para prevenção de abuso
- ✅ Compatibilidade com a função `sendToDestination()` já existente

## Notas Técnicas

- A função utiliza a API Evolution já configurada nas settings
- Cada número é enviado individualmente para garantir rastreabilidade
- O status geral é considerado "sucesso" se pelo menos um envio for bem-sucedido
- Erros individuais são capturados e retornados para análise
