"use client";

import React from "react";
import { useSession } from "@/lib/auth-client";

// Role-to-Permission mapping (RBAC Engine)
export function getPermissionsForRole(role?: string): string[] {
  if (!role) return [];
  
  const r = role.toUpperCase();
  
  if (r === "ADMIN") {
    return [
      "sarabun:document:create",
      "sarabun:document:edit",
      "sarabun:document:delete",
      "sarabun:document:approve",
      "sarabun:document:cancel",
      "sarabun:settings:edit",
      "sarabun:amss:sync"
    ];
  }
  
  if (r === "STAFF" || r === "OFFICER") {
    return [
      "sarabun:document:create",
      "sarabun:document:edit",
      "sarabun:amss:sync"
    ];
  }
  
  // Teachers/Default role
  return [
    "sarabun:document:create"
  ];
}

interface GuardedActionProps {
  requiredPermission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function GuardedAction({
  requiredPermission,
  fallback = null,
  children
}: GuardedActionProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const permissions = getPermissionsForRole(role);

  if (!permissions.includes(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
