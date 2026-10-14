import { CardHeader } from "./CardHeader";
import { leakedFields, canaryField } from "../data";

interface Props {
  canary?: { token: string; owner: string } | null;
}

export function CanaryCard({ canary }: Props) {
  const hasCanary = canary !== undefined ? canary !== null : true;
  const token = canary?.token ? `${canary.token}@trap.test` : "tok_ab12cd@trap.test";
  const owner = canary?.owner || "p_a3f9c2d1e4";

  return (
    <section className="flex flex-col overflow-hidden rounded-[28px] bg-surface p-6">
      <CardHeader title="Canary token">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            hasCanary ? "bg-lime text-bg" : "bg-raised text-muted"
          }`}
        >
          {hasCanary ? "Matched" : "No match"}
        </span>
      </CardHeader>

      <div className="mt-4">
        <div className="font-mono text-[15px] font-medium text-ink">{token}</div>
        <div className="mt-1.5 text-[12px] text-muted">
          {hasCanary ? (
            <>
              Planted for <span className="font-mono text-ink">{owner}</span>
            </>
          ) : (
            "No registered token identified in leaked payload"
          )}
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex flex-wrap gap-[7px]" aria-label={`${leakedFields.length} fields scanned`}>
          {leakedFields.map((f) => (
            <span
              key={f}
              title={f}
              className={`h-2.5 w-2.5 rounded-full ${
                hasCanary && f === canaryField ? "bg-lime" : "bg-raised"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-[11px] text-muted">
          {leakedFields.length} leaked fields scanned · {hasCanary ? `hit in ${canaryField}` : "all clear"}
        </div>
      </div>
    </section>
  );
}
