"use client";

import Link from "next/link";
import { ToastProvider, useToast } from "@/components/toast-provider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  FileText, 
  History, 
  CheckSquare, 
  Settings, 
  UserCircle, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Maximize,
  Minimize,
  FileSpreadsheet,
  Users,
  Activity,
  Archive,
  Bell,
  BookOpen,
  Plus,
  Clock,
  ClipboardList,
  Wrench,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  CalendarDays as Calendar,
  Building2,
  Award,
  Layers,
  Wallet,
  Vote
} from "lucide-react";
import { hasRepairPermission } from "@/lib/permissions";
import { getNotifications } from "@/app/actions/admin";
import { getMyPendingRoutingCount } from "@/app/actions/incoming";
import { getSystemSettings } from "@/app/actions/settings";

function ToolbarButtons({ isAdmin, isApprover }: { isAdmin: boolean; isApprover: boolean }) {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [counts, setCounts] = useState({ users: 0, leaves: 0 });
  const notiRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchNotifications = useCallback(() => {
    if (isAdmin || isApprover) {
      getNotifications().then((data) => {
        setNotifications(data.items);
        setCounts(data.counts);
      }).catch(() => {});
    }
  }, [isAdmin, isApprover]);
  
  // Refresh on mount + on route change + on window focus + on custom event (no polling)
  useEffect(() => {
    fetchNotifications();
    const onRefresh = () => fetchNotifications();
    const onFocus = () => fetchNotifications();
    window.addEventListener("noti-refresh", onRefresh);
    window.addEventListener("focus", onFocus);
    return () => { 
      window.removeEventListener("noti-refresh", onRefresh); 
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  // Refresh whenever the user navigates to a different page
  useEffect(() => {
    fetchNotifications();
  }, [pathname, fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const totalCount = counts.users + counts.leaves;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("momentAgo");
    if (mins < 60) return `${mins} ${t("minutesAgo")}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t("hoursAgo")}`;
    const days = Math.floor(hrs / 24);
    return `${days} ${t("daysAgo")}`;
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLang(lang === "th" ? "en" : "th")}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-all duration-300 font-bold text-sm"
        title={lang === "th" ? "เปลี่ยนเป็นภาษาอังกฤษ" : "Switch to Thai"}
      >
        {lang === "th" ? "TH" : "EN"}
      </button>

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-all duration-300"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <button
        onClick={toggleFullscreen}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-all duration-300"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      {/* Notification Bell + Panel */}
      {(isAdmin || isApprover) && (
        <div className="relative" ref={notiRef}>
          <button
            onClick={() => { setNotiOpen(!notiOpen); if (!notiOpen) fetchNotifications(); }}
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-purple-600 transition-all duration-300"
          >
            <Bell className="w-5 h-5" />
            {totalCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#F4F7FB] dark:ring-slate-900"
              >
                {totalCount > 99 ? "99+" : totalCount}
              </motion.span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          <AnimatePresence>
            {notiOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-0 top-14 w-[380px] max-h-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-[100] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("notifications")}
                    </h3>
                    {totalCount > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {totalCount} {t("itemsPending")}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setNotiOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Action Buttons */}
                {(counts.users > 0 || counts.leaves > 0) && (
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
                    {counts.leaves > 0 && (
                      <Link
                        href="/approvals"
                        onClick={() => setNotiOpen(false)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                      >
                        <CheckSquare className="w-4 h-4" />
                        {t("approveLeave")} ({counts.leaves})
                      </Link>
                    )}
                    {counts.users > 0 && isAdmin && (
                      <Link
                        href="/users"
                        onClick={() => setNotiOpen(false)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                      >
                        <Users className="w-4 h-4" />
                        {t("approveUsers")} ({counts.users})
                      </Link>
                    )}
                  </div>
                )}

                {/* Notification Items List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Bell className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium">{t("noNotifications")}</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {notifications.map((noti, i) => (
                        <Link
                          key={noti.id}
                          href={noti.href}
                          onClick={() => setNotiOpen(false)}
                          className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                        >
                          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${
                            noti.type === "user" 
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                              : "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                          }`}>
                            {noti.type === "user" ? <Users className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{noti.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{noti.desc}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo(noti.time)}</p>
                          </div>
                          <div className={`shrink-0 w-2 h-2 rounded-full mt-2 ${
                            noti.type === "user" ? "bg-emerald-500" : "bg-purple-500"
                          }`} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <Link
                      href={counts.leaves > 0 ? "/approvals" : "/users"}
                      onClick={() => setNotiOpen(false)}
                      className="block w-full text-center text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                    >
                      {t("viewAll")} →
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function getUserRoleKey(user: any, isFinalApprover: boolean = false) {
  if (user?.role === "ADMIN" || user?.position === "แอดมิน") return "ADMIN";
  if (user?.position === "ผู้อำนวยการ" || isFinalApprover) return "DIRECTOR";
  if (user?.position === "หัวหน้างานบุคคล") return "HR";
  if (user?.position === "เจ้าหน้าที่บุคคล") return "HR_STAFF";
  if (user?.position === "ผู้ตรวจสอบ") return "INSPECTOR";
  if (user?.position === "หัวหน้าหมวด" || user?.position === "หัวหน้ากลุ่มสาระ") return "DEPT_HEAD";
  return "TEACHER";
}

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  calendar: ["ADMIN", "DIRECTOR", "HR", "HR_STAFF", "INSPECTOR", "DEPT_HEAD", "TEACHER"],
  reports: ["ADMIN", "DIRECTOR", "HR", "HR_STAFF", "INSPECTOR", "DEPT_HEAD"],
  approvals: ["ADMIN", "DIRECTOR", "HR", "INSPECTOR", "DEPT_HEAD"],
  logs: ["ADMIN"],
  backups: ["ADMIN"],
  users: ["ADMIN", "HR"],
  settings: ["ADMIN"],
  manual_import: ["ADMIN", "HR", "HR_STAFF"]
};

function CollapsibleGroup({
  title,
  icon: GroupIcon,
  items,
  badge,
  defaultOpen = false,
  pathname,
  searchParams,
  renderNavItem,
}: {
  title: string;
  icon: any;
  items: Array<{ href: string; label: string; icon: any; badge?: number }>;
  badge?: number;
  defaultOpen?: boolean;
  pathname: string;
  searchParams: any;
  renderNavItem: (item: any, isSubItem?: boolean) => React.ReactNode;
}) {
  const isAnyChildActive = items.some((item) => {
    if (item.href.includes("?")) {
      const [path, query] = item.href.split("?");
      const keyVal = query.split("=");
      return pathname === path && searchParams?.get(keyVal[0]) === keyVal[1];
    }
    return pathname === item.href;
  });

  const [isOpen, setIsOpen] = useState(defaultOpen || isAnyChildActive);

  useEffect(() => {
    if (isAnyChildActive) {
      setIsOpen(true);
    }
  }, [isAnyChildActive]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 cursor-pointer select-none ${
          isAnyChildActive
            ? "text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-500/10"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GroupIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {badge !== undefined && badge > 0 && (
            <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {badge}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="pl-2 overflow-hidden space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-3.5 mt-0.5"
          >
            {items.map((item) => renderNavItem(item, true))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t, lang } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brandName, setBrandName] = useState("ระบบการลา");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [isFinalApprover, setIsFinalApprover] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<any>(null);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [enableLeave, setEnableLeave] = useState(true);
  const [enableAttendance, setEnableAttendance] = useState(false);
  const [enableDocument, setEnableDocument] = useState(false);
  const [enableRepair, setEnableRepair] = useState(false);
  const [enableTimetable, setEnableTimetable] = useState(true);
  const [enableSubstitute, setEnableSubstitute] = useState(true);
  const [enableSupervision, setEnableSupervision] = useState(true);
  const [enableExam, setEnableExam] = useState(true);
  const [enableCompetency, setEnableCompetency] = useState(true);
  const [enableFacility, setEnableFacility] = useState(true);
  const [enableAcademicSettings, setEnableAcademicSettings] = useState(true);
  const [enableBudget, setEnableBudget] = useState(false);
  const [enableStudentAffairs, setEnableStudentAffairs] = useState(false);
  const [enableStudentCouncil, setEnableStudentCouncil] = useState(false);
  const [enableAcademicPlanning, setEnableAcademicPlanning] = useState(true);
  const [academicPlanningAllowedUserIds, setAcademicPlanningAllowedUserIds] = useState<string[]>([]);
  const [brandSubheader, setBrandSubheader] = useState("ระบบจัดการการลา");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      getMyPendingRoutingCount().then(setPendingDocsCount).catch(() => {});
    }
  }, [session?.user?.id, pathname]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    // 1. Immediately read from localStorage on client-side mount to prevent async DB fetch lag
    if (typeof window !== "undefined") {
      const storedSchoolName = localStorage.getItem("eleave_schoolName");
      const storedSubheader = localStorage.getItem("eleave_subheader");
      const storedLogoUrl = localStorage.getItem("eleave_logoUrl");
      const storedEnableLeave = localStorage.getItem("eleave_enableLeave");
      const storedEnableAttendance = localStorage.getItem("eleave_enableAttendance");
      const storedEnableDocument = localStorage.getItem("eleave_enableDocument");
      const storedEnableRepair = localStorage.getItem("eleave_enableRepair");
      const storedEnableTimetable = localStorage.getItem("eleave_enableTimetable");
      const storedEnableSubstitute = localStorage.getItem("eleave_enableSubstitute");
      const storedEnableSupervision = localStorage.getItem("eleave_enableSupervision");
      const storedEnableExam = localStorage.getItem("eleave_enableExam");
      const storedEnableCompetency = localStorage.getItem("eleave_enableCompetency");
      const storedEnableFacility = localStorage.getItem("eleave_enableFacility");
      const storedEnableAcademicSettings = localStorage.getItem("eleave_enableAcademicSettings");
      const storedEnableBudget = localStorage.getItem("eleave_enableBudget");
      const storedEnableStudentAffairs = localStorage.getItem("eleave_enableStudentAffairs");
      const storedEnableStudentCouncil = localStorage.getItem("eleave_enableStudentCouncil");
      const storedEnableAcademicPlanning = localStorage.getItem("eleave_enableAcademicPlanning");

      if (storedSchoolName) setBrandName(storedSchoolName);
      if (storedSubheader) setBrandSubheader(storedSubheader);
      if (storedLogoUrl) setBrandLogo(storedLogoUrl);
      if (storedEnableLeave) setEnableLeave(storedEnableLeave === "true");
      if (storedEnableAttendance) setEnableAttendance(storedEnableAttendance === "true");
      if (storedEnableDocument) setEnableDocument(storedEnableDocument === "true");
      if (storedEnableRepair) setEnableRepair(storedEnableRepair === "true");
      if (storedEnableTimetable) setEnableTimetable(storedEnableTimetable === "true");
      if (storedEnableSubstitute) setEnableSubstitute(storedEnableSubstitute === "true");
      if (storedEnableSupervision) setEnableSupervision(storedEnableSupervision === "true");
      if (storedEnableExam) setEnableExam(storedEnableExam === "true");
      if (storedEnableCompetency) setEnableCompetency(storedEnableCompetency === "true");
      if (storedEnableFacility) setEnableFacility(storedEnableFacility === "true");
      if (storedEnableAcademicSettings) setEnableAcademicSettings(storedEnableAcademicSettings === "true");
      if (storedEnableBudget) setEnableBudget(storedEnableBudget === "true");
      if (storedEnableStudentAffairs) setEnableStudentAffairs(storedEnableStudentAffairs === "true");
      if (storedEnableStudentCouncil) setEnableStudentCouncil(storedEnableStudentCouncil === "true");
      if (storedEnableAcademicPlanning) setEnableAcademicPlanning(storedEnableAcademicPlanning === "true");
      
      // If we loaded cached data, we can mark settings loading as finished to bypass default splash page
      if (storedSchoolName || storedLogoUrl) {
        setIsLoadingSettings(false);
      }
    }

    getSystemSettings().then((s) => {
      if (!s) {
        setIsLoadingSettings(false);
        return;
      }
      const finalSchoolName = s.schoolName || t("loginTitle");
      const finalSubheader = s.subheader || "ระบบจัดการการลา";
      const finalLogoUrl = s.logoUrl || null;
      const finalEnableLeave = (s as any).enableLeave !== false;
      const finalEnableAttendance = s.enableAttendance === true;
      const finalEnableDocument = s.enableDocument === true;
      const finalEnableRepair = (s as any).enableRepair === true;
      const finalEnableTimetable = (s as any).enableTimetable !== false;
      const finalEnableSubstitute = (s as any).enableSubstitute !== false;
      const finalEnableSupervision = (s as any).enableSupervision !== false;
      const finalEnableExam = (s as any).enableExam !== false;
      const finalEnableCompetency = (s as any).enableCompetency !== false;
      const finalEnableFacility = (s as any).enableFacility !== false;
      const finalEnableAcademicSettings = (s as any).enableAcademicSettings !== false;
      const finalEnableBudget = (s as any).enableBudget === true;
      const finalEnableStudentAffairs = (s as any).enableStudentAffairs === true;
      const finalEnableStudentCouncil = (s as any).enableStudentCouncil === true;
      const finalEnableAcademicPlanning = (s as any).enableAcademicPlanning !== false;
      const allowedAP = ((s as any).academicPlanningAllowedUserIds || "").split(",").map((id: string) => id.trim()).filter(Boolean);

      setBrandName(finalSchoolName);
      setBrandLogo(finalLogoUrl);
      setBrandSubheader(finalSubheader);
      setEnableLeave(finalEnableLeave);
      setEnableAttendance(finalEnableAttendance);
      setEnableDocument(finalEnableDocument);
      setEnableRepair(finalEnableRepair);
      setEnableTimetable(finalEnableTimetable);
      setEnableSubstitute(finalEnableSubstitute);
      setEnableSupervision(finalEnableSupervision);
      setEnableExam(finalEnableExam);
      setEnableCompetency(finalEnableCompetency);
      setEnableFacility(finalEnableFacility);
      setEnableAcademicSettings(finalEnableAcademicSettings);
      setEnableBudget(finalEnableBudget);
      setEnableStudentAffairs(finalEnableStudentAffairs);
      setEnableStudentCouncil(finalEnableStudentCouncil);
      setEnableAcademicPlanning(finalEnableAcademicPlanning);
      setAcademicPlanningAllowedUserIds(allowedAP);
      
      if (s.finalApproverUserIds && session?.user?.id) {
        const allowedIds = s.finalApproverUserIds.split(",").map((id: string) => id.trim()).filter(Boolean);
        setIsFinalApprover(allowedIds.includes(session.user.id));
      }
      if (s.rolePermissions) {
        try {
          setRolePermissions(JSON.parse(s.rolePermissions));
        } catch (e) {
          console.error("Failed to parse rolePermissions", e);
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("eleave_schoolName", finalSchoolName);
        localStorage.setItem("eleave_subheader", finalSubheader);
        if (finalLogoUrl) {
          localStorage.setItem("eleave_logoUrl", finalLogoUrl);
        } else {
          localStorage.removeItem("eleave_logoUrl");
        }
        localStorage.setItem("eleave_enableLeave", String(finalEnableLeave));
        localStorage.setItem("eleave_enableAttendance", String(finalEnableAttendance));
        localStorage.setItem("eleave_enableDocument", String(finalEnableDocument));
        localStorage.setItem("eleave_enableRepair", String(finalEnableRepair));
        localStorage.setItem("eleave_enableTimetable", String(finalEnableTimetable));
        localStorage.setItem("eleave_enableSubstitute", String(finalEnableSubstitute));
        localStorage.setItem("eleave_enableSupervision", String(finalEnableSupervision));
        localStorage.setItem("eleave_enableExam", String(finalEnableExam));
        localStorage.setItem("eleave_enableCompetency", String(finalEnableCompetency));
        localStorage.setItem("eleave_enableFacility", String(finalEnableFacility));
        localStorage.setItem("eleave_enableAcademicSettings", String(finalEnableAcademicSettings));
      }

      setIsLoadingSettings(false);
    }).catch((err) => {
      console.error("Failed to load settings in layout:", err);
      setIsLoadingSettings(false);
    });
  }, [session?.user?.id, t]);

  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window === "undefined") return;
      const storedEnableLeave = localStorage.getItem("eleave_enableLeave");
      const storedEnableAttendance = localStorage.getItem("eleave_enableAttendance");
      const storedEnableDocument = localStorage.getItem("eleave_enableDocument");
      const storedEnableRepair = localStorage.getItem("eleave_enableRepair");
      const storedEnableTimetable = localStorage.getItem("eleave_enableTimetable");
      const storedEnableSubstitute = localStorage.getItem("eleave_enableSubstitute");
      const storedEnableSupervision = localStorage.getItem("eleave_enableSupervision");
      const storedEnableExam = localStorage.getItem("eleave_enableExam");
      const storedEnableCompetency = localStorage.getItem("eleave_enableCompetency");
      const storedEnableFacility = localStorage.getItem("eleave_enableFacility");
      const storedEnableAcademicSettings = localStorage.getItem("eleave_enableAcademicSettings");
      const storedEnableBudget = localStorage.getItem("eleave_enableBudget");
      const storedEnableStudentAffairs = localStorage.getItem("eleave_enableStudentAffairs");
      const storedEnableStudentCouncil = localStorage.getItem("eleave_enableStudentCouncil");
      const storedEnableAcademicPlanning = localStorage.getItem("eleave_enableAcademicPlanning");

      if (storedEnableLeave) setEnableLeave(storedEnableLeave === "true");
      if (storedEnableAttendance) setEnableAttendance(storedEnableAttendance === "true");
      if (storedEnableDocument) setEnableDocument(storedEnableDocument === "true");
      if (storedEnableRepair) setEnableRepair(storedEnableRepair === "true");
      if (storedEnableTimetable) setEnableTimetable(storedEnableTimetable === "true");
      if (storedEnableSubstitute) setEnableSubstitute(storedEnableSubstitute === "true");
      if (storedEnableSupervision) setEnableSupervision(storedEnableSupervision === "true");
      if (storedEnableExam) setEnableExam(storedEnableExam === "true");
      if (storedEnableCompetency) setEnableCompetency(storedEnableCompetency === "true");
      if (storedEnableFacility) setEnableFacility(storedEnableFacility === "true");
      if (storedEnableAcademicSettings) setEnableAcademicSettings(storedEnableAcademicSettings === "true");
      if (storedEnableBudget) setEnableBudget(storedEnableBudget === "true");
      if (storedEnableStudentAffairs) setEnableStudentAffairs(storedEnableStudentAffairs === "true");
      if (storedEnableStudentCouncil) setEnableStudentCouncil(storedEnableStudentCouncil === "true");
      if (storedEnableAcademicPlanning) setEnableAcademicPlanning(storedEnableAcademicPlanning === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (isPending || isLoadingSettings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 overflow-hidden">
        {/* Decorative background lights */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6"
        >
          {/* Logo container with pulse rings */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 dark:bg-purple-400/10 animate-ping opacity-75" />
            <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-md animate-pulse" />
            
            <div className="relative w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-slate-100 dark:border-slate-700/50 flex items-center justify-center overflow-hidden">
              {brandLogo ? (
                <motion.img 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.5, type: "spring" }}
                  src={brandLogo} 
                  alt="School Logo" 
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Texts */}
          <div className="space-y-2">
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-bold text-gray-900 dark:text-white leading-snug px-4 line-clamp-2"
            >
              {brandName || "โรงเรียนของเรา"}
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs font-semibold tracking-wider text-purple-600 dark:text-purple-400 uppercase"
            >
              {brandSubheader || "ระบบจัดการการลาออนไลน์"}
            </motion.p>
          </div>

          {/* Load indicator */}
          <div className="w-40 pt-4 mx-auto">
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full absolute top-0 bottom-0"
                animate={{ 
                  left: ["-100%", "100%"],
                  width: ["30%", "60%", "30%"]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as any;
  const isAdmin = user.role === "ADMIN" || user.position === "แอดมิน";
  const isApprover = isAdmin || user.position === "ผู้อำนวยการ" || user.position === "หัวหน้างานบุคคล" || isFinalApprover;

  if (!isAdmin && !user.isApproved) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[#F4F7FB] dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t("pendingAccountTitle")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("pendingAccountDesc")}
            </p>
          </div>
          <button 
            onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/login") }})}
            className="w-full px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    );
  }

  const userRole = getUserRoleKey(user, isFinalApprover);
  const activePermissions = rolePermissions || DEFAULT_PERMISSIONS;

  const showLeave = enableLeave || isAdmin;
  const showDocument = enableDocument || isAdmin;
  const showRepair = enableRepair || isAdmin;
  const showAttendance = enableAttendance || isAdmin;
  const showBudget = enableBudget || isAdmin;
  const showStudentAffairs = enableStudentAffairs || isAdmin;
  const showStudentCouncil = enableStudentCouncil || isAdmin;
  const isAcademicPlanningAllowed = isAdmin || (user?.id && academicPlanningAllowedUserIds.includes(user.id));
  const showAcademicPlanning = enableAcademicPlanning && isAcademicPlanningAllowed;

  // Sub-items for Leave System (ระบบการลา)
  const leaveSubItems = showLeave
    ? [
        { href: "/hr/leave/request", label: "ขอลาออนไลน์", icon: FileText },
        { href: "/hr/leave/history", label: "ประวัติการลา", icon: History },
      ]
    : [];
  if (showLeave && activePermissions.approvals?.includes(userRole)) {
    leaveSubItems.push({ href: "/hr/leave/approvals", label: "พิจารณาอนุมัติลา", icon: CheckSquare });
  }
  if (showLeave && activePermissions.reports?.includes(userRole)) {
    leaveSubItems.push({ href: "/hr/leave/reports", label: "รายงานและสถิติ", icon: FileSpreadsheet });
  }
  if (showLeave) {
    leaveSubItems.push({ href: "/manual", label: t("userManual"), icon: BookOpen });
  }

  // Sub-items for Document System (ระบบสารบรรณ / เอกสาร)
  const documentSubItems = showDocument
    ? [
        { href: "/document?view=issue", label: "ขอเลขหนังสือ", icon: FileText },
        { href: "/document?view=outbound_history", label: "ประวัติและทะเบียนออกเลขหนังสือ", icon: ClipboardList },
        { href: "/document?view=inbound", label: "AMSS++", icon: Archive },
        { href: "/document?view=cert", label: "เกียรติบัตร", icon: ClipboardList },
      ]
    : [];

  // Sub-items for Repair System (ระบบแจ้งซ่อม)
  const repairSubItems = (showRepair && (hasRepairPermission(user, "repair:view.own") || hasRepairPermission(user, "repair:view.all")))
    ? [
        { href: "/repair", label: "รายการแจ้งซ่อมทั้งหมด", icon: Wrench },
        { href: "/repair/new", label: "แจ้งซ่อมรายการใหม่", icon: Plus },
        { href: "/repair/summary", label: "สรุปการดำเนินงาน", icon: FileText },
      ]
    : [];

  // Sub-items for Academic Affairs Systems (งานฝ่ายวิชาการ - แยกเป็นระบบย่อย)
  const academicPlanningSubItems = showAcademicPlanning
    ? [
        { href: "/academic/planning", label: "ภาพรวมศูนย์วางแผน", icon: Layers },
        { href: "/academic/planning/curriculum", label: "โครงสร้างหลักสูตร", icon: BookOpen },
        { href: "/academic/planning/sandbox", label: "ฉากทัศน์จำลอง (Sandbox)", icon: Layers },
        { href: "/academic/planning/workload", label: "ภาระงานสอน & ETU", icon: Activity },
      ]
    : [];

  const timetableSubItems = enableTimetable
    ? [
        { href: "/academic/timetable", label: "จัดตารางสอนออนไลน์", icon: Calendar },
        { href: "/academic/timetable?view=matrix", label: "ตารางสอนรวมรายห้อง/ครู", icon: FileText },
      ]
    : [];

  const substituteSubItems = enableSubstitute
    ? [
        { href: "/academic/substitute", label: "จัดครูสอนแทนออนไลน์", icon: ArrowRightLeft },
        { href: "/academic/substitute?view=history", label: "บันทึกและประวัติสอนแทน", icon: ClipboardList },
      ]
    : [];

  const supervisionSubItems = enableSupervision
    ? [
        { href: "/academic/supervision", label: "นิเทศการสอนออนไลน์", icon: CheckSquare },
        { href: "/academic/supervision?view=summary", label: "สรุปผลและรายงานนิเทศ", icon: FileSpreadsheet },
      ]
    : [];

  const examSubItems = enableExam
    ? [
        { href: "/academic/exam", label: "จัดตารางสอบ & ผังที่นั่ง", icon: FileText },
      ]
    : [];

  // Sub-items for Budget System (ระบบบริหารงานงบประมาณ & เบิกจ่าย)
  const budgetSubItems = showBudget
    ? [
        { href: "/budget", label: "บริหารงานงบประมาณ & พัสดุ", icon: Wallet },
        { href: "/budget?view=projects", label: "จัดสรรงบโครงการ & แผนงาน", icon: FileText },
        { href: "/budget?view=reports", label: "รายงานและการเบิกจ่าย", icon: FileSpreadsheet },
      ]
    : [];

  // Sub-items for Student Affairs System (ระบบบริหารงานกิจการนักเรียน & วินัย)
  const studentAffairsSubItems = showStudentAffairs
    ? [
        { href: "/student-affairs", label: "บริหารงานกิจการนักเรียน", icon: Users },
        { href: "/student-affairs?view=discipline", label: "บันทึกวินัย & พฤติกรรม", icon: CheckSquare },
        { href: "/student-affairs?view=care", label: "ระบบดูแลช่วยเหลือนักเรียน", icon: BookOpen },
      ]
    : [];

  // Sub-items for Student Council System (ระบบบริหารงานสภานักเรียน E-Voting)
  const studentCouncilSubItems = showStudentCouncil
    ? [
        { href: "/student-council", label: "เลือกตั้งออนไลน์ E-Voting", icon: Vote },
        { href: "/student-council?view=activities", label: "กิจกรรมสภานักเรียน", icon: Calendar },
        { href: "/student-council?view=suggestions", label: "ตู้รับข้อเสนอแนะนักเรียน", icon: Archive },
      ]
    : [];

  // Items for Settings category (ตั้งค่าระบบ)
  const settingsNavItems = [];
  if (activePermissions.settings?.includes(userRole)) {
    settingsNavItems.push({ href: "/settings", label: "ตั้งค่าระบบหลัก", icon: Settings });
  } else if (activePermissions.manual_import?.includes(userRole)) {
    settingsNavItems.push({ href: "/settings?section=manual-import", label: "กรอกข้อมูลใบลาเอง", icon: Plus });
  }
  if (isAcademicPlanningAllowed) {
    settingsNavItems.push({ href: "/academic/planning", label: "ศูนย์วางแผนวิชาการ", icon: Layers });
  }
  if (activePermissions.users?.includes(userRole)) {
    settingsNavItems.push({ href: "/users", label: "จัดการบุคคล", icon: Users });
  }
  if (activePermissions.logs?.includes(userRole)) {
    settingsNavItems.push({ href: "/logs", label: "บันทึกกิจกรรม", icon: Activity });
  }

  const renderNavItem = (item: any, isSubItem: boolean = false) => {
    const isExactMatch = item.href.includes("?")
      ? pathname === item.href.split("?")[0] && (searchParams?.get(item.href.split("?")[1].split("=")[0]) === item.href.split("?")[1].split("=")[1])
      : (pathname === item.href || (item.href === "/hr/leave/request" && pathname === "/request") || (item.href === "/hr/leave/history" && pathname === "/history") || (item.href === "/hr/leave/approvals" && pathname === "/approvals") || (item.href === "/hr/leave/reports" && pathname === "/reports") || (item.href === "/hr/attendance" && pathname === "/attendance") || (item.href === "/hr/competency" && pathname === "/academic/competency") || (item.href === "/general/facility" && pathname === "/academic/facility"));

    const isActive = isExactMatch || (item.href.startsWith("/settings") && !item.href.includes("?") && pathname.startsWith("/settings") && !searchParams?.get("section"));
    const Icon = item.icon;

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={`relative flex items-center gap-2.5 px-3 ${isSubItem ? "py-2 text-[12.5px]" : "py-2.5 text-[13px]"} rounded-xl font-medium transition-all duration-200 group overflow-hidden ${
            isActive
              ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 font-bold"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-purple-500 rounded-r-full"
            />
          )}
          <Icon className={`${isSubItem ? "w-3.5 h-3.5" : "w-4 h-4"} transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const checkPermission = (path: string): boolean => {
    const key = getUserRoleKey(user, isFinalApprover);
    const activePerms = rolePermissions || DEFAULT_PERMISSIONS;
    if ((path.startsWith("/attendance") || path.startsWith("/hr/attendance")) && !enableAttendance && !isAdmin) return false;
    if ((path.startsWith("/document") || path.startsWith("/general/document")) && !enableDocument && !isAdmin) return false;
    if ((path.startsWith("/repair") || path.startsWith("/general/repair")) && !enableRepair && !isAdmin) return false;
    if ((path.startsWith("/repair") || path.startsWith("/general/repair")) && !hasRepairPermission(user, "repair:view.own") && !hasRepairPermission(user, "repair:view.all")) return false;
    if (path.startsWith("/budget") && !enableBudget && !isAdmin) return false;
    if (path.startsWith("/student-affairs") && !enableStudentAffairs && !isAdmin) return false;
    if (path.startsWith("/student-council") && !enableStudentCouncil && !isAdmin) return false;
    if (path.startsWith("/academic/planning") && !isAcademicPlanningAllowed) return false;
    if ((path.startsWith("/reports") || path.startsWith("/hr/leave/reports")) && !activePerms.reports?.includes(key)) return false;
    if ((path.startsWith("/approvals") || path.startsWith("/hr/leave/approvals")) && !activePerms.approvals?.includes(key)) return false;
    if (path.startsWith("/logs") && !activePerms.logs?.includes(key)) return false;
    if (path.startsWith("/users") && !activePerms.users?.includes(key)) return false;
    if (path.startsWith("/settings")) {
      const section = searchParams?.get("section");
      if (section === "manual-import" && activePerms.manual_import?.includes(key)) {
        return true;
      }
      if (!activePerms.settings?.includes(key)) return false;
    }
    return true;
  };

  const mobileNavItems: Array<{ href: string; label: string; icon: any }> = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/request", label: t("requestLeave"), icon: FileText },
    { href: "/history", label: t("history"), icon: History },
  ];
  if (showAttendance) {
    mobileNavItems.push({ href: "/attendance", label: lang === "en" ? "Attendance" : "ลงเวลาปฏิบัติราชการ", icon: Clock });
  }
  if (showDocument) {
    mobileNavItems.push({ href: "/document", label: lang === "en" ? "Documents" : "เอกสาร", icon: ClipboardList });
  }

  const hasAccess = checkPermission(pathname);

  const isImpersonating = user.isActualAdmin === true && (user.role !== "ADMIN" && user.position !== "แอดมิน");

  const handleClearImpersonation = async () => {
    try {
      const { clearImpersonation } = await import("@/app/actions/settings");
      await clearImpersonation();
      window.location.reload();
    } catch (error: any) {
      showToast("error", "เกิดข้อผิดพลาด: " + (error?.message || error));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] dark:bg-slate-900 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30">
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold shadow-md shrink-0 print:hidden z-[9999]">
          <div className="flex items-center gap-2">
            <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-white shrink-0" />
            <span>
              ขณะนี้คุณกำลังจำลองมุมมองสิทธิ์เป็น: <span className="underline decoration-wavy decoration-2 decoration-white/70">{user.position || "ครู (สิทธิ์ทั่วไป)"}</span> (บทบาท: {user.role})
            </span>
          </div>
          <button 
            type="button"
            onClick={handleClearImpersonation}
            className="ml-4 px-3.5 py-1.5 bg-white text-orange-600 hover:bg-orange-50 font-bold rounded-xl shadow transition-colors shrink-0"
          >
            กลับเป็นแอดมิน
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        
        {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-[220px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[4px_0_24px_rgba(0,0,0,0.02)] print:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        
        {/* Brand */}
        <div className="h-16 px-4 flex items-center border-b border-slate-100 dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="w-8 h-8 rounded-xl object-cover shadow-xs shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[13.5px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 leading-tight truncate">{brandName}</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Top Dashboard Link */}
          <Link href="/dashboard">
            <div className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group overflow-hidden ${
              pathname === "/dashboard" 
                ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 font-bold" 
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}>
              {pathname === "/dashboard" && (
                <motion.div layoutId="activeNav" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-purple-500 rounded-r-full" />
              )}
              <LayoutDashboard className={`w-4 h-4 transition-transform duration-200 ${pathname === "/dashboard" ? "scale-110" : "group-hover:scale-110"}`} />
              <span className="flex-1 truncate">{t("dashboard")}</span>
            </div>
          </Link>

          {/* Section 1: บุคคล */}
          <div className="space-y-1.5">
            <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              บุคคล
            </div>

            {/* ลงเวลาปฏิบัติราชการ */}
            {showAttendance && renderNavItem({ href: "/hr/attendance", label: "ลงเวลาปฏิบัติราชการ", icon: Clock })}

            {/* แฟ้มสะสมงาน PA */}
            {enableCompetency && renderNavItem({ href: "/hr/competency", label: "แฟ้มสะสมงาน PA", icon: Award })}

            {/* ระบบการลา (Collapsible Group) */}
            <CollapsibleGroup
              title="ระบบการลา"
              icon={FileText}
              items={leaveSubItems}
              pathname={pathname}
              searchParams={searchParams}
              renderNavItem={renderNavItem}
            />
          </div>

          {/* Section 2: ทั่วไป */}
          <div className="space-y-1.5">
            <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              ทั่วไป
            </div>

            {/* จองทรัพยากรกลาง */}
            {enableFacility && renderNavItem({ href: "/general/facility", label: "จองทรัพยากรกลาง", icon: Building2 })}

            {/* ระบบสารบรรณ (Collapsible Group) */}
            {documentSubItems.length > 0 && (
              <CollapsibleGroup
                title="ระบบสารบรรณ"
                icon={ClipboardList}
                badge={pendingDocsCount}
                items={documentSubItems}
                pathname={pathname}
                searchParams={searchParams}
                renderNavItem={renderNavItem}
              />
            )}

            {/* ระบบแจ้งซ่อม (Collapsible Group) */}
            {repairSubItems.length > 0 && (
              <CollapsibleGroup
                title="ระบบแจ้งซ่อม"
                icon={Wrench}
                items={repairSubItems}
                pathname={pathname}
                searchParams={searchParams}
                renderNavItem={renderNavItem}
              />
            )}
          </div>

          {/* Section 3: วิชาการ */}
          {(academicPlanningSubItems.length > 0 || timetableSubItems.length > 0 || substituteSubItems.length > 0 || supervisionSubItems.length > 0 || examSubItems.length > 0 || (enableAcademicSettings && isAdmin)) && (
            <div className="space-y-1.5">
              <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                วิชาการ
              </div>

              {/* ศูนย์วางแผนวิชาการ */}
              {academicPlanningSubItems.length > 0 && (
                <CollapsibleGroup
                  title="ศูนย์วางแผนวิชาการ"
                  icon={Layers}
                  items={academicPlanningSubItems}
                  pathname={pathname}
                  searchParams={searchParams}
                  renderNavItem={renderNavItem}
                />
              )}

              {/* ระบบจัดตารางสอน */}
              {timetableSubItems.length > 0 && (
                <CollapsibleGroup
                  title="ระบบจัดตารางสอน"
                  icon={Calendar}
                  items={timetableSubItems}
                  pathname={pathname}
                  searchParams={searchParams}
                  renderNavItem={renderNavItem}
                />
              )}

              {/* ระบบจัดครูสอนแทน */}
              {substituteSubItems.length > 0 && (
                <CollapsibleGroup
                  title="ระบบจัดครูสอนแทน"
                  icon={ArrowRightLeft}
                  items={substituteSubItems}
                  pathname={pathname}
                  searchParams={searchParams}
                  renderNavItem={renderNavItem}
                />
              )}

              {/* ระบบนิเทศการสอน */}
              {supervisionSubItems.length > 0 && (
                <CollapsibleGroup
                  title="ระบบนิเทศการสอน"
                  icon={CheckSquare}
                  items={supervisionSubItems}
                  pathname={pathname}
                  searchParams={searchParams}
                  renderNavItem={renderNavItem}
                />
              )}

              {/* ระบบจัดตารางสอบ */}
              {examSubItems.length > 0 && (
                <CollapsibleGroup
                  title="ระบบจัดตารางสอบ"
                  icon={FileText}
                  items={examSubItems}
                  pathname={pathname}
                  searchParams={searchParams}
                  renderNavItem={renderNavItem}
                />
              )}

              {/* ตั้งค่าระบบวิชาการ */}
              {enableAcademicSettings && isAdmin && renderNavItem({ href: "/academic/settings", label: "ตั้งค่าระบบวิชาการ (เฉพาะแอดมิน)", icon: Settings })}
            </div>
          )}

          {/* Section 4: งบประมาณ */}
          {budgetSubItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                งบประมาณ
              </div>
              <CollapsibleGroup
                title="ระบบบริหารงานงบประมาณ"
                icon={Wallet}
                items={budgetSubItems}
                pathname={pathname}
                searchParams={searchParams}
                renderNavItem={renderNavItem}
              />
            </div>
          )}

          {/* Section 5: กิจการนักเรียน */}
          {studentAffairsSubItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                กิจการนักเรียน
              </div>
              <CollapsibleGroup
                title="ระบบกิจการนักเรียน"
                icon={Users}
                items={studentAffairsSubItems}
                pathname={pathname}
                searchParams={searchParams}
                renderNavItem={renderNavItem}
              />
            </div>
          )}

          {/* Section 6: สภานักเรียน */}
          {studentCouncilSubItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                สภานักเรียน
              </div>
              <CollapsibleGroup
                title="ระบบสภานักเรียน"
                icon={Vote}
                items={studentCouncilSubItems}
                pathname={pathname}
                searchParams={searchParams}
                renderNavItem={renderNavItem}
              />
            </div>
          )}

          {/* Section 7: ตั้งค่าระบบ */}
          {settingsNavItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-3 pb-0.5 text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                ตั้งค่าระบบ
              </div>

              {settingsNavItems.map(item => renderNavItem(item))}
            </div>
          )}

          <div className="pt-2">
            <Link href="/profile">
              <div className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group overflow-hidden ${
                pathname === "/profile" 
                  ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 font-bold" 
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}>
                {pathname === "/profile" && (
                  <motion.div layoutId="activeNav" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-purple-500 rounded-r-full" />
                )}
                <UserCircle className={`w-4 h-4 transition-transform duration-200 ${pathname === "/profile" ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="flex-1 truncate">{t("profile")}</span>
              </div>
            </Link>
          </div>
        </nav>

        {/* User Footer Component */}
        <div className="p-3 mx-2.5 mb-3 mt-auto shrink-0">
          <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2.5">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 dark:border-slate-700 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate leading-snug">{user.name}</p>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">{user.position || t("staff")}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 text-[12.5px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-[220px]">
        
        {/* Top Header */}
        <header className="h-24 px-6 lg:px-10 flex items-center justify-between z-30 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {t("welcomeBack")}, {user.name.split(" ")[0]} 
                <motion.span 
                  animate={{ rotate: [0, 14, -8, 14, -4, 10, 0, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
                  className="text-2xl origin-[70%_70%] inline-block"
                >
                  👋
                </motion.span>
              </h2>
            </div>
          </div>
          
          <ToolbarButtons isAdmin={isAdmin} isApprover={isApprover} />
        </header>

        {/* Page Content */}
        <div className="flex-1 px-6 lg:px-10 pb-24 lg:pb-12 w-full max-w-[1600px] mx-auto">
          {hasAccess ? children : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-lg mx-auto mt-12">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้ (Access Denied)</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-xs">
                บัญชีผู้ใช้ของคุณไม่ได้รับอนุญาตให้เข้าถึงเนื้อหาในส่วนนี้ หากเป็นข้อผิดพลาด กรุณาติดต่อแอดมินหรือหัวหน้างานบุคคล
              </p>
              <Link href="/dashboard" className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-95">
                กลับสู่แดชบอร์ด
              </Link>
            </div>
          )}
        </div>
      </main>

      </div>

      {/* Mobile Bottom Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-2 py-1.5 flex justify-around items-center lg:hidden print:hidden">
        {mobileNavItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center py-1 group transition-all">
              <div className={`flex flex-col items-center gap-1 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110 stroke-[2.5]" : "group-hover:scale-110"}`} />
                <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              </div>
            </Link>
          );
        })}
        {/* Profile Item (always 5th or 4th item) */}
        <Link href="/profile" className="flex-1 flex flex-col items-center justify-center py-1 group transition-all">
          <div className={`flex flex-col items-center gap-1 ${pathname === "/profile" ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>
            <UserCircle className={`w-5 h-5 transition-transform duration-200 ${pathname === "/profile" ? "scale-110 stroke-[2.5]" : "group-hover:scale-110"}`} />
            <span className="text-[10px] font-semibold tracking-tight">{t("profile")}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] dark:bg-slate-900">
          <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      }>
        <AppContent>{children}</AppContent>
      </Suspense>
    </ToastProvider>
  );
}
