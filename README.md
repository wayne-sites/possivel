# Possível

Plataforma social para publicar, conversar, seguir pessoas, vender ou trocar itens, criar causas, receber apoio e transformar ideias em próximos passos com a Possível IA.

## O que esta versão entrega

### Web
- cadastro, login, logout, recuperação e redefinição de senha com Supabase Auth;
- perfil editável com nome, @usuário, bio e avatar;
- feed real com texto, foto e vídeo;
- curtidas e comentários persistentes;
- conexões, bloqueios e notificações;
- mensagens privadas com Supabase Realtime;
- marketplace com venda/troca, imagens, limites por plano e checkout protegido;
- causas/projetos com meta, valor arrecadado e apoios;
- assinatura Possível Pro por **R$ 29,99/mês**;
- chamadas privadas de áudio/vídeo preparadas para Daily;
- denúncias, RLS, Storage e rate limiting no banco;
- Possível IA com o recurso **Mapa do Possível**.

### Mobile
A pasta `mobile/` contém o app Expo/React Native em TypeScript, com a mesma conta, dados, RLS e backend do site. O visual usa a mesma identidade clara em creme/coral e inclui a Possível IA.

## Possível IA

A Possível IA é a camada inteligente do produto. Ela oferece:
- **Mapa do Possível**: transforma um objetivo em próximos passos, pessoas, recursos e uma métrica de progresso;
- melhoria de publicações;
- estruturação de anúncios;
- planejamento de causas;
- revisão preventiva de segurança.

O motor local funciona sem um provedor externo. Opcionalmente, a Edge Function `possivel-ai` pode usar um modelo compatível com API de chat configurado **somente no servidor**:

```env
AI_API_URL=
AI_API_KEY=
AI_MODEL=
```

Nenhuma chave de IA deve ser colocada no site ou no aplicativo.

## Configuração obrigatória do Supabase

Para um projeto novo:
1. Execute `supabase-schema.sql`.
2. Em seguida execute `supabase/migrations/202608080001_ai_security_hardening.sql`.

Para o projeto atual, que já executou `supabase-schema.sql`, execute **somente**:
`supabase/migrations/202608080001_ai_security_hardening.sql`.

Depois:
1. Em Authentication > URL Configuration, adicione:
   - `https://possivel2026.github.io/possivel/`
   - `possivel://login`
   - `possivel://reset-password`
2. Implante as Edge Functions de `supabase/functions/`.
3. Configure os secrets externos no Supabase.

## Secrets externos

Obrigatórios para pagamentos/chamadas:
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `APP_URL`
- `PAYMENT_WEBHOOK_URL`
- `DAILY_API_KEY`

O preço mensal do Possível Pro está definido no backend como **R$ 29,99**.

A chave `service_role`, senha do banco e tokens privados nunca devem ser colocados no frontend.

## Segurança

O projeto usa defesa em camadas:
- RLS no Supabase;
- bloqueios aplicados às políticas de interação;
- limites de requisições no banco contra spam/bots;
- preço de compras validado novamente no servidor;
- assinatura de webhooks;
- tokens privados apenas em Edge Functions;
- CSP no site;
- respostas sensíveis com `no-store`;
- limites de entrada e validações de arquivos.

Isso reduz a superfície de ataque, mas nenhum sistema conectado à internet pode ser prometido como “impossível de hackear”. Consulte `SECURITY.md` para o modelo de proteção e operação.

## Edge Functions principais

- `possivel-ai`: Possível IA e Mapa do Possível;
- `create-subscription-checkout`: assinatura Pro;
- `payment-webhook`: atualiza assinatura;
- `create-payment-checkout`: compra ou doação com valor revalidado;
- `payment-events-webhook`: confirma compra ou doação;
- `create-call-room`: cria sala privada Daily.

## Testes

```bash
node --check script.js
node --check enhancements.js
node tests/static-check.mjs

cd mobile
npm install --no-audit --no-fund
npm run typecheck
npx expo export --platform android --output-dir dist
```

## GitHub Pages

A publicação web usa `.github/workflows/deploy-pages.yml`. O CI valida web, mobile, TypeScript e bundle Android antes do merge.
