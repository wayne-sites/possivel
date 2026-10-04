# Pagamentos Mercado Pago

O plano **Possível Pro custa R$ 29,99 por mês**. O preço é definido no backend (`PRO_MONTHLY_PRICE_BRL`) e não é confiado ao aplicativo.

Edge Functions incluídas:

- `create-subscription-checkout`
- `payment-webhook`
- `get-subscription`
- `cancel-subscription`
- `restore-subscription`
- `get-entitlements`
- `create-payment-checkout`
- `payment-events-webhook`

Variáveis nas Supabase Edge Functions:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
APP_URL=https://possivel2026.github.io/possivel/
PAYMENT_WEBHOOK_URL=
```

Use credenciais sandbox durante desenvolvimento. O `SUPABASE_SERVICE_ROLE_KEY` e o token do Mercado Pago ficam somente no ambiente seguro das Edge Functions.

O checkout de compras reconsulta o anúncio no servidor e substitui qualquer valor adulterado pelo preço real do banco antes de falar com o Mercado Pago.
