# Alterações no Fluxo de Autenticação para Links de Divulgação

## Resumo das Alterações

Este documento descreve as alterações realizadas para implementar um fluxo de autenticação obrigatória quando o usuário acessa um link de divulgação de bolão via WhatsApp. O usuário será redirecionado para login/cadastro e, após autenticar, será automaticamente redirecionado para o bolão.

---

## 1. Fluxo de Funcionamento

### Antes (Comportamento Antigo)

1. Usuário clica no link: `https://seusite.com/?pool=ID_DO_BOLAO`
2. Se não estiver logado, era redirecionado para `/login`
3. Após login, era redirecionado para a home `/`
4. Usuário precisava procurar o bolão novamente

### Depois (Novo Comportamento)

1. Usuário clica no link: `https://seusite.com/?pool=ID_DO_BOLAO`
2. Se não estiver logado, é redirecionado para `/login?redirect=/?pool=ID_DO_BOLAO`
3. Na página de login, exibe um alerta informando que autenticação é obrigatória
4. Após login bem-sucedido, é automaticamente redirecionado para `/?pool=ID_DO_BOLAO`
5. O bolão abre automaticamente no diálogo de compra
6. Usuário pode escolher a quantidade de cotas e realizar o pagamento PIX

---

## 2. Alterações Implementadas

### 2.1 Página Index.tsx (src/pages/Index.tsx)

**Modificação**: Atualizar o redirecionamento para login para incluir a URL de retorno

```typescript
// Antes
const handleBuy = (pool: Tables<'pools'>) => {
  if (!user) {
    window.location.href = '/login';
    return;
  }
  // ...
};

// Depois
const handleBuy = (pool: Tables<'pools'>) => {
  if (!user) {
    // Redirecionar para login com URL de retorno
    window.location.href = `/login?redirect=/?pool=${pool.id}`;
    return;
  }
  // ...
};
```

**Arquivo Modificado**: `src/pages/Index.tsx` (linha 72)

---

### 2.2 Página Login.tsx (src/pages/Login.tsx)

**Modificações**:

1. **Importar `useSearchParams`** para capturar o parâmetro de redirecionamento
2. **Adicionar alerta visual** informando que autenticação é obrigatória (quando vindo de um link de bolão)
3. **Redirecionar para a URL correta** após login bem-sucedido
4. **Preservar URL de retorno** ao redirecionar para cadastro

