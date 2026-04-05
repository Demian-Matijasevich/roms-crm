import { SkeletonCard, SkeletonTable } from "@/app/components/Skeleton";
export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-7 bg-card-border rounded w-32" />
        <div className="h-9 bg-card-border rounded w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-8 bg-card-border rounded-lg animate-pulse" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}
