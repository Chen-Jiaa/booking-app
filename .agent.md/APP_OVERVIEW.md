# Room Booking App — System Overview

---

## Layer 1 — Purpose

Allow organization members to browse available rooms, select time slots, and submit booking requests — while admins maintain full control by approving or rejecting requests, managing rooms, and overseeing schedules through a weekly calendar view. Success means every booking has a clear owner, a clear status, and is synced to Google Calendar with email notifications at every decision point.

---

## Layer 2 — Actors

### Guest (not logged in)

- Can browse available rooms on the homepage
- Cannot submit a booking
- Can sign up or log in

### Member (logged in, role: `user`)

- Can browse available rooms
- Can select a room, pick a date, choose available time slots, and submit a booking
- Can view their own bookings and their statuses
- Can cancel their own bookings

### Admin (logged in, role: `admin`)

- Can view all bookings in a paginated table
- Can approve (confirm) or reject pending bookings
- Can view a weekly room calendar (grid on desktop, list on mobile)
- Can manage rooms (add, edit availability, set approval requirements, assign approvers)
- Can manage users

---

## Layer 3 — States

### Booking

| State         | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `pending`     | Submitted for a room that requires approval; awaiting admin decision |
| `confirmed`   | Approved by admin, or auto-confirmed for rooms without approval required |
| `rejected`    | Declined by an admin                                         |
| `cancelled`   | Cancelled by the member who created it                       |

### Room

| State             | Description                                      |
| ----------------- | ------------------------------------------------ |
| Available (`true`) | Visible to members, can be booked                |
| Unavailable (`false`) | Hidden from the room list, cannot be booked  |
| Blocked (period)  | Specific time ranges marked unavailable via `unavailable_periods` |

### User

| State        | Description                          |
| ------------ | ------------------------------------ |
| Logged out   | Guest — can only browse rooms        |
| Logged in    | Authenticated via Supabase Auth      |
| Unverified   | Signed up but awaiting email verification |

---

## Layer 4 — Flows

### Booking Submission

1. **If** room does NOT require approval →
   - Status is set to `confirmed`
   - Google Calendar event is created
   - Confirmation email is sent to the member

2. **If** room DOES require approval →
   - Status is set to `pending`
   - Google Calendar event is created (marked as pending)
   - Notification email is sent to all designated approvers for that room

### Admin Approval / Rejection

1. **If** admin approves a pending booking →
   - Status becomes `confirmed`
   - A new Google Calendar event is created
   - Confirmation email is sent to the member

2. **If** admin rejects a pending booking →
   - Status becomes `rejected`
   - Google Calendar event is updated to reflect rejection
   - Rejection email is sent to the member

3. Admins can also approve/reject via one-click links in the email (`/api/approve?id=` and `/api/reject?id=`)

### Member Cancellation

1. **If** member cancels their own booking →
   - Status becomes `cancelled`
   - Google Calendar event is updated to reflect cancellation
   - Booking no longer appears in the member's active list

### Time Slot Conflict Prevention

1. **If** a member selects a date for a room →
   - All `pending` and `confirmed` bookings for that room on that day are fetched
   - Occupied 30-minute slots are disabled in the time picker
   - The member can only select available slots

### Authentication

1. **If** unauthenticated user hits `/admin/*` or `/bookings/*` →
   - Middleware intercepts and redirects through Supabase session check
2. **If** user signs up →
   - Email verification flow is triggered (`/verify`, `/email-confirmation`)
