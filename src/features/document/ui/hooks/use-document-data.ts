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
import { getSimpleUsersList, getSystemSettings } from "@/app/actions/settings";
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
  const [enableAmssSync, setEnableAmssSync] = useState(true);
  const [enableCertificate, setEnableCertificate] = useState(true);
  const [documentManageMode, setDocumentManageMode] = useState<string>("DIRECT");
  const [docAdminUserIds, setDocAdminUserIds] = useState<string[]>([]);

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
        sysSettings,
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
        getSystemSettings().catch(() => null),
      ]);

      setSections((secs || []) as MemoSectionDTO[]);
      if (outStatsRes?.success && outStatsRes.data) {
        setOutboundStats(outStatsRes.data);
      }
      if (outListRes?.success && outListRes.data) {
        setOutboundDocs(outListRes.data as OutboundDocument[]);
      }
      setInboundDocs((inList || []) as IncomingDoc[]);
      setUsers(staff || []);
      if (trendRes?.success && trendRes.data) {
        setTrendData(trendRes.data as DocumentTrendData[]);
      }
      if (sysSettings) {
        if (typeof (sysSettings as any).enableAmssSync === "boolean") {
          setEnableAmssSync((sysSettings as any).enableAmssSync);
        }
        if (typeof (sysSettings as any).enableCertificate === "boolean") {
          setEnableCertificate((sysSettings as any).enableCertificate);
        }
        if (typeof (sysSettings as any).documentManageMode === "string") {
          setDocumentManageMode((sysSettings as any).documentManageMode || "DIRECT");
        }
        if (typeof (sysSettings as any).documentAdminUserIds === "string") {
          const ids = ((sysSettings as any).documentAdminUserIds || "").split(",").map((s: string) => s.trim()).filter(Boolean);
          setDocAdminUserIds(ids);
        }
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
    enableAmssSync,
    enableCertificate,
    documentManageMode,
    docAdminUserIds,
    loadData,
  };
}
