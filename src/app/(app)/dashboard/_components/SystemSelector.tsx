"use client";
import { useState, useRef, useEffect } from "react";
import { CalendarDays, Wrench, ChevronDown } from "lucide-react";

export type SystemOption = { id: string; label: string; icon: "CalendarDays" | "Wrench" };
const ICONS: Record<string, React.ReactNode> = {
  CalendarDays: <CalendarDays className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
};

export default function SystemSelector({
  available,
  selected,
  onChange,
}: {
  available: SystemOption[];
  selected: string;
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = available.find((s) => s.id === selected) ?? available[0];
  if (!current || available.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-white hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm"
      >
        {ICONS[current.icon]}
        {current.label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-20">
          {available.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={`w-full text-left flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors ${
                s.id === selected
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {ICONS[s.icon]}
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
