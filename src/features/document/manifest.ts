export const DOCUMENT_PERMISSIONS = {
  SETTINGS_EDIT: "sarabun:settings:edit",
  AMSS_SYNC: "sarabun:amss:sync",
  DOC_CANCEL: "sarabun:doc:cancel",
  DOC_ISSUE: "sarabun:doc:issue",
} as const;

export const DOCUMENT_NAV_ITEMS = [
  {
    id: "issue",
    label: "📝 ขอเลขเอกสาร & ประวัติทะเบียน",
    view: "issue",
    activeTab: "outbound",
  },
  {
    id: "inbound",
    label: "📥 หนังสือรับ (AMSS++)",
    view: "inbound",
    activeTab: "inbound",
  },
  {
    id: "cert",
    label: "🏅 ออกเกียรติบัตร",
    view: "cert",
    activeTab: "outbound",
  },
] as const;
