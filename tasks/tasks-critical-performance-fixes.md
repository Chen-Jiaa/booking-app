## Relevant Files

- `src/lib/supabase/server.ts` - Add React `cache()` wrapper for `createClient()` and new `getAuthUser()` helper
- `src/app/(main)/actions/getUserProfile.ts` - Refactor to use cached `getAuthUser()` instead of direct `supabase.auth.getUser()`
- `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` - Refactor to use cached `getAuthUser()`, parallelize where possible
- `src/app/(admin)/admin/components/admin-booking-table-2.tsx` - Enhance with column sorting, column visibility toggle, email filter, and email column from old table
- `src/app/(admin)/admin/components/admin-booking-table.tsx` - Old table component to be deleted after feature migration
- `src/app/(admin)/admin/page.tsx` - Already fetches server-side; update to pass any new props needed by enhanced Table2
- `src/app/(admin)/actions/booking-status-change.ts` - Already handles Google Calendar sync via `google-calendar` lib — verify no changes needed
- `src/app/(main)/components/BookingForm.tsx` - Accept `initialProfile` prop, remove `useEffect` fetch pattern
- `src/app/(main)/components/RoomList.tsx` - Pass `initialProfile` through to `BookingForm`
- `src/app/(main)/page.tsx` - Fetch `getUserProfile()` server-side and pass to `RoomList`
- `src/app/(main)/calendar/page.tsx` - Fetch initial calendar events server-side and pass to EventCalendarLoader
- `src/app/(main)/calendar/components/EventCalendarLoader.tsx` - Pass `initialEvents` prop through to EventCalendar
- `src/app/(main)/calendar/components/EventCalendar.tsx` - Accept `initialEvents` prop, use as initial state instead of empty array

### Notes

- No new dependencies are required. Uses existing: `react` (`cache`), `@supabase/ssr`, `drizzle-orm`, `@tanstack/react-table`.
- The visual appearance of all components should remain the same — only the data loading pattern changes.
- Row selection/checkboxes are intentionally NOT ported from the old admin table (per resolved decision).
- Use `npx eslint .` to lint after each task.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:

- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

**Before marking any task as complete**, run `npx eslint .` (or the relevant file path) and fix all linting errors. Do not check off a task until ESLint passes cleanly.

## Tasks

- [x] 0.0 Create feature branch

  - [x] 0.1 Create and checkout a new branch: `git checkout -b feature/critical-performance-fixes`

- [ ] 1.0 Consolidate Auth Lookups — Add cached `getAuthUser()` helper using React `cache()`

  - [x] 1.1 Read `src/lib/supabase/server.ts` to understand the current `createClient()` and `getUserAndRole()` implementations.
  - [x] 1.2 Import `cache` from `react` at the top of `src/lib/supabase/server.ts`.
  - [x] 1.3 Create and export a `getAuthUser` function wrapped with React `cache()`. It should call `createClient()` to get the Supabase client, then call `supabase.auth.getUser()`, and return the `user` object (or `null` if unauthenticated). This ensures `supabase.auth.getUser()` is called at most once per server request no matter how many callers invoke `getAuthUser()`.
  - [x] 1.4 Refactor `getUserAndRole()` in the same file to call `getAuthUser()` instead of independently calling `createClient()` + `supabase.auth.getUser()`. It should still create its own Supabase client (via `createClient()`) for the profile query, but the auth check must come from the cached helper.
  - [x] 1.5 In `getUserAndRole()`, after getting the user from `getAuthUser()`, fetch the profile role. Since the auth result is already resolved from cache, the profile query can proceed immediately without an extra auth round-trip.
  - [x] 1.6 Run `npx eslint src/lib/supabase/server.ts` and fix any linting errors.

