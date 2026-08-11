import { type BookingDays, type Bookings } from "@/db/schema";
import { calendar_v3, auth as googleAuth } from "@googleapis/calendar";

// Helper to ensure env variables are set
function requireEnv(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Misconfiguration: Missing environment variable: ${varName}`);
  }
  return value;
}

// --- Google Auth Setup (Do this once at the top) ---
const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
const privateKey = requireEnv("GOOGLE_PRIVATE_KEY").replaceAll(String.raw`\n`, "\n");
const jwtAuth = new googleAuth.JWT({
  email: requireEnv("GOOGLE_CLIENT_EMAIL"),
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = new calendar_v3.Calendar({ auth: jwtAuth });

// --- Types ---
export interface BookingDayEventInput {
  clientName: string;
  date: Date;
  dayType: string;
  email: string;
  endTime: Date | null;
  eventName: string;
  isAllDay: boolean;
  phone: string;
  roomName: string;
  startTime: Date | null;
  status: string;
}

// --- Function: CREATE a calendar event for one day of a multi-day booking ---
export async function createBookingDayCalendarEvent(
  input: BookingDayEventInput,
): Promise<null | string | undefined> {
  const dayTypeLabel = input.dayType === "main_event" ? "MAIN EVENT" : "SETUP";
  const statusLabel = input.status.toUpperCase();
  const summary = `[${statusLabel} - ${dayTypeLabel}] ${input.roomName} - ${input.eventName} by ${input.clientName}`;
  const description = `Event: ${input.eventName}\nClient: ${input.clientName}\nPhone: ${input.phone}\nEmail: ${input.email}`;

  try {
    if (input.isAllDay) {
      const startDateStr = formatDateOnly(input.date);
      const nextDay = new Date(input.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDateStr = formatDateOnly(nextDay);

      const event = await calendar.events.insert({
        calendarId,
        requestBody: {
          description,
          end: { date: endDateStr },
          start: { date: startDateStr },
          summary,
        },
      });
      return event.data.id;
    }

    if (!input.startTime || !input.endTime) {
      throw new Error("startTime and endTime are required for non-all-day events.");
    }

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        description,
        end: { dateTime: input.endTime.toISOString(), timeZone: "Asia/Singapore" },
        start: { dateTime: input.startTime.toISOString(), timeZone: "Asia/Singapore" },
        summary,
      },
    });
    return event.data.id;
  } catch (error) {
    console.error("Failed to create booking day calendar event:", error);
    throw new Error("Failed to create Google Calendar event for booking day.", { cause: error });
  }
}

// --- Function: CREATE a new event (standard single-day booking) ---
export async function createCalendarEvent(booking: Bookings) {
  const summaryStatus = booking.status ? `[${booking.status.toUpperCase()}]` : "[STATUS UNKNOWN]";

  let description: string;
  let summary: string;

  if (booking.bookingType === "multi_day") {
    summary = `${summaryStatus} ${booking.roomName} - ${booking.eventName ?? booking.purpose} by ${booking.clientName ?? booking.name}`;
    description = `Event: ${booking.eventName ?? booking.purpose}\nClient: ${booking.clientName ?? booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}`;
  } else {
    summary = `${summaryStatus} ${booking.roomName} by ${booking.name} for ${booking.purpose}`;
    description = `Phone: ${booking.phone}\nEmail: ${booking.email}\nPurpose: ${booking.purpose}`;
  }

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        description,
        end: { dateTime: booking.endTime.toISOString(), timeZone: "Asia/Singapore" },
        start: { dateTime: booking.startTime.toISOString(), timeZone: "Asia/Singapore" },
        summary,
      },
    });

    return event.data.id;
  } catch (error) {
    console.error(`Failed to create calendar event for booking ${booking.id.toString()}:`, error);
    throw new Error("Failed to create Google Calendar event.", { cause: error });
  }
}

// --- Function: CREATE calendar events for all days of a multi-day booking ---
export async function createMultiDayCalendarEvents(
  booking: Bookings,
  days: BookingDays[],
): Promise<{ dayId: string; eventId: string }[]> {
  const results: { dayId: string; eventId: string }[] = [];

  for (const day of days) {
    const eventId = await createBookingDayCalendarEvent({
      clientName: booking.clientName ?? booking.name,
      date: day.date,
      dayType: day.dayType,
      email: booking.email,
      endTime: day.endTime,
      eventName: booking.eventName ?? booking.purpose,
      isAllDay: day.isAllDay ?? false,
      phone: booking.phone,
      roomName: booking.roomName,
      startTime: day.startTime,
      status: booking.status,
    });

    if (eventId) {
      results.push({ dayId: day.id, eventId });
    }
  }

  return results;
}

// --- Function: DELETE a single calendar event by ID ---
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (error: unknown) {
    // 410 Gone means already deleted — treat as success
    if ((error as { status?: number }).status === 410) return;
    console.error(`Failed to delete calendar event ${eventId}:`, error);
    throw new Error("Failed to delete Google Calendar event.", { cause: error });
  }
}

// --- Function: PATCH a calendar event's summary ---
export async function patchCalendarEventSummary(eventId: string, summary: string): Promise<void> {
  try {
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: { summary },
    });
  } catch (error) {
    console.error(`Failed to patch calendar event ${eventId}:`, error);
    throw new Error("Failed to update Google Calendar event.", { cause: error });
  }
}

// --- Function: UPDATE or DELETE an existing event (standard single-day booking) ---
export async function updateCalendarEvent(booking: Bookings) {
  if (!booking.eventId) {
    console.warn(`Booking ${booking.id.toString()} has no eventId, skipping calendar update.`);
    return;
  }

  try {
    switch (booking.status) {
      case "cancelled":
      case "rejected": {
        try {
          await calendar.events.delete({ calendarId, eventId: booking.eventId });
        } catch (deleteError: unknown) {
          // 410 Gone means already deleted — treat as success
          if ((deleteError as { status?: number }).status !== 410) throw deleteError;
        }
        break;
      }

      case "confirmed": {
        const confirmedSummary =
          booking.bookingType === "multi_day"
            ? `[CONFIRMED] ${booking.roomName} - ${booking.eventName ?? booking.purpose} by ${booking.clientName ?? booking.name}`
            : `[CONFIRMED] ${booking.roomName} by ${booking.name} for ${booking.purpose}`;
        await calendar.events.patch({
          calendarId,
          eventId: booking.eventId,
          requestBody: {
            summary: confirmedSummary,
          },
        });
        break;
      }

      default: {
        // 'pending'
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to update calendar for event ${booking.eventId}:`, error);
    throw new Error("Failed to sync status with Google Calendar.", { cause: error });
  }
}

