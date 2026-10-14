import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Config, checkConnectivity } from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  onConfigChange: (c: Config) => void;
  onReverify?: () => void;
}

export function ConfigDrawer({ open, onClose, config, onConfigChange, onReverify }: Props) {
  const reduce = useReducedMotion();
  const ease = [0.23, 1, 0.32, 1] as const;

  const [form, setForm] = useState<Config>(config);
  const [status, setStatus] = useState<{ tracer: boolean; db: boolean; erp: boolean } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  useEffect(() => {
    if (open) {
      testHealth(form);
    }
  }, [open]);

  const testHealth = async (cfg: Config) => {
    setTesting(true);
    try {
      const res = await checkConnectivity(cfg);
      setStatus(res);
    } catch (e) {
      setStatus({ tracer: false, db: false, erp: false });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (key: keyof Config, val: string) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    onConfigChange(updated);
  };

  const handleReverify = async () => {
    await testHealth(form);
    if (onReverify) onReverify();
  };

  const allHealthy = status?.tracer && status?.db;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-3 right-3 z-50 flex w-[380px] flex-col rounded-[28px] bg-surface p-7 shadow-2xl"
            initial={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease }}
          >
            <div className="flex items-center">
              <h2 className="font-display text-[22px] font-semibold uppercase">Connection</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-raised transition-colors duration-150 ease-out hover:bg-line"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-[13px] text-muted">Keys and endpoints for this investigation.</p>

            <div className="mt-6 flex flex-col gap-4">
              <label className="block">
                <span className="text-[12px] font-medium text-muted">Tracer URL</span>
                <input
                  type="text"
                  value={form.tracerUrl}
                  onChange={(e) => handleChange("tracerUrl", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-full bg-bg px-4 font-mono text-[13px] text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-muted">ERP URL</span>
                <input
                  type="text"
                  value={form.erpUrl}
                  onChange={(e) => handleChange("erpUrl", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-full bg-bg px-4 font-mono text-[13px] text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-muted">Read key (x-read-key)</span>
                <input
                  type="password"
                  value={form.readKey}
                  onChange={(e) => handleChange("readKey", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-full bg-bg px-4 font-mono text-[13px] text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-muted">Admin key (x-admin-key)</span>
                <input
                  type="password"
                  value={form.adminKey}
                  onChange={(e) => handleChange("adminKey", e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-full bg-bg px-4 font-mono text-[13px] text-ink outline-none ring-lime/60 transition-shadow duration-150 ease-out focus:ring-2"
                />
                <span className="mt-1 block text-[11px] text-muted">Required for custodian identity reveal</span>
              </label>
            </div>

            <div className="mt-auto flex items-center gap-3 rounded-full bg-bg py-2 pl-4 pr-2">
              <span className={`h-2.5 w-2.5 rounded-full ${allHealthy ? "bg-lime" : "bg-danger"}`} />
              <span className="text-[12px] font-medium">
                {testing
                  ? "Checking..."
                  : allHealthy
                  ? "Tracer and database healthy"
                  : status?.tracer
                  ? "Tracer ok, check DB/keys"
                  : "Tracer offline (port 8000)"}
              </span>
              <button
                onClick={handleReverify}
                disabled={testing}
                className="ml-auto h-9 whitespace-nowrap rounded-full bg-lime px-4 text-[12px] font-semibold text-bg transition-colors duration-150 ease-out hover:bg-[#d2f77f] disabled:opacity-50"
              >
                Re-verify
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
