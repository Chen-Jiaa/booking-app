## Relevant Files

- `src/app/globals.css` - CSS variable definitions (`:root` and `.dark`). This is the primary file where the new oklch color tokens are defined.
- `tailwind.config.ts` - Tailwind theme extension mapping CSS variables to utility classes. Must switch from `hsl()` to `oklch()`.
- `src/app/layout.tsx` - Root HTML layout. Must add `dark` class to `<html>` element to activate dark mode permanently.
- `components.json` - shadcn/ui configuration. Update `baseColor` and `cssVariables` settings if needed.
- `src/components/ui/sonner.tsx` - Toast component using `next-themes`. Update to hardcode dark theme instead of using `useTheme()`.
- `src/components/ui/dialog.tsx` - Uses hardcoded `bg-black/80` overlay.
- `src/components/ui/alert-dialog.tsx` - Uses hardcoded `bg-black/80` overlay.
- `src/components/ui/sheet.tsx` - Uses hardcoded `bg-black/80` overlay.
- `src/components/ui/badge.tsx` - May need variant color updates for dark mode status badges.
- `src/components/ui/button.tsx` - Check variant styles for dark mode compatibility.
- `src/components/ui/card.tsx` - Surface-level component; verify it uses tokens correctly.
- `src/components/ui/sidebar.tsx` - Admin sidebar; uses sidebar-specific CSS variable tokens.
- `src/components/ui/calendar.tsx` - Date picker (DayPicker) styling.
- `src/components/ui/pagination.tsx` - Has hardcoded `dark:border-gray-800/80`.
- `src/app/(main)/components/RoomList.tsx` - Hardcoded `text-black`, `bg-green-50`, `fill-green-700`, `text-green-700`.
- `src/app/(main)/components/nav-bar.tsx` - Navigation bar; uses `border-b` (verify token usage).
- `src/app/(main)/components/footer.tsx` - Footer; uses token classes (likely fine).
- `src/app/(main)/bookings/user-booking-table.tsx` - Hardcoded `text-white`, `text-green-700`, `bg-green-50`, `text-red-700`, `bg-red-50`, `bg-red-600`, `text-red-700`.
- `src/app/(admin)/admin/components/admin-booking-table.tsx` - Hardcoded `bg-[#f9ddc7]`, `text-green-700`, `bg-green-50`, `text-red-700`, `bg-red-50`, `text-red-500`.
- `src/app/(admin)/admin/calendar/components/calendar-grid.tsx` - Hardcoded `border-gray-200`, `bg-gray-50`, `bg-gray-100`, `border-blue-200`, `bg-blue-50/50`, `bg-green-100/200/300`, `bg-orange-100/200/300`, `bg-red-100/200/300`.
- `src/app/(admin)/admin/calendar/components/calendar-list.tsx` - Hardcoded `text-blue-600`, `bg-green-100`, `text-green-800`, `bg-orange-100`, `text-orange-800`, `bg-red-100`, `text-red-800`.
- `src/app/(main)/calendar/components/EventCalendar.tsx` - Hardcoded hex colors for FullCalendar events (`#3b82f6`, `#f59e0b`, `#22c55e`, `#ffffff`).
- `src/app/(main)/calendar/components/BookingDetailPopover.tsx` - Hardcoded `text-white`, `bg-green-100`, `text-green-800`, `bg-orange-100`, `text-orange-800`, plus hex colors for day type badges.
- `src/lib/sendBookingEmail.ts` - Inline HTML email styles with hardcoded hex (`#4CAF50`, `#f44336`, `#ddd`). These must remain inline hex but should use the new brand colors.

### Notes

