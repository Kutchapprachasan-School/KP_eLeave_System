"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { updateProfile } from "@/app/actions/user";
import { authClient } from "@/lib/auth-client";
import { Save, Lock, User as UserIcon, ShieldCheck, Mail, BookOpen, KeyRound, CheckCircle, Fingerprint, Camera, Trash2, Pencil, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ProfilePage() {
  const { data: session, isPending, refetch } = useSession();
  const user = session?.user as any;
  const { t, lang, tPosition } = useI18n();

  const [name, setName] = useState("");
  const [subjectGroup, setSubjectGroup] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state with user data once loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setSubjectGroup(user.subjectGroup || "");
      setAvatarPreview(user.image || "");
      setSignaturePreview(user.signatureUrl || "");
    }
  }, [user]);

  if (isPending) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
            <div className="md:col-span-2 space-y-6">
              <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name, subjectGroup });
      await refetch();
      alert(lang === "en" ? "Profile updated successfully!" : "อัปเดตข้อมูลส่วนตัวสำเร็จ");
    } catch (error) {
      alert(lang === "en" ? "Failed to update profile" : "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(lang === "en" ? "Image size should be less than 2MB" : "ขนาดรูปภาพต้องไม่เกิน 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setAvatarPreview(base64);
      try {
        await updateProfile({ name, subjectGroup, image: base64 });
        await refetch();
      } catch (err) {
        console.error("Failed to save avatar", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert(lang === "en" ? "Signature size should be less than 1MB" : "ขนาดไฟล์ลายเซ็นต้องไม่เกิน 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setSignaturePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- Signature Canvas Drawing Handlers ---
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coords to handle canvas size vs ClientBoundingRect
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#4F46E5"; // Indigo-600

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Check if canvas is empty
    const buffer = new Uint32Array(canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const isEmpty = !buffer.some(color => color !== 0);
    
    if (isEmpty) {
      alert(lang === "en" ? "Please draw your signature first" : "กรุณาเซ็นชื่อก่อนกดบันทึก");
      return;
    }

    const base64 = canvas.toDataURL("image/png");
    setSignaturePreview(base64);
    clearCanvas();
  };

  const handleSaveSignatureToDb = async () => {
    if (!signaturePreview) return;
    setSavingSignature(true);
    try {
      await updateProfile({ name, subjectGroup, signatureUrl: signaturePreview });
      await refetch();
      alert(lang === "en" ? "Signature saved successfully!" : "บันทึกลายเซ็นต์สำเร็จเรียบร้อยแล้ว");
    } catch (err) {
      alert(lang === "en" ? "Failed to save signature" : "เกิดข้อผิดพลาดในการบันทึกลายเซ็น");
    } finally {
      setSavingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm(lang === "en" ? "Are you sure you want to delete your signature?" : "คุณแน่ใจหรือไม่ว่าต้องการลบลายเซ็นต์นี้?")) return;
    setSavingSignature(true);
    try {
      await updateProfile({ name, subjectGroup, signatureUrl: "" });
      await refetch();
      setSignaturePreview("");
      alert(lang === "en" ? "Signature deleted successfully!" : "ลบลายเซ็นต์เรียบร้อยแล้ว");
    } catch (err) {
      alert(lang === "en" ? "Failed to delete signature" : "เกิดข้อผิดพลาดในการลบลายเซ็น");
    } finally {
      setSavingSignature(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError(lang === "en" ? "New passwords do not match" : "รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(lang === "en" ? "Password must be at least 8 characters" : "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      });
      
      if (res.error) {
        setPasswordError(res.error.message || (lang === "en" ? "Current password is incorrect" : "รหัสผ่านปัจจุบันไม่ถูกต้อง"));
      } else {
        setPasswordSuccess(lang === "en" ? "Password changed successfully!" : "เปลี่ยนรหัสผ่านสำเร็จ!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      setPasswordError(lang === "en" ? "An error occurred" : "เกิดข้อผิดพลาด");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 dark:from-purple-950 dark:via-indigo-950 dark:to-black p-8 md:p-10 shadow-lg border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl -z-10" />
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white shadow-inner">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {lang === "en" ? "My Profile" : "โปรไฟล์ของฉัน"}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1">
              {lang === "en" ? "Manage your personal information and account security settings" : "จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Profile Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          {/* Cover Header */}
          <div className="h-32 bg-gradient-to-br from-purple-500 to-indigo-600 relative">
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
            <div className="absolute bottom-0 right-4 translate-y-1/2 flex items-center justify-center p-1 rounded-full bg-white dark:bg-slate-900 shadow-md">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-950 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Active
              </span>
            </div>
          </div>
          
          <div className="px-6 pb-8 pt-0 flex flex-col items-center text-center relative">
            {/* Avatar */}
            <div 
              onClick={() => avatarInputRef.current?.click()}
              className="-mt-16 w-28 h-28 rounded-full border-4 border-white dark:border-slate-950 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-extrabold shadow-xl relative group overflow-hidden cursor-pointer"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || "U"
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 text-[10px] font-bold">
                <Camera className="w-5 h-5 text-white" />
                <span>เปลี่ยนรูป</span>
              </div>
            </div>
            <input 
              ref={avatarInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange} 
            />

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-4 leading-tight">{user?.name}</h2>
            
            <div className="flex items-center gap-1.5 mt-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </div>

            {/* Quick Badge */}
            <div className="mt-5 w-full flex flex-col gap-2.5 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500">
                <span>{lang === "en" ? "ROLE" : "ตำแหน่ง"}</span>
                <span>{lang === "en" ? "DEPARTMENT" : "สังกัด"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-100 dark:border-purple-900/50">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {tPosition(user?.position) || user?.position || (lang === "en" ? "Staff Member" : "บุคลากร")}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-100 dark:border-indigo-900/50 max-w-[140px] truncate" title={user?.subjectGroup}>
                  <BookOpen className="w-3.5 h-3.5" />
                  {user?.subjectGroup || (lang === "en" ? "Not Set" : "ไม่ระบุ")}
                </span>
              </div>
            </div>

            {/* Extra Account Stats */}
            <div className="mt-4 w-full flex items-center justify-between px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                UID: {user?.id ? user.id.substring(0, 8).toUpperCase() : "N/A"}
              </span>
              <span>
                Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { month: "short", year: "numeric" }) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Info Form */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <UserIcon className="w-5 h-5 text-indigo-500" />
              {lang === "en" ? "Personal Information" : "ข้อมูลส่วนตัว"}
            </h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    {lang === "en" ? "Full Name" : "ชื่อ - นามสกุล"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                  </div>
                </div>

                {["ครู", "หัวหน้างานบุคคล", "TEACHER", "HEAD"].includes(user?.position || "") && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      {lang === "en" ? "Subject Group" : "กลุ่มสาระการเรียนรู้"}
                    </label>
                    <div className="relative">
                      <select
                        value={subjectGroup}
                        onChange={(e) => setSubjectGroup(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm appearance-none cursor-pointer"
                      >
                        <option value="" disabled>
                          {lang === "en" ? "Select Subject Group" : "เลือกกลุ่มสาระการเรียนรู้"}
                        </option>
                        <option value="คณิตศาสตร์">{lang === "en" ? "Mathematics" : "กลุ่มสาระการเรียนรู้คณิตศาสตร์"}</option>
                        <option value="วิทยาศาสตร์และเทคโนโลยี">{lang === "en" ? "Science & Tech" : "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี"}</option>
                        <option value="ภาษาไทย">{lang === "en" ? "Thai Language" : "กลุ่มสาระการเรียนรู้ภาษาไทย"}</option>
                        <option value="ภาษาต่างประเทศ">{lang === "en" ? "Foreign Languages" : "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ"}</option>
                        <option value="สังคมศึกษา ศาสนาและวัฒนธรรม">{lang === "en" ? "Social Studies" : "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนาและวัฒนธรรม"}</option>
                        <option value="สุขศึกษา พลศึกษา">{lang === "en" ? "Health & PE" : "กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา"}</option>
                        <option value="ศิลปศึกษา">{lang === "en" ? "Arts" : "กลุ่มสาระการเรียนรู้ศิลปศึกษา"}</option>
                        <option value="การงานอาชีพ">{lang === "en" ? "Occupations & Tech" : "กลุ่มสาระการเรียนรู้การงานอาชีพ"}</option>
                        <option value="กิจกรรมพัฒนาผู้เรียน">{lang === "en" ? "Student Development" : "กิจกรรมพัฒนาผู้เรียน"}</option>
                        <option value="งานแนะแนว">{lang === "en" ? "Guidance" : "งานแนะแนว"}</option>
                        <option value="นักพัฒนาโรงเรียนและบุคลากรอื่นๆ">{lang === "en" ? "School Dev & Others" : "นักพัฒนาโรงเรียนและบุคลากรอื่นๆ"}</option>
                      </select>
                      <BookOpen className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 h-10 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md shadow-purple-500/10 focus:ring-4 focus:ring-purple-500/20 transition-all text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? (lang === "en" ? "Saving..." : "กำลังบันทึก...") : (lang === "en" ? "Save Changes" : "บันทึกข้อมูล")}
                </button>
              </div>
            </form>
          </div>

          {/* Signature Upload & Drawing Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <Fingerprint className="w-5 h-5 text-indigo-500" />
              {lang === "en" ? "Leave Form Signature" : "ลายมือชื่อสำหรับใบลา (ลายเซ็นต์อิเล็กทรอนิกส์)"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preview Container */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {lang === "en" ? "Current Signature" : "ลายเซ็นต์ปัจจุบันของคุณ"}
                </label>
                <div className="h-44 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex flex-col items-center justify-center overflow-hidden p-4 relative group">
                  {signaturePreview ? (
                    <>
                      <img src={signaturePreview} alt="Signature Preview" className="max-h-full max-w-full object-contain dark:invert" />
                      <button 
                        onClick={handleDeleteSignature}
                        className="absolute bottom-3 right-3 w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 flex items-center justify-center text-rose-600 transition-colors shadow-sm"
                        title={lang === "en" ? "Delete Signature" : "ลบลายเซ็นต์"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 dark:text-slate-600">
                      <Fingerprint className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-semibold">{lang === "en" ? "No signature uploaded" : "ยังไม่ได้ตั้งค่าลายเซ็นต์"}</p>
                      <p className="text-[10px] mt-1 text-slate-400 max-w-[180px]">{lang === "en" ? "Needed for generating leave forms automatically" : "จำเป็นต้องใช้สำหรับออกเอกสารใบลาโดยอัตโนมัติ"}</p>
                    </div>
                  )}
                </div>
                {signaturePreview && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSignatureToDb}
                      disabled={savingSignature}
                      className="flex items-center gap-2 px-5 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/10 transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingSignature ? (lang === "en" ? "Saving..." : "กำลังบันทึก...") : (lang === "en" ? "Save Signature" : "ยืนยันและบันทึกลายเซ็นต์")}
                    </button>
                  </div>
                )}
              </div>

              {/* Upload/Draw Input Container */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {lang === "en" ? "Upload or Draw New Signature" : "เพิ่มลายเซ็นต์ใหม่ (อัปโหลด หรือ วาดบนจอ)"}
                </label>
                
                {/* Method selector tab */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                  <label 
                    onClick={() => {
                      const drawEl = document.getElementById("sig-draw-section");
                      const uploadEl = document.getElementById("sig-upload-section");
                      const tabUpload = document.getElementById("tab-upload-label");
                      const tabDraw = document.getElementById("tab-draw-label");
                      if (drawEl) drawEl.style.display = "none";
                      if (uploadEl) uploadEl.style.display = "block";
                      if (tabUpload) {
                        tabUpload.className = "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/40 dark:border-slate-800/40 cursor-pointer transition-all";
                      }
                      if (tabDraw) {
                        tabDraw.className = "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-all";
                      }
                    }}
                    id="tab-upload-label"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/40 dark:border-slate-800/40 cursor-pointer transition-all"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Upload Image" : "อัปโหลดภาพแสกน"}</span>
                  </label>
                  <label 
                    onClick={() => {
                      const drawEl = document.getElementById("sig-draw-section");
                      const uploadEl = document.getElementById("sig-upload-section");
                      const tabUpload = document.getElementById("tab-upload-label");
                      const tabDraw = document.getElementById("tab-draw-label");
                      if (drawEl) drawEl.style.display = "block";
                      if (uploadEl) uploadEl.style.display = "none";
                      if (tabUpload) {
                        tabUpload.className = "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-all";
                      }
                      if (tabDraw) {
                        tabDraw.className = "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/40 dark:border-slate-800/40 cursor-pointer transition-all";
                      }
                      // Wait for display change then ensure canvas width is matched to layout
                      setTimeout(() => {
                        const canvas = canvasRef.current;
                        if (canvas) {
                          const rect = canvas.getBoundingClientRect();
                          canvas.width = rect.width * 2;
                          canvas.height = rect.height * 2;
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            ctx.scale(2, 2);
                          }
                        }
                      }, 50);
                    }}
                    id="tab-draw-label"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Draw Signature" : "วาดบนหน้าจอ"}</span>
                  </label>
                </div>

                {/* Upload Section */}
                <div id="sig-upload-section" className="block">
                  <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-500/5 transition-all cursor-pointer group">
                    <input 
                      ref={signatureInputRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={handleSignatureUpload} 
                      className="hidden" 
                    />
                    <Paperclip className="w-7 h-7 text-slate-300 dark:text-slate-700 group-hover:text-purple-400 transition-colors mb-1.5" />
                    <span className="text-xs text-slate-400 group-hover:text-purple-500 transition-colors">{lang === "en" ? "Click to upload signature file" : "คลิกเพื่อเลือกไฟล์รูปภาพลายเซ็นต์"}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-700 mt-1">{lang === "en" ? "PNG transparent background recommended" : "แนะนำเป็นไฟล์ PNG พื้นหลังโปร่งใส"}</span>
                  </label>
                </div>

                {/* Draw Section */}
                <div id="sig-draw-section" className="hidden">
                  <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 bg-slate-50/50 dark:bg-slate-900/10 cursor-crosshair touch-none"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 transition-colors hover:border-rose-100 shadow-sm"
                        title={lang === "en" ? "Clear" : "ล้างหน้าจอ"}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={saveDrawnSignature}
                        className="flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold shadow-sm transition-colors"
                      >
                        {lang === "en" ? "Apply" : "นำไปใช้"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Password Form */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <KeyRound className="w-5 h-5 text-purple-500" />
              {lang === "en" ? "Change Password" : "เปลี่ยนรหัสผ่าน"}
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-5">
              {passwordError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-100 dark:border-rose-950">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-950 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {passwordSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  {lang === "en" ? "Current Password" : "รหัสผ่านปัจจุบัน"}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    {lang === "en" ? "New Password" : "รหัสผ่านใหม่"}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    {lang === "en" ? "Confirm New Password" : "ยืนยันรหัสผ่านใหม่"}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-6 h-10 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md shadow-purple-500/10 focus:ring-4 focus:ring-purple-500/20 transition-all text-sm disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {savingPassword ? (lang === "en" ? "Updating..." : "กำลังเปลี่ยนรหัสผ่าน...") : (lang === "en" ? "Update Password" : "เปลี่ยนรหัสผ่าน")}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
