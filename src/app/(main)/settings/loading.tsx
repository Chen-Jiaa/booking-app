import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="rounded-lg border p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-24 mt-2" />
      </div>
    </div>
  );
}
