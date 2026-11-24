// Closures are stored as rows in `unavailable_periods` (one per room per day).
// The reason column holds: closure:<groupId>:<yyyy-MM-dd>:<label>
// The "closure:" prefix keeps them separate from Google Calendar rows ("gcal:"),
// which the calendar sync is allowed to delete.
export const CLOSURE_PREFIX = "closure:";
export const CLOSURE_TIMEZONE = "Asia/Kuala_Lumpur";

const REASON_PATTERN = /^closure:([0-9a-f-]{36}):(\d{4}-\d{2}-\d{2}):([\s\S]*)$/;

export function parseClosureReason(
  reason: string,
): null | { date: string; groupId: string; label: string } {
  const match = REASON_PATTERN.exec(reason);
  return match ? { date: match[2], groupId: match[1], label: match[3] } : null;
}
