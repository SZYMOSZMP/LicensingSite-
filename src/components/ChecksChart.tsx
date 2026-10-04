/** Stacked bar chart of valid vs rejected license checks per day. Pure SVG, no client JS. */
export function ChecksChart({ data }: { data: { date: string; valid: number; rejected: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.valid + d.rejected));
  const W = 700;
  const H = 180;
  const pad = 24;
  const bw = (W - pad) / data.length;
  const total = data.reduce((a, d) => a + d.valid + d.rejected, 0);
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ok" /> Valid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-bad" /> Rejected
        </span>
        <span className="ml-auto">{total.toLocaleString()} checks</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="h-auto w-full" role="img" aria-label="License checks per day">
        <line x1={pad} x2={W} y1={H} y2={H} stroke="var(--color-line)" />
        <text x={0} y={10} fontSize="10" fill="var(--color-muted)">
          {max}
        </text>
        {data.map((d, i) => {
          const x = pad + i * bw + bw * 0.15;
          const w = bw * 0.7;
          const hv = ((H - 14) * d.valid) / max;
          const hr = ((H - 14) * d.rejected) / max;
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.valid} valid, ${d.rejected} rejected`}</title>
              {hv > 0 && <rect x={x} y={H - hv} width={w} height={hv} rx={2} fill="var(--color-ok)" opacity={0.85} />}
              {hr > 0 && <rect x={x} y={H - hv - hr} width={w} height={hr} rx={2} fill="var(--color-bad)" opacity={0.85} />}
              {(i % 2 === 0 || data.length <= 10) && (
                <text x={x + w / 2} y={H + 14} fontSize="10" textAnchor="middle" fill="var(--color-muted)">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
