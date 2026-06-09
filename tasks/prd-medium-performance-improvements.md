# PRD: Medium Priority Performance Improvements — Caching, Streaming, Query Optimization, Connection Pooling

## 1. Introduction / Overview

After addressing the critical performance issues (server-side data fetching and auth consolidation), this PRD covers five medium-to-lower priority improvements that will further reduce load times, enable progressive rendering, and ensure the app scales as data grows:

- **Problem #3:** Sequential server queries with no batching in `admin/page.tsx`.
- **Problem #4:** No server-side caching — every navigation runs fresh database queries.
- **Problem #5:** No `loading.tsx` or Suspense boundaries — pages show nothing until all data is ready.
- **Problem #6:** Full-dataset client fetch in the old admin table (consolidation recommendation).
- **Problem #7:** Database connection not optimized for serverless — `postgres-js` opens persistent TCP connections that are inefficient on Vercel.

These changes build on top of the critical fixes (PRD: Critical Performance Fixes) and assume those are implemented first.

---

## 2. Goals

- **G1:** Reduce admin dashboard TTFB by parallelizing server queries.
- **G2:** Reduce repeat-visit load times by caching stable data server-side.
- **G3:** Show meaningful content progressively using Suspense boundaries and streaming.
- **G4:** Ensure the admin table scales to 1,000+ bookings without performance degradation.
- **G5:** Achieve a Vercel Speed Insights LCP under 2 seconds for all major pages.
- **G6:** Eliminate connection exhaustion risks and reduce cold-start overhead by using connection pooling optimized for serverless.

---

## 3. User Stories

- **US1:** As an admin, the dashboard should load as fast on my 10th visit as on my 1st — frequently accessed data should be cached.
- **US2:** As a user, when a page takes time to load, I should see a loading skeleton or indicator immediately — not a blank white screen.
- **US3:** As an admin with hundreds of bookings, the table should remain fast because it only loads one page of data at a time.
- **US4:** As a user navigating between pages, previously loaded data should appear near-instantly when I return.
- **US5:** As any user, I should never experience a failed page load due to database connection limits being exhausted during traffic spikes.

---

## 4. Functional Requirements

### Problem #3: Parallel Server Queries

#### 4.1 Admin Page Query Batching

1. In `src/app/(admin)/admin/page.tsx`, the bookings query and count query currently run sequentially:
   ```typescript
   const bookingData = await db.select()...
   const total = await db.select({ count: count() })...
   ```
2. These two queries must run in parallel using `Promise.all`:
   ```typescript
   const [bookingData, total] = await Promise.all([
     db.select().from(bookings)...,
     db.select({ count: count() }).from(bookings),
   ])
   ```
3. Apply the same pattern to any other page that makes multiple independent database queries.

#### 4.2 Calendar Action Query Batching

4. In `fetchCalendarBookings()`, the standard bookings query and multi-day bookings query are independent and should run in parallel using `Promise.all`.
5. The `booking_days` sub-query depends on the multi-day result, so it remains sequential after the multi-day query — but the two top-level queries should be parallelized.

### Problem #4: Server-Side Caching

#### 4.3 Next.js `unstable_cache` for Stable Data

