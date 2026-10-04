export function formatDate(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "Never";
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatDateTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function timeAgo(ms: number | null | undefined): string {
  if (!ms) return "never";
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** yyyy-mm-dd for <input type="date">, or "" when there is no date. */
export function dateInputValue(ms: number | null | undefined): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "";
}
