# Room Booking App — System Overview

> **Audience:** AI agents and developers. This document is the primary reference for understanding the full architecture, data model, workflows, and conventions of this codebase.

---

## 1. Purpose & Scope

A room booking platform for **Collective** (a church/organization) that allows members to browse rooms, select time slots, and submit booking requests. Admins approve or reject bookings, manage rooms, and oversee schedules. All bookings sync to Google Calendar with email notifications at every decision point.

The system supports two booking types:

- **Standard bookings** — single-day, hourly time slots for regular members.
- **Multi-day bookings** — date-range bookings with per-day time and type configuration, available to Event Managers and Admins.

---

## 2. Tech Stack

| Category | Technology | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Server-first rendering, server actions for mutations |
| Language | **TypeScript 5** | Strict mode enabled |
| UI | **React 18**, **Tailwind CSS 3**, **shadcn/ui** (Radix primitives) | Component library in `src/components/ui/` |
| Auth | **Supabase Auth** (`@supabase/ssr`) | Session-based, cookie-managed |
| Database | **PostgreSQL** via Supabase | Accessed through both Supabase client and Drizzle ORM |
| ORM | **Drizzle ORM** (`drizzle-orm` + `postgres`) | Schema in `src/db/schema.ts`, migrations in `supabase/migrations/` |
| Calendar | **FullCalendar** (`@fullcalendar/react`) | Public calendar page with day/week/month views |
| Google Calendar | **@googleapis/calendar** | Outbound sync — app creates/updates/deletes events on a shared Google Calendar |
| Email | **Resend** | Transactional emails (approval requests, confirmations, rejections) |
| Forms | **react-hook-form** + **Zod** | Validation with `@hookform/resolvers` |
| Tables | **TanStack Table** (`@tanstack/react-table`) | Admin booking tables, user tables |
| URL State | **nuqs** | URL query string state management |
| Date/Time | **date-fns** + **date-fns-tz** | Timezone: `Asia/Kuala_Lumpur` / `Asia/Singapore` |
| Analytics | **Vercel Analytics** + **Speed Insights** | Injected in root layout |
| Package Manager | **pnpm** (v10.2.0) | Lockfile: `pnpm-lock.yaml` |
| Linting | **ESLint** (flat config) + **Prettier** | Config: `eslint.config.mjs` |

---

## 3. Architecture

### 3.1 — App Router Structure

The app uses Next.js App Router with **route groups** (parenthesized directories that do not appear in the URL):

```
src/app/
├── layout.tsx              # Root layout — SupabaseProvider, Analytics, global CSS
├── globals.css
├── (main)/                 # Public + member-facing routes
│   ├── layout.tsx          # NavBar + Footer shell
│   ├── page.tsx            # Homepage — room list (SSR)
│   ├── (auth)/             # Auth pages (login, signup, verify, email-confirmation)
│   ├── bookings/           # /bookings — user's booking list + edit flow
│   ├── calendar/           # /calendar — public FullCalendar page
│   ├── settings/           # /settings — user profile editor
│   ├── booking-confirmation/
│   ├── actions/            # Server actions for booking operations
│   └── components/         # Shared components (forms, nav, etc.)
├── (admin)/                # Admin-only routes
│   ├── layout.tsx          # Sidebar shell (AppSidebar + SidebarInset)
│   ├── admin/
│   │   ├── page.tsx        # /admin — recent bookings dashboard
│   │   ├── bookings/       # /admin/bookings — approve/reject routes
│   │   ├── calendar/       # /admin/calendar — admin weekly calendar
│   │   ├── rooms/          # /admin/rooms — room CRUD
│   │   ├── users/          # /admin/users — user/role management
│   │   └── components/     # Admin components (sidebar, tables)
│   └── actions/            # Admin server actions
└── api/                    # API routes (currently empty directory)
```

### 3.2 — Data Access (Hybrid Model)

This codebase uses a **hybrid data access pattern** — both Supabase client queries and Drizzle ORM direct PostgreSQL queries coexist:

| Method | Used For | Location |
|---|---|---|
| **Supabase client** (server) | Auth operations, simple reads in server components (e.g., room list on homepage), reads in middleware | `src/lib/supabase/server.ts` → `createClient()` |
| **Supabase client** (browser) | Auth state management, real-time session tracking | `src/lib/supabase/client.ts` → `supabase` singleton |
| **Drizzle ORM** | All server action mutations (inserts, updates, deletes), complex queries, transactions | `src/db/index.ts` → `db` instance, schema in `src/db/schema.ts` |

