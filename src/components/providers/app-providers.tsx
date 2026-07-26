"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ToastProvider } from "@/components/ui/toast"

// Lazy load CommandPalette for zero impact on initial load speed
const CommandPalette = dynamic(
  () => import("@/components/ui/command-dialog").then((mod) => mod.CommandPalette),
  { ssr: false }
)

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <CommandPalette />
    </ToastProvider>
  )
}
