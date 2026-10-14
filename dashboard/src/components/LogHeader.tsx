import { Search } from "lucide-react";
import { actions, type Action } from "../data";

interface Props {
  action: Action | "all";
  onAction: (a: Action | "all") => void;
  search: string;
  onSearch: (s: string) => void;
}

export function LogHeader({ action, onAction, search, onSearch }: Props) {
  return (
    <div className="mb-5 flex shrink-0 items-end gap-2">
      <h1 className="font-display text-[40px] font-bold uppercase leading-none tracking-tight">Event log</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex h-11 items-center gap-1 rounded-full bg-surface p-1">
          {(["all", ...actions] as const).map((a) => (
            <button
              key={a}
              onClick={() => onAction(a)}
              className={`h-9 whitespace-nowrap rounded-full px-4 text-[12px] font-semibold capitalize transition-colors duration-150 ease-out ${
                action === a ? "bg-ink text-bg" : "text-muted hover:text-ink"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <label className="flex h-11 w-[240px] items-center gap-2 rounded-full bg-surface px-4 ring-lime/60 transition-shadow duration-150 ease-out focus-within:ring-2">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Actor, target or data ID"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>
    </div>
  );
}