> **Important:** When writing new server actions, follow the existing pattern — use Drizzle for transactional writes and Supabase client for auth checks within the same action.

### 3.3 — Server vs Client Responsibilities

| Concern | Server | Client |
|---|---|---|
| Auth checks | `getUserAndRole()`, middleware | `useSupabase()` hook for role/user state |
| Data fetching | Server components with Supabase client, server actions | Fetches via server actions |
| Mutations | All via `'use server'` actions | Triggers via form submissions, button clicks |
| Google Calendar sync | Inside server actions (outside DB transactions) | N/A |
| Email sending | Via `after()` callback in server actions (non-blocking) | N/A |

### 3.4 — Middleware

**File:** `src/middleware.ts` → delegates to `src/lib/supabase/middleware.ts`

**Matcher:** `/admin/:path*`, `/bookings/:path*`

**Behavior:**
1. Refreshes Supabase session cookies on every matched request.
2. Redirects unauthenticated users to `/login`.
3. For `/admin/*` routes — additionally checks `profiles.role === 'admin'`; redirects non-admins to `/`.

**Not covered by middleware:** `/`, `/calendar`, `/settings`, `/booking-confirmation`, auth pages. These routes handle their own access control (or are intentionally public).

---

## 4. Route Map

### Public Routes (no auth required)

| Route | Description |
|---|---|
| `/` | Homepage — browse available rooms |
| `/login` | Login page |
| `/signup` | Sign-up page |
| `/verify` | Email verification prompt |
| `/email-confirmation` | Post-verification confirmation |
| `/calendar` | Public event calendar (access controlled by `CALENDAR_ACCESS` config flag) |

### Authenticated Routes (member+)

| Route | Description |
|---|---|
| `/bookings` | User's booking list with statuses |
| `/bookings/[id]/edit` | Edit an existing booking |
| `/settings` | User profile editor (name, email, phone) |
| `/booking-confirmation` | Post-booking confirmation page |

### Admin Routes (admin role only)

| Route | Description |
|---|---|
| `/admin` | Admin dashboard — recent bookings table |
| `/admin/bookings/approve/[id]` | One-click approve from email link |
| `/admin/bookings/reject/[id]` | One-click reject from email link |
| `/admin/calendar` | Admin weekly room calendar |
| `/admin/rooms` | Room CRUD management |
| `/admin/users` | User list + role management |

---

## 5. Authentication & Authorization

### Auth Flow

- **Provider:** Supabase Auth (email/password with email verification)
- **Session management:** Cookie-based via `@supabase/ssr`
- **Middleware** refreshes cookies and enforces route protection

### Role System

Source of truth: `profiles.role` column in the database.

| Role | Value | Permissions |
|---|---|---|
| Regular Member | `user` (default) | Browse rooms, create standard bookings, view/cancel/edit own bookings |
| Event Manager | `event_manager` | All member permissions + create multi-day bookings with per-day configuration |
| Admin | `admin` | All permissions + approve/reject bookings, manage rooms, manage users, access admin panel |

### Role Resolution

- **Server-side:** `getUserAndRole()` in `src/lib/supabase/server.ts` — fetches user from auth, then queries `profiles.role`.
- **Client-side:** `useSupabase()` hook from `src/components/providers/supabase-providers.tsx` — provides `{ user, role, loading }`.
- **Helper functions:** `src/lib/roles.ts` — `isEventManager(role)`, `canCreateMultiDayBooking(role)`.

---

## 6. Data Model

### 6.1 — `profiles`

User metadata linked to Supabase Auth users.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK, FK → auth.users) | Supabase Auth user ID |
| `full_name` | text | Display name |
| `email` | varchar | User email |
| `phone` | text | Phone number (optional, saved back from booking form) |
| `role` | text | `'user'` \| `'admin'` \| `'event_manager'` (default: `'user'`) |
| `username` | text (unique) | Optional username |
| `avatar_url` | text | Optional avatar |
| `website` | text | Optional website |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Set on profile updates |

### 6.2 — `rooms`

