import { RefreshCw } from "lucide-react";
import { chain } from "../data";

interface Props {
  verifiedAt?: string;
  onVerify?: () => void;
  verifying?: boolean;
}

export function ChainHeader({ verifiedAt = chain.verified, onVerify, verifying }: Props) {
  return (
    <div className="mb-5 flex shrink-0 items-end gap-2">
      <div>
        <h1 className="font-display text-[40px] font-bold uppercase leading-none tracking-tight">Chain</h1>
        <p className="mt-2 text-[13px] text-muted">Verified {verifiedAt}</p>
      </div>
      <button
        onClick={onVerify}
        disabled={verifying}
        className="ml-auto flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-lime px-5 text-[13px] font-semibold text-bg transition-colors duration-150 ease-out hover:bg-[#d2f77f] disabled:opacity-50"
      >
        <RefreshCw size={15} className={verifying ? "animate-spin" : ""} />
        {verifying ? "Verifying…" : "Verify"}
      </button>
    </div>
  );
}
