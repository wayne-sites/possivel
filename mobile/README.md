# Possível Mobile

Aplicativo Expo/React Native que usa o mesmo projeto Supabase do site Possível e a mesma identidade visual.

## Recursos

- cadastro, login, sessão persistente e recuperação de senha;
- perfil e avatar;
- feed real com texto, foto, vídeo, curtidas e comentários;
- conexões, seguir/deixar de seguir e bloqueio;
- mensagens privadas em tempo real;
- marketplace com venda/troca e limite Free/Pro;
- causas, metas, apoios e checkout;
- notificações em tempo real;
- Possível Pro por **R$ 29,99/mês**;
- Possível IA com **Mapa do Possível**;
- denúncias e chamadas privadas preparadas com Daily.

Não há dados fictícios: estados vazios são exibidos quando o banco não possui conteúdo.

## Executar

```bash
cd mobile
npm install --no-audit --no-fund
npm run typecheck
npx expo start
```

A URL e a chave `anon` pública do Supabase possuem fallback no app. Para usar outro projeto, copie `.env.example` para `.env` e altere os valores públicos.

## Antes de testar recursos protegidos

1. Execute a migration `supabase/migrations/202608080001_ai_security_hardening.sql`.
2. Adicione `possivel://login` e `possivel://reset-password` no Supabase Auth.
3. Implante as Edge Functions.
4. Configure os secrets descritos no README principal.

O workflow `.github/workflows/mobile-apk.yml` gera um APK release standalone para teste em Android.
