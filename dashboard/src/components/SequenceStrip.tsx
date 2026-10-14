import { CardHeader } from "./CardHeader";
import { chain, findings } from "../data";

type Props = { selected: string; onSelect: (id: string) => void };

export function SequenceStrip({ selected, onSelect }: Props) {
  const pct = (seq: number) => (seq / chain.headSeq) * 100;

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <CardHeader title="Sequence">
        <span className="font-mono text-[11px] text-muted">1 – {chain.headSeq.toLocaleString()}</span>
      </CardHeader>

      <div className="relative mt-auto h-14">
        {/* Event ticks */}
        <div
          className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-full bg-raised"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-line) 0 1px, transparent 1px 6px)",
          }}
        />
        {findings.map((f) => {
          const active = f.id === selected;
          const tone = f.kind === "edit" ? "bg-danger" : "bg-orange";
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              aria-label={`${f.kind} at seq ${f.after}`}
              className="absolute top-0 flex h-full w-5 -translate-x-1/2 justify-center"
              style={{ left: `${Math.min(pct(f.after), 99)}%` }}
            >
              <span
                className={`block w-1.5 rounded-full transition-[height,transform] duration-150 ease-out ${tone} ${
                  active ? "h-full" : "mt-2 h-10"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="relative mt-3 h-4 font-mono text-[11px] text-muted">
        {findings.map((f) => (
          <span
            key={f.id}
            className={`absolute -translate-x-1/2 whitespace-nowrap transition-colors duration-150 ease-out ${
              f.id === selected ? "text-ink font-semibold" : ""
            }`}
            style={{ left: `${Math.min(pct(f.after), 97)}%` }}
          >
            {f.after}
          </span>
        ))}
      </div>
    </section>
  );
}
