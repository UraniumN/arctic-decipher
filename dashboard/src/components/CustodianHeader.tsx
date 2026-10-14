import { Lock, Unlock } from "lucide-react";
import { identities } from "../data";

type Props = { revealed: boolean; onToggle: () => void };

export function CustodianHeader({ revealed, onToggle }: Props) {
  return (
    <div className="mb-5 flex shrink-0 items-end gap-2">
      <div>
        <h1 className="font-display text-[40px] font-bold uppercase leading-none tracking-tight">Custodian</h1>
        <p className="mt-2 text-[13px] text-muted">{identities.length} pseudonyms · admin key required</p>
      </div>
      <button
        onClick={onToggle}
        className={`ml-auto flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
          revealed ? "bg-surface text-ink hover:bg-raised" : "bg-orange text-bg hover:bg-[#f8a640]"
        }`}
      >
        {revealed ? <Lock size={15} /> : <Unlock size={15} />}
        {revealed ? "Hide identities" : "Reveal identities"}
      </button>
    </div>
  );
}
