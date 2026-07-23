import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container items-top mx-auto grid gap-5">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
