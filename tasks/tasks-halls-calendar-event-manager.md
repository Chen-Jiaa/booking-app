## Relevant Files

### Database & Schema

- `src/db/schema.ts` - Drizzle ORM schema definitions. Add `booking_days` table, new columns on `bookings` (e.g., `booking_type`, `is_multi_day`), and `phone` column on `profiles`.
- `drizzle.config.ts` - Drizzle Kit config for generating migrations.
- `supabase/migrations/` - Directory where Drizzle Kit outputs SQL migration files.

### Server Actions — Booking

- `src/app/(main)/actions/submitBooking.ts` - Existing booking submission action. Must be extended to handle multi-day bookings, new fields, and profile phone save-back.
- `src/app/(main)/actions/getUnavailableSlots.ts` - Fetches booked time slots for a room/date. Must be updated for multi-day bookings and Main Hall ↔ Lobby dependency logic.
- `src/app/(main)/bookings/actions.ts` - Contains `cancelUserBooking`. Must be updated to cancel all `booking_days` and associated Google Calendar events.

### Server Actions — Admin

- `src/app/(admin)/actions/approve-reject-booking.ts` - Admin approve/reject actions. Update to handle multi-day bookings as a whole.
- `src/app/(admin)/actions/booking-status-change.ts` - Core status change logic + Google Calendar sync. Extend for multi-day (multiple calendar events per booking).
- `src/app/(admin)/admin/users/actions.ts` - `updateUserRole` action. Already supports `event_manager` — no changes needed.
- `src/app/(admin)/admin/calendar/actions/create-booking.ts` - Admin calendar booking creation. Update for multi-day support.
- `src/app/(admin)/admin/calendar/actions/fetch-week-bookings.ts` - Fetches bookings for the admin weekly view. Update to include `booking_days` data.

### Components — Booking Flow

- `src/app/(main)/components/BookingForm.tsx` - Existing single-day booking form. Must support Event Manager fields and profile autofill.
- `src/app/(main)/components/DateTimeSelector.tsx` - Room/date/time picker. Remains for standard bookings; multi-day form will be a separate component.
- `src/app/(main)/components/BookingSummary.tsx` - Booking summary display. Extend for multi-day booking summary.
- `src/app/(main)/components/MultiDayBookingForm.tsx` - **New file.** Enhanced booking form for Event Managers with date range, per-day config, day type, Lobby prompt, and new fields.
- `src/app/(main)/components/MultiDayDateConfig.tsx` - **New file.** Tabular layout component for configuring each day in a multi-day booking (time, all-day, day type).

### Components — Admin

- `src/app/(admin)/admin/users/components/UserTable.tsx` - User role management table. Already includes `event_manager` option — verify it works end-to-end.
- `src/app/(admin)/admin/components/` - Admin dashboard components. May need updates to display multi-day booking details.

### Components — Calendar

- `src/app/(main)/calendar/page.tsx` - **New file.** Public calendar page route.
- `src/app/(main)/calendar/components/EventCalendar.tsx` - **New file.** FullCalendar wrapper component with week/month views, room filtering, and event click handling.
- `src/app/(main)/calendar/components/BookingDetailPopover.tsx` - **New file.** Popover/modal showing booking details for logged-in users.
- `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` - **New file.** Server action to fetch all bookings for the calendar view with access-control-aware field selection.

### Google Calendar

- `src/lib/google-calendar.ts` - Google Calendar integration (create/update/delete events). Extend to handle multiple events per multi-day booking, day type labels in event titles.

### Email

- `src/lib/sendBookingEmail.ts` - Email notification functions. Extend email templates for multi-day booking details and day types.

### Types

- `src/types/booking.ts` - Booking TypeScript interface. Add multi-day fields (`booking_days`, `booking_type`, `is_multi_day`, etc.).
- `src/types/room.ts` - Room TypeScript interface. May need a `dependency_group` or similar field.

### Auth & Middleware

- `src/middleware.ts` - Route protection middleware. Add `/calendar` route handling (public by default, with future restriction support).
- `src/lib/supabase/server.ts` - `getUserAndRole` helper. May need updates for `event_manager` role checks.
- `src/lib/supabase/client.ts` - Client-side Supabase helper.
- `src/components/providers/supabase-providers.tsx` - Supabase context provider. Ensure `event_manager` role is exposed.

