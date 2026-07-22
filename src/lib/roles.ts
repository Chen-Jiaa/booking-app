export function canCreateMultiDayBooking(role: null | string): boolean {
  return role === "event_manager" || role === "admin";
}

export function isEventManager(role: null | string): boolean {
  return role === "event_manager";
}
