import { FileText } from "lucide-react";
import { ModuleManifest } from "@/core/application/module-manifest";
import { PERMISSIONS } from "@/constants/permissions";

export const DocumentModuleManifest: ModuleManifest = {
  id: "document",
  name: "ระบบสารบรรณและ e-เกษียณหนังสือ",
  version: "1.0.0",
  order: 3,
  category: "ADMINISTRATION",
  icon: FileText,
  requiredPermissions: [PERMISSIONS.DOCUMENT_VIEW],
  routes: {
    main: "/document/incoming",
    subRoutes: [
      { label: "หนังสือรับ", href: "/document/incoming", permission: PERMISSIONS.DOCUMENT_VIEW },
    ],
  },
};
