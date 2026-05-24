"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export function CycleSelect({ defaultValue = "all", showAll = false }: { defaultValue?: string, showAll?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const currentVal = searchParams.get("cycle") || defaultValue;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cycle", val);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={currentVal}
      onChange={handleChange}
      className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20"
    >
      {showAll && <option value="all">{t("allOptions")}</option>}
      <option value="current">{t("currentCycle")}</option>
      <option value="cycle1">{t("cycle1Label")}</option>
      <option value="cycle2">{t("cycle2Label")}</option>
      <option value="year">{t("fullYear")}</option>
    </select>
  );
}
