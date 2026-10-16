export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="relative flex items-center justify-center">
        {/* Subtle circular track */}
        <div className="w-10 h-10 rounded-full border-[2.5px] border-amber-100 dark:border-amber-950/60" />
        {/* Active spinning orange indicator */}
        <div className="absolute inset-0 w-10 h-10 rounded-full border-[2.5px] border-transparent border-t-amber-500 border-r-amber-500 dark:border-t-amber-400 dark:border-r-amber-400 animate-spin" />
      </div>
      <span className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
        กำลังโหลด...
      </span>
    </div>
  );
}