// --- Function: UPDATE or DELETE all calendar events for a multi-day booking ---
export async function updateMultiDayCalendarEvents(
  booking: Bookings,
  days: BookingDays[],
): Promise<void> {
  for (const day of days) {
    if (!day.eventId) continue;

    switch (booking.status) {
      case "cancelled":
      case "rejected": {
        await deleteCalendarEvent(day.eventId);
        break;
      }

      case "confirmed": {
        const dayTypeLabel = day.dayType === "main_event" ? "MAIN EVENT" : "SETUP";
        const summary = `[CONFIRMED - ${dayTypeLabel}] ${booking.roomName} - ${booking.eventName ?? booking.purpose} by ${booking.clientName ?? booking.name}`;
        await patchCalendarEventSummary(day.eventId, summary);
        break;
      }

      default: {
        break;
      }
    }
  }
}

// --- Function: REGISTER a push notification watch channel ---
export async function registerCalendarWatch(
  webhookUrl: string,
  token: string,
): Promise<{ channelId: string; expiration: number }> {
  try {
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        address: webhookUrl,
        id: crypto.randomUUID(),
        token,
        type: "web_hook",
      },
    });

    const channelId = response.data.id;
    const expiration = response.data.expiration;

    if (!channelId || !expiration) {
      throw new Error("Google did not return a channel ID or expiration.");
    }

    return { channelId, expiration: Number(expiration) };
  } catch (error) {
    console.error("Failed to register calendar watch:", error);
    throw new Error("Failed to register Google Calendar watch channel.", { cause: error });
  }
}

// --- Function: LIST events from Google Calendar in a time range ---
export async function listCalendarEvents(timeMin: Date, timeMax: Date) {
  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });
    return response.data.items ?? [];
  } catch (error) {
    console.error("Failed to list calendar events:", error);
    throw new Error("Failed to list Google Calendar events.", { cause: error });
  }
}

// --- Helper: Format date as YYYY-MM-DD for all-day events ---
function formatDateOnly(date: Date): string {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
