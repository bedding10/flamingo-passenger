export function createIdempotencyKey(scope: string): string {
  return `${scope}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`;
}
export const idempotencyHeaders = (key: string) => ({
  headers: { "Idempotency-Key": key },
});
