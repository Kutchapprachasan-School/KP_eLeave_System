"use client";

import CertGenerator from "@/app/(app)/document/_components/cert-generator";

interface CertViewProps {
  onBack: () => void;
}

export function CertView({ onBack }: CertViewProps) {
  return <CertGenerator onBack={onBack} />;
}
