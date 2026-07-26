"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toBuddhistYear } from "@/features/document/domain/utils/thai-date";
import { OutboundDocument, IncomingDoc } from "@/features/document/domain/types/document.types";

export type ViewType = "issue" | "inbound" | "outbound_history" | "cert";
export type TabType = "outbound" | "inbound";

export function useDocumentFilters(
  outboundDocs: OutboundDocument[],
  inboundDocs: IncomingDoc[]
) {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>("outbound");
  const [view, setView] = useState<ViewType>("issue");
  const [selectedYear, setSelectedYear] = useState<number>(toBuddhistYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [selectedYearTable, setSelectedYearTable] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Sync state from URL Search Params
  const paramView = searchParams?.get("view") ?? null;
  const paramTab = searchParams?.get("tab") ?? null;
  const paramDocType = searchParams?.get("docType") ?? null;
  const paramStatus = searchParams?.get("status") ?? null;

  useEffect(() => {
    if (
      paramView === "inbound" ||
      paramView === "outbound_history" ||
      paramView === "issue" ||
      paramView === "cert"
    ) {
      setView(paramView as ViewType);
      if (paramView === "inbound") setActiveTab("inbound");
      if (paramView === "outbound_history") setActiveTab("outbound");
    } else if (paramView === "history") {
      if (paramTab === "inbound") {
        setView("inbound");
        setActiveTab("inbound");
      } else {
        setView("outbound_history");
        setActiveTab("outbound");
      }
    } else if (paramTab === "inbound") {
      setView("inbound");
      setActiveTab("inbound");
    }

    if (paramDocType !== null) {
      setSelectedDocType(paramDocType);
    }
    if (paramStatus !== null) {
      setSelectedStatus(paramStatus);
    }
  }, [paramView, paramTab, paramDocType, paramStatus]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDocType("");
    setSelectedYearTable("");
    setSelectedStatus("");
  };

  return {
    activeTab,
    setActiveTab,
    view,
    setView,
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
  };
}
