"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocumentSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?section=document-settings");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}
