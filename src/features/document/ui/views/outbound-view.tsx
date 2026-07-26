"use client";

import OutboundForm from "@/app/(app)/document/_components/forms/outbound-form";
import { MemoSectionDTO, OutboundDocument } from "@/features/document/domain/types/document.types";

interface OutboundViewProps {
  sections: MemoSectionDTO[];
  outboundDocs: OutboundDocument[];
  issuing: boolean;
  onIssueSubmit: (data: any) => Promise<any>;
  onRefresh: () => void;
  username: string;
  department: string;
  onGoToHistory?: () => void;
}

export function OutboundView({
  sections,
  outboundDocs,
  issuing,
  onIssueSubmit,
  onRefresh,
  username,
  department,
  onGoToHistory,
}: OutboundViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <OutboundForm
        sections={sections}
        issuing={issuing}
        onSubmit={onIssueSubmit}
        username={username}
        department={department}
        outboundDocs={outboundDocs}
        onRefresh={onRefresh}
        onGoToHistory={onGoToHistory}
      />
    </div>
  );
}

