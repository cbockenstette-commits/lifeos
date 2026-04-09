// Dashboard loading skeleton — renders the same 3-column grid layout
// as the real dashboard with greyed-out placeholder blocks. Avoids
// layout shift on first load.

function SkeletonBlock({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
      aria-hidden="true"
    />
  );
}

function SkeletonWidget(): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <SkeletonBlock className="h-3 w-24" />
      </div>
      <div className="space-y-2 px-4 py-3">
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <SkeletonBlock className="h-3 w-4/6" />
      </div>
    </section>
  );
}

export function DashboardSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      <SkeletonWidget />
      <SkeletonWidget />
      <SkeletonWidget />
      <SkeletonWidget />
      <SkeletonWidget />
      <SkeletonWidget />
    </div>
  );
}
