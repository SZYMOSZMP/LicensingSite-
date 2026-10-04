const g = globalThis as unknown as { __xklRate?: Map<string, { count: number; reset: number }> };
const buckets = (g.__xklRate ??= new Map());

/** Simple fixed-window limiter. Returns true when the caller should be blocked. */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return false;
  }
  b.count++;
  return b.count > limit;
}
