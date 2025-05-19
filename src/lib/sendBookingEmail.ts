// lib/email.ts
import { Resend } from 'resend'

import { formatBookingTime } from './date-utils'
import { getPurposeLabel } from './getPurposeLabel'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmationEmail({
  email,
  fullEndTime,
  fullStartTime,
  name,
  phone,
  purpose,
  selectedRoomName,
  to
}: {
  bookingId: string
  email: string
  fullEndTime: string
  fullStartTime: string
  name: string
  phone: string
  purpose: string
  selectedRoomName: string
  to: string
}) {
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
    subject: `Your Booking has Been Approved - ${selectedRoomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendBookingEmail({
  bookingId,
  email,
  fullEndTime,
  fullStartTime,
  name,
  phone,
  purpose,
  selectedRoomName,
  to
}: {
  bookingId: string
  email: string
  fullEndTime: string
  fullStartTime: string
  name: string
  phone: string
  purpose: string
  selectedRoomName: string
  to: string
}) {
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

      <a href="https://booking.collective.my/api/reject?id=${bookingId}"
        style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px;">
        ❌ Reject
      </a>
    `,
    subject: `New Booking Request - ${selectedRoomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendBookingRejectionEmail({
  email,
  fullEndTime,
  fullStartTime,
  name,
  phone,
  purpose,
  selectedRoomName,
  to
}: {
  bookingId: string
  email: string
  fullEndTime: string
  fullStartTime: string
  name: string
  phone: string
  purpose: string
  selectedRoomName: string
  to: string
}) {
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
    subject: `Your Booking has Been Rejected - ${selectedRoomName}`,
    to,
  })

  if (error) {
    console.error('Failed to send email:', error)
  }
}