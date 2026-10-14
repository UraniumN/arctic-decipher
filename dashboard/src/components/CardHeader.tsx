import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export function CardHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-display text-[15px] font-semibold uppercase tracking-wide">{title}</h2>
      <div className="ml-auto flex items-center gap-3">
        {children}
        <button
          aria-label={`${title} options`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-raised hover:text-ink"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
