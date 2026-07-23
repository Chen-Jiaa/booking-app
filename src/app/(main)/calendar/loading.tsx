import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </main>
  );
}
