import { chain, findings } from "../data";

interface Props {
  eventsCount?: number;
  missingCount?: number;
  editedCount?: number;
}

export function SummaryCard({ eventsCount, missingCount, editedCount }: Props) {
  const missing = missingCount !== undefined ? missingCount : findings.reduce((n, f) => n + f.missing, 0);
  const edited = editedCount !== undefined ? editedCount : findings.filter((f) => f.kind === "edit").length;
  const eventsTotal = eventsCount !== undefined ? eventsCount : chain.events;
  const tail = findings.some((f) => f.kind === "tail");

  const isTampered = missing > 0 || edited > 0 || tail;

  return (
    <section className={`flex h-full flex-col rounded-[28px] p-6 text-bg shadow-sm ${isTampered ? "bg-orange" : "bg-lime"}`}>
      <h2 className="font-display text-[15px] font-semibold uppercase tracking-wide">
        {isTampered ? "Tampered" : "Verified clean"}
      </h2>
      <div className="mt-auto grid grid-cols-3 gap-4">
        <Metric value={eventsTotal.toLocaleString()} label="Events" />
        <Metric value={String(missing)} label="Missing" />
        <Metric value={String(edited)} label="Edited" />
      </div>
      {tail && <p className="mt-3 text-[12px] font-medium">Tail deletion at head</p>}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[34px] font-bold leading-none">{value}</div>
      <div className="mt-1.5 text-[11px] font-medium opacity-70">{label}</div>
    </div>
  );
}
