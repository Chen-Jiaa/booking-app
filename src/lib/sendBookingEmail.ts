import { type Bookings } from '@/db/schema'
import { Resend } from 'resend'

import { formatBookingTime } from './date-utils'
import { getPurposeLabel } from './getPurposeLabel'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendEmailProps = Bookings & {
  to: string | string[] // Resend can send to multiple people
}

export async function sendBookingConfirmationEmail(props: SendEmailProps) {
  const { to, ...bookingDetails} = props;

  const { error } = await resend.emails.send({
    from: 'Collective Booking <system@booking.collective.my>', // same sender used in Supabase
    html: `
      <p>Your booking has been approved.</p>
      <p><strong>Room:</strong> ${selectedRoomName}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> +6${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Time:</strong> ${formatBookingTime(fullStartTime)} - ${formatBookingTime(fullEndTime)}</p>
      <p><strong>Purpose:</strong> ${getPurposeLabel(purpose)}</p>
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
      <p><strong>Room:</strong> ${selectedRoomName}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> +6${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Time:</strong> ${formatBookingTime(fullStartTime)} - ${formatBookingTime(fullEndTime)}</p>
      <p><strong>Purpose:</strong> ${getPurposeLabel(purpose)}</p>
      <a href="https://booking.collective.my/api/approve?id=${bookingId}"
        style="display: inline-block; padding: 10px 20px; margin-right: 10px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
        ✅ Approve
      </a>

      <a href="https://booking.collective.my/api/reject?id=${bookingDetails.id.toString()}"
        style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px;">
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
      <p><strong>Room:</strong> ${selectedRoomName}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> +6${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Time:</strong> ${formatBookingTime(fullStartTime)} - ${formatBookingTime(fullEndTime)}</p>
      <p><strong>Purpose:</strong> ${getPurposeLabel(purpose)}</p>
    `,
    subject: `Your Booking has Been Rejected - ${bookingDetails.roomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error)
  }
}

function renderBookingDetailsHtml(booking: Bookings): string {
  return `
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
  `;
}