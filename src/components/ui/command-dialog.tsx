"use client"

import * as React from "react"
import { Command } from "cmdk"
import {
  FileText,
  User,
  Calendar,
  Home,
  PlusCircle,
  Search,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Award,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  // Keyboard Shortcut Event Listener (Ctrl+K / Cmd+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 flex items-start justify-center p-4 pt-[12vh]">
      <div className="relative w-full max-w-xl">
        <Command
          className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
          label="Global Command Menu"
        >
          {/* Header Search Input */}
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
            <Command.Input
              autoFocus
              placeholder="พิมพ์คำสั่ง ค้นหาเมนู บุคลากร หรือเลขหนังสือ... (กด Esc เพื่อปิด)"
              className="flex h-12 w-full rounded-md bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Result List */}
          <Command.List className="max-h-[340px] overflow-y-auto p-2 space-y-1 text-slate-700 dark:text-slate-300">
            <Command.Empty className="py-8 text-center text-xs text-slate-400">
              ไม่พบข้อมูลหรือคำสั่งที่ค้นหา
            </Command.Empty>

            {/* Group 1: Main Navigation */}
            <Command.Group
              heading="เมนูหลัก (Navigation)"
              className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
            >
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard"))}
              >
                <Home className="mr-2.5 h-4 w-4 text-indigo-500" />
                <span>หน้าหลักภาพรวม (Dashboard)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => runCommand(() => router.push("/document?view=issue"))}
              >
                <FileText className="mr-2.5 h-4 w-4 text-orange-500" />
                <span>ระบบงานสารบรรณ (Sarabun System)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => runCommand(() => router.push("/leave"))}
              >
                <Calendar className="mr-2.5 h-4 w-4 text-emerald-500" />
                <span>ระบบยื่นใบลา (Leave Management)</span>
              </CommandItem>

              <CommandItem
                onSelect={() => runCommand(() => router.push("/document?view=cert"))}
              >
                <Award className="mr-2.5 h-4 w-4 text-purple-500" />
                <span>ระบบออกเกียรติบัตร (Certificate Generator)</span>
              </CommandItem>
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

            {/* Group 2: Quick Actions */}
            <Command.Group
              heading="คำสั่งด่วน (Quick Actions)"
              className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
            >
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/document?view=issue"))
                }
              >
                <PlusCircle className="mr-2.5 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  ขอออกเลขเอกสารสารบรรณด่วน
                </span>
              </CommandItem>

              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/document?view=inbound"))
                }
              >
                <FileText className="mr-2.5 h-4 w-4 text-indigo-500" />
                <span>ดึงหนังสือรับจากระบบ AMSS++</span>
              </CommandItem>
            </Command.Group>
          </Command.List>

          {/* Footer Shortcuts Hint */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <span>เลือก: <kbd className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">↵</kbd></span>
              <span>เลื่อน: <kbd className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">↑</kbd> <kbd className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">↓</kbd></span>
            </div>
            <span>ปิด: <kbd className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">ESC</kbd></span>
          </div>
        </Command>
      </div>
    </div>
  )
}

function CommandItem({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect?: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2.5 text-xs outline-none transition-colors",
        "aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-950/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 font-medium",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      )}
    >
      {children}
      <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-0 aria-selected:opacity-100 transition-opacity text-indigo-500" />
    </Command.Item>
  )
}