- This project has no test framework configured. Verification is done via `pnpm build`, `pnpm lint`, and manual visual inspection.
- The app uses shadcn/ui (new-york style) with Tailwind CSS v3 and CSS variables. The current variables use HSL color space; the migration changes them to oklch.
- Email templates use inline HTML styles — email clients don't support CSS variables, so those must stay as inline hex values but should be updated to match the new brand palette.
- FullCalendar requires programmatic hex/rgb color values, not CSS variables.
- The `next-themes` package is already installed (`^0.4.5`) but is only used by `sonner.tsx`. Since we're going dark-mode-only, we don't need a theme provider — just hardcode the `dark` class.
- The existing `.dark` CSS block in `globals.css` will be replaced entirely; `:root` will contain the dark oklch values directly (no light theme).

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:

- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/dark-mode-color-scheme`)

- [x] 1.0 Migrate CSS variable system from HSL to oklch and define the new dark-mode-only color scheme
  - [x] 1.1 In `src/app/globals.css`, replace the `:root` block with the new oklch-based dark color tokens. Map the giving-platform palette to shadcn/ui variable names:
    - `--background` → base-1 `oklch(0.1543 0 0)`
    - `--foreground` → fg-1 `oklch(0.9851 0 0)`
    - `--card` → surface `oklch(0.1822 0 0)`
    - `--card-foreground` → fg-1 `oklch(0.9851 0 0)`
    - `--popover` → surface `oklch(0.1822 0 0)`
    - `--popover-foreground` → fg-1 `oklch(0.9851 0 0)`
    - `--primary` → CTA accent `#d4ff70` (convert to oklch)
    - `--primary-foreground` → base-0 `oklch(0 0 0)` (dark text on bright lime)
    - `--secondary` → elevated `oklch(0.243 0 0)`
    - `--secondary-foreground` → fg-default `oklch(0.8248 0 0)`
    - `--muted` → surface `oklch(0.1822 0 0)`
    - `--muted-foreground` → fg-muted `oklch(0.7048 0 0)`
    - `--accent` → elevated `oklch(0.243 0 0)`
    - `--accent-foreground` → fg-default `oklch(0.8248 0 0)`
    - `--destructive` → error `hsl(358, 75%, 59%)` (convert to oklch)
    - `--destructive-foreground` → fg-1 `oklch(0.9851 0 0)`
    - `--border` → border `oklch(0.2705 0 0)`
    - `--input` → border `oklch(0.2705 0 0)`
    - `--ring` → CTA accent (convert `#d4ff70` to oklch)
  - [x] 1.2 Add new custom semantic CSS variables for status colors that don't map to existing shadcn variables:
    - `--info` → `hsl(210, 100%, 62%)`
    - `--success` → `hsl(151, 65%, 54%)`
    - `--error` → `hsl(358, 75%, 59%)`
    - `--warning` → `hsl(53, 90%, 62%)`
    - Plus tinted background variants using `color-mix()` at ~15% opacity for status badges (e.g., `--success-bg`, `--error-bg`, `--warning-bg`)
  - [x] 1.3 Update chart CSS variables to match the giving-platform chart palette:
    - `--chart-1` → near-white
    - `--chart-2` → cyan `#22d3ee`
    - `--chart-3` → lime `#a3e635`
    - `--chart-4` → amber `#facc15`
    - `--chart-5` → orange `#fb923c`
  - [x] 1.4 Update sidebar CSS variables to use the new dark palette:
    - `--sidebar-background` → base-0 `oklch(0 0 0)`
    - `--sidebar-foreground` → fg-default `oklch(0.8248 0 0)`
    - `--sidebar-primary` → CTA accent (oklch of `#d4ff70`)
    - `--sidebar-primary-foreground` → base-0 `oklch(0 0 0)`
    - `--sidebar-accent` → elevated `oklch(0.243 0 0)`
    - `--sidebar-accent-foreground` → fg-1 `oklch(0.9851 0 0)`
    - `--sidebar-border` → border `oklch(0.2705 0 0)`
    - `--sidebar-ring` → CTA accent
  - [x] 1.5 Remove the `.dark { ... }` block entirely (no longer needed since `:root` IS the dark theme now)
  - [x] 1.6 Verify the `@layer base` block at the bottom still applies `bg-background text-foreground` to `body`

