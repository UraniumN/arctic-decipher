import { CardHeader } from "./CardHeader";
import { revealLog } from "../data";

export function RevealLog() {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <CardHeader title="Reveal history" />

      <ol className="mt-5 flex flex-col">
        {revealLog.map((r, i) => (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {i < revealLog.length - 1 && <span className="absolute left-[4px] top-4 h-full w-px bg-line" />}
            <span className={`mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full ${i === 0 ? "bg-orange" : "bg-line"}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold">{r.who}</span>
                <span className="ml-auto whitespace-nowrap text-[11px] text-muted">{r.when}</span>
              </div>
              <div className="mt-1 font-mono text-[12px] text-muted">{r.scope}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
