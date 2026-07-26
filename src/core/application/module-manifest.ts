import { ComponentType } from "react";

export interface ModuleRoute {
  label: string;
  href: string;
  permission?: string;
}

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  order: number;
  category: "ADMINISTRATION" | "ACADEMIC" | "SYSTEM";
  icon: ComponentType<{ className?: string }>;
  requiredPermissions: string[];
  routes: {
    main: string;
    subRoutes: ModuleRoute[];
  };
}
