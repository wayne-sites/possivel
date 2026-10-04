import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  'app/(auth)/login.tsx',
  'app/(auth)/signup.tsx',
  'app/(auth)/reset-password.tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/search.tsx',
  'app/(tabs)/connections.tsx',
  'app/(tabs)/messages.tsx',
  'app/(tabs)/marketplace.tsx',
  'app/(tabs)/projects.tsx',
  'app/(tabs)/profile.tsx',
  'app/ai.tsx',
  'app/pro-library.tsx',
  'app/post/create.tsx',
  'app/chat/[id].tsx',
  'app/listing/create.tsx',
  'app/project/create.tsx',
  'app/notifications.tsx',
  'app/plans.tsx',
  'services/app.ts',
  'services/ai.ts',
  'services/proMedia.ts',
  'lib/supabase.ts',
  'components/ui.tsx',
  'components/ProMediaTab.tsx',
];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Arquivo obrigatório ausente: ${file}`);
  const text = fs.readFileSync(full, 'utf8');
  if (text.trim().length < 200) throw new Error(`Arquivo parece incompleto: ${file}`);
}

for (const route of ['app/(tabs)/books.tsx', 'app/(tabs)/watch.tsx']) {
  if (!fs.existsSync(path.join(root, route))) throw new Error(`Aba obrigatória ausente: ${route}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
if (packageJson.main !== 'expo-router/entry') throw new Error('Expo Router não configurado.');
if (!packageJson.dependencies['expo-document-picker']) throw new Error('Seletor de arquivos da Biblioteca Pro não instalado.');
if (appJson.expo.scheme !== 'possivel') throw new Error('Deep link possivel:// não configurado.');
if (appJson.expo.userInterfaceStyle !== 'light') throw new Error('Tema mobile deve seguir a identidade visual clara.');

const allCode = required.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const oldOwner = ['marcelinfreefire153', 'arch'].join('-');
for (const forbidden of ['TODO: implementar', 'Lorem ipsum', 'Mínimo de 6 caracteres', oldOwner]) {
  if (allCode.includes(forbidden)) throw new Error(`Conteúdo incompleto/antigo encontrado: ${forbidden}`);
}

const plans = fs.readFileSync(path.join(root, 'app/plans.tsx'), 'utf8');
if (!plans.includes('R$ 15,99/mês')) throw new Error('Preço do Pro ausente no app.');

const tabs = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');
for (const marker of ['name="index"', 'name="search"', 'name="messages"', 'name="books"', 'name="watch"', "title: 'Filmes e séries'"]) {
  if (!tabs.includes(marker)) throw new Error(`Navegação principal incompleta: ${marker}`);
}

const proMedia = fs.readFileSync(path.join(root, 'components/ProMediaTab.tsx'), 'utf8');
for (const marker of ['R$ 15,99/mês', '2 GB', '500 MB', 'Não envie cópias piratas']) {
  if (!proMedia.includes(marker)) throw new Error(`Biblioteca Pro mobile incompleta: ${marker}`);
}

const theme = fs.readFileSync(path.join(root, 'components/ui.tsx'), 'utf8');
if (!theme.includes("#F6F1E8") || !theme.includes("#F56B5D")) throw new Error('Identidade visual do site não foi aplicada ao app.');

const ai = fs.readFileSync(path.join(root, 'services/ai.ts'), 'utf8');
if (!ai.includes("supabase.functions.invoke('possivel-ai'")) throw new Error('Possível IA não está ligada à Edge Function.');

console.log('mobile static check: ok');
