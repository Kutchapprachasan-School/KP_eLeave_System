import React from "react";
import { SUPERVISION_MANIFEST } from "@/features/supervision/manifest";
import AcademicSupervisionApp from "@/app/supervision/page";

export const metadata = {
  title: `${SUPERVISION_MANIFEST.name} - ${SUPERVISION_MANIFEST.department}`,
  description: SUPERVISION_MANIFEST.description,
};

export default function AcademicSupervisionPage() {
  return <AcademicSupervisionApp />;
}