- [x] 2.0 Refactor server actions to use cached auth helper

  - [x] 2.1 Read `src/app/(main)/actions/getUserProfile.ts` to understand the current implementation.
  - [x] 2.2 Refactor `getUserProfile()` to import and call `getAuthUser()` from `@/lib/supabase/server` instead of creating its own Supabase client and calling `supabase.auth.getUser()`. Remove the `createClient` import if no longer needed.
  - [x] 2.3 Run `npx eslint src/app/(main)/actions/getUserProfile.ts` and fix any linting errors.
  - [x] 2.4 Read `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` to understand the current implementation.
  - [x] 2.5 Refactor `fetchCalendarBookings()` to import and call `getAuthUser()` from `@/lib/supabase/server` instead of independently calling `createClient()` + `supabase.auth.getUser()`. The function still needs a Supabase client for the data queries — keep `createClient()` for that, but the auth check must come from `getAuthUser()`.
  - [x] 2.6 In `fetchCalendarBookings()`, restructure so the auth check (`getAuthUser()`) and the Supabase data queries run in parallel where possible. Since `getAuthUser()` is cached, call it alongside the data fetch using `Promise.all` or concurrent awaits. Use the auth result afterward to decide which fields to include in the response (sensitive fields like `picName`, `picPhone` etc. are only included when logged in).
  - [x] 2.7 Run `npx eslint src/app/(main)/calendar/actions/fetchCalendarBookings.ts` and fix any linting errors.

- [x] 3.0 Enhance admin bookings table (Table2) with missing features from old table

  - [x] 3.1 Read `src/app/(admin)/admin/components/admin-booking-table.tsx` (old table) and `src/app/(admin)/admin/components/admin-booking-table-2.tsx` (Table2) side by side to identify the features that exist in the old table but are missing from Table2.
  - [x] 3.2 Refactor `Table2` to use `@tanstack/react-table`'s `useReactTable` hook (already a project dependency) instead of manually mapping rows. This enables client-side sorting, filtering, and column visibility on top of the server-side paginated data. Define column definitions (`ColumnDef<Bookings>[]`) matching the current columns: Name, Phone, Email, Room, Booking Date, Start Time, End Time, Status.
  - [x] 3.3 Add the **Email column** to Table2's column definitions. It should be **visible by default** (do NOT set `email: false` in initial `VisibilityState` — this differs from the old table which hid it). Use the same cell renderer pattern as the old table (`<div className="lowercase ml-4">`).
  - [x] 3.4 Add **column sorting** to Table2. Each column header should render a `<Button variant="ghost">` with an `<ArrowUpDown />` icon that calls `column.toggleSorting()` on click, matching the old table's pattern. Enable `getSortedRowModel()` in the `useReactTable` config.
  - [x] 3.5 Add the **email filter input** to Table2. Render an `<Input>` above the table that filters the `email` column (using `table.getColumn("email")?.setFilterValue()`), matching the old table's pattern. Enable `getFilteredRowModel()` in the `useReactTable` config.
  - [x] 3.6 Add the **column visibility toggle dropdown** to Table2. Render a `<DropdownMenu>` with `<DropdownMenuCheckboxItem>` entries for each hideable column, matching the old table's "Columns" dropdown pattern. Wire it to `column.toggleVisibility()`.
  - [x] 3.7 Keep the existing server-side `<Pagination>` component in Table2. The TanStack table should NOT add its own client-side pagination — the data is already paginated by the server. Do NOT add `getPaginationRowModel()`.
  - [x] 3.8 Ensure the status change dropdown in Table2 continues to call the `updateBookingStatus` server action. Verify that `booking-status-change.ts` already handles Google Calendar sync (it does — it calls `updateCalendarEvent` / `createCalendarEvent` / `deleteCalendarEvent` from `@/lib/google-calendar`). No changes needed to the server action.
  - [x] 3.9 Update `src/app/(admin)/admin/page.tsx` if any new props are needed by the enhanced Table2 (e.g., if the interface changed). The page already fetches bookings server-side and passes `bookingData`, `page`, and `pageCount` — these should remain the same.
  - [x] 3.10 Run `npx eslint src/app/(admin)/admin/components/admin-booking-table-2.tsx src/app/(admin)/admin/page.tsx` and fix any linting errors.
  - [ ] 3.11 Manually test: navigate to the admin dashboard, verify the table renders with data immediately (no pop-in), email column is visible, sorting works on all columns, email filter works, column visibility toggle works, and status change dropdown updates bookings.

