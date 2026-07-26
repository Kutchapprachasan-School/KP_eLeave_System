"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toBuddhistYear } from "@/features/document/domain/utils/thai-date";
import { OutboundDocument, IncomingDoc } from "@/features/document/domain/types/document.types";

export type ViewType = "issue" | "inbound" | "outbound_history" | "cert";
export type TabType = "outbound" | "inbound";

export function useDocumentFilters(
  outboundDocs: OutboundDocument[],
  inboundDocs: IncomingDoc[]
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read URL params as Single Source of Truth
  const paramView = (searchParams?.get("view") as ViewType) || "issue";
  const paramTab = (searchParams?.get("tab") as TabType) || "outbound";
  const searchQuery = searchParams?.get("q") || "";
  const selectedDocType = searchParams?.get("docType") || "";
  const selectedYearTable = searchParams?.get("year") || "";
  const selectedStatus = searchParams?.get("status") || "";

  const [selectedYear, setSelectedYear] = useState<number>(toBuddhistYear());

  // URL State Updater Helper supporting batch updates
  const setUrlParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const setNav = (newView: ViewType, newTab: TabType) => {
    setUrlParams({ view: newView, tab: newTab });
  };

  const setView = (newView: ViewType) => setUrlParams({ view: newView });
  const setActiveTab = (newTab: TabType) => setUrlParams({ tab: newTab });
  const setSearchQuery = (q: string) => setUrlParams({ q });
  const setSelectedDocType = (type: string) => setUrlParams({ docType: type });
  const setSelectedYearTable = (year: string) => setUrlParams({ year });
  const setSelectedStatus = (status: string) => setUrlParams({ status });

  const clearFilters = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const filteredOutboundDocs = useMemo(() => {
    return outboundDocs.filter(
      (d) => toBuddhistYear(d.date) === selectedYear
    );
  }, [outboundDocs, selectedYear]);

  const filteredInboundDocs = useMemo(() => {
    return inboundDocs.filter(
      (d) => toBuddhistYear(d.receiveDate) === selectedYear
    );
  }, [inboundDocs, selectedYear]);

  return {
    activeTab: paramTab,
    setActiveTab,
    view: paramView,
    setView,
    setNav,
    selectedYear,
    setSelectedYear,
    searchQuery,
    setSearchQuery,
    selectedDocType,
    setSelectedDocType,
    selectedYearTable,
    setSelectedYearTable,
    selectedStatus,
    setSelectedStatus,
    filteredOutboundDocs,
    filteredInboundDocs,
    clearFilters,
    isPending,
  };
}
