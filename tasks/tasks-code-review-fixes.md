# Code Review Fixes — Vercel React Best Practices

Based on a comprehensive code review using the Vercel React Best Practices skill, 15 issues were identified across 10 files. Tasks are ordered by logical dependency and severity.

## Relevant Files

- `src/app/api/approve/route.ts` - CRITICAL: GET mutation with no auth, to be replaced with Server Action (Issues #1)
- `src/app/api/reject/route.ts` - CRITICAL: GET mutation with no auth, to be replaced with Server Action (Issue #2)
- `src/app/api/insert-booking/route.ts` - CRITICAL: No auth, service-role client exposure, to be deleted (Issues #3, #4)
- `src/lib/supabase/server-client.ts` - HIGH: Global service-role client export, to be deleted or guarded (Issue #9)
- `src/app/(admin)/admin/components/nav-user.tsx` - MEDIUM: Broken signOut handler (Issue #15)
- `src/app/layout.tsx` - NEW: Root layout to be created for shared html/body tags (Issues #5, #6)
- `src/app/(main)/layout.tsx` - HIGH: Remove duplicate html/body, keep route-specific UI (Issue #5)
- `src/app/(admin)/layout.tsx` - HIGH: Remove duplicate html/body, keep route-specific UI (Issue #6)
- `src/app/(admin)/admin/users/components/UserTable.tsx` - MEDIUM: Client-side role mutation, useEffect fetching (Issues #10, #12)
- `src/app/(admin)/admin/users/actions.ts` - NEW: Server Action for role changes (Issue #10)
- `src/app/(admin)/admin/rooms/components/AddRoomForm.tsx` - MEDIUM: Client-side room creation (Issue #11)
- `src/app/(admin)/admin/rooms/actions.ts` - Existing Server Actions file, add room creation here (Issue #11)
- `src/app/(main)/actions/submitBooking.ts` - HIGH: Calendar API in transaction, blocking email (Issues #7, #8)
- `src/app/(admin)/actions/booking-status-change.ts` - MEDIUM: Blocking email, mixed Supabase/Drizzle access (Issues #13, #14)
- `src/lib/sendBookingEmail.ts` - Related: Contains approve/reject email links that reference the old API routes (Issues #1, #2)
- `src/lib/supabase/server.ts` - Reference: Contains `getUserAndRole()` helper for auth checks
- `src/middleware.ts` - Reference: Current middleware only protects `/admin/*` and `/bookings/*`, not `/api/*`

### Notes

- Security fixes (Tasks 1–2) must be deployed before any other changes.
- Layout consolidation (Task 3) may affect routing; test all route groups after changes.
- The approve/reject email links in `sendBookingEmail.ts` currently point to the old GET API routes — Task 1 must also update these links.
- The `insert-booking` API route is unused (booking submission goes through the `submitBooking` Server Action) — verify before deleting.
- Use `pnpm dev` to verify changes locally and `pnpm build` to check for build errors.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:

- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch

  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b fix/code-review-fixes`)

- [x] 1.0 Fix critical API route security vulnerabilities (Issues #1, #2, #3, #4, #9)

  - [x] 1.1 **Approve/Reject routes → Server Actions:** Create a new file `src/app/(admin)/actions/approve-reject-booking.ts` with two Server Actions: `approveBooking(bookingId: number)` and `rejectBooking(bookingId: number)`. Each must: (a) call `getUserAndRole()` to verify the caller is an `admin`, (b) update the booking status in the database using Drizzle ORM (not Supabase client), (c) trigger the appropriate Google Calendar update, and (d) send the confirmation/rejection email.
  - [x] 1.2 **Update email links:** In `src/lib/sendBookingEmail.ts`, replace the approve/reject `<a href>` links (which currently call `GET /api/approve?id=...` and `GET /api/reject?id=...`) with links that navigate to an admin booking management page (e.g., `https://booking.collective.my/admin/bookings`) instead of performing mutations via URL. The actual approve/reject actions will be triggered from the admin UI using the new Server Actions.
  - [x] 1.3 **Delete old API routes:** Delete the directories `src/app/api/approve/` and `src/app/api/reject/` entirely, since their functionality is replaced by the Server Actions from step 1.1.
  - [x] 1.4 **Audit `insert-booking` API route usage:** Search the codebase for any references to `/api/insert-booking`. If it is unused (booking submission is handled by the `submitBooking` Server Action), delete `src/app/api/insert-booking/` entirely. If it is used, add authentication (call `getUserAndRole()` or check session) and replace the service-role Supabase import with the authenticated server client or Drizzle.
  - [x] 1.5 **Guard or remove service-role client:** If `src/lib/supabase/server-client.ts` has no remaining imports after steps 1.3–1.4, delete the file. If other files still import it, add a prominent `// WARNING: This client bypasses RLS. Only use in server-side code that requires admin privileges.` comment and consider renaming to `admin-client.ts` to make the risk obvious.
  - [x] 1.6 **Verify:** Run `pnpm build` to ensure no broken imports. Manually test the admin booking approval flow from the admin UI.

- [x] 2.0 Fix broken signOut handler (Issue #15)

  - [x] 2.1 In `src/app/(admin)/admin/components/nav-user.tsx`, on line 54, change `onClick={() => void signOut}` to `onClick={() => { void signOut() }}` — the current code references the function without calling it, so clicking "Log out" does nothing.
  - [x] 2.2 **Verify:** Run `pnpm dev`, navigate to the admin sidebar, and confirm clicking "Log out" actually signs the user out and refreshes the page.

- [x] 3.0 Consolidate layouts into a shared root layout (Issues #5, #6)

  - [x] 3.1 **Create root layout:** Create `src/app/layout.tsx` with the shared `<html>` and `<body>` tags, `<SupabaseProvider>`, `<SpeedInsights>`, and `<Analytics>`. This becomes the single source for the document shell.
  - [x] 3.2 **Refactor `(main)` layout:** In `src/app/(main)/layout.tsx`, remove the `<html>`, `<body>`, `<SupabaseProvider>`, `<SpeedInsights>`, and `<Analytics>` wrappers. Keep only the route-group-specific UI: `<NavBar>`, `{children}`, and `<Footer>`.
  - [x] 3.3 **Refactor `(admin)` layout:** In `src/app/(admin)/layout.tsx`, remove the `<html>`, `<body>`, `<SupabaseProvider>`, `<SpeedInsights>`, and `<Analytics>` wrappers. Keep only the route-group-specific UI: `<SidebarProvider>`, `<AppSidebar>`, `<SidebarInset>`, header, `{children}`, and `<Footer>`.
  - [x] 3.4 **Move `globals.css` import:** Ensure `globals.css` is imported only in the new root `src/app/layout.tsx`, and remove duplicate imports from `(main)/layout.tsx` and `(admin)/layout.tsx`.
  - [x] 3.5 **Verify:** Run `pnpm dev`. Navigate between main pages (`/`, `/bookings`) and admin pages (`/admin/bookings`, `/admin/rooms`) to confirm: (a) no full-page reloads between route groups, (b) styles load correctly, (c) Supabase auth context is preserved across route groups.

- [x] 4.0 Move client-side mutations to authenticated Server Actions (Issues #10, #11)

  - [x] 4.1 **Create user role Server Action:** Create `src/app/(admin)/admin/users/actions.ts` with a `updateUserRole(userId: string, newRole: 'admin' | 'event_manager' | 'user')` Server Action. It must: (a) call `getUserAndRole()` to verify the caller is an `admin`, (b) use Drizzle ORM to update the `profiles` table (`db.update(profiles).set({ role: newRole }).where(eq(profiles.id, userId))`), (c) call `revalidatePath('/admin/users')`.
  - [x] 4.2 **Update UserTable.tsx:** Refactor `src/app/(admin)/admin/users/components/UserTable.tsx` to call the new `updateUserRole` Server Action instead of directly mutating via the client-side Supabase SDK (`supabase.from("profiles").update(...)`). Update the role type to include `'event_manager'`. Add an "Event Manager" option to the dropdown menu alongside "Admin" and "User".
  - [x] 4.3 **Create room Server Action:** In `src/app/(admin)/admin/rooms/actions.ts` (existing file), add an `addRoom` Server Action. It must: (a) call `getUserAndRole()` to verify the caller is an `admin`, (b) validate input with the same Zod schema, (c) use Drizzle ORM to insert into the `rooms` table, (d) call `revalidatePath('/admin/rooms')`.
  - [x] 4.4 **Update AddRoomForm.tsx:** Refactor `src/app/(admin)/admin/rooms/components/AddRoomForm.tsx` to call the new `addRoom` Server Action instead of directly inserting via the client-side Supabase SDK (`supabase.from("rooms").insert(...)`). Remove the `import { supabase } from "@/lib/supabase/client"` line.
  - [x] 4.5 **Verify:** Run `pnpm build`. Test adding a room from the admin UI and changing a user's role from the admin Users Table. Confirm the mutations work and the pages revalidate.

- [ ] 5.0 Optimize async operations — transaction scope and non-blocking emails (Issues #7, #8, #13)

  - [ ] 5.1 **Move `createCalendarEvent` outside transaction:** In `src/app/(main)/actions/submitBooking.ts`, refactor so the DB transaction only handles the database insert and returns the inserted booking. After the transaction completes, call `createCalendarEvent()` and then update the booking's `eventId` in a separate query. This prevents holding a DB connection open during the external Google Calendar API call (which can take 200ms–2s).
  - [ ] 5.2 **Move email sending to `after()`:** In `src/app/(main)/actions/submitBooking.ts`, use `import { after } from 'next/server'` to schedule the email sending (`sendBookingEmail` / `sendBookingConfirmationEmail`) to run after the response is sent. This avoids blocking the user's response while waiting for Resend API calls. Note: `after()` runs outside the request context, so gather all needed data (booking details, approver emails, recipient email) before calling `after()`.
  - [ ] 5.3 **Move email sending to `after()` in booking-status-change:** In `src/app/(admin)/actions/booking-status-change.ts`, wrap the `sendBookingConfirmationEmail` and `sendBookingRejectionEmail` calls in `after()` so the admin UI responds immediately without waiting for email delivery.
  - [ ] 5.4 **Verify:** Run `pnpm build`. Test creating a new booking and approving/rejecting a booking. Confirm: (a) the response returns quickly, (b) the Google Calendar event is created, (c) emails are received (may take a few seconds since they're now non-blocking).

- [ ] 6.0 Standardize data access layer — consolidate on Drizzle ORM (Issue #14)

  - [ ] 6.1 **Refactor `booking-status-change.ts` to use Drizzle:** In `src/app/(admin)/actions/booking-status-change.ts`, replace the Supabase client calls (`supabase.from("bookings").update(...)`) with Drizzle ORM queries (`db.update(bookings).set(...).where(eq(bookings.id, bookingId)).returning()`). This eliminates the need for the `SupabaseBooking` snake_case interface and the manual camelCase mapping, since Drizzle returns camelCase fields matching the schema.
  - [ ] 6.2 **Remove unused interfaces:** After refactoring to Drizzle, remove the `SupabaseBooking` interface and the `CalendarEventBooking` interface from `booking-status-change.ts`. Use the `Bookings` type exported from `@/db/schema` instead. Also remove the locally-defined `Bookings` interface (lines 9–23) since `@/db/schema` already exports this type.
  - [ ] 6.3 **Remove Supabase server import:** Remove `import { createClient } from "@/lib/supabase/server"` from `booking-status-change.ts` if no longer used.
  - [ ] 6.4 **Verify:** Run `pnpm build`. Test approving and rejecting a booking from the admin UI. Confirm the status updates correctly and the Google Calendar event is updated.

- [ ] 7.0 Improve client-side data fetching patterns (Issue #12)
  - [ ] 7.1 **Evaluate approach:** The `UserTable.tsx` component fetches user data in a `useEffect`. Decide between two approaches: (a) **Server Component** — fetch users server-side in the parent `page.tsx` and pass as props (preferred if the data doesn't need frequent client-side refetching), or (b) **SWR** — use `useSWR` for client-side fetching with automatic deduplication and caching (preferred if the table needs real-time updates or polling). Check `package.json` to see if `swr` is already a dependency.
  - [ ] 7.2 **Option A — Server Component approach:** In `src/app/(admin)/admin/users/page.tsx`, fetch the users list server-side using Drizzle (`db.select().from(profiles).orderBy(desc(profiles.createdAt))`) and pass the data as a prop to `UserTable`. Update `UserTable` to accept `users` as a prop and remove the `useEffect` fetch and `fetchError` state.
  - [ ] 7.3 **Option B — SWR approach (if real-time needed):** Install `swr` if not present. Create a Server Action or API route to fetch users. Use `useSWR('/api/users', fetcher)` in `UserTable` instead of the raw `useEffect` + `useState` pattern.
  - [ ] 7.4 **Remove client-side Supabase import:** After refactoring, remove `import { supabase } from "@/lib/supabase/client"` from `UserTable.tsx` if no longer used for any operations (role changes were moved in Task 4.2, data fetching moved in this task).
  - [ ] 7.5 **Verify:** Run `pnpm build`. Navigate to the admin Users Table. Confirm users load correctly, filtering by email works, and role changes still function.
