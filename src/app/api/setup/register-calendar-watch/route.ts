import { calendarWatchChannels } from "@/db/schema";
import { db } from "@/db";
import { registerCalendarWatch } from "@/lib/google-calendar";
import { NextRequest } from "next/server";

// One-time setup endpoint. Call this once after deploying to register
// the Google Calendar push notification watch.
// Protect with SETUP_SECRET env var.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!process.env.SETUP_SECRET || authHeader !== `Bearer ${process.env.SETUP_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`;

  const { channelId, expiration } = await registerCalendarWatch(
    webhookUrl,
    process.env.GOOGLE_WEBHOOK_SECRET!,
  );

  await db
    .insert(calendarWatchChannels)
    .values({ channelId, expiration, id: "main" })
    .onConflictDoUpdate({
      set: { channelId, expiration },
      target: calendarWatchChannels.id,
    });

  return Response.json({
    channelId,
    expiresAt: new Date(expiration).toISOString(),
    message: "Watch channel registered successfully.",
  });
}
