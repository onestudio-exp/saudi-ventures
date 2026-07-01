// Skeleton renders animated placeholder lines while a card loads or generates
// content. Widths vary so it reads like text, not a block.
const WIDTHS = ["92%", "100%", "84%", "96%", "78%", "100%", "88%"];

export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: WIDTHS[i % WIDTHS.length] }} />
      ))}
    </div>
  );
}

// SkeletonCard is a placeholder tile for grid/list items still loading.
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`surface-card rounded-2xl p-5 ${className}`} aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