Room definitions and configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | varchar(255) | Room name |
| `description` | text | Room description |
| `capacity` | integer | Seating capacity |
| `availability` | boolean | `true` = visible and bookable; `false` = hidden |
| `approval_required` | boolean | If `true`, bookings start as `pending`; if `false`, auto-confirmed |
| `approvers` | text[] | Array of email addresses notified on new bookings |
| `available_to` | text | Availability visibility scope |
| `image` | text | Room image URL |
| `dependency_group` | text | Rooms sharing the same group have inter-dependency logic (e.g., `'main_hall_lobby'`) |
| `created_at` | timestamptz | Auto-set |

### 6.3 — `bookings`

Parent booking records (both standard and multi-day).

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial (PK) | Auto-increment |
| `user_id` | uuid (FK → auth.users) | Booking creator (nullable, `onDelete: 'set null'`) |
| `room_id` | uuid (FK → rooms) | Booked room |
| `room_name` | text | Denormalized room name |
| `name` | text | Booker's name |
| `email` | text | Booker's email |
| `phone` | text | Booker's phone |
| `purpose` | text | Booking purpose (from predefined options or free text) |
| `start_time` | timestamptz | Booking start (or overall start for multi-day) |
| `end_time` | timestamptz | Booking end (or overall end for multi-day) |
| `status` | text | `'pending'` \| `'confirmed'` \| `'rejected'` \| `'cancelled'` |
| `event_id` | text | Google Calendar event ID (standard bookings) |
| `booking_type` | text | `'standard'` (default) \| `'multi_day'` |
| `is_multi_day` | boolean | `false` (default) — **must stay in sync** with `booking_type` |
| `event_name` | text | Event name (multi-day / event manager bookings) |
| `client_name` | text | Client name (multi-day bookings) |
| `expected_attendance` | integer | Expected attendance count |
| `parent_booking_id` | integer | Links a lobby booking to its parent Main Hall booking |
| `created_at` | timestamptz | Auto-set |

> ⚠️ **Gotcha:** `booking_type` and `is_multi_day` are **redundant fields** that must always be kept in sync. `is_multi_day: true` ↔ `booking_type: 'multi_day'`. Both are checked in different parts of the code.

### 6.4 — `booking_days`

Per-day details for multi-day bookings. One row per day in a multi-day booking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `booking_id` | integer (FK → bookings, cascade delete) | Parent booking |
| `date` | timestamptz | The specific day |
| `start_time` | timestamptz (nullable) | `null` when `is_all_day` is true |
| `end_time` | timestamptz (nullable) | `null` when `is_all_day` is true |
| `is_all_day` | boolean | If true, blocks 08:00–23:30 |
| `day_type` | text | `'rehearsal_setup'` \| `'main_event'` |
| `event_id` | text | Google Calendar event ID for this specific day |
| `created_at` | timestamptz | Auto-set |

### 6.5 — `unavailable_periods`

Admin-defined blackout windows for rooms.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `room_id` | uuid (FK → rooms, cascade delete) | Affected room |
| `start_time` | timestamptz | Block start |
| `end_time` | timestamptz | Block end |
| `reason` | text | Why the room is blocked |
| `created_at` | timestamptz | Auto-set |

### 6.6 — Entity Relationships

```
auth.users (1) ──── (1) profiles
    │
    └── (1) ──── (many) bookings
                    │
                    ├── (1) ──── (many) booking_days
                    │
                    └── room_id ──── rooms
                                      │
                                      └── (1) ──── (many) unavailable_periods

bookings.parent_booking_id ──── bookings.id  (self-referential for linked lobby bookings)
```

---

## 7. Core Workflows

### 7.1 — Standard Booking Submission

**Action:** `src/app/(main)/actions/submitBooking.ts`

1. Validate input with Zod schema.
2. **DB transaction:** Look up room's `approval_required` and `approvers`. Insert booking row with status = `'pending'` or `'confirmed'`.
3. **Outside transaction:** Create Google Calendar event → store `eventId` back on booking row.
4. **`after()` callback** (non-blocking): Save phone to profile if missing. Send email to approvers (if pending) or confirmation to booker (if auto-confirmed).

### 7.2 — Multi-Day Booking Submission

**Action:** `src/app/(main)/actions/submitMultiDayBooking.ts`

