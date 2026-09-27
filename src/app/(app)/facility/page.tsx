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
import { getHolidays } from "@/app/actions/holiday";

import FacilityBookingForm from "./_components/FacilityBookingForm";
import FacilityUnifiedCalendar from "./_components/FacilityUnifiedCalendar";
import FacilityHistoryView from "./_components/FacilityHistoryView";
import FacilityApprovalView from "./_components/FacilityApprovalView";
import FacilityManagementView from "./_components/FacilityManagementView";
import {
  type FacilityView,
  formatISODateInput,
  type ModuleMode,
  parseSemesterConfigFromGuidelines
} from "./_components/facility-shared";

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
  const [holidays, setHolidays] = useState<any[]>([]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
      const [resList, allBookings, myBookings, driverList, roleInfo, settings, holidayList] = await Promise.all([
        getFacilityResourcesAction().catch(() => []),
        getFacilityReservationsAction().catch(() => []),
        getFacilityReservationsAction({ onlyMine: true }).catch(() => []),
        getDriverProfilesAction().catch(() => []),
        getCurrentFacilityUserRoleAction().catch(() => null),
        getFacilitySettingsAction().catch(() => null),
        getHolidays().catch(() => [])
      ]);

      setResources(resList || []);
      setReservations(allBookings || []);
      setMyReservations(myBookings || []);
      setDrivers(driverList || []);
      setUserRoleInfo(roleInfo);
      setFacilitySettings(settings);
      setHolidays(holidayList || []);
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
                        {isCalendarOpen
                          ? "ปฏิทินการใช้ทรัพยากรส่วนกลาง (คลิกเพื่อพับเก็บ)"
                          : "ปฏิทินการใช้ทรัพยากรส่วนกลาง (คลิกเพื่อเปิดดู)"}
                      </h2>
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
                      semesterConfig={parseSemesterConfigFromGuidelines(facilitySettings?.guidelinesHtml).semesterConfig}
                      holidays={holidays}
                      activeResourceFilter={selectedSlot?.resourceType || "ALL"}
                      onResourceFilterChange={(f) => {
                        if (f === "MEETING_ROOM" || f === "VEHICLE") {
                          setSelectedSlot((prev: any) => ({ ...(prev || {}), resourceType: f }));
                        }
                      }}
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
                  reservations={reservations}
                  initialSelection={selectedSlot}
                  onCategoryChange={(type) => {
                    setSelectedSlot((prev: any) => ({ ...(prev || {}), resourceType: type, resourceId: "" }));
                  }}
                  currentUserProfile={userRoleInfo?.user}
                  semesterConfig={parseSemesterConfigFromGuidelines(facilitySettings?.guidelinesHtml).semesterConfig}
                  holidays={holidays}
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
              facilitySettings={facilitySettings}
              holidays={holidays}
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
