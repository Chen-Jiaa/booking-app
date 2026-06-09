# PRD — New Halls, Event Calendar & Event Manager Role

---

## 1. Introduction / Overview

The booking app currently supports simple room bookings on an hourly basis for internal members. This feature set introduces:

1. **Three new halls** (Stage 8, Main Hall, Lobby to Main Hall) with inter-room dependency logic.
2. **A new "Event Manager" user role** for managing external paid events, capable of booking rooms across multiple days with per-day time control.
3. **A public event calendar page** (Google Calendar–style) showing all room bookings so every stakeholder can see what's booked and avoid double bookings.

**Problem:** Multiple people deal with clients simultaneously, and there is no shared visual overview of all bookings. This leads to a risk of double bookings and scheduling conflicts. The goal is a single source of truth — visible on the website and synced to Google Calendar.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Add Stage 8, Main Hall, and Lobby to Main Hall as bookable rooms with correct dependency rules. |
| G2 | Introduce the "Event Manager" role that can create multi-day bookings with per-day time slots. |
| G3 | Provide a public calendar page displaying all bookings across all rooms to prevent double bookings. |
| G4 | Sync all bookings (including multi-day) to Google Calendar so external tools also reflect the schedule. |
| G5 | Ensure no double bookings can occur, even when multiple people are booking concurrently. |

---

## 3. User Stories

### Event Manager

- **US-1:** As an Event Manager, I want to book a room for multiple consecutive days (e.g., 3 days setup + 1 day main event) so I can manage the full lifecycle of an external paid event.
- **US-2:** As an Event Manager, I want to specify exact hours per day or mark a day as "All Day" so I have flexible scheduling control.
- **US-3:** As an Event Manager, I want to explicitly mark each day of my booking as "Rehearsal / Setup" or "Main Event Day" so other users can see the nature of the booking on the calendar.
- **US-4:** As an Event Manager, when booking the Main Hall, I want to be prompted whether the client also needs the Lobby so the system can block the Lobby if required.

### Admin

- **US-5:** As an Admin, I want to assign the "Event Manager" role to a user from the Users Table so I can grant multi-day booking permissions.
- **US-6:** As an Admin, I want to see all bookings (including multi-day) on the calendar and in the admin booking table.

### Member / Guest

- **US-7:** As a Member or Guest, I want to view a calendar page showing all room bookings so I can see availability at a glance.
- **US-8:** As a Member, I want to click on a booking in the calendar to view its details (event name, PIC, room, times, booking type) so I know who to contact if needed.

---

## 4. Functional Requirements

### 4.1 — New Halls

| # | Requirement |
|---|-------------|
| FR-1 | Add three new rooms to the system: **Stage 8**, **Main Hall**, and **Lobby to Main Hall**. |
| FR-2 | **Stage 8** operates completely independently — no dependency on any other room. It follows existing booking rules. |
| FR-3 | **Main Hall + Lobby dependency rules:** |
| FR-3a | If the Main Hall is booked for a **Main Event Day**, the Lobby is automatically marked unavailable for that date/time. |
| FR-3b | If the Main Hall is booked for **Rehearsal / Setup only**, the Lobby remains available for other bookings. |
| FR-3c | If only the Lobby is booked, the Main Hall remains available (the hall has a backdoor for access). |
| FR-3d | When an Event Manager books the Main Hall, the booking form must display a prompt: _"Will the client also need the Lobby for setup?"_ — if "Yes", the Lobby is also blocked for the same date/time. |
| FR-4 | The Lobby can be booked independently for its own events without affecting Main Hall availability. However, if the Lobby is booked for a **Main Event**, the Main Hall **cannot** be used as a Main Event Day at that time — it can only be booked for Rehearsal / Setup (since the hall has a backdoor). |

### 4.2 — Event Manager Role

