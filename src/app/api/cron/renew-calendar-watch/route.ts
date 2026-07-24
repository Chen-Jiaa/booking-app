import { calendarWatchChannels } from "@/db/schema";
import { registerCalendarWatch } from "@/lib/google-calendar";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  // Vercel automatically sends this header for cron jobs
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [channel] = await db
    .select()
    .from(calendarWatchChannels)
    .where(eq(calendarWatchChannels.id, "main"));

  if (!channel) {
    return Response.json({ message: "No watch channel registered yet. Call /api/setup/register-calendar-watch first." }, { status: 200 });
  }

  const msUntilExpiry = channel.expiration - Date.now();

  if (msUntilExpiry > RENEW_THRESHOLD_MS) {
    const hoursLeft = Math.floor(msUntilExpiry / 1000 / 60 / 60);
    return Response.json({ message: `Channel still valid. Expires in ~${hoursLeft.toString()}h.` });
  }

  // Expiring within 24h — register a new watch
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`;
  const { channelId, expiration } = await registerCalendarWatch(
    webhookUrl,
    process.env.GOOGLE_WEBHOOK_SECRET!,
  );

  await db
    .update(calendarWatchChannels)
    .set({ channelId, expiration })
    .where(eq(calendarWatchChannels.id, "main"));

  return Response.json({ channelId, expiration, message: "Watch channel renewed." });
}