- [x] 4.0 Move Booking Form profile fetch to server component (RSC)

  - [x] 4.1 Read `src/app/(main)/page.tsx` (server component), `src/app/(main)/components/RoomList.tsx` (client component), and `src/app/(main)/components/BookingForm.tsx` (client component) to understand the current data flow.
  - [x] 4.2 In `src/app/(main)/page.tsx`, import `getUserProfile` from `../actions/getUserProfile` and call it server-side (alongside the existing room fetch). Pass the result as an `initialProfile` prop to `<RoomList>`.
  - [x] 4.3 Update the `RoomList` component's props interface to accept `initialProfile` (type: `{ email: string | null; fullName: string | null; phone: string | null } | null`). Thread this prop down to `<BookingForm2>` as `initialProfile`.
  - [x] 4.4 Update `BookingForm.tsx`: add an `initialProfile` prop to the `BookingFormProps` interface (type: `{ email: string | null; fullName: string | null; phone: string | null } | null`).
  - [x] 4.5 In `BookingForm.tsx`, use `initialProfile` to set `defaultValues` in the `useForm()` call: `name: initialProfile?.fullName ?? ""`, `email: initialProfile?.email ?? ""`, `phone: initialProfile?.phone ?? ""`. This replaces the empty-string defaults.
  - [x] 4.6 Remove the `useEffect` + `loadProfile()` pattern from `BookingForm.tsx` entirely. The form now renders pre-filled on first paint — no client-side fetch needed.
  - [x] 4.7 Remove the `useSupabase` import and `const { user } = useSupabase()` from `BookingForm.tsx` if it was only used for the `useEffect` guard. Check if `user` is still needed for the `submitBooking` call (`userId: user?.id`). If so, keep `useSupabase` but remove the `useEffect`. If `userId` can be resolved server-side in `submitBooking`, remove the client-side dependency entirely.
  - [x] 4.8 Run `npx eslint src/app/(main)/page.tsx src/app/(main)/components/RoomList.tsx src/app/(main)/components/BookingForm.tsx` and fix any linting errors.
  - [x] 4.9 Manually test: navigate to the booking page while logged in, open a room's booking dialog, go to step 2 — verify name, email, and phone are pre-filled immediately with no flash. Test while logged out — verify fields are empty with no errors.

- [x] 5.0 Move Calendar initial events fetch to server component (RSC)

  - [x] 5.1 Read `src/app/(main)/calendar/page.tsx`, `src/app/(main)/calendar/components/EventCalendarLoader.tsx`, and `src/app/(main)/calendar/components/EventCalendar.tsx` to understand the current data flow.
  - [x] 5.2 In `src/app/(main)/calendar/page.tsx`, calculate the current month's date range (first day of current month to first day of next month in ISO format). Call `fetchCalendarBookings(rangeStart, rangeEnd)` server-side and capture the result.
  - [x] 5.3 Pass the fetched events as an `initialEvents` prop to `<EventCalendarLoader>`. Also pass `isLoggedIn` as before (it's already passed).
  - [x] 5.4 Update `EventCalendarLoader.tsx` to accept the `initialEvents` prop (type: `CalendarEvent[]`) and pass it through to `<EventCalendar>`.
  - [x] 5.5 Update `EventCalendar.tsx`: add `initialEvents` to the `EventCalendarProps` interface (type: `CalendarEvent[]`).
  - [x] 5.6 In `EventCalendar.tsx`, initialize the `events` state with `initialEvents` instead of an empty array: `useState<CalendarEvent[]>(initialEvents)`.
  - [x] 5.7 Ensure the `handleDatesSet` callback (triggered by FullCalendar on mount and on navigation) still fetches events client-side for subsequent month changes. On the initial render, FullCalendar will fire `datesSet` — this will re-fetch the same month's data. This is acceptable and ensures the pattern stays simple. (Optionally, you can skip the fetch if the date range matches the initial range, but this is not required.)
  - [x] 5.8 Run `npx eslint src/app/(main)/calendar/page.tsx src/app/(main)/calendar/components/EventCalendarLoader.tsx src/app/(main)/calendar/components/EventCalendar.tsx` and fix any linting errors.
  - [ ] 5.9 Manually test: navigate to the calendar page — verify events for the current month are visible immediately on first paint (no empty calendar flash). Navigate to a different month — verify events load correctly via client-side fetch.

- [x] 6.0 Remove old admin-booking-table.tsx and clean up dead code
  - [x] 6.1 Search the codebase for any imports or references to `admin-booking-table.tsx` or the `AdminTable` component. Verify nothing else depends on it.
  - [x] 6.2 Delete `src/app/(admin)/admin/components/admin-booking-table.tsx`.
  - [x] 6.3 Search for any remaining imports of `@/lib/supabase/client` in admin-related files. If Table2 or any admin component still imports the browser Supabase client, remove it — all admin data fetching should go through server components or server actions.
  - [x] 6.4 Run `npx eslint .` across the full project and fix any linting errors.
  - [x] 6.5 Run `npx next build` to verify the project builds without errors.
