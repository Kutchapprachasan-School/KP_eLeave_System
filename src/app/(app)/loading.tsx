export default function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] w-full p-8 select-none animate-in fade-in duration-150">
      <div className="relative flex items-center justify-center">
        {/* Subtle circular track */}
        <div className="w-9 h-9 rounded-full border-[2.5px] border-amber-100 dark:border-amber-950/60" />
        {/* Active spinning orange indicator */}
        <div className="absolute inset-0 w-9 h-9 rounded-full border-[2.5px] border-transparent border-t-amber-500 border-r-amber-500 dark:border-t-amber-400 dark:border-r-amber-400 animate-spin" />
      </div>
      <span className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
        กำลังโหลด...
      </span>
    </div>
  );
}
