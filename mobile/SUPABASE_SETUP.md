# Supabase Setup

## Projeto atual

O `supabase-schema.sql` já é a base canônica do banco. Se ele já foi executado, **não rode novamente a migration antiga `202608040001_mobile_subscriptions.sql` manualmente**.

Execute apenas a atualização atual:

```text
supabase/migrations/202608080001_ai_security_hardening.sql
```

Ela adiciona:
- bloqueios aplicados às interações;
- rate limiting no banco;
- cota diária da Possível IA;
- validação reforçada de pagamentos;
- correção segura do trigger de totais de causas.

Depois:
1. Faça deploy das functions em `supabase/functions/`.
2. No Auth, autorize `https://possivel2026.github.io/possivel/`, `possivel://login` e `possivel://reset-password`.
3. Confirme Realtime para `messages` e `notifications`.
4. Mantenha `service_role` e demais secrets somente nas Edge Functions.
