# PRD: Critical Performance Fixes — Server-Side Data Fetching & Auth Optimization

## 1. Introduction / Overview

The booking app currently suffers from two critical performance problems that directly impact perceived speed and user experience:

1. **Client-side data fetching after page render** — Three major screens (`admin-booking-table.tsx`, `BookingForm.tsx`, `EventCalendar.tsx`) use `"use client"` components with `useEffect` to fetch data *after* the page is already visible. This causes a visible "pop-in" effect where users see empty states ("No results", blank form fields, empty calendar) before data appears.

2. **Repeated authentication waterfalls** — Every server action that needs user data (`getUserProfile()`, `getUserAndRole()`, `fetchCalendarBookings()`) independently creates a new Supabase client and makes a network round-trip to the Supabase Auth API, followed by a second sequential database query. This creates unnecessary latency on every request.

The goal is to eliminate visible loading flashes and reduce server response times by moving data fetching to server components (RSC) and consolidating auth lookups.

---

## 2. Goals

- **G1:** Eliminate the "pop-in" / empty-state flash on all major pages (admin bookings table, booking form, calendar).
- **G2:** Reduce Largest Contentful Paint (LCP) by at least 40% on the admin dashboard and calendar pages.
- **G3:** Reduce the number of Supabase Auth API round-trips per page load from multiple to exactly one.
- **G4:** Reduce Time to First Byte (TTFB) by consolidating sequential auth + DB queries into parallel or single-pass patterns.

---

## 3. User Stories

- **US1:** As an admin, when I navigate to the admin dashboard, I should immediately see the bookings table with data — not an empty "No results" state that pops in after a delay.
- **US2:** As a user filling out a booking form, my name, email, and phone should already be populated when the form appears — not fill in a second later.
- **US3:** As a user viewing the calendar, I should see events already rendered on the page — not an empty calendar that fills in after loading.
- **US4:** As any user, page transitions should feel fast, with content appearing as the page loads rather than after it.

---

## 4. Functional Requirements

### Problem #1: Move Data Fetching to Server Components

#### 4.1 Admin Bookings Table (`admin-booking-table.tsx`)

1. The admin page (`src/app/(admin)/admin/page.tsx`) already fetches bookings server-side and passes them to `Table2`. The old `admin-booking-table.tsx` (which uses `useEffect` + Supabase client to fetch ALL bookings client-side) should be retired.
2. Migrate any missing features from the old `AdminTable` component into `Table2` or a new consolidated component that receives data via props. Features to preserve:
   - Status change dropdown (approve/reject) — already exists in `Table2` via `updateBookingStatus` server action.
   - Column sorting — add client-side sorting via TanStack Table (already a dependency) while keeping server-side pagination.
   - Column visibility toggle — port the `DropdownMenuCheckboxItem` column toggler from the old table.
   - Email filter — port the email filter input.
   - Email column — show by default (do not hide).
3. Remove the old `admin-booking-table.tsx` component once all needed features are consolidated.
4. Remove the Supabase browser client import (`@/lib/supabase/client`) from any admin table component.

#### 4.2 Booking Form Pre-fill (`BookingForm.tsx`)

5. The user profile data (name, email, phone) must be fetched in the **server component** that renders the booking form page, not inside the client component via `useEffect`.
6. The server component should call `getUserProfile()` and pass the result as a prop (e.g., `initialProfile`) to `BookingForm`.
7. `BookingForm` should use the prop as `defaultValues` in `useForm()` — removing the `useEffect` + `loadProfile()` pattern.
8. If the user is not logged in, `initialProfile` should be `null` and the form renders with empty fields (current behavior, but without the flash).

#### 4.3 Calendar Events (`EventCalendar.tsx`)

9. The calendar page's server component should fetch the **initial set of events for the current month** server-side and pass them as an `initialEvents` prop to `EventCalendar`.
10. `EventCalendar` should render with `initialEvents` on first paint — no empty state. The initial date range should be the current calendar month (matching the default `dayGridMonth` view).
11. Subsequent date range changes (user navigates months) should continue to fetch client-side via the existing `fetchCalendarBookings` server action — this is expected and acceptable since the user initiated the navigation.
12. The rooms list is already fetched server-side (`fetchCalendarRooms`) — keep this pattern.

### Problem #2: Consolidate Auth Lookups

#### 4.4 Single Auth Validation Per Request

13. Create a cached/memoized helper (e.g., `getAuthUser()`) that calls `supabase.auth.getUser()` **once per request** and caches the result for the duration of that server request using React's `cache()` function.
14. `getUserProfile()`, `getUserAndRole()`, and `fetchCalendarBookings()` must all use this shared cached helper instead of each independently calling `supabase.auth.getUser()`.
15. The Supabase server client creation (`createClient()`) should also be wrapped with React `cache()` so only one client instance is created per request.

