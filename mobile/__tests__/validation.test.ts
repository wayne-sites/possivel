import { describe, expect, it } from 'vitest';
import { assertStrongEnoughNewPassword, normalizeAIMessage, normalizeHandle } from '../lib/validation';

describe('validações críticas do Possível', () => {
  it('normaliza @usuário sem caracteres perigosos ou espaços', () => {
    expect(normalizeHandle('  Meu.User-01!  ')).toBe('meuuser01');
    expect(normalizeHandle('nome_valido')).toBe('nome_valido');
  });

  it('exige pelo menos 8 caracteres em novas senhas', () => {
    expect(() => assertStrongEnoughNewPassword('1234567')).toThrow(/8 caracteres/);
    expect(assertStrongEnoughNewPassword('12345678')).toBe('12345678');
  });

  it('normaliza prompts e bloqueia entradas vazias ou grandes demais', () => {
    expect(normalizeAIMessage('  quero\n  criar   algo  ')).toBe('quero criar algo');
    expect(() => normalizeAIMessage('a')).toThrow(/Conte um pouco mais/);
    expect(() => normalizeAIMessage('123456', 5)).toThrow(/no máximo 5 caracteres/);
  });
});
