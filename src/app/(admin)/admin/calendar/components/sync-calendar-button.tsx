"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { syncExternalCalendarEvents } from "../actions/sync-external-events";

export function SyncCalendarButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await syncExternalCalendarEvents();
      if (result.error) {
        setMessage(`Sync failed: ${result.error}`);
      } else {
        setMessage(`Synced: +${result.inserted.toString()} new, ${result.cancelled.toString()} cancelled`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-muted-foreground text-sm">{message}</span>}
      <Button disabled={loading} onClick={handleSync} variant="outline">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Sync from Calendar"}
      </Button>
    </div>
  );
}
