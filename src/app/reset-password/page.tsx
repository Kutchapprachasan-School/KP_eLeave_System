"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import { createAuthClient } from "better-auth/react";
import { useI18n } from "@/lib/i18n";

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
});

function ResetPasswordForm() {
  const { t, lang } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert(t("passwordsNotMatch"));
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: token || undefined
      });

      if (error) {
        alert(error.message || (lang === "en" ? "Failed to reset password" : "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน"));
      } else {
        alert(t("resetPasswordSuccess"));
        router.push("/login");
      }
    } catch (err) {
      alert(t("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-[420px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 relative z-10 border border-white/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
          <Lock className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white text-center">{t("confirmResetPasswordTitle")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">{t("confirmResetPasswordSubtitle")}</p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock className="h-[20px] w-[20px] text-slate-400" />
        </div>
        <input
          type={showPassword ? "text" : "password"}
          required
          className="w-full h-[50px] pl-[44px] pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
          placeholder={t("newPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock className="h-[20px] w-[20px] text-slate-400" />
        </div>
        <input
          type={showPassword ? "text" : "password"}
          required
          className="w-full h-[50px] pl-[44px] pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
          placeholder={t("confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-[50px] rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[15px] font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 shadow-lg shadow-purple-500/20 transition-all duration-200 mt-4"
      >
        {loading ? t("saving") : t("confirmResetPasswordButton")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] dark:bg-slate-900 relative overflow-hidden p-4">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => setLang(lang === "th" ? "en" : "th")}
          className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 font-bold text-xs shadow-sm cursor-pointer"
        >
          {lang === "th" ? "TH / EN" : "EN / TH"}
        </button>
      </div>

      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/40 dark:bg-purple-800/20 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 dark:bg-indigo-800/20 blur-[80px]" />
      </div>

      <Suspense fallback={<div className="animate-pulse w-full max-w-[420px] h-[400px] bg-white/50 rounded-3xl" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
