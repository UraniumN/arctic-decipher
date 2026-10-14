import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CardHeader } from "./CardHeader";
import { contextFor, type Finding } from "../data";

const cols = "grid-cols-[64px_128px_80px_128px_64px_1fr]";

export function ContextRows({ finding }: { finding: Finding }) {
  const reduce = useReducedMotion();
  const rows = contextFor(finding);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <CardHeader title={`Around seq ${finding.after}`} />

      <div className={`mt-4 grid ${cols} gap-3 px-4 pb-2 text-[11px] font-medium text-muted`}>
        <span>Seq</span>
        <span>Actor</span>
        <span>Action</span>
        <span>Target</span>
        <span>Data</span>
        <span>Hash</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={finding.id}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
        >
          {rows.map((r) =>
            r.state === "missing" ? (
              <li
                key={r.seq}
                className={`grid ${cols} items-center gap-3 rounded-[14px] border border-dashed border-orange/60 px-4 py-2.5 font-mono text-[12px] text-orange`}
              >
                <span>{r.seq}</span>
                <span className="col-span-5">missing</span>
              </li>
            ) : (
              <li
                key={r.seq}
                className={`grid ${cols} items-center gap-3 rounded-[14px] px-4 py-2.5 font-mono text-[12px] ${
                  r.state === "edited" ? "bg-danger/15 text-ink" : "bg-bg"
                }`}
              >
                <span className={r.state === "edited" ? "font-semibold text-danger" : "text-muted"}>{r.seq}</span>
                <span className="truncate">{r.actor}</span>
                <span className="text-muted">{r.action}</span>
                <span className="truncate">{r.target}</span>
                <span className="text-muted">{r.dataId}</span>
                <span className={r.state === "edited" ? "text-danger" : "text-muted"}>
                  {r.hash}…{r.state === "edited" && " mismatch"}
                </span>
              </li>
            )
          )}
        </motion.ul>
      </AnimatePresence>
    </section>
  );
}
