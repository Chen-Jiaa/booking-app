import { type Bookings } from '@/db/schema';
import { google } from 'googleapis';

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
const privateKey = requireEnv("GOOGLE_PRIVATE_KEY").replaceAll(String.raw`\n`, '\n');
const auth = new google.auth.JWT({
  email: requireEnv("GOOGLE_CLIENT_EMAIL"),
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});
const calendar = google.calendar({ auth, version: 'v3' });

// --- Function 1: CREATE a new event ---
export async function createCalendarEvent(booking: Bookings) {
  console.log(`Creating calendar event for booking: ${booking.id.toString()} with status: ${booking.status}`)

  const summaryStatus = booking.status ? `[${booking.status.toUpperCase()}]` : '[STATUS UNKNOWN]';
  const summary = `${summaryStatus} ${booking.roomName} by ${booking.name} for ${booking.purpose}`;

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        description: `Phone: ${booking.phone}\nEmail: ${booking.email}\nPurpose: ${booking.purpose}`,
        end: { dateTime: booking.endTime.toISOString(), timeZone: 'Asia/Singapore' },
        start: { dateTime: booking.startTime.toISOString(), timeZone: 'Asia/Singapore' },
        summary: summary,
      },
    });

    // Return the ID of the newly created Google Calendar event
    return event.data.id;
  } catch (error) {
    console.error(`Failed to create calendar event for booking ${booking.id.toString()}:`, error);
    throw new Error("Failed to create Google Calendar event.");
  }
}

// --- Function 2: UPDATE or DELETE an existing event ---
export async function updateCalendarEvent(booking: Bookings) {
  if (!booking.eventId) {
    console.warn(`Booking ${booking.id.toString()} has no eventId, skipping calendar update.`);
    return;
  }
  console.log(`Updating calendar event ${booking.eventId} for booking ${booking.id.toString()} to status: ${booking.status}`);

  try {
    switch (booking.status) {
      case 'cancelled':
      case 'rejected': {
        await calendar.events.delete({ calendarId, eventId: booking.eventId });
        break;
      }
      
      case 'confirmed': {
        await calendar.events.patch({
          calendarId,
          eventId: booking.eventId,
          requestBody: {
            summary: `[CONFIRMED] ${booking.roomName} by ${booking.name} for ${booking.purpose}`,
          },
        });
        break;
      }
      
      default: { // 'pending'
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to update calendar for event ${booking.eventId}:`, error);
    throw new Error("Failed to sync status with Google Calendar.");
  }
}