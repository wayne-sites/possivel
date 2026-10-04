# Segurança do Possível

## Princípio

O Possível usa defesa em profundidade. “Anti-hack” aqui significa reduzir superfícies de ataque, limitar abuso, proteger segredos e falhar de forma segura; não significa prometer invulnerabilidade.

## Camadas implementadas

- **Autenticação:** Supabase Auth e sessão persistente.
- **Autorização:** Row Level Security (RLS) em dados de usuário.
- **Bloqueios:** contas bloqueadas não podem seguir, enviar mensagens, curtir/comentar conteúdo entre si ou iniciar chamadas.
- **Anti-spam/bot:** triggers de rate limiting no PostgreSQL para posts, comentários, mensagens, anúncios, causas, follows, likes, denúncias, pagamentos e chamadas.
- **Pagamentos:** o servidor reconsulta anúncio/causa e determina o valor autorizado antes de criar checkout; o cliente não é fonte de verdade para preço.
- **Webhooks:** eventos de pagamento passam por verificação de assinatura.
- **Segredos:** service role, tokens de Mercado Pago, Daily e IA ficam apenas nas Edge Functions.
- **Frontend web:** Content Security Policy, limites de entrada e renderização de conteúdo de usuário sem HTML arbitrário.
- **IA:** limite diário por plano; entradas limitadas; nenhum segredo precisa ser enviado ao modelo; logs de auditoria não armazenam o texto completo do prompt.
- **Mídia:** bucket limita MIME types e tamanho; escrita fica restrita à pasta do próprio usuário.

## Auditoria de dependências

O CI executa `npm audit` sobre as dependências de produção e **falha automaticamente** se aparecer qualquer vulnerabilidade crítica ou qualquer vulnerabilidade alta nova.

Em 8 de agosto de 2026, o toolchain atual do Expo/Metro ainda traz avisos transitivos upstream que não podem ser eliminados sem quebrar ou regredir a versão do framework. Eles são aceitos temporariamente por **ID exato** no arquivo `mobile/scripts/security-audit.mjs`, para que nenhuma vulnerabilidade nova seja escondida:

- `GHSA-w3rx-r6r6-pgpr` — `image-size`, parser ICNS com possibilidade de DoS por loop; no momento não há versão corrigida publicada.
- `GHSA-5p2g-fcmc-qvqq` — `image-size`, parsers JXL/HEIF com possibilidade de DoS por loop; no momento não há versão corrigida publicada.
- `GHSA-w5hq-g745-h8pq` — `uuid` transitivo do tooling Expo/xcode; severidade moderada.

Esses pacotes aparecem na cadeia de build/prebuild (Metro/Expo CLI/xcode). A política não transforma os avisos em “seguros”: ela os mantém visíveis e bloqueia imediatamente qualquer advisory alto/crítico diferente. A lista deve ser reduzida assim que patches compatíveis forem publicados.

Não use `npm audit fix --force` automaticamente: o npm pode propor downgrade/upgrade incompatível do Expo/React Native. Atualizações de segurança devem passar por compatibilidade Expo, TypeScript, lint, testes, bundle Android e APK.

## Operação segura

1. Execute `supabase/migrations/202608080001_ai_security_hardening.sql`.
2. Configure senhas fortes e MFA na conta que administra GitHub, Supabase, Mercado Pago e provedor de IA.
3. Nunca faça commit de `service_role`, chaves privadas, senhas, access tokens ou secrets de webhook.
4. Use credenciais sandbox durante desenvolvimento.
5. Revogue imediatamente qualquer secret que tenha sido exposto.
6. Revise logs do Supabase e do provedor de pagamento após comportamento suspeito.
7. Mantenha dependências e SDKs atualizados com testes antes de publicar.

## Limitações

GitHub Pages é hospedagem estática e não permite controlar todos os headers HTTP como um servidor próprio. Por isso o site usa CSP em `<meta>` e toda operação sensível permanece no Supabase/Edge Functions.

A Possível IA não deve receber senhas, tokens, códigos de recuperação, chaves privadas ou documentos sensíveis.