1. Validate input. Compute full timestamps for each day.
2. **Pre-transaction:** Run dependency conflict checks via `isBookingAllowed()` for each day (and lobby if needed).
3. **DB transaction:** Check for direct room conflicts (standard + multi-day). Insert parent `bookings` row (`is_multi_day: true`, `booking_type: 'multi_day'`, `status: 'pending'`). Insert `booking_days` rows. If lobby needed, insert linked lobby booking + days with `parentBookingId`.
4. **Outside transaction:** Create Google Calendar events for each day → store `eventId` on each `booking_days` row. Same for lobby days.
5. **`after()` callback:** Save phone to profile. Send multi-day email to approvers.

### 7.3 — Admin Approval / Rejection

**Actions:** `src/app/(admin)/actions/approve-reject-booking.ts` → `booking-status-change.ts`

1. Verify caller has `admin` role via `getUserAndRole()`.
2. Update booking `status` to `'confirmed'` or `'rejected'`.
3. **If multi-day:** Patch all `booking_days` calendar events (confirmed → update title, rejected → delete). Also update all linked bookings (e.g., lobby).
4. **If standard:** Patch or delete the single Google Calendar event.
5. **`after()` callback:** Send confirmation or rejection email to the booker.
6. **One-click email links:** `/admin/bookings/approve/[id]` and `/admin/bookings/reject/[id]` are page routes that trigger these actions.

### 7.4 — Member Cancellation

**Action:** `src/app/(main)/bookings/actions.ts` → `cancelUserBooking()`

1. **DB transaction:** Set booking status to `'cancelled'`. If multi-day, also cancel linked bookings (lobby). Standard bookings delete their calendar event inside the transaction.
2. **Outside transaction (multi-day):** Delete all `booking_days` calendar events for main + linked bookings.

### 7.5 — Booking Edit Flow

**Action:** `src/app/(main)/actions/editBooking.ts`

Two functions: `editStandardBooking()` and `editMultiDayBooking()`.

| Change Type | Effect |
|---|---|
| Date/time changed | Status resets to `'pending'`, old calendar events deleted, new ones created, approval emails sent |
| Non-date fields only (name, purpose, etc.) | Updated in place, calendar events patched, no status change |

For multi-day edits, linked bookings (lobby) are also updated, and their calendar events are deleted/recreated.

### 7.6 — Time Slot Conflict Prevention

**Action:** `src/app/(main)/actions/getUnavailableSlots.ts`

1. Fetch all `pending` and `confirmed` standard bookings overlapping the selected date.
2. Fetch all `booking_days` for multi-day bookings on that date.
3. Fetch dependency-based conflicts via `getDependencyBlockedSlots()`.
4. Return a `Set<string>` of occupied 30-minute time slots (e.g., `"09:00"`, `"09:30"`).
5. Client-side time picker disables these slots.

---

## 8. Business Rules & Invariants

### Booking Status Lifecycle

```
                  ┌─────────────────────────────┐
                  │                               │
    submit ──→ pending ──→ confirmed              │
                  │                               │
                  └──→ rejected                   │
                                                  │
    submit (no approval) ──→ confirmed            │
                                                  │
    any active status ──→ cancelled ──────────────┘
                                                  
    edit (date change) ──→ pending (re-enters approval flow)
```

### Room Dependencies

**File:** `src/lib/room-dependencies.ts`

The **Main Hall** and **Lobby to Main Hall** share `dependency_group: 'main_hall_lobby'`. Rules are **asymmetric and name-based**:

| Scenario | Main Hall | Lobby |
|---|---|---|
| Main Hall booked as **Main Event Day** | — | **Blocked** for that time |
| Main Hall booked as **Rehearsal / Setup** | — | Remains available |
| Lobby booked independently | Remains available | — |
| Lobby booked as **Main Event** | Cannot be **Main Event Day** (can still be Rehearsal / Setup) | — |

**Stage 8** is fully independent — no dependency logic.

### Booking Purpose Options

Predefined options in `src/lib/getPurposeLabel.ts`:

- Connect Group, Combine Connect Group, Bible Study, Prayer Meeting, Zone Meeting, Practice, Event, Others

### Operating Hours

Defined in `src/lib/config.ts`:

- **Start:** 08:00 (8 AM)
- **End:** 23:30 (11:30 PM)
- **Slot interval:** 30 minutes

### Calendar Access Control

Defined in `src/lib/config.ts`:

- `CALENDAR_ACCESS: 'public' | 'restricted'` — currently `'public'`
- When `'restricted'`, only `admin` and `event_manager` roles can access `/calendar`

