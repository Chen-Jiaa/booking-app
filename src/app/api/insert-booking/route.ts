import { supabase } from '@/lib/supabase/server-client'
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

interface BookingPayload {
    description: string
    end_time: string
    id: string,
    name: string
    purpose: string
    room_name: string
    start_time: string
    status: string
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
    const body = (await req.json()) as BookingPayload
    const { description, end_time, name, purpose, room_name, start_time, status } = body

    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const calendar = google.calendar({ auth, version: 'v3' })

    const event = {
      description,
      end: {
        dateTime: new Date(end_time).toISOString(),
        timeZone: 'Asia/Kuala_Lumpur',
      },
      start: {
        dateTime: new Date(start_time).toISOString(),
        timeZone: 'Asia/Kuala_Lumpur',
      },
      summary: `[${status}] ${room_name} booked by ${name} for ${purpose}`,
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    })

    const { error } = await supabase
        .from('bookings')
        .update({event_id: response.data.id})
        .eq('id', body.id)

    if (error) {
        console.error('Failed to update Supabase with event ID', error)
    }

    return NextResponse.json({
      eventId: response.data.id,
      message: 'Booking added to Google Calendar',
    })
  } catch (error: unknown) {
    let errorMessage = 'Unknown error'
    if(error instanceof Error) {
        errorMessage = error.message
    }
    console.error('Google Calendar API Error:', error)
    return NextResponse.json(
      { error: errorMessage, message: 'Failed to insert booking' },
      { status: 500 }
    )
  }
}