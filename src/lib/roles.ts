// Which availableTo values each role can access. "user" rooms are open to all
// authenticated users; higher-tier rooms require a matching role or admin.
const ROLE_ROOM_ACCESS: Record<string, string[]> = {
  admin: ["user", "event_manager", "superUser", "admin"],
  event_manager: ["user", "event_manager"],
  superUser: ["user", "superUser"],
  user: ["user"],
};

export function filterRoomsByRole<T extends { availableTo: null | string }>(
  rooms: T[],
  role: null | string,
): T[] {
  const allowed = role ? (ROLE_ROOM_ACCESS[role] ?? ["user"]) : ["user"];
  return rooms.filter((r) => r.availableTo !== null && allowed.includes(r.availableTo));
}

export function canCreateMultiDayBooking(role: null | string): boolean {
  return role === "event_manager" || role === "admin";
}

export function isEventManager(role: null | string): boolean {
  return role === "event_manager";
}
