import { FolderOpen, ScrollText, ScanSearch, Settings, Plus } from "lucide-react";

export type NavView = "cases" | "events" | "investigate" | "chain" | "custodian";

const items: { id: NavView | "settings"; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string }[] = [
  { id: "cases", icon: FolderOpen, label: "Cases" },
  { id: "events", icon: ScrollText, label: "Event log" },
  { id: "investigate", icon: ScanSearch, label: "Investigate" },
  { id: "settings", icon: Settings, label: "Settings" },
];

interface Props {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenConfig: () => void;
  onNewCase?: () => void;
}

export function Rail({ activeView, onNavigate, onOpenConfig, onNewCase }: Props) {
  return (
    <aside className="flex w-[88px] shrink-0 flex-col items-center py-6">
      <div
        onClick={() => onNavigate("cases")}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-ink transition-transform active:scale-95"
        title="LeakTrace Home"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-label="LeakTrace">
          <path d="M6 4v16h12" stroke="#050505" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 4h7M15.5 4v10" stroke="#050505" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      <nav className="mt-[104px] flex flex-col gap-3">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive =
            id === activeView ||
            (id === "cases" && (activeView === "cases" || activeView === "chain" || activeView === "custodian"));

          return (
            <button
              key={label}
              title={label}
              aria-label={label}
              onClick={() => {
                if (id === "settings") {
                  onOpenConfig();
                } else {
                  onNavigate(id as NavView);
                }
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
                (id === activeView) ? "bg-lime text-bg" : "bg-surface text-ink hover:bg-raised"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => {
          if (onNewCase) {
            onNewCase();
          } else {
            onNavigate("cases");
          }
        }}
        title="New investigation case"
        aria-label="New investigation case"
        className="mt-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink transition-all duration-150 ease-out hover:bg-lime hover:text-bg active:scale-95"
      >
        <Plus size={20} />
      </button>
    </aside>
  );
}