| # | Requirement |
|---|-------------|
| FR-5 | Add a new role value `event_manager` to the user profiles system (alongside existing `admin` and `user`). |
| FR-6 | Admins can assign the `event_manager` role from the existing Users Table page via the role dropdown (currently supports `admin` and `user`). |
| FR-7 | Event Managers can create **multi-day bookings** by selecting a date range (start date → end date). |
| FR-8 | For each day in the range, the Event Manager can either: **(a)** specify start and end times, or **(b)** check an "All Day" checkbox (similar to Google Calendar). |
| FR-9 | For each day in the range, the Event Manager must mark the day type as one of: **"Rehearsal / Setup"** or **"Main Event Day"**. |
| FR-10 | Multi-day bookings must respect the same conflict-prevention logic — occupied slots/days are disabled in the picker. |
| FR-11 | Event Managers can also make standard single-day/hourly bookings (they have all the capabilities of a regular member plus multi-day). |
| FR-11a | Multi-day bookings by Event Managers still require **admin approval** before being confirmed. |

### 4.3 — Event Calendar Page

| # | Requirement |
|---|-------------|
| FR-12 | Add a new page (e.g., `/calendar`) accessible to **all users** (including guests). |
| FR-13 | The calendar displays bookings across **all rooms** in a weekly or monthly view, styled similarly to Google Calendar. |
| FR-14 | Each booking entry on the calendar must show: room name, event name/description, and the day type label ("Rehearsal / Setup" or "Main Event Day" or standard booking). **Guests** can see that a slot is booked (room name, time, day type) but **cannot** see detailed info (event name, PIC, contact). |
| FR-15 | Clicking a booking entry opens a detail view / popover showing: Event Name, Client Name, Event Manager Name & Phone, room, date & time, expected attendance, day type, and booking status. **This detail view is only visible to logged-in users.** |
| FR-16 | The calendar must support switching between rooms (filter by room) and navigating between weeks/months. |
| FR-17 | Build the access control so it can be easily restricted to `admin` and `event_manager` roles in the future (e.g., a config flag or middleware check), but default to public for now. |

### 4.4 — Google Calendar Sync

| # | Requirement |
|---|-------------|
| FR-18 | Multi-day bookings must sync to Google Calendar. Each day in a multi-day booking should appear as its own calendar event (with appropriate title indicating day type). |
| FR-19 | When a multi-day booking is approved, updated, or cancelled, the corresponding Google Calendar events must be updated accordingly. |

### 4.5 — Booking Form Updates

| # | Requirement |
|---|-------------|
| FR-20 | Regular members continue to use the existing hourly booking flow (no changes). |
| FR-21 | Event Managers see an enhanced booking form that supports: date range selection, per-day time or "All Day", day type marking, and the Lobby prompt (when booking Main Hall). |
| FR-22 | The booking form must show existing bookings/conflicts inline so the Event Manager can avoid clashes while filling out the form. |

### 4.6 — Booking Edit Flow

| # | Requirement |
|---|-------------|
| FR-28 | All users (members and Event Managers) can **edit** their own bookings via an edit button on their booking details. |
| FR-29 | If an edit **changes the date(s) or time(s)**, the edited booking is treated as a **new booking** — it re-enters the approval flow (status resets to `pending` for rooms requiring approval). |
| FR-30 | When a date/time edit is submitted: **(a)** the previous Google Calendar event(s) are deleted, **(b)** new Google Calendar event(s) are created, and **(c)** email notifications are sent to the relevant approvers and the booking owner. |
| FR-31 | Edits to non-date fields (e.g., Event Name, Client Name, Expected Attendance) do **not** require re-approval — they update in place and sync to Google Calendar. |
| FR-32 | Multi-day bookings are approved or rejected **as a whole** (not per-day). |

### 4.7 — Booking Form Fields & User Profile Autofill

| # | Requirement |
|---|-------------|
| FR-23 | The Event Manager booking form must collect: **Event Name**, **Client Name**, **Event Manager Name**, **Event Manager Phone**, and **Expected Attendance**. |
| FR-24 | **Event Manager Name** and **Event Manager Phone** must be **autofilled** from the logged-in user's profile data. |
| FR-25 | Add a **phone number** field to the user profile / user settings page. |
| FR-26 | For **all logged-in users** (not just Event Managers), the booking form should prefill available fields (name, email, phone) from their profile. |
| FR-27 | If a user submits a booking and their profile does not yet have a phone number, the phone number entered in the form must be **saved back to their profile** automatically. |

