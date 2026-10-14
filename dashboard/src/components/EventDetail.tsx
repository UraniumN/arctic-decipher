import { ArrowRight } from "lucide-react";
import { CardHeader } from "./CardHeader";
import type { LogEvent } from "../data";

export function EventDetail({ event }: { event: LogEvent }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <CardHeader title={`Seq ${event.seq}`} />

      <div className="mt-6 flex items-center gap-3 font-mono text-[13px]">
        <span className="truncate">{event.actor}</span>
        <ArrowRight size={14} className="shrink-0 text-muted" />
        <span className="truncate">{event.target}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${event.action === "publish" ? "bg-orange text-bg" : "bg-raised"}`}>
          {event.action}
        </span>
        <span className="text-muted">{event.time}</span>
      </div>

      <dl className="mt-6 flex flex-col gap-4 border-t border-line pt-5">
        <Item label="Data ID" value={event.dataId ?? "—"} />
        <Item label="Status" value={String(event.status)} tone={event.status >= 400 ? "text-danger" : undefined} />
        <Item label="Event ID" value={event.eventId} />
        <Item label="Prev hash" value={event.prevHash} />
        <Item label="Hash" value={event.hash} />
      </dl>
    </section>
  );
}

function Item({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className={`mt-1 break-all font-mono text-[12px] leading-relaxed ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}
