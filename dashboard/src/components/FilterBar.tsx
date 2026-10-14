import { ChevronDown, SlidersHorizontal, Loader2 } from "lucide-react";

interface Props {
  onOpenConfig: () => void;
  onRerun?: () => void;
  loading?: boolean;
  dataId?: string;
  exposure?: string;
  suspectCount?: number;
}

export function FilterBar({
  onOpenConfig,
  onRerun,
  loading = false,
  dataId = "S1001",
  exposure = "public_bucket",
  suspectCount = 4,
}: Props) {
  const filters = [
    { label: "Data ID", value: dataId },
    { label: "Exposure", value: exposure },
  ];

  return (
    <div className="mb-5 flex shrink-0 items-center gap-2">
      <div>
        <h1 className="font-display text-[40px] font-bold uppercase leading-none tracking-tight">
          Leak {dataId}
        </h1>
        <p className="mt-2 text-[13px] text-muted">
          {suspectCount} suspects ranked · live investigation
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-5 text-[13px] transition-colors duration-150 ease-out hover:bg-raised"
          >
            <span className="text-muted">{f.label}:</span>
            <span className="font-semibold">{f.value}</span>
            <ChevronDown size={15} className="text-muted" />
          </button>
        ))}
        <button
          onClick={onRerun}
          disabled={loading}
          className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-lime px-5 text-[13px] font-semibold text-bg transition-colors duration-150 ease-out hover:bg-[#d2f77f] disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Investigating..." : "Re-run investigation"}
        </button>
        <button
          onClick={onOpenConfig}
          aria-label="Connection settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface transition-colors duration-150 ease-out hover:bg-raised"
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
    </div>
  );
}