### Navigation

- `src/app/(main)/components/nav-bar.tsx` - Main navigation bar. Add link to `/calendar` page.

### User Profile / Settings

- `src/app/(main)/settings/page.tsx` - **New file or existing.** User settings page for editing profile, including new phone number field.

### Utilities

- `src/lib/date-utils.ts` - Date utility functions. May need helpers for date range generation, all-day time calculations.
- `src/lib/config.ts` - App configuration. Add calendar access control config flag.

### Notes

- This project does not currently have a test framework set up (no Jest/Vitest in `package.json`). Testing tasks focus on manual verification and ensuring the build passes (`pnpm build`).
- Use `pnpm drizzle-kit generate` to create migration files after schema changes, then `pnpm drizzle-kit push` or apply via Supabase CLI.
- FullCalendar must be installed: `pnpm add @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:

- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch

  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/halls-calendar-event-manager`)

- [x] 1.0 Database schema & migration — Add `booking_days` table, new columns on `bookings` and `profiles`

  - [x] 1.1 In `src/db/schema.ts`, add a `phone` column (`text('phone')`) to the `profiles` table.
  - [x] 1.2 In `src/db/schema.ts`, add the following columns to the `bookings` table: `bookingType` (`text('booking_type')` — values: `'standard'`, `'multi_day'`; default `'standard'`), `clientName` (`text('client_name')`), `eventName` (`text('event_name')`), `expectedAttendance` (`integer('expected_attendance')`), `isMultiDay` (`boolean('is_multi_day')`, default `false`).
  - [x] 1.3 In `src/db/schema.ts`, create a new `bookingDays` table with columns: `id` (uuid, PK, defaultRandom), `bookingId` (bigserial reference to `bookings.id`, onDelete cascade), `date` (timestamp with timezone, not null), `startTime` (timestamp with timezone, nullable — null means all day), `endTime` (timestamp with timezone, nullable), `isAllDay` (boolean, default false), `dayType` (text — values: `'rehearsal_setup'`, `'main_event'`; not null), `eventId` (text — Google Calendar event ID for this specific day), `createdAt` (timestamp with timezone, defaultNow).
  - [x] 1.4 Export the `BookingDays` type using `InferSelectModel<typeof bookingDays>`.
  - [x] 1.5 Update `src/types/booking.ts` to add the new fields (`booking_type`, `client_name`, `event_name`, `expected_attendance`, `is_multi_day`) and create a `BookingDay` interface matching the `bookingDays` table.
  - [x] 1.6 Run `pnpm drizzle-kit generate` to generate the migration SQL file in `supabase/migrations/`.
  - [x] 1.7 Review the generated migration SQL to verify it matches the intended schema changes. Apply the migration to the database using `pnpm drizzle-kit push` or the Supabase CLI.

- [x] 2.0 Add new halls & room dependency logic

  - [x] 2.1 Seed the three new rooms into the `rooms` table via a SQL migration or seed script: **Stage 8** (independent, set `approval_required` as needed), **Main Hall** (set `approval_required: true`), and **Lobby to Main Hall** (set `approval_required: true`). Include appropriate `capacity` values and `description` text.
  - [x] 2.2 In `src/db/schema.ts`, add a `dependencyGroup` column (`text('dependency_group')`) to the `rooms` table. Main Hall and Lobby to Main Hall should share the same group value (e.g., `'main_hall_lobby'`). Stage 8 and other rooms should have `null`.
  - [x] 2.3 Create a new utility file `src/lib/room-dependencies.ts` that exports functions for the Main Hall ↔ Lobby dependency logic: (a) `getBlockedRoomIds(roomId, dayType, rooms)` — given a booked room and its day type, returns an array of room IDs that should be blocked or restricted. (b) `isBookingAllowed(roomId, dayType, date, startTime, endTime)` — server-side check that queries existing bookings and returns whether the proposed booking is allowed based on dependency rules.
  - [x] 2.4 In `src/lib/room-dependencies.ts`, implement the specific rules: (a) Main Hall booked as "Main Event Day" → Lobby is blocked for that date/time. (b) Main Hall booked as "Rehearsal / Setup" → Lobby remains available. (c) Lobby booked independently → Main Hall remains available. (d) Lobby booked as "Main Event" → Main Hall cannot be booked as "Main Event Day" for that time (but can still be "Rehearsal / Setup").
  - [x] 2.5 Update `src/app/(main)/actions/getUnavailableSlots.ts` to also check for dependency-based conflicts: when checking availability for the Lobby, also check Main Hall bookings that are "Main Event Day"; when checking Main Hall, also check Lobby "Main Event" bookings. Use the functions from `room-dependencies.ts`.
  - [x] 2.6 Run the migration to add the `dependency_group` column and verify the new rooms appear in the app's room list.