---

## 5. Non-Goals (Out of Scope)

- **Recurring bookings** (e.g., every Monday) — not included in this iteration.
- **Payment / invoicing** for external events — handled outside this system.
- **Room-specific pricing** — no pricing logic in the app.
- **Drag-and-drop rescheduling** on the calendar — view-only for now.
- **Mobile app** — the calendar page should be responsive, but no native app is planned.
- **Notification preferences** — existing email notification logic applies; no user-configurable preferences added.

---

## 6. Design Considerations

- **Calendar UI:** Use [FullCalendar](https://fullcalendar.io/) (`@fullcalendar/react`) for the calendar page — it provides week/month/day views, event click handlers, and responsive support out of the box, matching the Google Calendar–style UX. On mobile, switch to a list/agenda view.
- **Day type labels:** Use visual badges or color coding to distinguish "Rehearsal / Setup" (e.g., orange/yellow) from "Main Event Day" (e.g., red/blue) and standard bookings (e.g., green).
- **Lobby prompt:** When the Event Manager selects "Main Hall" in the booking form, show an inline prompt or modal: _"Will the client also need the Lobby for setup/event?"_ with Yes/No options. If Yes, automatically add the Lobby to the booking.
- **Multi-day form UX:** Consider a step-by-step or tabular layout where each row is a day in the range, with columns for: date, start time, end time, "All Day" checkbox, and day type dropdown.

---

## 7. Technical Considerations

- **Database:** The `bookings` table will need new columns or a related `booking_days` table to support multi-day bookings with per-day metadata (day type, times).
- **Role system:** Add `event_manager` as a valid role in the `profiles` table. Update the `UserTable.tsx` dropdown to include this option.
- **Room dependencies:** Implement dependency logic at the API/server level (not just client-side) to prevent race conditions when multiple people book simultaneously.
- **Conflict checking:** The conflict-check query must account for multi-day bookings and the Main Hall ↔ Lobby dependency when determining slot availability.
- **Google Calendar:** Extend existing Google Calendar integration to handle creating/updating multiple events for a single multi-day booking.
- **Future access control:** Wrap the calendar page route in a middleware check that currently allows all users but can be toggled to restrict by role.

---

## 8. Success Metrics

| # | Metric |
|---|--------|
| SM-1 | Zero double bookings occur after launch (conflicts are prevented by the system). |
| SM-2 | All bookings (single-day and multi-day) appear on both the in-app calendar and Google Calendar within seconds of creation/approval. |
| SM-3 | Event Managers can successfully create a multi-day booking spanning 3+ days with mixed day types in a single form submission. |
| SM-4 | All users can view the calendar page and identify room availability without needing to contact anyone. |

---

## 9. Resolved Questions

| # | Question | Decision |
|---|----------|----------|
| RQ-1 | Should the calendar page show booking details to guests? | **No.** Guests can see that a slot is booked (room, time, day type) but details (event name, PIC, contact) are visible to logged-in users only. |
| RQ-2 | If the Lobby is booked and an Event Manager books Main Hall — should the system block it? | **Partially.** If the Lobby has a Main Event booking, the Main Hall cannot be booked as a Main Event Day at that time — but it can still be booked for Rehearsal / Setup. |
| RQ-3 | Should multi-day bookings require admin approval? | **Yes.** Event Manager bookings still require admin approval. |
| RQ-4 | What fields should the Event Manager fill in? | Event Name, Client Name, Event Manager Name (autofilled), Event Manager Phone (autofilled), Expected Attendance. |
| RQ-5 | Should there be a max advance booking limit? | **No limit.** |
| RQ-6 | What calendar library to use? | **FullCalendar** (`@fullcalendar/react`) — mature, MIT-licensed, Google Calendar–style out of the box. |
| RQ-7 | Multi-day approval: whole booking or per-day? | **Whole booking.** Approve/reject the entire multi-day booking at once. |

## 10. Open Questions

_No open questions remaining — all decisions have been resolved._
