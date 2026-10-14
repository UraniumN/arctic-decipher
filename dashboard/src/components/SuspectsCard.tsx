import { Lock, Unlock } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CardHeader } from "./CardHeader";
import { suspects as defaultSuspects, Suspect } from "../data";

type Props = {
  suspectsList?: Suspect[];
  selected: string;
  onSelect: (id: string) => void;
  revealed: boolean;
  onReveal: () => void;
  custodianMap?: Record<string, string>;
};

export function SuspectsCard({
  suspectsList = defaultSuspects,
  selected,
  onSelect,
  revealed,
  onReveal,
  custodianMap,
}: Props) {
  const reduce = useReducedMotion();
  const list = suspectsList.length > 0 ? suspectsList : defaultSuspects;
  const current = list.find((s) => s.id === selected) ?? list[0];
  const rank = list.indexOf(current) + 1;

  const getDisplayName = (s: Suspect) => {
    if (!revealed) return s.id;
    if (custodianMap && custodianMap[s.id]) return custodianMap[s.id];
    return s.real || s.id;
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <div className="shrink-0">
        <CardHeader title="Suspect ranking">
          <button
            onClick={onReveal}
            className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12px] font-semibold transition-colors duration-150 ease-out ${
              revealed ? "bg-orange text-bg" : "bg-raised text-ink hover:bg-line"
            }`}
          >
            {revealed ? <Unlock size={13} /> : <Lock size={13} />}
            {revealed ? "Identities revealed" : "Custodian reveal"}
          </button>
        </CardHeader>
      </div>

      {/* Selected suspect */}
      <div className="mt-4 flex shrink-0 items-end gap-6 border-b border-line pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="flex min-w-0 flex-1 items-end gap-6"
          >
            <div className="font-display text-[64px] font-bold leading-[0.85] tracking-tight">
              {(current.p * 100).toFixed(1)}
              <span className="text-[32px] text-muted">%</span>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    rank === 1 ? "bg-orange text-bg" : "bg-raised text-ink"
                  }`}
                >
                  #{rank} {rank === 1 ? "Primary suspect" : "Suspect"}
                </span>
                <span className="truncate text-[15px] font-semibold">
                  {revealed ? (
                    getDisplayName(current)
                  ) : (
                    <span className="font-mono">{current.id}</span>
                  )}
                </span>
                {revealed && <span className="font-mono text-[11px] text-muted">{current.id}</span>}
              </div>
              <p className="mt-2 text-[13px] leading-snug text-muted">{current.why}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ranking */}
      <ol className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {list.map((s, i) => {
          const active = s.id === selected;
          return (
            <li key={s.id} className="shrink-0">
              <button
                onClick={() => onSelect(s.id)}
                className={`grid w-full grid-cols-[28px_170px_1fr] items-center gap-3 rounded-full py-1.5 pl-3 pr-1.5 text-left transition-colors duration-150 ease-out ${
                  active ? "bg-raised" : "hover:bg-raised/60"
                }`}
              >
                <span className="font-display text-[14px] font-semibold text-muted">{i + 1}</span>
                <span className="truncate text-[13px] font-medium">
                  {revealed ? getDisplayName(s) : <span className="font-mono">{s.id}</span>}
                </span>
                <span className="relative h-8 rounded-full bg-bg">
                  <span
                    className={`absolute inset-y-0 left-0 flex items-center justify-end rounded-full pr-3 text-[12px] font-bold text-bg transition-colors duration-150 ease-out ${
                      active ? "bg-lime" : i === 0 ? "bg-orange" : "bg-ink"
                    }`}
                    style={{ width: `max(56px, ${s.p * 100}%)` }}
                  >
                    {(s.p * 100).toFixed(1)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex shrink-0 items-center gap-5 text-[12px] text-muted">
        <Legend className="bg-lime" label="Selected" />
        <Legend className="bg-orange" label="Primary" />
        <Legend className="bg-ink" label="Other" />
        <span className="ml-auto">Ranked heuristics, not calibrated probabilities</span>
      </div>
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
