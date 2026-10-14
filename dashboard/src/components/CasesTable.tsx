import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cases, type CaseStatus } from "../data";

interface Props {
  onSelectCase?: (dataId: string) => void;
}

export function CasesTable({ onSelectCase }: Props) {
  const [tab, setTab] = useState<CaseStatus>("open");
  const rows = cases.filter((c) => c.status === tab);

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-1 self-start rounded-full bg-bg p-1">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-8 whitespace-nowrap rounded-full px-4 text-[12px] font-semibold capitalize transition-colors duration-150 ease-out ${
              tab === t ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {t} · {cases.filter((c) => c.status === t).length}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[72px_120px_1fr_64px_88px_76px_16px] gap-3 px-4 pb-3 text-[11px] font-medium text-muted">
        <span>Data ID</span>
        <span>Exposure</span>
        <span>Top suspect</span>
        <span>Canary</span>
        <span>Chain</span>
        <span>Updated</span>
        <span />
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {rows.map((c) => (
          <li key={c.dataId}>
            <button
              onClick={() => onSelectCase?.(c.dataId)}
              className="group grid w-full grid-cols-[72px_120px_1fr_64px_88px_76px_16px] items-center gap-3 rounded-[18px] px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-raised"
            >
              <span className="font-display text-[20px] font-semibold leading-none">{c.dataId}</span>
              <span className="truncate font-mono text-[12px] text-muted">{c.exposure}</span>
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-[112px] shrink-0 truncate font-mono text-[12px]">{c.top}</span>
                <span className="relative h-1.5 flex-1 rounded-full bg-bg">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${c.p >= 0.5 ? "bg-orange" : "bg-ink"}`}
                    style={{ width: `${c.p * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right text-[12px] font-semibold">{Math.round(c.p * 100)}%</span>
              </span>
              <span className="text-[12px]">
                {c.canary ? (
                  <span className="rounded-full bg-lime px-2 py-0.5 font-semibold text-bg">Match</span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </span>
              <ChainStatus missing={c.missing} edited={c.edited} />
              <span className="whitespace-nowrap text-[12px] text-muted">{c.updated}</span>
              <ChevronRight size={16} className="text-muted transition-colors duration-150 ease-out group-hover:text-ink" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChainStatus({ missing, edited }: { missing: number; edited: number }) {
  if (edited > 0) return <span className="whitespace-nowrap text-[12px] font-semibold text-danger">{edited} edited</span>;
  if (missing > 0) return <span className="whitespace-nowrap text-[12px] font-semibold text-orange">{missing} missing</span>;
  return <span className="text-[12px] text-muted">Clean</span>;
}
