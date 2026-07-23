import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-28" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 border-b last:border-0">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-28" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
