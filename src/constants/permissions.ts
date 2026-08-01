export const PERMISSIONS = {
  // Document Module Permissions
  DOCUMENT_VIEW: "document:view",
  DOCUMENT_DIRECTIVE_CREATE: "document:directive:create", // สิทธิ์ e-เกษียณ/สั่งการ
  DOCUMENT_ROUTING_ACKNOWLEDGE: "document:routing:acknowledge", // สิทธิ์กดรับทราบ
  DOCUMENT_ROUTING_REPORT: "document:routing:report", // สิทธิ์ส่งรายงานผล
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
