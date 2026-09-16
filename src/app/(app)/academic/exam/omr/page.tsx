"use client";

import React from "react";
import { ExamPapersManagementView } from "@/components/omr/ExamPapersManagementView";

export default function OmrExamDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <ExamPapersManagementView showHeader={true} />
    </div>
  );
}
