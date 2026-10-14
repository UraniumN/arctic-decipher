import { useState } from "react";

interface Props {
  onInvestigate?: (dataId: string, exposure: string, text: string) => void;
}

export function NewCaseCard({ onInvestigate }: Props) {
  const [dataId, setDataId] = useState("S1001");
  const [exposure, setExposure] = useState("public_bucket");
  const [text, setText] = useState('{"id":"S1001","note_ref":"tok_ab12cd"}');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvestigate?.(dataId.trim() || "S1001", exposure.trim() || "public_bucket", text);
  };

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-surface p-6 shadow-sm">
      <h2 className="font-display text-[15px] font-semibold uppercase tracking-wide">New case</h2>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col gap-4">
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Data ID</span>
          <input
            value={dataId}
            onChange={(e) => setDataId(e.target.value)}
            placeholder="S1001"
            className="mt-2 h-11 w-full rounded-full bg-bg px-4 font-mono text-[13px] text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out placeholder:text-muted/60 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-medium text-muted">Exposure node</span>
          <input
            value={exposure}
            onChange={(e) => setExposure(e.target.value)}
            placeholder="public_bucket"
            className="mt-2 h-11 w-full rounded-full bg-bg px-4 font-mono text-[13px] text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out placeholder:text-muted/60 focus:ring-2"
          />
        </label>

        <label className="flex flex-1 flex-col">
          <span className="text-[12px] font-medium text-muted">Leaked text</span>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"id":"S1001","note_ref":"tok_…"}'
            className="mt-2 min-h-[110px] flex-1 resize-none rounded-[18px] bg-bg px-4 py-3 font-mono text-[12px] leading-relaxed text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out placeholder:text-muted/60 focus:ring-2"
          />
        </label>

        <button
          type="submit"
          className="mt-auto h-11 w-full whitespace-nowrap rounded-full bg-lime text-[13px] font-semibold text-bg transition-colors duration-150 ease-out hover:bg-[#d2f77f]"
        >
          Investigate
        </button>
      </form>
    </section>
  );
}
