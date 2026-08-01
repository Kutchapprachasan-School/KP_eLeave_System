"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, Sparkles } from "lucide-react";

export interface ComboboxOption {
  label: string;
  value: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onSelect: (val: string) => void;
  placeholder?: string;
  triggerLabel?: string;
}

export function SearchableCombobox({
  options,
  value,
  onSelect,
  placeholder = "พิมพ์เพื่อค้นหา...",
  triggerLabel = "✨ เลือกจากรายการใช้บ่อย",
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation handler with preventDefault on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault(); // Prevents accidental form submission!
      if (filteredOptions[selectedIndex]) {
        onSelect(filteredOptions[selectedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span>{triggerLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={placeholder}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-slate-50 dark:divide-slate-800/40">
            {filteredOptions.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3">
                ไม่พบรายการ
              </p>
            ) : (
              filteredOptions.map((opt, idx) => (
                <button
                  key={opt.value + idx}
                  type="button"
                  onClick={() => {
                    onSelect(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    idx === selectedIndex
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