### Timezone

The app operates in **Asia/Kuala_Lumpur** (`Asia/Singapore`) timezone. Google Calendar events use `Asia/Singapore` timezone. All date formatting uses `date-fns-tz` with this timezone.

### Phone Number Save-Back

When a user submits a booking and their profile does not yet have a phone number, the phone number from the booking form is automatically saved to their profile (`profiles.phone`).

---

## 9. External Integrations

### 9.1 — Supabase

- **Auth:** Email/password authentication with email verification flow.
- **Database:** PostgreSQL database accessed via Supabase client (reads) and Drizzle ORM (writes/transactions).
- **Session:** Cookie-based session management via `@supabase/ssr`.

### 9.2 — Google Calendar (Outbound Sync)

**File:** `src/lib/google-calendar.ts`

- Uses a **service account** (JWT auth) to manage events on a shared calendar.
- **Standard bookings:** One calendar event per booking. Event title includes status (e.g., `[PENDING] Room by Name for Purpose`).
- **Multi-day bookings:** One calendar event per day. Event title includes status and day type (e.g., `[PENDING - MAIN EVENT] Main Hall - EventName by ClientName`).
- Events are created on submission, patched on approval, and deleted on rejection/cancellation.

### 9.3 — Resend (Email)

**File:** `src/lib/sendBookingEmail.ts`

- **Sender:** `Collective Booking <system@booking.collective.my>`
- **Email types:**
  - `sendBookingEmail` — notification to approvers with approve/reject links
  - `sendBookingConfirmationEmail` — confirmation to booker on approval
  - `sendBookingRejectionEmail` — rejection notification to booker
  - `sendMultiDayBookingEmail` — multi-day booking notification with day table
- **Approve/reject links** in emails point to: `https://booking.collective.my/admin/bookings/approve/[id]` and `https://booking.collective.my/admin/bookings/reject/[id]`

### 9.4 — Vercel

- **Analytics:** `@vercel/analytics` — page view tracking
- **Speed Insights:** `@vercel/speed-insights` — performance monitoring

---

## 10. Side Effects Matrix

| Action | DB Effect | Google Calendar | Email |
|---|---|---|---|
| Submit standard booking (no approval) | Insert booking (`confirmed`) | Create event `[CONFIRMED]` | Confirmation to booker |
| Submit standard booking (approval required) | Insert booking (`pending`) | Create event `[PENDING]` | Notification to approvers |
| Submit multi-day booking | Insert booking + booking_days (`pending`) | Create event per day `[PENDING - TYPE]` | Multi-day notification to approvers |
| Admin approves | Status → `confirmed` | Patch titles to `[CONFIRMED]` | Confirmation to booker |
| Admin rejects | Status → `rejected` | Delete all events | Rejection to booker |
| Member cancels | Status → `cancelled` | Delete all events | — |
| Edit (date change) | Update booking, delete/recreate booking_days | Delete old events, create new `[PENDING]` events | Re-notify approvers |
| Edit (non-date change) | Update fields in place | Patch event titles | — |

---

