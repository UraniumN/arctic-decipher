import { User, ArrowRightLeft, Globe, Eye } from "lucide-react";
import { CardHeader } from "./CardHeader";
import { spans, timelineNodes, chainGap, suspects, type Action } from "../data";

const WINDOW = 30;
const ticks = [0, 5, 10, 15, 20, 25, 30];
const suspectIds = new Set(suspects.map((s) => s.id));

export function TimelineCard({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const pct = (m: number) => `${(m / WINDOW) * 100}%`;
  const total = spans.reduce((n, s) => n + s.events, 0);

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-surface p-6">
      <CardHeader title="Provenance timeline">
        <span className="text-[11px] text-muted">S1001 · 30 min window</span>
      </CardHeader>

      <div className="mt-6 flex min-h-0 flex-1">
        {/* Node labels */}
        <div className="flex w-[104px] shrink-0 flex-col pb-8">
          {timelineNodes.map((n) => (
            <div key={n} className="flex flex-1 items-center">
              <span
                className={`truncate font-mono text-[11px] ${
                  n === selected ? "font-medium text-lime" : suspectIds.has(n) ? "text-muted" : "text-ink"
                }`}
              >
                {n}
              </span>
            </div>
          ))}
        </div>

        {/* Plot */}
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-0 bottom-8">
            {/* Grid */}
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute inset-y-0 border-l border-dashed border-line"
                style={{ left: pct(t) }}
              />
            ))}

            {/* Chain gap */}
            <div
              className="absolute inset-y-0 rounded-md border border-dashed border-orange/70"
              style={{
                left: pct(chainGap.start),
                width: pct(chainGap.end - chainGap.start),
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(246,149,31,0.18) 0 4px, transparent 4px 9px)",
              }}
              title={`Chain gap after seq ${chainGap.after}: ${chainGap.missing} events missing`}
            />
            <div
              className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-orange"
              style={{ left: pct((chainGap.start + chainGap.end) / 2) }}
            >
              {chainGap.missing} missing
            </div>

            {/* Rows */}
            <div className="absolute inset-0 flex flex-col">
              {timelineNodes.map((node) => {
                const rowSpans = spans.filter((s) => s.node === node);
                const isSuspect = suspectIds.has(node);
                const dim = isSuspect && node !== selected;
                return (
                  <div key={node} className="relative flex-1">
                    {rowSpans.map((s) => {
                      const wide = s.end - s.start >= 5;
                      return (
                        <button
                          key={`${s.node}-${s.start}`}
                          disabled={!isSuspect}
                          onClick={() => isSuspect && onSelect(node)}
                          title={`${s.node} · ${s.action} · ${s.events} events`}
                          className={`absolute top-1/2 flex h-9 -translate-y-1/2 items-center justify-between rounded-full pl-1.5 pr-3 text-[11px] font-bold text-bg transition-opacity duration-150 ease-out disabled:cursor-default ${
                            barColor[s.action]
                          } ${dim ? "opacity-35 hover:opacity-70" : "opacity-100"}`}
                          style={{ left: pct(s.start), width: pct(s.end - s.start) }}
                        >
                          {wide && (
                            <>
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg text-ink">
                                <ActionIcon action={s.action} />
                              </span>
                              <span>{s.events}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Axis */}
          <div className="absolute inset-x-0 bottom-0 h-8">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute bottom-1 -translate-x-1/2 text-[11px] font-medium text-muted"
                style={{ left: pct(t) }}
              >
                {t === WINDOW ? "leak" : `${t}m`}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5 text-[12px] text-muted">
        <Legend className="bg-lime" label="Request" />
        <Legend className="bg-orange" label="Transfer" />
        <Legend className="bg-ink" label="Publish" />
        <span className="ml-auto">
          Total: <span className="font-semibold text-ink">{total}</span>
        </span>
      </div>
    </section>
  );
}

const barColor: Record<Action, string> = {
  request: "bg-lime",
  read: "bg-lime",
  transfer: "bg-orange",
  publish: "bg-ink",
};

function ActionIcon({ action }: { action: Action }) {
  if (action === "request") return <User size={12} strokeWidth={2.5} />;
  if (action === "read") return <Eye size={12} strokeWidth={2.5} />;
  if (action === "transfer") return <ArrowRightLeft size={12} strokeWidth={2.5} />;
  return <Globe size={12} strokeWidth={2.5} />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
