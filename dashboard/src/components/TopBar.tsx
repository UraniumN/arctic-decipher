import { ScanSearch, Link2, Lock, Search, type LucideIcon } from "lucide-react";
import type { NavView } from "./Rail";

interface Props {
  connected?: boolean;
  tracerHost?: string;
  activeView: NavView;
  onNavigate: (view: NavView) => void;
}

export function TopBar({
  connected = true,
  tracerHost = "localhost:8000",
  activeView,
  onNavigate,
}: Props) {
  const tabs: { id: NavView; icon: LucideIcon; label: string }[] = [
    { id: "investigate", icon: ScanSearch, label: "Investigate" },
    { id: "chain", icon: Link2, label: "Chain" },
    { id: "custodian", icon: Lock, label: "Custodian" },
  ];

  return (
    <header className="flex h-[92px] shrink-0 items-center gap-2">
      {tabs.map(({ id, icon: Icon, label }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
              active ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-raised"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        );
      })}
      <button
        onClick={() => onNavigate("events")}
        title="View event log"
        aria-label="Search events"
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
          activeView === "events" ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-raised"
        }`}
      >
        <Search size={17} />
      </button>
      <a
        href="/erp.html"
        className="flex h-11 items-center whitespace-nowrap rounded-full bg-surface px-5 text-[13px] font-semibold transition-colors duration-150 ease-out hover:bg-raised"
      >
        ERP Demo
      </a>

      <div className="ml-auto flex items-center gap-5">
        <div className="flex h-11 items-center gap-2.5 rounded-full bg-surface pl-4 pr-5 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-lime" : "bg-danger"
              }`}
            />
          </span>
          <span className="whitespace-nowrap text-[13px] font-medium">
            {connected ? "Tracer connected" : "Tracer offline"}
          </span>
          <span className="font-mono text-[11px] text-muted">{tracerHost}</span>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold">Investigator</div>
          <div className="text-[12px] text-muted">read + admin keys</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-raised font-display text-[15px] font-semibold">
          IN
        </div>
      </div>
    </header>
  );
}
