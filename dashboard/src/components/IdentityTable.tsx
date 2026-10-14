import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { identities as defaultIdentities, type Identity } from "../data";

const cols = "grid-cols-[150px_1fr_140px_180px]";

interface Props {
  revealed: boolean;
  custodianMap?: Record<string, string>;
  onSelectCase?: (caseId: string) => void;
}

export function IdentityTable({ revealed, custodianMap, onSelectCase }: Props) {
  const reduce = useReducedMotion();

  // If live custodianMap is available, augment real names
  const list: Identity[] = defaultIdentities.map((id) => ({
    ...id,
    real: custodianMap?.[id.pseudonym] || id.real,
  }));

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <div className={`grid ${cols} gap-4 px-4 pb-3 text-[11px] font-medium text-muted`}>
        <span>Pseudonym</span>
        <span>Identity</span>
        <span>Role</span>
        <span>Cases</span>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {list.map((p, i) => (
          <li key={p.pseudonym} className={`grid ${cols} items-center gap-4 rounded-[18px] bg-bg px-4 py-3`}>
            <span className="font-mono text-[12px]">{p.pseudonym}</span>

            <span className="relative h-5 overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                {revealed ? (
                  <motion.span
                    key="real"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.18, delay: reduce ? 0 : i * 0.03, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute inset-0 truncate text-[14px] font-semibold"
                  >
                    {p.real}
                  </motion.span>
                ) : (
                  <motion.span
                    key="mask"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="absolute inset-y-1 left-0 rounded-full bg-raised"
                    style={{ width: `${60 + (p.real.length % 5) * 14}px` }}
                  />
                )}
              </AnimatePresence>
            </span>

            <span className="text-[13px] text-muted">{p.role}</span>

            <span className="flex flex-wrap gap-1.5">
              {p.cases.length === 0 && <span className="text-[12px] text-muted">—</span>}
              {p.cases.map((c) => (
                <button
                  key={c}
                  onClick={() => onSelectCase?.(c)}
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium transition-transform duration-100 active:scale-95 ${
                    c === p.topIn ? "bg-orange text-bg" : "bg-raised text-ink hover:bg-line"
                  }`}
                >
                  {c}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2 text-[12px] text-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-orange" />
        Top suspect in case
      </div>
    </section>
  );
}
