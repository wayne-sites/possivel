import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const required = ['index.html','styles.css','script.js','supabase-config.js','supabase-schema.sql'];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
}
const html = fs.readFileSync('index.html','utf8');
for (const id of ['feedList','authDialog','composeDialog','commentsDialog','marketList','causesList']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Elemento obrigatório ausente: ${id}`);
}
if ((html.match(/@supabase\/supabase-js@2/g) || []).length !== 1) throw new Error('Supabase CDN deve aparecer uma vez.');
if (html.includes('sample-bike') || html.includes('Ana Martin') || html.includes('João Silva')) throw new Error('Dados fictícios encontrados.');
const config = fs.readFileSync('supabase-config.js','utf8');
if (/service_role|secret_key/i.test(config)) throw new Error('Segredo proibido no frontend.');

const labsRequired = [
  'microprodutos/index.html',
  'microprodutos/styles.css',
  'microprodutos/app.js',
  'microprodutos/admin.js',
  'microprodutos/vercel.json',
  'microprodutos/package.json',
  'microprodutos/supabase-admin-schema.sql',
  'microprodutos/api/admin-summary.js',
  'microprodutos/api/withdrawals.js',
  'microprodutos/api/mercadopago-webhook.js',
  'microprodutos/api/public-config.js'
];
for (const file of labsRequired) {
  if (!fs.existsSync(file)) throw new Error(`Microproduto ausente: ${file}`);
}

function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
    const full = path.join(dir,entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk('microprodutos').filter(f=>f.endsWith('.js'))) {
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
}

const labsHtml = fs.readFileSync('microprodutos/index.html','utf8');
for (const id of ['toolGrid','workspace','creatorPanel','creatorLogin','withdrawForm']) {
  if (!labsHtml.includes(`id="${id}"`)) throw new Error(`Labs: elemento obrigatório ausente: ${id}`);
}
const publicFiles = ['microprodutos/index.html','microprodutos/app.js','microprodutos/admin.js','microprodutos/styles.css'];
for (const file of publicFiles) {
  const text = fs.readFileSync(file,'utf8');
  if (/SUPABASE_SERVICE_ROLE_KEY|MERCADOPAGO_ACCESS_TOKEN|MERCADOPAGO_WEBHOOK_SECRET/.test(text)) {
    throw new Error(`Labs: nome de segredo privado exposto no frontend: ${file}`);
  }
}
const pkg = JSON.parse(fs.readFileSync('microprodutos/package.json','utf8'));
if (pkg.dependencies?.mercadopago !== '3.0.0') throw new Error('Labs: versão do SDK Mercado Pago divergente da versão validada.');
JSON.parse(fs.readFileSync('microprodutos/vercel.json','utf8'));
const schema = fs.readFileSync('microprodutos/supabase-admin-schema.sql','utf8');
for (const marker of ['wayne_financial_summary','request_wayne_withdrawal','pg_advisory_xact_lock']) {
  if (!schema.includes(marker)) throw new Error(`Labs: proteção financeira ausente: ${marker}`);
}
console.log('Validação estática concluída.');
