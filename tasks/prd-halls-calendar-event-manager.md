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
| FR-4 | The Lobby can be booked independently for its own events without affecting Main Hall availability (except: the Main Hall cannot host a **Main Event Day** if the Lobby is booked by someone else at that time, since the lobby would be occupied). |

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

### 4.3 — Event Calendar Page

| # | Requirement |
|---|-------------|
| FR-12 | Add a new page (e.g., `/calendar`) accessible to **all users** (including guests). |
| FR-13 | The calendar displays bookings across **all rooms** in a weekly or monthly view, styled similarly to Google Calendar. |
| FR-14 | Each booking entry on the calendar must show: room name, event name/description, and the day type label ("Rehearsal / Setup" or "Main Event Day" or standard booking). |
| FR-15 | Clicking a booking entry opens a detail view / popover showing: event name, room, date & time, PIC (person in charge) name & contact, day type, and booking status. |
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

- **Calendar UI:** Use a Google Calendar–inspired layout. On desktop, show a weekly grid with rooms as columns or color-coded entries. On mobile, switch to a list/agenda view.
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

## 9. Open Questions

| # | Question |
|---|----------|
| OQ-1 | Should the calendar page show booking details (PIC contact info) to guests, or only to logged-in users? |
| OQ-2 | If the Lobby is booked by someone else and an Event Manager tries to book Main Hall as "Main Event Day" — should the system block it, or warn and allow override? |
| OQ-3 | Should multi-day bookings require admin approval, or are Event Manager bookings auto-confirmed? |
| OQ-4 | What specific fields should the Event Manager fill in for each booking? (e.g., Event Name, Client Name, PIC Name, PIC Phone, Expected Attendance, etc.) |
| OQ-5 | Should there be a limit on how far in advance an Event Manager can book (e.g., max 6 months ahead)? |
