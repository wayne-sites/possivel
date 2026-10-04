export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function extFrom(uri: string, mime?: string | null) {
  const raw = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (raw && /^[a-z0-9]{2,5}$/.test(raw)) return raw;
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  if (mime?.includes('video')) return 'mp4';
  return 'jpg';
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message: unknown }).message);
  return 'Ocorreu um erro inesperado.';
}
