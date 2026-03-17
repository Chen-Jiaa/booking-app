export const room_startHour = 8; // 8am
export const room_endHour = 23.5; // 11:30pm
export const interval = 30; //30min

/**
 * Controls who can access the /calendar page.
 * - 'public': All users including guests can view the calendar.
 * - 'restricted': Only admin and event_manager roles can access the calendar.
 */
export const CALENDAR_ACCESS: 'public' | 'restricted' = 'public';
