import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

serve(async (req) => {
  const payload = await req.json()

  const booking = payload.record

  const {
    status,
    email,
    name,
    phone,
    fullStartTime,
    fullEndTime,
    purpose,
    selectedRoomName,
    id: bookingId,
  } = booking

  const TO = email

  // Use Resend API directly from Edge Function (Deno) or call an API route in your Next.js app
  // Option 1: Call Next.js API route (preferred if your Resend code uses Node.js libs)

  const endpoint =
    status === 'confirmed'
      ? 'send-confirmation'
      : status === 'rejected'
      ? 'send-rejection'
      : null

  if (!endpoint) return new Response('No email to send', { status: 200 })

  const res = await fetch(`https://booking.collective.my/api/${endpoint}`, {
    body: JSON.stringify({
      bookingId,
      email,
      fullStartTime,
      fullEndTime,
      name,
      phone,
      purpose,
      selectedRoomName,
      to: TO,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: req.headers.get('Authorization')!, // Preserve secret from webhook
    },
    method: 'POST',
  })

  return new Response(`Called ${endpoint}`, { status: res.status })
})
