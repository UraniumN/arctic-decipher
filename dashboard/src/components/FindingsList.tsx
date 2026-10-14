import { ArrowRight } from "lucide-react";
import { CardHeader } from "./CardHeader";
import { findings, type Finding } from "../data";

type Props = { selected: string; onSelect: (id: string) => void };

export function FindingsList({ selected, onSelect }: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <CardHeader title="Findings">
        <span className="text-[11px] text-muted">{findings.length}</span>
      </CardHeader>

      <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {findings.map((f) => {
          const active = f.id === selected;
          return (
            <li key={f.id}>
              <button
                onClick={() => onSelect(f.id)}
                className={`w-full rounded-[18px] px-4 py-3 text-left transition-colors duration-150 ease-out ${
                  active ? "bg-raised" : "hover:bg-raised/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${f.kind === "edit" ? "bg-danger" : "bg-orange"}`} />
                  <span className="text-[13px] font-semibold">{title(f)}</span>
                  <span className="ml-auto font-mono text-[11px] text-muted">seq {f.after}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 pl-4 font-mono text-[11px] text-muted">
                  <span className="truncate">{f.between[0]}</span>
                  <ArrowRight size={11} className="shrink-0" />
                  <span className="truncate">{f.between[1]}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function title(f: Finding) {
  if (f.kind === "edit") return "Edited row";
  if (f.kind === "tail") return `Tail · ${f.missing} deleted`;
  return `Gap · ${f.missing} missing`;
}
