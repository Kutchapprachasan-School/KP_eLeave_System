"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Undo2 } from "lucide-react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  description?: string
  onUndo?: () => void
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { ...item, id }
    setToasts((prev) => [...prev, newToast])

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                {t.type === "error" && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                {t.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                {t.type === "info" && <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />}
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.message}</p>
                  {t.description && <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.description}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {t.onUndo && (
                  <button
                    onClick={() => {
                      t.onUndo?.()
                      removeToast(t.id)
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md border border-indigo-200/50 dark:border-indigo-900/40 cursor-pointer"
                  >
                    <Undo2 className="w-3 h-3" />
                    ยกเลิก
                  </button>
                )}
                <button
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToastNotification() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToastNotification must be used within ToastProvider")
  }
  return context
}
