import { Fragment } from "react";
import { events, gaps, type Action } from "../data";

const cols = "grid-cols-[56px_72px_1fr_76px_1fr_64px_48px]";

interface Props {
  action: Action | "all";
  search?: string;
  selected: number;
  onSelect: (seq: number) => void;
}

export function EventTable({ action, search = "", selected, onSelect }: Props) {
  const query = search.trim().toLowerCase();
  const rows = events.filter((e) => {
    if (action !== "all" && e.action !== action) return false;
    if (!query) return true;
    return (
      e.actor.toLowerCase().includes(query) ||
      e.target.toLowerCase().includes(query) ||
      (e.dataId && e.dataId.toLowerCase().includes(query)) ||
      String(e.seq).includes(query)
    );
  });

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <div className={`grid ${cols} gap-3 px-4 pb-3 text-[11px] font-medium text-muted`}>
        <span>Seq</span>
        <span>Time</span>
        <span>Actor</span>
        <span>Action</span>
        <span>Target</span>
        <span>Data</span>
        <span className="text-right">Status</span>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted">
            No events match criteria
          </div>
        ) : (
          rows.map((e) => {
            const gap = gaps.find((g) => g.after + g.missing + 1 === e.seq);
            const active = e.seq === selected;
            return (
              <Fragment key={e.seq}>
                <li>
                  <button
                    onClick={() => onSelect(e.seq)}
                    className={`grid w-full ${cols} items-center gap-3 rounded-[14px] px-4 py-2.5 text-left font-mono text-[12px] transition-colors duration-150 ease-out ${
                      active ? "bg-raised" : "hover:bg-raised/60"
                    }`}
                  >
                    <span className="text-muted">{e.seq}</span>
                    <span className="text-muted">{e.time}</span>
                    <span className="truncate">{e.actor}</span>
                    <span className={e.action === "publish" ? "text-orange" : "text-muted"}>{e.action}</span>
                    <span className="truncate">{e.target}</span>
                    <span className="text-muted">{e.dataId ?? "—"}</span>
                    <span className={`text-right ${e.status >= 400 ? "text-danger" : "text-muted"}`}>{e.status}</span>
                  </button>
                </li>
                {gap && (
                  <li className="my-1 flex items-center gap-3 rounded-[14px] border border-dashed border-orange/60 px-4 py-2 font-mono text-[12px] text-orange">
                    <span>
                      {gap.after + 1}–{gap.after + gap.missing}
                    </span>
                    <span>missing</span>
                  </li>
                )}
              </Fragment>
            );
          })
        )}
      </ul>
    </section>
  );
}