## 11. Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `DATABASE_URL` | Direct PostgreSQL connection string (for Drizzle ORM) |
| `GOOGLE_CLIENT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Google service account private key |
| `GOOGLE_CALENDAR_ID` | Target Google Calendar ID |
| `RESEND_API_KEY` | Resend API key for sending emails |

All variables are loaded from `.env.local`. The `NEXT_PUBLIC_` prefix makes those variables available in both server and client code.

---

## 12. Key Files Reference

### Data Layer

| File | Responsibility |
|---|---|
| `src/db/schema.ts` | Drizzle ORM schema — all table definitions and exported types |
| `src/db/index.ts` | Drizzle client instance (`db`) — postgres connection |
| `drizzle.config.ts` | Drizzle Kit config — migration output to `supabase/migrations/` |
| `src/types/booking.ts` | TypeScript interfaces for bookings (snake_case, matches DB columns) |
| `src/types/room.ts` | TypeScript interface for rooms |

### Auth & Session

| File | Responsibility |
|---|---|
| `src/lib/supabase/server.ts` | Server-side Supabase client factory + `getUserAndRole()` |
| `src/lib/supabase/client.ts` | Browser-side Supabase client singleton |
| `src/lib/supabase/middleware.ts` | Session refresh + route protection logic |
| `src/middleware.ts` | Middleware entry point (matcher config) |
| `src/components/providers/supabase-providers.tsx` | Client-side auth context (`useSupabase()` hook) |
| `src/lib/roles.ts` | Role helper functions (`isEventManager`, `canCreateMultiDayBooking`) |

### Booking Actions (Server)

| File | Responsibility |
|---|---|
| `src/app/(main)/actions/submitBooking.ts` | Standard single-day booking creation |
| `src/app/(main)/actions/submitMultiDayBooking.ts` | Multi-day booking creation with conflict checks |
| `src/app/(main)/actions/editBooking.ts` | Edit booking (standard + multi-day) with re-approval logic |
| `src/app/(main)/actions/getUnavailableSlots.ts` | Fetch occupied time slots for a room/date |
| `src/app/(main)/actions/fetchRooms.ts` | Fetch available rooms |
| `src/app/(main)/actions/getUserProfile.ts` | Fetch current user's profile |
| `src/app/(main)/actions/updateProfile.ts` | Update user profile |
| `src/app/(main)/bookings/actions.ts` | `cancelUserBooking()` — cancellation + calendar cleanup |
| `src/app/(admin)/actions/approve-reject-booking.ts` | Admin approve/reject entry points |
| `src/app/(admin)/actions/booking-status-change.ts` | Core status update + calendar sync + email |
| `src/app/(admin)/admin/users/actions.ts` | `updateUserRole()` — role management |
| `src/app/(admin)/admin/calendar/actions/create-booking.ts` | Admin calendar booking creation |
| `src/app/(admin)/admin/calendar/actions/fetch-week-bookings.ts` | Admin weekly view data |
| `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` | Public calendar data (access-control-aware) |

### External Integrations

| File | Responsibility |
|---|---|
| `src/lib/google-calendar.ts` | Google Calendar CRUD (create, patch, delete events) |
| `src/lib/sendBookingEmail.ts` | Email templates and sending via Resend |
| `src/lib/room-dependencies.ts` | Main Hall ↔ Lobby dependency logic |

### Components

| File | Responsibility |
|---|---|
| `src/app/(main)/components/BookingForm.tsx` | Standard booking form with profile autofill |
| `src/app/(main)/components/MultiDayBookingForm.tsx` | Event Manager multi-day booking form |
| `src/app/(main)/components/MultiDayDateConfig.tsx` | Per-day configuration table (time, all-day, day type) |
| `src/app/(main)/components/DateTimeSelector.tsx` | Room/date/time picker for standard bookings |
| `src/app/(main)/components/BookingSummary.tsx` | Booking summary display |
| `src/app/(main)/components/EditBookingForm.tsx` | Booking edit form |
| `src/app/(main)/components/RoomList.tsx` | Room cards on homepage |
| `src/app/(main)/components/nav-bar.tsx` | Main navigation bar |
| `src/app/(main)/calendar/components/EventCalendar.tsx` | FullCalendar wrapper component |
| `src/app/(main)/calendar/components/BookingDetailPopover.tsx` | Calendar event detail popover |
| `src/app/(admin)/admin/components/app-sidebar.tsx` | Admin sidebar navigation |
| `src/app/(main)/bookings/user-booking-table.tsx` | User's booking table |

### Configuration & Utilities

| File | Responsibility |
|---|---|
| `src/lib/config.ts` | Operating hours, slot interval, calendar access flag |
| `src/lib/date-utils.ts` | Date/time helpers (combine, format, slot generation) |
| `src/lib/getPurposeLabel.ts` | Purpose value → display label mapping |
| `src/lib/utils.ts` | `cn()` (Tailwind class merge), `getErrorMessage()` |
| `src/lib/composition.ts` | Ref/event handler composition utilities |
| `src/hooks/use-mobile.tsx` | Mobile breakpoint detection hook |

---

## 13. Known Gotchas & Non-Obvious Constraints

1. **Hybrid DB access:** The same app uses Supabase client queries _and_ Drizzle ORM. Server components tend to use Supabase; server actions use Drizzle. Follow the existing pattern of whichever file you're editing.

2. **Redundant multi-day state:** `bookings.booking_type` and `bookings.is_multi_day` must always stay in sync. Both are checked in different queries throughout the codebase.

3. **Room dependency logic is name-based:** The dependency checks in `room-dependencies.ts` compare against literal strings `'Main Hall'` and `'Lobby to Main Hall'`. Renaming these rooms in the database will break dependency logic.

4. **Timezone assumptions:** Google Calendar events are hardcoded to `Asia/Singapore`. Date formatting uses `Asia/Kuala_Lumpur`. These are the same timezone (UTC+8) but the code references both names.

5. **Email links are hardcoded:** Approve/reject email links point to `https://booking.collective.my/...`. This is the production domain, not derived from environment variables.

