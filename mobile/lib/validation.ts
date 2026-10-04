export function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function assertStrongEnoughNewPassword(password: string) {
  if (password.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.');
  return password;
}

export function normalizeAIMessage(value: string, maxLength = 2000) {
  const normalized = value.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
  if (normalized.length < 3) throw new Error('Conte um pouco mais sobre o que você quer tornar possível.');
  if (normalized.length > maxLength) throw new Error(`A mensagem deve ter no máximo ${maxLength.toLocaleString('pt-BR')} caracteres.`);
  return normalized;
}
