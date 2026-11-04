export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Se încarcă entitățile și acoperirea tematică">
      <div className="flex flex-col gap-1">
        <div className="h-3 w-28 animate-pulse rounded bg-elevated" />
        <div className="h-7 w-72 animate-pulse rounded bg-elevated" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-md border border-border bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md border border-border bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-md border border-border bg-surface" />
    </div>
  );
}