- [x] 3.0 Event Manager role & permissions

  - [x] 3.1 Verify that `src/app/(admin)/admin/users/actions.ts` already accepts `'event_manager'` in the `updateUserRole` function's type signature (it does — confirm no changes needed).
  - [x] 3.2 Verify that `src/app/(admin)/admin/users/components/UserTable.tsx` already includes the "Event Manager" option in the role dropdown (it does — confirm it renders and works correctly).
  - [x] 3.3 In `src/components/providers/supabase-providers.tsx` (or wherever the `useSupabase` hook is defined), ensure the `role` value can be `'event_manager'` and that it's properly typed.
  - [x] 3.4 Create a helper function `isEventManager(role: string | null): boolean` in `src/lib/supabase/server.ts` (or a new `src/lib/roles.ts`) that checks if a user has the `event_manager` role. Also create `canCreateMultiDayBooking(role)` that returns `true` for `event_manager` and `admin`.
  - [x] 3.5 In the booking page (`src/app/(main)/page.tsx` or wherever the booking flow starts), use the user's role to decide whether to show the standard booking form or the enhanced Event Manager form.

- [ ] 4.0 User profile phone number & autofill

  - [ ] 4.1 Check if a user settings/profile page already exists. If not, create `src/app/(main)/settings/page.tsx` with a form for editing profile fields (full name, email, phone number). Use the existing `profiles` table and Drizzle ORM.
  - [ ] 4.2 Add a phone number input field to the settings page form. On submission, update the `profiles` table with the new phone number via a server action.
  - [ ] 4.3 Create a server action `src/app/(main)/actions/getUserProfile.ts` (or add to existing actions) that fetches the current user's profile (name, email, phone) from the `profiles` table.
  - [ ] 4.4 In `src/app/(main)/components/BookingForm.tsx`, call `getUserProfile` on mount and use the returned data to prefill the `name`, `email`, and `phone` fields via `form.reset()` or `defaultValues`.
  - [ ] 4.5 In the `submitBooking` server action (`src/app/(main)/actions/submitBooking.ts`), after a successful booking insert, check if the user's profile has a phone number. If not, update the `profiles` table with the phone number from the booking form (FR-27).
  - [ ] 4.6 Add a link to the settings/profile page in the navigation bar (`src/app/(main)/components/nav-bar.tsx`) or user menu.

- [ ] 5.0 Event Manager multi-day booking form

  - [ ] 5.1 Install FullCalendar packages: `pnpm add @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list`.
  - [ ] 5.2 Create `src/app/(main)/components/MultiDayBookingForm.tsx` — the enhanced booking form shown to Event Managers. It should include: Event Name, Client Name, Event Manager Name (autofilled, read-only), Event Manager Phone (autofilled, read-only), Expected Attendance, date range picker (start date → end date), and a "Continue" button to proceed to per-day configuration.
  - [ ] 5.3 Create `src/app/(main)/components/MultiDayDateConfig.tsx` — a tabular/step-by-step layout where each row represents a day in the selected range. Each row has: date (read-only), start time picker, end time picker, "All Day" checkbox (disables time pickers when checked), and a day type dropdown (`"Rehearsal / Setup"` or `"Main Event Day"`).
  - [ ] 5.4 In `MultiDayDateConfig.tsx`, when the user changes any day's configuration, fetch and display existing bookings/conflicts inline for that room on that date (re-use or adapt `getUnavailableSlots`). Disable occupied time slots.
  - [ ] 5.5 In `MultiDayBookingForm.tsx`, when the selected room is "Main Hall", display a prompt: _"Will the client also need the Lobby for setup/event?"_ with Yes/No options. If "Yes", the Lobby should be included in the booking and blocked for the same dates/times.
  - [ ] 5.6 Add a booking summary section at the bottom of the form showing all days, their times, and day types before submission.
  - [ ] 5.7 In the booking page, conditionally render `MultiDayBookingForm` when the user role is `event_manager` (or `admin`), and the standard `DateTimeSelector` + `BookingForm` for regular members.