6. **Middleware coverage gaps:** The middleware matcher only covers `/admin/:path*` and `/bookings/:path*`. Routes like `/settings` are not protected by middleware — they handle auth checks differently (or may be accessible to unauthenticated users).

7. **Google Calendar sync is outbound only:** The app pushes events to Google Calendar. There is no inbound sync (Google Calendar changes are not reflected back in the app).

8. **`parentBookingId` for linked bookings:** When booking Main Hall with Lobby, a separate lobby booking is created with `parentBookingId` pointing to the main booking. Approving/rejecting/cancelling the parent cascades to linked bookings in application code (not via DB foreign key cascade).

9. **`after()` for side effects:** Email notifications and phone save-back use Next.js `after()` to run after the response is sent. These are fire-and-forget — failures are logged but don't cause the request to fail.

10. **No test framework:** The project does not have Jest/Vitest configured. Verification is done via manual testing and `pnpm build` / `pnpm lint`.

---

## 14. How to Change Common Things

### Add a new role
1. Update the type/union in `updateUserRole()` in `src/app/(admin)/admin/users/actions.ts`.
2. Add the role option to the UserTable dropdown in `src/app/(admin)/admin/users/components/UserTable.tsx`.
3. Add role-check helpers in `src/lib/roles.ts`.
4. Update the `SupabaseProvider` typing if needed.
5. Update middleware if the new role needs specific route protection.

### Add a new room
1. Insert into the `rooms` table (via admin UI at `/admin/rooms` or direct DB insert).
2. If it has dependencies, set `dependency_group` and update `src/lib/room-dependencies.ts`.

### Change booking approval logic
1. Room-level approval is controlled by `rooms.approval_required` and `rooms.approvers`.
2. The approval flow is in `src/app/(main)/actions/submitBooking.ts` (standard) and `submitMultiDayBooking.ts` (multi-day).
3. Admin actions are in `src/app/(admin)/actions/`.

### Change calendar sync behavior
1. All Google Calendar operations are in `src/lib/google-calendar.ts`.
2. Calendar events are created in booking submission actions and updated in status change actions.

### Modify room dependency behavior
1. Edit `src/lib/room-dependencies.ts` — both `getBlockedRoomIds()` and `getDependencyBlockedSlots()`.
2. Update `isBookingAllowed()` for server-side conflict validation.
3. Update `getUnavailableSlots()` if the UI conflict display needs changes.

### Add a new booking field
1. Add the column in `src/db/schema.ts`.
2. Update `src/types/booking.ts`.
3. Run `pnpm drizzle-kit generate` then `pnpm drizzle-kit push`.
4. Update the relevant booking form component(s).
5. Update the relevant server action(s).
6. Update email templates in `src/lib/sendBookingEmail.ts` if the field should appear in emails.
7. Update Google Calendar event description in `src/lib/google-calendar.ts` if needed.

---

## 15. Glossary

| Term | Definition |
|---|---|
| **Standard booking** | A single-day, hourly booking created by regular members |
| **Multi-day booking** | A date-range booking spanning multiple days, with per-day configuration |
| **Main Event Day** | A day type for multi-day bookings indicating the primary event day (triggers dependency blocking) |
| **Rehearsal / Setup** | A day type for multi-day bookings indicating preparation (does not trigger full blocking) |
| **Approval-required room** | A room where bookings start as `pending` until an admin approves |
| **Approvers** | Email addresses (stored on the room) that receive notification when a new booking is submitted |
| **Dependency group** | A shared identifier linking rooms that have inter-availability rules (e.g., Main Hall ↔ Lobby) |
| **Unavailable period** | An admin-defined blackout window for a room |
| **Linked booking** | A secondary booking (e.g., Lobby) created alongside a primary booking (e.g., Main Hall) via `parentBookingId` |
| **Event Manager** | A user role that can create multi-day bookings for external paid events |
| **PIC** | Person In Charge — the contact person for a booking |