- [x] 2.0 Update Tailwind config to use oklch color functions
  - [x] 2.1 In `tailwind.config.ts`, change all `hsl(var(--...))` references to `oklch(var(--...))` for the achromatic tokens (background, foreground, card, popover, secondary, muted, accent, border, input, ring, sidebar tokens)
  - [x] 2.2 For tokens that remain in HSL (semantic colors like destructive, info, success, etc.), keep using `hsl(var(--...))` or convert to oklch — be consistent with whatever format was chosen in step 1.1
  - [x] 2.3 Add new color entries in `tailwind.config.ts` for the semantic status colors (`info`, `success`, `warning`) so they can be used as Tailwind utilities (e.g., `bg-success`, `text-warning`)
  - [x] 2.4 Verify chart colors still work with the new format

- [x] 3.0 Force dark mode globally
  - [x] 3.1 In `src/app/layout.tsx`, add `className="dark"` to the `<html>` element (e.g., `<html lang="en" className="dark">`)
  - [x] 3.2 Optionally set `<html>` `style={{ colorScheme: 'dark' }}` so native browser elements (scrollbars, form controls) also respect dark mode
  - [x] 3.3 In `src/components/ui/sonner.tsx`, replace `useTheme()` with a hardcoded `theme="dark"` since there's no theme toggle. Remove the `next-themes` import from this file.