- [ ] 6.0 Multi-day booking submission & conflict logic

  - [ ] 6.1 Create a new server action `src/app/(main)/actions/submitMultiDayBooking.ts` that accepts the multi-day booking data: event info fields, room ID, array of day configurations (date, start/end time or all-day, day type), and optional Lobby inclusion flag.
  - [ ] 6.2 In `submitMultiDayBooking.ts`, implement a database transaction that: (a) inserts a parent row into `bookings` with `is_multi_day: true`, `booking_type: 'multi_day'`, `status: 'pending'`, and the new fields (event name, client name, expected attendance). Use the earliest day's start time as `start_time` and latest day's end time as `end_time`. (b) inserts one row per day into `booking_days` with the per-day metadata.
  - [ ] 6.3 In `submitMultiDayBooking.ts`, before inserting, run conflict checks for each day against existing bookings — including the Main Hall ↔ Lobby dependency rules from `room-dependencies.ts`. If any day has a conflict, abort the transaction and return an error indicating which day(s) conflict.
  - [ ] 6.4 If the Lobby inclusion flag is set (Main Hall booking + "Yes" to Lobby prompt), also insert a linked booking for the Lobby with the same dates/times and `status: 'pending'`. Use a shared `parentBookingId` or link field so they can be approved/rejected together.
  - [ ] 6.5 After successful DB insert, create Google Calendar events for each day in the booking (one event per day). Store the returned `eventId` on each `booking_days` row. Use day type labels in the event title (e.g., `[PENDING - REHEARSAL] Main Hall by ClientName`).
  - [ ] 6.6 Send email notifications to the room's approvers (same pattern as existing `submitBooking.ts`) with details of the multi-day booking.
  - [ ] 6.7 Update `src/app/(admin)/actions/booking-status-change.ts` to handle multi-day bookings: when approving/rejecting, update the parent `bookings` row status AND update all associated `booking_days` Google Calendar events (patch titles to `[CONFIRMED]` or delete on rejection).
  - [ ] 6.8 Update `src/app/(main)/bookings/actions.ts` (`cancelUserBooking`) to also delete all `booking_days` Google Calendar events when a multi-day booking is cancelled.

- [ ] 7.0 Booking edit flow

  - [ ] 7.1 Add an "Edit" button to the user's booking details page/row (`src/app/(main)/bookings/user-booking-table.tsx` or a booking detail page) that navigates to an edit form pre-populated with the booking's current data.
  - [ ] 7.2 Create `src/app/(main)/components/EditBookingForm.tsx` (or re-use/extend `BookingForm.tsx`) that loads the existing booking data and allows editing. For multi-day bookings, load the `booking_days` data and show the `MultiDayDateConfig` component.
  - [ ] 7.3 Create a server action `src/app/(main)/actions/editBooking.ts` that accepts the updated booking data and compares it to the original.
  - [ ] 7.4 In `editBooking.ts`, if date(s) or time(s) have changed (FR-29): (a) delete the old Google Calendar event(s), (b) reset the booking status to `pending` (re-enter approval flow), (c) create new Google Calendar event(s) with `[PENDING]` status, (d) send email notifications to approvers and the booking owner.
  - [ ] 7.5 In `editBooking.ts`, if only non-date fields changed (event name, client name, expected attendance — FR-31): update the booking in place without changing status, and patch the Google Calendar event(s) with updated details.
  - [ ] 7.6 Ensure multi-day bookings are approved/rejected as a whole (FR-32) — the edit flow should not allow editing individual days' approval status.

