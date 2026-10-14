import { CardHeader } from "./CardHeader";
import { eventRate, chainGap } from "../data";

interface Props {
  eventsCount?: number;
  missingCount?: number;
  missingAfter?: number;
  editedCount?: number;
}

export function ChainCard({
  eventsCount = 1284,
  missingCount,
  missingAfter,
  editedCount = 0,
}: Props) {
  const w = 300;
  const h = 64;
  const max = Math.max(...eventRate);
  const pts = eventRate.map((v, i) => [(i / (eventRate.length - 1)) * w, h - 4 - (v / max) * (h - 12)]);
  const line = (from: number, to: number) =>
    pts
      .slice(from, to + 1)
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");

  const missingVal = missingCount !== undefined ? String(missingCount) : String(chainGap.missing);
  const missingLabel =
    missingAfter !== undefined
      ? `Missing after seq ${missingAfter}`
      : missingCount !== undefined && missingCount === 0
      ? "Clean linear chain"
      : `Missing after seq ${chainGap.after}`;

  return (
    <section className="relative flex flex-col overflow-hidden rounded-[28px] bg-surface p-6 pb-0">
      <CardHeader title="Chain integrity">
        <span className="text-[11px] text-muted">
          {eventsCount.toLocaleString()} events
        </span>
      </CardHeader>

      <div className="mt-4 flex gap-8">
        <Metric
          tone={missingVal === "0" ? "lime" : "orange"}
          value={missingVal}
          label={missingLabel}
        />
        <Metric
          tone={editedCount === 0 ? "lime" : "orange"}
          value={String(editedCount)}
          label="Edited events"
        />
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="-mx-6 mt-auto h-12 w-[calc(100%+48px)]">
        <path d={line(0, 19)} fill="none" stroke="var(--color-lime)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <path
          d={line(19, 23)}
          fill="none"
          stroke={missingVal === "0" ? "var(--color-lime)" : "var(--color-orange)"}
          strokeWidth="1.6"
          strokeDasharray={missingVal === "0" ? undefined : "3 3"}
          vectorEffect="non-scaling-stroke"
        />
        <path d={line(23, eventRate.length - 1)} fill="none" stroke="var(--color-lime)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </section>
  );
}

function Metric({ tone, value, label }: { tone: "lime" | "orange"; value: string; label: string }) {
  return (
    <div>
      <svg width="10" height="8" viewBox="0 0 10 8" className={tone === "lime" ? "text-lime" : "text-orange"}>
        {tone === "lime" ? <path d="M5 0L10 8H0z" fill="currentColor" /> : <path d="M0 0H10L5 8z" fill="currentColor" />}
      </svg>
      <div className="mt-1.5 font-display text-[30px] font-semibold leading-none">{value}</div>
      <div className="mt-1.5 whitespace-nowrap text-[11px] text-muted">{label}</div>
    </div>
  );
}
