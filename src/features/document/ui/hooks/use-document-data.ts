"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDashboardStats,
  getDocumentsList,
  getDocumentTrendStats,
} from "@/app/actions/document";
import { getMemoSections } from "@/app/actions/document-settings";
import {
  getIncomingDocsList,
  getAMSSCredentials,
} from "@/app/actions/incoming";
import { getSimpleUsersList } from "@/app/actions/settings";
import {
  MemoSectionDTO,
  OutboundDocument,
  IncomingDoc,
  DashboardStats,
  DocumentTrendData,
} from "@/features/document/domain/types/document.types";

export function useDocumentData() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<MemoSectionDTO[]>([]);
  const [outboundDocs, setOutboundDocs] = useState<OutboundDocument[]>([]);
  const [inboundDocs, setInboundDocs] = useState<IncomingDoc[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [outboundStats, setOutboundStats] = useState<DashboardStats>({
    DRAFT: 0,
    ISSUED: 0,
    PRINTED: 0,
    CANCELLED: 0,
  });
  const [trendData, setTrendData] = useState<DocumentTrendData[]>([]);
  const [amssCredsExist, setAmssCredsExist] = useState<boolean | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        secs,
        outStatsRes,
        outListRes,
        inList,
        staff,
        amssCreds,
        trendRes,
      ] = await Promise.all([
        getMemoSections().catch(() => []),
        getDashboardStats().catch(() => ({
          success: false,
          data: { DRAFT: 0, ISSUED: 0, PRINTED: 0, CANCELLED: 0 },
        })),
        getDocumentsList({}).catch(() => ({ success: false, data: [] })),
        getIncomingDocsList({}).catch(() => []),
        getSimpleUsersList().catch(() => []),
        getAMSSCredentials().catch(() => ({ success: false, data: null })),
        getDocumentTrendStats().catch(() => ({ success: false, data: [] })),
      ]);

      setSections((secs || []) as MemoSectionDTO[]);
      if (outStatsRes?.success && outStatsRes.data) {
        setOutboundStats(outStatsRes.data);
      }
      if (outListRes?.success && Array.isArray(outListRes.data)) {
        setOutboundDocs(outListRes.data as OutboundDocument[]);
      } else if (Array.isArray(outListRes)) {
        setOutboundDocs(outListRes as OutboundDocument[]);
      }
      setInboundDocs((inList || []) as IncomingDoc[]);
      setUsers(staff || []);
      if (trendRes?.success && trendRes.data) {
        setTrendData(trendRes.data as DocumentTrendData[]);
      }

      if (amssCreds?.success && amssCreds.data) {
        setAmssCredsExist(true);
        setLastSyncAt(
          amssCreds.data.lastSyncAt ? new Date(amssCreds.data.lastSyncAt) : null
        );
      } else {
        setAmssCredsExist(false);
        setLastSyncAt(null);
      }
    } catch (err) {
      console.error("useDocumentData loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    sections,
    outboundDocs,
    inboundDocs,
    users,
    outboundStats,
    trendData,
    amssCredsExist,
    lastSyncAt,
    loadData,
  };
}
