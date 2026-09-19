"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Calendar, 
  History, 
  ShieldCheck, 
  Settings, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  getFacilityResourcesAction,
  getFacilityReservationsAction,
  getDriverProfilesAction,
  getCurrentFacilityUserRoleAction,
  getFacilitySettingsAction
} from "@/app/actions/facility";

import FacilityBookingForm from "./_components/FacilityBookingForm";
import FacilityUnifiedCalendar from "./_components/FacilityUnifiedCalendar";
import FacilityHistoryView from "./_components/FacilityHistoryView";
import FacilityApprovalView from "./_components/FacilityApprovalView";
import FacilityManagementView from "./_components/FacilityManagementView";
import FacilityGuidelinesBanner from "./_components/FacilityGuidelinesBanner";
import { type FacilityView, formatISODateInput, type ModuleMode } from "./_components/facility-shared";

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
  const [facilitySettings, setFacilitySettings] = useState<any>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(true);

  // Selected slot from calendar to populate booking form
  const [selectedSlot, setSelectedSlot] = useState<{
    resourceId?: string;
    resourceType?: ModuleMode;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resList, allBookings, myBookings, driverList, roleInfo, settings] = await Promise.all([
        getFacilityResourcesAction().catch(() => []),
        getFacilityReservationsAction().catch(() => []),
        getFacilityReservationsAction({ onlyMine: true }).catch(() => []),
        getDriverProfilesAction().catch(() => []),
        getCurrentFacilityUserRoleAction().catch(() => null),
        getFacilitySettingsAction().catch(() => null)
      ]);

      setResources(resList || []);
      setReservations(allBookings || []);
      setMyReservations(myBookings || []);
      setDrivers(driverList || []);
      setUserRoleInfo(roleInfo);
      setFacilitySettings(settings);
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

  // Handler when user clicks a slot on the calendar
  const handleSelectSlot = (resource: any, date: Date, hour?: number) => {
    const dateStr = formatISODateInput(date);
    let startTimeStr = "09:00";
    let endTimeStr = "12:00";
    if (typeof hour === "number") {
      startTimeStr = `${String(hour).padStart(2, "0")}:00`;
      endTimeStr = `${String(hour + 1).padStart(2, "0")}:00`;
    }

    setSelectedSlot({
      resourceId: resource?.id,
      resourceType: resource?.type,
      startDate: dateStr,
      endDate: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr
    });

    // If currently on other tab, navigate to request
    if (currentView !== "request" && currentView !== "calendar") {
      navigateToView("request");
    }

    // Smooth scroll down to booking form
    setTimeout(() => {
      const el = document.getElementById("facility-booking-form-container");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 md:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto font-sans">
      
      {/* Sleek Subsystem Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => navigateToView("request")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentView === "request" || currentView === "calendar"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ปฏิทิน & ยื่นจองทรัพยากร</span>
          </button>

          <button
            onClick={() => navigateToView("history")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentView === "history"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติคำขอของฉัน</span>
            {myReservations.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                currentView === "history" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                {myReservations.length}
              </span>
            )}
          </button>

          {isPrivileged && (
            <button
              onClick={() => navigateToView("approval")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                currentView === "approval"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>พิจารณาอนุมัติ</span>
              {pendingApprovalsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          )}

          {isPrivileged && (
            <button
              onClick={() => navigateToView("crud")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                currentView === "crud"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>จัดการข้อมูลทรัพยากร</span>
            </button>
          )}
        </div>

        {/* Right Action: Refresh */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="รีเฟรชข้อมูลทั้งหมด"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Hotline & Regulations Banner */}
      <FacilityGuidelinesBanner
        hotlinePhone={facilitySettings?.hotlinePhone}
        guidelinesHtml={facilitySettings?.guidelinesHtml}
      />

      {/* Sub-Views Routing */}
      {loading && resources.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">กำลังโหลดข้อมูลระบบทรัพยากรส่วนกลาง...</p>
        </div>
      ) : (
        <>
          {/* COMBINED VIEW: CALENDAR ON TOP + BOOKING FORM DIRECTLY UNDERNEATH */}
          {(currentView === "request" || currentView === "calendar") && (
            <div className="space-y-8">
              {/* 1. Resource Calendar on Top (Collapsible) */}
              <div className="space-y-3">
                <div
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        ปฏิทินการใช้ทรัพยากรส่วนกลาง
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                          {isCalendarOpen ? "กำลังแสดง (คลิกเพื่อพับเก็บ)" : "พับเก็บอยู่ (คลิกเพื่อเปิดดู)"}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isCalendarOpen
                          ? "ตรวจสอบสถานะและช่วงเวลาว่างของห้องประชุมและรถโรงเรียนแบบเรียลไทม์ (คลิกช่องเวลาเพื่อเริ่มจอง)"
                          : "พับปฏิทินเก็บแล้ว — ท่านสามารถกรอกแบบฟอร์มยื่นจองด้านล่างได้ทันทีโดยไม่ต้องเลื่อนหน้าจอ"}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {isCalendarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isCalendarOpen && (
                  <div className="transition-all duration-300">
                    <FacilityUnifiedCalendar
                      resources={resources}
                      reservations={reservations}
                      onSelectSlot={handleSelectSlot}
                      onSelectReservation={(item) => {
                        if (item.reservedByUserId === userRoleInfo?.userId) {
                          navigateToView("history");
                        } else if (isPrivileged) {
                          navigateToView("approval");
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 2. Booking Form Directly Underneath */}
              <div id="facility-booking-form-container" className="pt-4 border-t border-slate-200/60 dark:border-slate-800">
                <FacilityBookingForm
                  resources={resources}
                  initialSelection={selectedSlot}
                  onSuccess={() => {
                    loadData();
                    navigateToView("history");
                  }}
                />
              </div>
            </div>
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
