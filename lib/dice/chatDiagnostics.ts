export const CHAT_DIAGNOSTICS_STORAGE_KEY = '__r20ChatDiagnostics';

/** Measurement-only chat candidates are never user-facing in production. */
export function canEnableChatDiagnostics(
  nodeEnv: string | undefined,
  storedValue: string | null,
): boolean {
  return nodeEnv !== 'production' && storedValue === '1';
}
