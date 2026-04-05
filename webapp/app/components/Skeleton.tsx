"use client";

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card-bg border border-card-border rounded-xl p-5 animate-pulse ${className}`}>
      <div className="h-3 bg-card-border rounded w-24 mb-3" />
      <div className="h-7 bg-card-border rounded w-32 mb-2" />
      <div className="h-3 bg-card-border rounded w-20" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-card-border animate-pulse">
      <div className="w-8 h-8 rounded-full bg-card-border shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-card-border rounded w-40" />
        <div className="h-3 bg-card-border rounded w-64" />
      </div>
      <div className="h-6 bg-card-border rounded w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-card-border animate-pulse">
        <div className="h-5 bg-card-border rounded w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export default function SkeletonPage() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-7 bg-card-border rounded w-40" />
        <div className="h-9 bg-card-border rounded w-32" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonTable rows={5} />
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}
