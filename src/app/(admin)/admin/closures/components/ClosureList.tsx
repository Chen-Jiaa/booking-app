"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteClosure } from "../actions";

export interface ClosureSummary {
  endDate: string;
  groupId: string;
  label: string;
  roomNames: string[];
  startDate: string;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

export default function ClosureList({ closures }: { closures: ClosureSummary[] }) {
  const [busyId, setBusyId] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);

  async function handleDelete(closure: ClosureSummary) {
    if (!window.confirm(`Remove "${closure.label}"? These rooms will become bookable again.`)) {
      return;
    }
    setBusyId(closure.groupId);
    setError(null);
    const result = await deleteClosure(closure.groupId);
    if (!result.success) setError(result.error ?? "Failed to remove closure");
    setBusyId(null);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Current and past closures</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {closures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No closures yet.</p>
      ) : (
        <ul className="space-y-3">
          {closures.map((closure) => (
            <li
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              key={closure.groupId}
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium break-words">{closure.label}</p>
                <p className="text-sm text-muted-foreground">
                  {closure.startDate === closure.endDate
                    ? formatDate(closure.startDate)
                    : `${formatDate(closure.startDate)} – ${formatDate(closure.endDate)}`}
                </p>
                <p className="text-sm break-words">
                  {closure.roomNames.length} rooms: {closure.roomNames.join(", ")}
                </p>
              </div>
              <Button
                disabled={busyId === closure.groupId}
                onClick={() => void handleDelete(closure)}
                size="sm"
                variant="outline"
              >
                {busyId === closure.groupId ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
