import { spawnSync } from 'node:child_process';

const knownUpstream = new Map([
  ['GHSA-w3rx-r6r6-pgpr', 'image-size / Metro: parser ICNS pode entrar em loop; sem versão corrigida disponível no momento.'],
  ['GHSA-5p2g-fcmc-qvqq', 'image-size / Metro: parsers JXL/HEIF podem entrar em loop; sem versão corrigida disponível no momento.'],
  ['GHSA-w5hq-g745-h8pq', 'uuid transitivo do tooling de build Expo/xcode; severidade moderada.'],
]);

const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(audit.stdout || '{}');
} catch (error) {
  console.error('Não foi possível interpretar o resultado do npm audit.');
  console.error(audit.stderr || error);
  process.exit(1);
}

if (audit.error || audit.signal || ![0, 1].includes(audit.status) || !report ||
    report.error || typeof report.vulnerabilities !== 'object' || !report.vulnerabilities ||
    Array.isArray(report.vulnerabilities) || !report.metadata?.vulnerabilities ||
    !['critical', 'high', 'moderate', 'low'].every((key) =>
      Number.isInteger(report.metadata.vulnerabilities[key]) && report.metadata.vulnerabilities[key] >= 0)) {
  console.error('Auditoria indisponível ou resposta inválida do npm. Gate bloqueado; não há confirmação de segurança.');
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities;
const advisoryFromUrl = (url = '') => String(url).match(/GHSA-[A-Za-z0-9-]+/)?.[0] || null;
const advisories = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  for (const via of vulnerability?.via || []) {
    if (typeof via === 'string') continue;
    advisories.push({
      id: advisoryFromUrl(via?.url),
      severity: via?.severity || vulnerability?.severity || 'unknown',
      packageName,
      title: via?.title || '',
      url: via?.url || '',
    });
  }
}

const criticalPackages = Object.entries(vulnerabilities)
  .filter(([, item]) => item?.severity === 'critical')
  .map(([name]) => name);

if (criticalPackages.length) {
  console.error(`Auditoria bloqueada: vulnerabilidade crítica em ${criticalPackages.join(', ')}.`);
  process.exit(1);
}

const highAdvisories = advisories.filter((item) => item.severity === 'high');
const unexpectedHigh = highAdvisories.filter((item) => !item.id || !knownUpstream.has(item.id));
const reportedHighCount = Number(report.metadata?.vulnerabilities?.high ?? 0);

if (unexpectedHigh.length || (reportedHighCount > 0 && highAdvisories.length === 0)) {
  console.error('Auditoria bloqueada: surgiu vulnerabilidade alta não aprovada pela política temporária.');
  for (const item of unexpectedHigh) {
    console.error(`- ${item.id || 'advisory-sem-id'} · ${item.packageName}${item.title ? ` · ${item.title}` : ''}`);
  }
  if (reportedHighCount > 0 && highAdvisories.length === 0) {
    console.error('- O npm reportou vulnerabilidades altas, mas nenhum advisory raiz pôde ser identificado.');
  }
  process.exit(1);
}

const observedIds = new Set(
  advisories.map((item) => item.id).filter((id) => id && knownUpstream.has(id)),
);

if (observedIds.size) {
  console.warn('Avisos upstream conhecidos no tooling de build (monitorados, não ignorados silenciosamente):');
  for (const id of observedIds) console.warn(`- ${id}: ${knownUpstream.get(id)}`);
}

const counts = report.metadata?.vulnerabilities || {};
console.log(`npm audit: critical=${counts.critical ?? 0}, high=${counts.high ?? 0}, moderate=${counts.moderate ?? 0}, low=${counts.low ?? 0}`);
console.log('Gate de segurança aprovado: nenhuma vulnerabilidade crítica e nenhuma vulnerabilidade alta nova fora da lista upstream documentada.');
