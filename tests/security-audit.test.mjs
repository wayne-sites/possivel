import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../mobile/scripts/security-audit.mjs', import.meta.url));
const clean = { vulnerabilities: {}, metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } } };

function auditResult(report, status = 0) {
  const dir = mkdtempSync(path.join(tmpdir(), 'possivel-audit-'));
  try {
    const output = typeof report === 'string' ? report : JSON.stringify(report);
    writeFileSync(path.join(dir, 'npm'), `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(output)}); process.exit(${status});\n`, { mode: 0o700 });
    return spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, PATH: dir + path.delimiter + process.env.PATH } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('audit approves an actual clean report', () => assert.equal(auditResult(clean).status, 0));
test('audit rejects npm errors, empty/malformed output and abnormal exits', () => {
  for (const [report, status] of [[{ error: { code: 'ENOTFOUND' } }, 1], [{}, 0], ['', 0], ['not json', 1], [clean, 2]]) {
    const result = auditResult(report, status);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /Gate de segurança aprovado/);
  }
});
test('audit still blocks critical and unknown high advisories', () => {
  for (const severity of ['critical', 'high']) {
    const report = structuredClone(clean);
    report.metadata.vulnerabilities[severity] = 1;
    report.vulnerabilities.example = { severity, via: [{ severity, url: 'https://example.invalid/GHSA-aaaa-bbbb-cccc' }] };
    assert.equal(auditResult(report, 1).status, 1);
  }
});