```typescript
// Novas importações
import { useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

// Capturar URL de retorno
const [searchParams] = useSearchParams();
const redirectUrl = searchParams.get('redirect') || '/';

// Redirecionar após login bem-sucedido
if (error) {
  // ... tratamento de erro
} else {
  navigate(redirectUrl); // Redireciona para a URL de retorno
}

// Exibir alerta se vindo de link de bolão
{redirectUrl !== '/' && (
  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex gap-3">
    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-amber-900">Autenticação obrigatória</p>
      <p className="text-xs text-amber-800 mt-1">
        Você precisa estar logado para comprar cotas do bolão. Faça login ou crie uma conta.
      </p>
    </div>
  </div>
)}

// Preservar URL ao redirecionar para cadastro
<Link 
  to={`/register${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
  className="font-medium text-primary hover:underline"
>
  Cadastre-se
</Link>
```

**Arquivo Modificado**: `src/pages/Login.tsx` (completo reescrito)

---

### 2.3 Página Register.tsx (src/pages/Register.tsx)

**Modificações**:

1. **Importar `useSearchParams`** para capturar o parâmetro de redirecionamento
2. **Adicionar alerta visual** informando que autenticação é obrigatória
3. **Redirecionar para login com URL preservada** após cadastro bem-sucedido
4. **Preservar URL de retorno** ao redirecionar para login

```typescript
// Novas importações
import { useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

// Capturar URL de retorno
const [searchParams] = useSearchParams();
const redirectUrl = searchParams.get('redirect') || '/';

// Após cadastro bem-sucedido, redirecionar para login com URL preservada
navigate(`/login${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`);

// Exibir alerta se vindo de link de bolão
{redirectUrl !== '/' && (
  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex gap-3">
    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-amber-900">Autenticação obrigatória</p>
      <p className="text-xs text-amber-800 mt-1">
        Você precisa estar logado para comprar cotas do bolão. Crie uma conta ou faça login.
      </p>
    </div>
  </div>
)}
```

**Arquivo Modificado**: `src/pages/Register.tsx` (completo reescrito)

---

## 3. Fluxo Completo de Funcionamento

### Cenário 1: Usuário Não Autenticado Clica no Link

```
1. WhatsApp: "Participe: https://seusite.com/?pool=abc123"
   ↓
2. Usuário clica no link
   ↓
3. Página Index.tsx carrega
   ↓
4. Detecta que não há usuário autenticado
   ↓
5. Redireciona para: /login?redirect=/?pool=abc123
   ↓
6. Página Login.tsx exibe:
   - Alerta: "Autenticação obrigatória"
   - Formulário de login
   - Link para cadastro com URL preservada
   ↓
7. Usuário faz login ou se cadastra
   ↓
8. Redireciona para: /?pool=abc123
   ↓
9. Página Index.tsx abre automaticamente o bolão
   ↓
10. Usuário vê o diálogo de compra de cotas
    ↓
11. Escolhe a quantidade e realiza pagamento PIX
```

### Cenário 2: Usuário Autenticado Clica no Link

```
1. WhatsApp: "Participe: https://seusite.com/?pool=abc123"
   ↓
2. Usuário clica no link
   ↓
3. Página Index.tsx carrega
   ↓
4. Detecta que usuário está autenticado
   ↓
5. Abre automaticamente o diálogo de compra do bolão
   ↓
6. Usuário escolhe a quantidade e realiza pagamento PIX
```

---

## 4. Benefícios da Implementação

1. **Segurança**: Garante que apenas usuários autenticados possam comprar cotas
2. **Experiência do Usuário**: Fluxo intuitivo e direto do link para a compra
3. **Conversão**: Reduz etapas e facilita a compra após autenticação
4. **Clareza**: Alerta visual explica por que autenticação é necessária
5. **Preservação de Contexto**: URL de retorno é mantida durante todo o fluxo

---

## 5. Arquivos Modificados

| Arquivo | Modificação |
|---------|------------|
| `src/pages/Index.tsx` | Atualizar redirecionamento para login com URL de retorno |
| `src/pages/Login.tsx` | Adicionar suporte a redirecionamento e alerta visual |
| `src/pages/Register.tsx` | Adicionar suporte a redirecionamento e alerta visual |

---

## 6. Testes Recomendados

### Teste 1: Usuário Não Autenticado

1. Abra o link em uma janela anônima: `https://seusite.com/?pool=ID_DO_BOLAO`
2. Confirme que é redirecionado para login
3. Confirme que o alerta "Autenticação obrigatória" é exibido
4. Faça login
5. Confirme que é redirecionado para `/?pool=ID_DO_BOLAO`
6. Confirme que o diálogo de compra abre automaticamente

### Teste 2: Usuário Não Autenticado - Cadastro

1. Abra o link em uma janela anônima: `https://seusite.com/?pool=ID_DO_BOLAO`
2. Clique em "Cadastre-se"
3. Confirme que a URL de retorno é preservada
4. Complete o cadastro
5. Confirme que é redirecionado para login com URL de retorno
6. Faça login
7. Confirme que é redirecionado para `/?pool=ID_DO_BOLAO`
8. Confirme que o diálogo de compra abre automaticamente

### Teste 3: Usuário Autenticado

1. Faça login na conta
2. Abra o link: `https://seusite.com/?pool=ID_DO_BOLAO`
3. Confirme que o diálogo de compra abre automaticamente
4. Não deve exibir tela de login

---

## 7. Notas Importantes

### Segurança

- A autenticação é verificada no cliente (React)
- O backend já valida autenticação nas Edge Functions de pagamento
- Nenhuma mudança de segurança foi necessária

### Compatibilidade

- Funciona em todos os navegadores modernos
- Funciona em dispositivos móveis (importante para WhatsApp)
- Suporta URLs com parâmetros de redirecionamento

### Mensagens do WhatsApp

As mensagens de divulgação continuam usando o mesmo formato:

```
Valor da cota: R$ [VALOR]
Participe: https://seusite.com/?pool=ID_DO_BOLAO

📌 Como funciona:
• Faça o Pix pelo site e guarde o comprovante.
• Não é necessário enviar comprovante (salvo em caso de prêmio).
• Pix feito em outra chave será devolvido.
• Participação válida: Até [DATA E HORA]

💸 Prêmio:
• 10% administrador | 90% participantes.
• Prêmios < R$ 600 podem ser reinvestidos.

✅ Ao pagar, você concorda com as regras.
⚠️ Bolão independente, não oficial da Caixa.
```

---

## 8. Próximos Passos (Opcional)

Para melhorias futuras, considere:

1. **Analytics**: Rastrear quantos usuários vêm de links de divulgação
2. **Personalização**: Permitir mensagens personalizadas por bolão
3. **Rastreamento**: Saber qual bolão gerou mais conversões
4. **Notificações**: Enviar notificação após compra bem-sucedida
5. **Cupons**: Oferecer desconto para primeiro acesso via link

---

**Data da Alteração**: 07 de Março de 2026  
**Versão**: 1.0
