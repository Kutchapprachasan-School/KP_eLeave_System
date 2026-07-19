"use client";

import React, { Suspense } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export interface DashboardWidget {
  id: string;
  type: "summary" | "recent_activity" | "quick_action" | "chart" | "custom";
  gridArea?: { sm?: string; md?: string; lg?: string };
  permissionRequired?: string[];
  componentName: string;
  props?: Record<string, any>;
}

// Native React Class Error Boundary for independent widget isolation
export class WidgetErrorBoundary extends React.Component<
  { id: string; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { id: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`🔒 [Widget Error Boundary - ${this.props.id}]:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <WidgetErrorState id={this.props.id} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

// Widget loading fallback state
export function WidgetSkeletonState({ type }: { type: string }) {
  return (
    <div className="w-full space-y-3 animate-pulse p-4">
      {type === "summary" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      ) : type === "quick_action" ? (
        <div className="space-y-2">
          <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      )}
    </div>
  );
}

// Widget error state fallback UI
export function WidgetErrorState({ id, onReset }: { id: string; onReset?: () => void }) {
  return (
    <div className="p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30">
      <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-880 dark:text-slate-200">โมดูลขัดข้องชั่วคราว ({id})</h4>
        <p className="text-[10px] text-slate-500 mt-1">ไม่สามารถดึงข้อมูลส่วนนี้ได้ชั่วคราว</p>
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          ลองใหม่อีกครั้ง
        </button>
      )}
    </div>
  );
}

// Container wrapper
export function WidgetContainer({
  widget,
  children
}: {
  widget: DashboardWidget;
  children: React.ReactNode;
}) {
  return (
    <WidgetErrorBoundary id={widget.id}>
      <Suspense fallback={<WidgetSkeletonState type={widget.type} />}>
        {children}
      </Suspense>
    </WidgetErrorBoundary>
  );
}