- [x] 4.0 Replace hardcoded Tailwind color utilities with design token classes across app components
  - [x] 4.1 **`src/app/(main)/components/RoomList.tsx`** — Replace:
    - `bg-green-50` → use `bg-success/15` or a semantic token class for status background
    - `fill-green-700` / `text-green-700` → use `text-success` or appropriate semantic class
    - `text-black` (on buttons, lines 83 & 95) → remove (let button variant handle foreground color)
  - [x] 4.2 **`src/app/(main)/bookings/user-booking-table.tsx`** — Replace:
    - `text-white` (line 49) → `text-primary-foreground` (it's on a primary button)
    - `text-green-700 bg-green-50` → semantic success token classes
    - `text-red-700 bg-red-50` → semantic error token classes
    - `text-red-700` (cancel button, line 104) → `text-destructive`
    - `bg-red-600` (AlertDialogAction, line 122) → `bg-destructive`
  - [x] 4.3 **`src/app/(admin)/admin/components/admin-booking-table.tsx`** — Replace:
    - `bg-[#f9ddc7]` (pending) → semantic warning token background
    - `text-green-700 bg-green-50` (confirmed) → semantic success tokens
    - `text-red-700 bg-red-50` (rejected) → semantic error tokens
    - `text-red-500` (reject menu item, line 266) → `text-destructive`
  - [x] 4.4 **`src/app/(admin)/admin/calendar/components/calendar-grid.tsx`** — Replace:
    - Empty cell: `border-gray-200 bg-gray-50 hover:bg-gray-100` → `border-border bg-muted/50 hover:bg-muted`
    - Today highlight: `border-blue-200 bg-blue-50/50` → `border-info/30 bg-info/10` (or use info token)
    - `getStatusColor()`: Replace `bg-green-100/200/300`, `bg-orange-100/200/300`, `bg-red-100/200/300` → semantic token variants (e.g., `bg-success/15 hover:bg-success/25 border-success/40`)
  - [x] 4.5 **`src/app/(admin)/admin/calendar/components/calendar-list.tsx`** — Replace:
    - `text-blue-600` (today) → `text-info` token
    - `getStatusStyles()`: Replace `bg-green-100 text-green-800`, `bg-orange-100 text-orange-800`, `bg-red-100 text-red-800` → semantic token classes
  - [x] 4.6 **`src/app/(main)/calendar/components/BookingDetailPopover.tsx`** — Replace:
    - `STATUS_STYLES` object: `bg-green-100 text-green-800` / `bg-orange-100 text-orange-800` → semantic tokens
    - `text-white` on day type badge (line 63) → `text-primary-foreground` or remove if using tokens
  - [x] 4.7 **`src/components/ui/pagination.tsx`** — Replace `dark:border-gray-800/80` → `border-border`

- [x] 5.0 Update FullCalendar and admin calendar with dark-mode-compatible event colors
  - [x] 5.1 In `src/app/(main)/calendar/components/EventCalendar.tsx`, update `DAY_TYPE_COLORS` hex values to be visible on dark backgrounds. Suggested mapping:
    - `standard` → success green (e.g., `#4DC98E` from the palette)
    - `rehearsal_setup` → warning amber (e.g., `#F0E23D` or `#facc15`)
    - `main_event` → info blue (e.g., `#3D9EFF`)
    - `textColor` → keep `#ffffff` or adjust per background contrast
  - [x] 5.2 Update the legend color swatches (lines 105–115) to match the updated `DAY_TYPE_COLORS`
  - [x] 5.3 Add FullCalendar CSS overrides in `globals.css` to style the calendar chrome (toolbar, day headers, grid lines, today highlight, list view) for dark mode. Key selectors:
    - `.fc` (root) — text color
    - `.fc .fc-button` — button styles
    - `.fc .fc-toolbar-title` — title color
    - `.fc td, .fc th` — cell borders
    - `.fc .fc-day-today` — today background
    - `.fc .fc-list-*` — list view styles
  - [x] 5.4 Duplicate the updated `DAY_TYPE_COLORS` in `BookingDetailPopover.tsx` to keep it in sync (or extract to a shared constants file)

- [x] 6.0 Update email templates with new brand-aligned inline colors
  - [x] 6.1 In `src/lib/sendBookingEmail.ts`, update the approve button color from `#4CAF50` → `#4DC98E` (success from palette)
  - [x] 6.2 Update the reject button color from `#f44336` → `#D94148` (error from palette)
  - [x] 6.3 Update table border color from `#ddd` → a slightly lighter gray that fits the brand (e.g., `#444` or keep `#ddd` since emails have white/light backgrounds in most clients)
  - [x] 6.4 Consider adding a dark background style to the email body if the brand should carry through to emails (optional — most email clients default to white)

- [x] 7.0 Add semantic color tokens to Tailwind config and verify component usage
  - [x] 7.1 Ensure the semantic CSS variables defined in task 1.2 are mapped in `tailwind.config.ts` so classes like `bg-success`, `text-success`, `bg-warning`, `text-warning`, `bg-info`, `text-info`, `bg-error`, `text-error` work as Tailwind utilities
  - [x] 7.2 Also add background variants if using `color-mix()` approach: `bg-success-bg`, `bg-error-bg`, `bg-warning-bg` (for tinted badge backgrounds)
  - [x] 7.3 Verify all status badge/pill components across the app correctly use the new semantic tokens after changes in task 4

- [ ] 8.0 Visual QA and build verification
  - [x] 8.1 Run `pnpm build` and fix any TypeScript or build errors
  - [x] 8.2 Run `pnpm lint` and fix any linting errors
  - [ ] 8.3 Manually check each page for visual correctness:
    - Homepage (`/`) — room cards, availability badges, "Book now" buttons
    - Booking dialog — date picker, time slots, form inputs
    - My Bookings (`/bookings`) — booking cards, status pills, cancel/edit buttons
    - Calendar (`/calendar`) — FullCalendar grid/list views, event colors, legend, detail popover
    - Admin Dashboard (`/admin`) — booking table, status dropdowns
    - Admin Calendar (`/admin/calendar`) — grid view, list view, today highlight, status colors
    - Admin Sidebar — navigation links, active state
    - Settings (`/settings`) — profile form
    - Auth pages (`/login`, `/signup`) — form styling
  - [ ] 8.4 Verify toast notifications (Sonner) render with correct dark theme
  - [ ] 8.5 Verify dialog/sheet/alert-dialog overlays look correct with dark backdrop
  - [ ] 8.6 Test on mobile viewport — nav, calendar list view, booking cards
