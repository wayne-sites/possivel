# Preparar e testar o aplicativo

1. Instale Node.js LTS e Android Studio ou Expo Go.
2. No terminal, entre na pasta `mobile`.
3. Execute `npm install --no-audit --no-fund`.
4. Execute `npm run typecheck`.
5. Execute `npx expo start`.
6. Entre com a mesma conta usada no site.

## APK standalone

O repositório possui o workflow `Gerar APK de teste`, que executa `assembleRelease` e publica o APK como artefato do GitHub Actions.

Para um teste real:
1. baixe o APK release mais recente;
2. instale no Android;
3. teste login, feed, publicação, mensagens, IA, marketplace e causas;
4. só depois promova a versão para produção/loja.

Para build oficial de loja, use uma assinatura de produção e gere AAB.