- [ ] 8.0 Public event calendar page

  - [ ] 8.1 Create the calendar page route: `src/app/(main)/calendar/page.tsx`. This page should be accessible to all users (including guests). Add a `layout.tsx` if needed.
  - [ ] 8.2 Create `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` — a server action that fetches all `confirmed` and `pending` bookings (including `booking_days` for multi-day bookings) from the database. For guest users (no session), return only: room name, time/date, and day type label. For logged-in users, also return: event name, client name, PIC name & phone, expected attendance, booking status.
  - [ ] 8.3 Create `src/app/(main)/calendar/components/EventCalendar.tsx` — a client component wrapping FullCalendar. Configure it with: `dayGridMonth` and `timeGridWeek` views (and `listWeek` for mobile), event click handler, and responsive breakpoints.
  - [ ] 8.4 In `EventCalendar.tsx`, map the fetched bookings to FullCalendar event objects. Use color coding: green for standard bookings, orange/yellow for "Rehearsal / Setup", red/blue for "Main Event Day". Include room name and day type in the event title displayed on the calendar.
  - [ ] 8.5 Add a room filter (dropdown or checkbox group) above the calendar that lets users filter events by room. Support "All Rooms" as the default.
  - [ ] 8.6 Create `src/app/(main)/calendar/components/BookingDetailPopover.tsx` — a popover or dialog that opens when a calendar event is clicked. For logged-in users, show: Event Name, Client Name, Event Manager Name & Phone, Room, Date & Time, Expected Attendance, Day Type, Booking Status. For guests, show a message like "Log in to view booking details."
  - [ ] 8.7 Add a "Calendar" link to the main navigation bar (`src/app/(main)/components/nav-bar.tsx`).
  - [ ] 8.8 In `src/lib/config.ts` (or a new config file), add a `CALENDAR_ACCESS` flag (default: `'public'`) that can be changed to `'restricted'` to limit the calendar page to `admin` and `event_manager` roles in the future (FR-17). Implement a middleware check or server-side redirect based on this flag.

- [ ] 9.0 Google Calendar sync updates for multi-day bookings

  - [ ] 9.1 In `src/lib/google-calendar.ts`, create a new function `createMultiDayCalendarEvents(booking, bookingDays)` that creates one Google Calendar event per day. Each event title should include the day type (e.g., `[PENDING - SETUP] Main Hall - EventName`). Return an array of `{ dayId, eventId }` mappings.
  - [ ] 9.2 In `src/lib/google-calendar.ts`, create `updateMultiDayCalendarEvents(booking, bookingDays)` that updates or deletes all calendar events for a multi-day booking based on the new status (confirmed → patch titles, rejected/cancelled → delete all).
  - [ ] 9.3 In `src/lib/google-calendar.ts`, create `deleteCalendarEvent(eventId)` as a standalone helper (extract from the existing `updateCalendarEvent` switch case) for use when editing bookings with date changes.
  - [ ] 9.4 Update the existing `createCalendarEvent` and `updateCalendarEvent` functions to include day type in the event title/description when the booking has a `booking_type` of `'multi_day'`.
  - [ ] 9.5 Update `src/lib/sendBookingEmail.ts` to include multi-day booking details in email templates: list each day with its date, time, and day type. Update the `renderBookingDetailsHtml` function to handle the new fields.

- [ ] 10.0 Integration testing & polish
  - [ ] 10.1 Manually test the full standard booking flow (single-day, regular member) to ensure no regressions.
  - [ ] 10.2 Test Event Manager multi-day booking: create a 3+ day booking with mixed day types (rehearsal + main event), verify all days appear in the database, calendar page, and Google Calendar.
  - [ ] 10.3 Test Main Hall ↔ Lobby dependency: (a) Book Main Hall as "Main Event Day" → verify Lobby shows as unavailable. (b) Book Main Hall as "Rehearsal / Setup" → verify Lobby remains available. (c) Book Lobby as "Main Event" → verify Main Hall cannot be booked as "Main Event Day" but can be booked as "Rehearsal / Setup".
  - [ ] 10.4 Test concurrent booking conflict prevention: attempt to double-book the same room/time from two browser sessions simultaneously — verify one is rejected.
  - [ ] 10.5 Test booking edit flow: (a) Edit date/time → verify status resets to pending, old calendar events deleted, new ones created, emails sent. (b) Edit non-date fields → verify no status change, calendar events updated in place.
  - [ ] 10.6 Test calendar page: verify week/month view navigation, room filtering, event color coding, detail popover (logged-in vs. guest).
  - [ ] 10.7 Test Google Calendar sync: verify events appear with correct titles/day types, are updated on approval, and deleted on rejection/cancellation.
  - [ ] 10.8 Test mobile responsiveness: verify calendar page switches to list/agenda view on small screens, booking forms are usable on mobile.
  - [ ] 10.9 Run `pnpm build` to verify there are no TypeScript or build errors.
  - [ ] 10.10 Run `pnpm lint` to verify no linting issues.
