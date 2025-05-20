import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

interface UpdatePayload {
    eventId: string
    name: string
    newStatus: string
    purpose: string
    room_name: string
  }

function requireEnv(varName: string): string {
    const value = process.env[varName]
    if (!value) {
        throw new Error(`Missing environment variable: ${varName}`)
    }
    return value
}

const calendarId = requireEnv("GOOGLE_CALENDAR_ID")

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdatePayload
    const { eventId, name, newStatus, purpose, room_name } = body


    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ auth, version: 'v3' });

    switch (newStatus) {
    case 'cancelled': {
      await calendar.events.delete({
        calendarId,
        eventId,
      });
    
    break;
    }
    case 'confirmed': {
      await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          summary: `[CONFIRMED] ${room_name} booked by ${name} for ${purpose}`,
        },
      });
    
    break;
    }
    case 'rejected': {
      await calendar.events.delete({
        calendarId,
        eventId,
      });
    
    break;
    }
    // No default
    }

    return NextResponse.json({ message: 'Google Calendar event updated.' });
  } catch (error: unknown) {
    let errorMessage = 'Unknown error'
    if(error instanceof Error) {
        errorMessage = error.message
    }
    console.error('Error updating Google Calendar event:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}