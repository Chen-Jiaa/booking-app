import { syncExternalCalendarEvents } from "@/app/(admin)/admin/calendar/actions/sync-external-events";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.headers.get("X-Goog-Channel-Token");

  if (!process.env.GOOGLE_WEBHOOK_SECRET || token !== process.env.GOOGLE_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Google sends a minimal ping — just tells us something changed.
  // Run a sync to pick up whatever it was.
  await syncExternalCalendarEvents();

  return new Response("OK", { status: 200 });
}
