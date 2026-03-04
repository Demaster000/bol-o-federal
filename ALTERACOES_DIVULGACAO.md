# Alterações na Divulgação de Bolões

## Resumo das Alterações

Este documento descreve as alterações realizadas para garantir que a divulgação automática dos bolões funcione corretamente com a Evolution API, com o formato de mensagem padronizado e com links diretos que abrem o bolão automaticamente.

---

## 1. Formato da Mensagem de Divulgação (whatsapp-send/index.ts)

### Alteração Realizada

O formato da mensagem de divulgação foi padronizado para seguir exatamente o padrão solicitado:

```
Valor da cota: R$ [VALOR]
Participe: [LINK DIRETO]

📌 Como funciona:
• Faça o Pix pelo site e guarde o comprovante.
• Não é necessário enviar comprovante (salvo em caso de prêmio).
• Pix feito em outra chave será devolvido.
• Participação válida: Até [DATA E HORA]

💸 Prêmio:
• 10% administrador | 90% participantes.
• Prêmios < R$ 500 podem ser reinvestidos no próximo sorteio.

✅ Ao pagar, você concorda com as regras.
⚠️ Bolão independente, não oficial da Caixa.
```

### Arquivo Modificado

- **`supabase/functions/whatsapp-send/index.ts`** (linhas 242-252)

### Benefícios

- Mensagem mais concisa e direta
- Fácil de ler no WhatsApp
- Segue o padrão solicitado
- Inclui todas as informações essenciais

---

## 2. Link Direto para o Bolão (src/pages/Index.tsx)

### Alterações Realizadas

O arquivo `Index.tsx` foi modificado para:

1. **Capturar o parâmetro `pool` da URL** e abrir automaticamente o bolão quando a página carregar
2. **Atualizar a URL** quando o usuário clica em "Comprar" para refletir o bolão selecionado
3. **Auto-abrir o diálogo de compra** se o bolão estiver disponível e o usuário estiver autenticado

### Implementação

```typescript
// Novo useEffect para capturar parâmetro da URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const poolId = params.get('pool');
  if (poolId && pools.length > 0) {
    const pool = pools.find(p => p.id === poolId);
    if (pool) {
      setSelectedPool(pool as PoolWithType);
      setDialogOpen(true);
    }
  }
}, [pools]);

// Modificação no handleBuy para atualizar URL
window.history.replaceState({}, '', `/?pool=${pool.id}`);
```

### Arquivo Modificado

- **`src/pages/Index.tsx`** (linhas 22-33, 41-54, 76-77)

### Fluxo de Funcionamento

1. Usuário clica no link de divulgação: `https://seusite.com/?pool=ID_DO_BOLAO`
2. A página carrega e captura o parâmetro `pool`
3. Se o usuário estiver autenticado, o diálogo de compra abre automaticamente com o bolão selecionado
4. Se o usuário não estiver autenticado, é redirecionado para login
5. Após login, o diálogo abre automaticamente

---

## 3. Divulgação Automática com Evolution API

### Configuração no Painel Admin

A divulgação automática já está implementada e pode ser configurada através do painel admin em **WhatsApp > Notificações Automáticas**:

#### Tipos de Notificação

1. **Novo Bolão Criado**
   - Dispara automaticamente quando um novo bolão é criado
   - Envia a mensagem formatada com o link direto

2. **Resultado Publicado**
   - Envia notificação quando o resultado do sorteio é publicado
   - Notifica todos os participantes

3. **Divulgação Periódica**
   - Envia lista de bolões abertos periodicamente
   - Intervalo configurável (mínimo 5 minutos)
   - Pode ser disparada manualmente ou via cron externo

### Configuração Necessária

No painel admin, configure:

1. **URL da API**: URL da sua instância Evolution API
2. **API Key**: Chave de autenticação da Evolution API
3. **Nome da Instância**: Nome da instância configurada na Evolution
4. **ID do Grupo**: ID do grupo WhatsApp (formato: `5511999999999@g.us`)
5. **URL do Site**: URL do seu site (ex: `https://seusite.com`)

### Fluxo de Funcionamento

```
1. Admin cria novo bolão
   ↓
2. Sistema dispara chamada para whatsapp-send com type='new_pool'
   ↓
3. Edge Function formata mensagem com link direto
   ↓
4. Envia para Evolution API
   ↓
5. Evolution API envia para WhatsApp (grupo/canal)
   ↓
6. Usuário clica no link
   ↓
7. Página abre e auto-seleciona o bolão
```

---

## 4. Verificação da Integração

### Testes Recomendados

1. **Teste de Conexão**
   - Clique em "Testar Conexão" no painel admin
   - Verifique se a mensagem de teste chega no WhatsApp

2. **Criar Novo Bolão**
   - Crie um novo bolão no painel admin
   - Verifique se a mensagem é enviada automaticamente
   - Clique no link e confirme se o bolão abre automaticamente

3. **Divulgação Manual**
   - Clique em "Divulgar Bolões Abertos"
   - Verifique se todos os bolões abertos são divulgados

4. **Link Direto**
   - Copie o link do WhatsApp: `https://seusite.com/?pool=ID`
   - Abra em navegador e confirme se o bolão abre automaticamente

---

## 5. Arquivos Modificados

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `supabase/functions/whatsapp-send/index.ts` | 242-252 | Formato da mensagem |
| `src/pages/Index.tsx` | 22-33 | Novo useEffect para capturar URL |
| `src/pages/Index.tsx` | 41-54 | Auto-abrir bolão ao carregar |
| `src/pages/Index.tsx` | 76-77 | Atualizar URL ao selecionar bolão |

---

## 6. Notas Importantes

### Segurança

- A divulgação automática requer autenticação (token JWT)
- Apenas admins podem disparar divulgações
- A Evolution API valida a chave de API em cada requisição

### Performance

- Mensagens são enviadas de forma assíncrona
- Não bloqueia a criação do bolão
- Suporta múltiplos destinos (grupo + canal)

### Troubleshooting

Se a divulgação não funcionar:

1. Verifique se a Evolution API está acessível
2. Confirme se a API Key está correta
3. Verifique se o ID do grupo/canal está correto
4. Verifique os logs do Supabase (Edge Functions)
5. Teste a conexão através do painel admin

---

## 7. Próximos Passos (Opcional)

Para melhorias futuras, considere:

1. **Agendamento de Divulgação**: Permitir agendar divulgações para horários específicos
2. **Personalização de Mensagem**: Permitir customizar o template da mensagem
3. **Analytics**: Rastrear cliques nos links de divulgação
4. **Webhook**: Receber confirmação de entrega das mensagens
5. **Retry Automático**: Reenviar mensagens que falharem

---

**Data da Alteração**: 04 de Março de 2026  
**Versão**: 1.0
