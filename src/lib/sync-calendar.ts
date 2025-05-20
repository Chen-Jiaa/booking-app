interface SyncData {
    bookingId: string
    email: string
    fullEndTime: string
    fullStartTime: string
    name: string
    phone: string
    purpose: string
    selectedRoomName: string
    status: string
  }
  

export async function syncToCalendar({
    bookingId,
    email,
    fullEndTime,
    fullStartTime,
    name,
    phone,
    purpose,
    selectedRoomName,
    status
}: SyncData) {
    try {
        if (!process.env.NEXT_PUBLIC_SITE_URL) {
            throw new Error('NEXT_PUBLIC_SITE_URL is not defined')
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        await fetch(`${siteUrl}/api/insert-booking`, {
            body: JSON.stringify({
                description: `Phone: ${phone}, Email: ${email}, Purpose: ${purpose}`,
                end_time: fullEndTime,
                id: bookingId,
                name: name,
                purpose,
                room_name: selectedRoomName,
                start_time: fullStartTime,
                status
            }),
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
        })
    } catch (calendarError) {
        console.error("Calendar sync failed:", calendarError)
    }
}