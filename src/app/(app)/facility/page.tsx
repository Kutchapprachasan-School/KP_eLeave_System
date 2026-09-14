"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Building, 
  Bus, 
  Calendar, 
  FileText, 
  History, 
  ShieldCheck, 
  Settings, 
  Plus,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { SubsystemHeader, PRIMARY_ACTION_BUTTON_CLASSES } from "@/components/shared-ui/school-ops";
import {
  getFacilityResourcesAction,
  getFacilityReservationsAction,
  getDriverProfilesAction,
  getCurrentFacilityUserRoleAction
} from "@/app/actions/facility";

import FacilityBookingForm from "./_components/FacilityBookingForm";
import FacilityUnifiedCalendar from "./_components/FacilityUnifiedCalendar";
import FacilityHistoryView from "./_components/FacilityHistoryView";
import FacilityApprovalView from "./_components/FacilityApprovalView";
import FacilityManagementView from "./_components/FacilityManagementView";
import { type FacilityView } from "./_components/facility-shared";

function FacilityPortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  // Active View from Query Param (Default is "request" as per Golden Rule)
  const currentView: FacilityView = (searchParams.get("view") as FacilityView) || "request";

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [userRoleInfo, setUserRoleInfo] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resList, allBookings, myBookings, driverList, roleInfo] = await Promise.all([
        getFacilityResourcesAction().catch(() => []),
        getFacilityReservationsAction().catch(() => []),
        getFacilityReservationsAction({ onlyMine: true }).catch(() => []),
        getDriverProfilesAction().catch(() => []),
        getCurrentFacilityUserRoleAction().catch(() => null)
      ]);

      setResources(resList || []);
      setReservations(allBookings || []);
      setMyReservations(myBookings || []);
      setDrivers(driverList || []);
      setUserRoleInfo(roleInfo);
    } catch (err: any) {
      console.error("Failed to load facility data:", err);
      showToast("error", "ไม่สามารถดึงข้อมูลระบบได้: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateToView = (view: FacilityView) => {
    router.push(`?view=${view}`);
  };

  const isPrivileged = userRoleInfo?.canManage || userRoleInfo?.isAdmin || userRoleInfo?.isDirector || false;
  const pendingApprovalsCount = reservations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 md:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto font-sans">
      
      {/* Subsystem Header */}
      <SubsystemHeader
        title="ระบบจองห้องประชุมและยานพาหนะโรงเรียน"
        subtitle="ระบบบริการจองทรัพยากรส่วนกลางออนไลน์ สะดวก รวดเร็ว พร้อมตรวจสอบคิวว่างทันที"
        categoryTitle="ระบบบริหารทรัพยากรสถานศึกษา"
        subsystem="facility_room"
        versionBadge="v7.4 Unified Hub"
        roleBadge={userRoleInfo?.role}
        icon={Building}
        actions={
          <div className="flex items-center gap-2">
            {currentView !== "request" && (
              <button
                onClick={() => navigateToView("request")}
                className={PRIMARY_ACTION_BUTTON_CLASSES}
              >
                <Plus className="w-4 h-4" />
                ยื่นคำขอจองใหม่
              </button>
            )}

            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="รีเฟรชข้อมูลทั้งหมด"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        }
      />

      {/* Sub-Views Routing */}
      {loading && resources.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">กำลังโหลดข้อมูลระบบทรัพยากรส่วนกลาง...</p>
        </div>
      ) : (
        <>
          {/* VIEW 1: REQUEST FORM (DEFAULT LANDING PAGE) */}
          {currentView === "request" && (
            <FacilityBookingForm
              resources={resources}
              onSuccess={() => {
                loadData();
                navigateToView("history");
              }}
            />
          )}

          {/* VIEW 2: UNIFIED CALENDAR */}
          {currentView === "calendar" && (
            <FacilityUnifiedCalendar
              resources={resources}
              reservations={reservations}
              onSelectSlot={() => {
                navigateToView("request");
              }}
              onSelectReservation={(item) => {
                if (item.reservedByUserId === userRoleInfo?.userId) {
                  navigateToView("history");
                } else if (isPrivileged) {
                  navigateToView("approval");
                }
              }}
            />
          )}

          {/* VIEW 3: MY BOOKINGS HISTORY */}
          {currentView === "history" && (
            <FacilityHistoryView
              myReservations={myReservations}
              onRefresh={loadData}
              onNavigateToRequest={() => navigateToView("request")}
            />
          )}

          {/* VIEW 4: APPROVAL HUB */}
          {currentView === "approval" && isPrivileged && (
            <FacilityApprovalView
              reservations={reservations}
              drivers={drivers}
              onRefresh={loadData}
            />
          )}

          {/* VIEW 5: CRUD MANAGEMENT */}
          {currentView === "crud" && isPrivileged && (
            <FacilityManagementView
              resources={resources}
              drivers={drivers}
              onRefresh={loadData}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function UnifiedFacilityPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <FacilityPortalContent />
    </Suspense>
  );
}
