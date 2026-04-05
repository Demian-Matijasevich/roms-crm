import { SkeletonTable } from "@/app/components/Skeleton";
export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-7 bg-card-border rounded w-40" />
      </div>
      <SkeletonTable rows={10} />
    </div>
  );
}
