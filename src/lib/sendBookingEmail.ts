import { type Bookings } from '@/db/schema'
import { Resend } from 'resend'

import { formatBookingTime } from './date-utils'
import { getPurposeLabel } from './getPurposeLabel'

const resend = new Resend(process.env.RESEND_API_KEY)

interface MultiDayDetail {
  date: Date
  dayType: string
  endTime: Date | null
  isAllDay: boolean
  startTime: Date | null
}

type MultiDayEmailProps = SendEmailProps & {
  bookingDaysDetails: MultiDayDetail[]
}

type SendEmailProps = Bookings & {
  to: string | string[] // Resend can send to multiple people
}

export async function sendBookingConfirmationEmail(props: SendEmailProps) {
  const { to, ...bookingDetails} = props;

  const { error } = await resend.emails.send({
    from: 'Collective Booking <system@booking.collective.my>', // same sender used in Supabase
    html: `
      <p>Your booking has been approved.</p>
      ${renderBookingDetailsHtml(bookingDetails)}
    `,
    subject: `Your Booking has Been Approved - ${bookingDetails.roomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error);
  }
}


export async function sendBookingEmail(props: SendEmailProps) {
  const { to, ...bookingDetails} = props;

  const { error } = await resend.emails.send({
    from: 'Collective Booking <system@booking.collective.my>', // same sender used in Supabase
    html: `
      <p>You have a new booking request for:</p>
      ${renderBookingDetailsHtml(bookingDetails)}
      <a href="https://booking.collective.my/admin/bookings/approve/${bookingDetails.id.toString()}"
        style="display: inline-block; padding: 10px 20px; margin-right: 10px; background-color: #4DC98E; color: white; text-decoration: none; border-radius: 5px;">
        ✅ Approve
      </a>

      <a href="https://booking.collective.my/admin/bookings/reject/${bookingDetails.id.toString()}"
        style="display: inline-block; padding: 10px 20px; background-color: #D94148; color: white; text-decoration: none; border-radius: 5px;">
        ❌ Reject
      </a>
    `,
    subject: `New Booking Request - ${bookingDetails.roomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendBookingRejectionEmail(props: SendEmailProps) {
  const {to, ...bookingDetails} = props

  const { error } = await resend.emails.send({
    from: 'Collective Booking <system@booking.collective.my>', // same sender used in Supabase
    html: `
      <p>Your booking has been rejected. Kindly make another booking.</p>
      ${renderBookingDetailsHtml(bookingDetails)}
    `,
    subject: `Your Booking has Been Rejected - ${bookingDetails.roomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendMultiDayBookingEmail(props: MultiDayEmailProps) {
  const { bookingDaysDetails, to, ...bookingDetails } = props

  const daysHtml = bookingDaysDetails
    .map((day) => renderMultiDayRowHtml(day))
    .join('')

  const phoneDisplay = bookingDetails.phone ? '+6' + bookingDetails.phone : 'N/A'
  const attendanceHtml = bookingDetails.expectedAttendance == null
    ? ''
    : '<p><strong>Expected Attendance:</strong> ' + bookingDetails.expectedAttendance.toString() + '</p>'
  const bookingIdStr = bookingDetails.id.toString()

  const { error } = await resend.emails.send({
    from: 'Collective Booking <system@booking.collective.my>',
    html: `
      <p>You have a new multi-day booking request:</p>
      <p><strong>Event:</strong> ${bookingDetails.eventName ?? 'N/A'}</p>
      <p><strong>Client:</strong> ${bookingDetails.clientName ?? 'N/A'}</p>
      <p><strong>Room:</strong> ${bookingDetails.roomName}</p>
      <p><strong>Event Manager:</strong> ${bookingDetails.name}</p>
      <p><strong>Phone:</strong> ${phoneDisplay}</p>
      <p><strong>Email:</strong> ${bookingDetails.email}</p>
      ${attendanceHtml}
      <table style="border-collapse: collapse; width: 100%;">
        <thead><tr>
          <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Date</th>
          <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Time</th>
          <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Type</th>
        </tr></thead>
        <tbody>${daysHtml}</tbody>
      </table>
      <br/>
      <a href="https://booking.collective.my/admin/bookings/approve/${bookingIdStr}"
        style="display: inline-block; padding: 10px 20px; margin-right: 10px; background-color: #4DC98E; color: white; text-decoration: none; border-radius: 5px;">
        ✅ Approve
      </a>
      <a href="https://booking.collective.my/admin/bookings/reject/${bookingIdStr}"
        style="display: inline-block; padding: 10px 20px; background-color: #D94148; color: white; text-decoration: none; border-radius: 5px;">
        ❌ Reject
      </a>
    `,
    subject: `New Multi-Day Booking Request - ${bookingDetails.roomName} - ${bookingDetails.eventName ?? ''}`,
    to,
  })

  if (error) {
    console.error('Failed to send multi-day booking email:', error)
  }
}

function renderBookingDetailsHtml(booking: Bookings): string {
  const eventNameHtml = booking.eventName
    ? `<p><strong>Event:</strong> ${booking.eventName}</p>`
    : ''
  const clientNameHtml = booking.clientName
    ? `<p><strong>Client:</strong> ${booking.clientName}</p>`
    : ''
  const attendanceHtml = booking.expectedAttendance == null
    ? ''
    : `<p><strong>Expected Attendance:</strong> ${booking.expectedAttendance.toString()}</p>`

  return `
    ${eventNameHtml}
    ${clientNameHtml}
    <p><strong>Room:</strong> ${booking.roomName}</p>
    <p><strong>Name:</strong> ${booking.name}</p>
    <p><strong>Phone:</strong> ${booking.phone ? `+6${booking.phone}` : 'N/A'}</p>
    <p><strong>Email:</strong> ${booking.email}</p>
    <p><strong>Date:</strong> ${booking.startTime.toLocaleDateString('en-my', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}</p>
    <p><strong>Time:</strong> ${formatBookingTime(booking.startTime)} - ${formatBookingTime(booking.endTime)}</p>
    <p><strong>Purpose:</strong> ${getPurposeLabel(booking.purpose)}</p>
    ${attendanceHtml}
  `;
}

function renderMultiDayRowHtml(day: MultiDayDetail): string {
  const dateStr = day.date.toLocaleDateString('en-my', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = day.isAllDay
    ? 'All Day'
    : `${day.startTime ? formatBookingTime(day.startTime) : ''} - ${day.endTime ? formatBookingTime(day.endTime) : ''}`
  const typeStr = day.dayType === 'main_event' ? 'Main Event Day' : 'Rehearsal / Setup'
  return `<tr><td style="padding: 6px; border: 1px solid #ddd;">${dateStr}</td><td style="padding: 6px; border: 1px solid #ddd;">${timeStr}</td><td style="padding: 6px; border: 1px solid #ddd;">${typeStr}</td></tr>`
}