6. Wrap the rooms query (`fetchCalendarRooms`) with `unstable_cache` since room data rarely changes. Use a cache tag like `"rooms"`.
7. When rooms are added/removed/updated (if there's an admin UI for this), call `revalidateTag("rooms")` to bust the cache.
8. Cache the calendar events query with a short TTL (e.g., 60 seconds) and tag `"calendar-events"`. Revalidate on booking creation, approval, or rejection.
9. Cache the admin bookings list with tag `"admin-bookings"`. Revalidate when bookings are created, updated, or status-changed.

#### 4.4 Revalidation Points

10. The following actions must trigger cache revalidation:
    - `submitBooking()` → revalidate tags: `"calendar-events"`, `"admin-bookings"`
    - `updateBookingStatus()` → revalidate tags: `"calendar-events"`, `"admin-bookings"`
    - Any room CRUD operations → revalidate tag: `"rooms"`
11. Use `revalidateTag()` (preferred) over `revalidatePath()` for targeted invalidation.

#### 4.5 No Client-Side Cache Library

12. Do **not** add TanStack Query or any client-side caching library. The Next.js built-in server cache is sufficient for this app's needs and avoids additional bundle size.

### Problem #5: Loading States & Suspense Boundaries

#### 4.6 `loading.tsx` Files

13. Add `loading.tsx` files to the following route segments:
    - `src/app/(admin)/admin/loading.tsx` — skeleton for the admin bookings table.
    - `src/app/(main)/calendar/loading.tsx` — skeleton for the calendar page.
    - `src/app/(main)/booking/loading.tsx` (or wherever the booking form lives) — skeleton for the booking form page.
14. Each `loading.tsx` should render a meaningful skeleton that matches the layout of the page content (not a generic spinner). For example:
    - Admin table skeleton: table header + 5-10 rows of gray shimmer bars.
    - Calendar skeleton: calendar header (month/navigation) + grid of gray cells.
    - Booking form skeleton: labeled input placeholders.

#### 4.7 Suspense Boundaries for Independent Sections

15. Where a page has multiple independent data-loading sections, wrap each in its own `<Suspense>` boundary so they can stream independently. For example:
    - On the admin dashboard, if there are summary stats + a table, each can be a separate Suspense boundary.
16. Use `React.Suspense` with a fallback skeleton component for each boundary.

### Problem #6: Full-Dataset Client Fetch Consolidation

#### 4.8 Retire `admin-booking-table.tsx`

17. As recommended in the Critical PRD, the old `admin-booking-table.tsx` (which fetches ALL bookings client-side via `supabase.from("bookings").select()` with no limit) must be fully retired.
18. All references/imports of the old `AdminTable` component must be removed.
19. The consolidated table (enhanced `Table2` or replacement) must use **server-side pagination** exclusively — the client component receives only one page of data at a time.
20. Sorting that needs to work across all data (not just the visible page) should be done server-side by passing sort parameters as URL search params to the server component.

#### 4.9 Server-Side Sorting

21. The admin page should accept optional `sort` and `order` search params (e.g., `?sort=start_time&order=desc`).
22. The Drizzle query in `page.tsx` should apply the sort dynamically based on these params.
23. The client table component should update the URL search params when the user clicks a column sort header (using `useRouter` or `<Link>` with updated params).

### Problem #7: Database Connection Pooling for Serverless

#### 4.10 Switch to Supabase Connection Pooler

24. The current `src/db/index.ts` creates a `postgres-js` client with a direct TCP connection (`postgres(databaseUrl)`). On Vercel's serverless environment, each function invocation can open a new connection, risking connection exhaustion and adding cold-start overhead.
25. Update `DATABASE_URL` in the environment configuration to use the **Supabase Connection Pooler URL** in **Transaction mode** (e.g., `pooler.supabase.co:6543`). This pools connections at the Supabase infrastructure layer, so serverless functions share connections instead of each opening their own.
26. In `src/db/index.ts`, configure the `postgres-js` client for serverless-friendly behavior:
    ```typescript
    const client = postgres(databaseUrl, {
      prepare: false, // Required for Transaction mode pooling
    })
    ```
    The `prepare: false` option is required because Supabase's Transaction mode pooler (PgBouncer) does not support prepared statements.
27. No code changes are needed beyond `src/db/index.ts` and the environment variable — the Drizzle ORM layer and all existing queries remain the same.
28. The `drizzle.config.ts` should continue using the **direct connection URL** (not the pooler) for migrations, since migrations need persistent connections. Add a separate `DIRECT_DATABASE_URL` environment variable for this purpose if not already present.

---

## 5. Non-Goals (Out of Scope)

- **Client-side caching libraries** (TanStack Query, SWR) — not needed with Next.js server-side caching.
- **Hover-based prefetching** — would require a client-side cache layer; overkill for this app.
- **ISR / static generation** — pages are dynamic and user-specific.
- **Database-level optimization** (indexes, query plans) — the current queries are simple and well-structured.
- **Switching to an HTTP-based database driver** (e.g., `@neondatabase/serverless`) — the connection pooler approach is sufficient and avoids replacing the existing `postgres-js` driver.
- **UI redesign of skeletons** — skeletons should be simple and functional, not pixel-perfect.

---

## 6. Design Considerations

### Skeleton Examples

**Admin Table Skeleton:**
- Render the table header row with real column names.
- Render 8 rows with animated gray bars (shimmer effect) in each cell.
- Use existing `Skeleton` component from shadcn/ui if available, or simple `animate-pulse` divs.

**Calendar Skeleton:**
- Render the calendar toolbar (prev/next/today buttons, month title) as static elements.
- Render a grid placeholder with muted background cells matching the month grid layout.

**Booking Form Skeleton:**
- Render labeled input outlines with shimmer bars inside each field.

---

## 7. Technical Considerations

### `unstable_cache` Pattern

```typescript
import { unstable_cache } from 'next/cache'

const getCachedRooms = unstable_cache(
  async () => {
    // ... fetch rooms from DB
  },
  ['rooms'],
  { tags: ['rooms'], revalidate: 3600 } // 1 hour TTL
)
```

### Revalidation in Server Actions

```typescript
'use server'
import { revalidateTag } from 'next/cache'

export async function submitBooking(data: BookingInput) {
  // ... insert booking ...
  revalidateTag('calendar-events')
  revalidateTag('admin-bookings')
}
```

### Server-Side Sorting in Admin Page

```typescript
// page.tsx
const sortColumn = searchParams.sort ?? 'start_time'
const sortOrder = searchParams.order === 'asc' ? asc : desc

const bookingData = await db
  .select()
  .from(bookings)
  .orderBy(sortOrder(bookings[sortColumn]))
  .limit(pageSize)
  .offset(pageSize * (page - 1))
```

### Key Files to Modify / Create

| File | Change |
|------|--------|
| `src/app/(admin)/admin/page.tsx` | `Promise.all` for queries, accept sort params |
| `src/app/(admin)/admin/loading.tsx` | **New** — table skeleton |
| `src/app/(main)/calendar/loading.tsx` | **New** — calendar skeleton |
| `src/app/(main)/calendar/actions/fetchCalendarBookings.ts` | `Promise.all` for standard + multi-day queries, wrap with `unstable_cache` |
| `src/app/(main)/calendar/page.tsx` (or parent server component) | Wrap rooms fetch with `unstable_cache` |
| `src/app/(main)/actions/submitBooking.ts` | Add `revalidateTag()` calls |
| `src/app/(admin)/actions/booking-status-change.ts` | Add `revalidateTag()` calls |
| `src/app/(admin)/admin/components/admin-booking-table.tsx` | **Delete** |
| `src/app/(admin)/admin/components/admin-booking-table-2.tsx` | Add URL-based sorting via search params |
| `src/db/index.ts` | Add `{ prepare: false }` to `postgres()` client config |
| `drizzle.config.ts` | Use `DIRECT_DATABASE_URL` for migrations |
| `.env.local` / Vercel env vars | Switch `DATABASE_URL` to pooler URL, add `DIRECT_DATABASE_URL` for direct connection |

### Dependencies

- No new dependencies required.
- Uses existing: `next/cache` (`unstable_cache`, `revalidateTag`), `react` (`Suspense`).
- `Skeleton` component from shadcn/ui may need to be added via `npx shadcn@latest add skeleton` if not already present.

### Prerequisites

- **Critical Performance PRD must be completed first.** This PRD assumes data fetching has already been moved to server components and auth is consolidated.

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| TTFB (admin dashboard) | Reduce by ≥ 20% via parallel queries |
| Repeat-visit load time (calendar, admin) | Reduce by ≥ 50% via server cache hits |
| Time-to-interactive (all pages) | Users see skeleton within 100ms of navigation |
| Admin table with 1,000+ bookings | Page load < 2s (server-paginated, max 20 rows transferred) |
| LCP (all major pages) | Under 2 seconds on Vercel Speed Insights |
| Zero "blank screen" moments | Every route shows a skeleton or content immediately |
| DB connection errors under load | Zero connection exhaustion errors on Vercel |

---

## 9. Open Questions

1. **Skeleton component availability** — Does the project already have a `Skeleton` component from shadcn/ui, or does it need to be added?
2. **Cache TTL for events** — Is 60 seconds an acceptable staleness window for calendar events, or should it be shorter (e.g., 30s)?
3. **Server-side sorting scope** — Should sorting work across the full dataset (server-side) or only within the visible page (client-side)? Server-side is recommended for correctness but requires URL param changes.
4. **Admin stats/dashboard** — Are there plans for summary stats (total bookings, pending count, etc.) on the admin page? If so, these would be good candidates for independent Suspense boundaries.
5. **`unstable_cache` stability** — As of Next.js 15, `unstable_cache` is still marked unstable. Should we use the `use cache` directive instead if available in the project's Next.js version?
6. **Current `DATABASE_URL` format** — Is the current `DATABASE_URL` already pointing to the Supabase connection pooler, or is it a direct connection? Check the port — direct connections use port `5432`, while the pooler uses port `6543`.
7. **Existing `DIRECT_DATABASE_URL`** — Does the project already have a separate direct connection URL for migrations, or does `drizzle.config.ts` currently share the same `DATABASE_URL`?