#### 4.5 Parallel Auth + Profile Queries

16. In `getUserAndRole()`, the auth check and profile query currently run sequentially. After getting the user from the cached auth helper, fetch the profile role in the same query pass or use `Promise.all` where applicable.
17. In `fetchCalendarBookings()`, the auth check should use the cached helper; the auth result should not block the initial data query if possible (fetch bookings + check auth in parallel, then filter sensitive fields based on auth result).

---

## 5. Non-Goals (Out of Scope)

- **Client-side caching / TanStack Query / prefetching** — covered in the separate "Medium Priority" PRD.
- **`loading.tsx` / Suspense boundaries** — covered in the separate "Medium Priority" PRD.
- **Database query optimization or batching** (e.g., `Promise.all` for admin page queries) — covered separately.
- **Schema changes** — no database schema changes required.
- **UI redesign** — the visual appearance of components should remain the same.
- **Row selection / checkbox feature** — not actively used; will not be ported to the consolidated table.

---

## 6. Design Considerations

- The consolidated admin table should look and behave identically to the current table. Users should not notice a visual difference — only that data appears instantly.
- The booking form should render with pre-filled fields on first paint. No layout shift from empty → populated fields.
- The calendar should render with events visible immediately for the current month view.

---

## 7. Technical Considerations

### Server Component Data Flow

```
Server Component (page.tsx)
  ├── Fetches data (bookings / profile / events)
  ├── Passes data as props ↓
  └── Client Component (table / form / calendar)
        └── Renders immediately with data
```

### Key Files to Modify

| File | Change |
|------|--------|
| `src/app/(admin)/admin/page.tsx` | Already fetches server-side — consolidate to use only `Table2` (or enhanced version) |
| `src/app/(admin)/admin/components/admin-booking-table.tsx` | Remove after migrating features to `Table2` |
| `src/app/(admin)/admin/components/admin-booking-table-2.tsx` | Add column sorting, visibility toggle, email filter from old table. Add `/api/update-calendar-event` call to `updateBookingStatus` to sync Google Calendar. |
| `src/app/(admin)/actions/booking-status-change.ts` | Add Google Calendar sync — call `/api/update-calendar-event` after status update (currently missing from `Table2`'s flow) |
| `src/app/(main)/components/BookingForm.tsx` | Accept `initialProfile` prop, remove `useEffect` fetch |
| Booking form parent page (server component) | Fetch `getUserProfile()` and pass to `BookingForm` |
| `src/app/(main)/calendar/components/EventCalendar.tsx` | Accept `initialEvents` prop, use as initial state |
| Calendar parent page (server component) | Fetch initial events server-side, pass to `EventCalendar` |
| `src/lib/supabase/server.ts` | Wrap `createClient()` and add `getAuthUser()` with React `cache()` |
| `src/app/(main)/actions/getUserProfile.ts` | Use cached `getAuthUser()` instead of direct `supabase.auth.getUser()` |
| `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` | Use cached `getAuthUser()`, parallelize where possible |

### React `cache()` Pattern for Auth

```typescript
import { cache } from 'react'

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
```

This ensures that within a single server request, no matter how many components or server actions call `getAuthUser()`, the Supabase Auth API is hit exactly once.

### Dependencies

- No new dependencies required.
- Uses existing: `react` (`cache`), `@supabase/ssr`, `drizzle-orm`, `@tanstack/react-table`.

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| LCP (admin dashboard) | Reduce by ≥ 40% |
| LCP (calendar page) | Reduce by ≥ 40% |
| TTFB (pages with auth) | Reduce by ≥ 30% (fewer auth round-trips) |
| "Pop-in" flash | Eliminated on admin table, booking form, and calendar |
| Supabase Auth API calls per page load | Exactly 1 (down from 2-3+) |
| Vercel Speed Insights — real user LCP | Measurable improvement within 1 week of deployment |

---

## 9. Resolved Decisions

1. **Row selection in admin table** — Not actively used. Skip porting checkboxes to the consolidated table.
2. **Calendar initial date range** — Fetch the current month on the server (matching the default `dayGridMonth` view).
3. **Calendar update API call** — `Table2`'s `updateBookingStatus` server action does **not** currently call `/api/update-calendar-event`. This must be added so Google Calendar stays in sync when admins approve/reject bookings.
4. **Email column default visibility** — Show the email column by default (do not hide it like the old table did).
