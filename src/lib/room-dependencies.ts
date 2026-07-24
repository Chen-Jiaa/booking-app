import { createClient } from "@/lib/supabase/server";
import { addMinutes, format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface RoomInfo {
  id: string;
  name: string;
}

interface DependencyRule {
  blocks: string[]; // partial name patterns to match blocked rooms (case-insensitive)
  condition?: "wedding"; // only applies when source booking purpose contains "wedding"
  source: string; // partial name pattern to match the source room (case-insensitive)
}

// Blocking rules based on physical space constraints.
// Lobby is the entrance to Main Hall and Glass Room.
// Main Hall access also blocks the Lobby and Glass Room area.
const DEPENDENCY_RULES: DependencyRule[] = [
  { blocks: ["main hall", "glass"], source: "lobby" },
  { blocks: ["vip"], condition: "wedding", source: "lobby" },
  { blocks: ["lobby", "glass"], source: "main hall" },
];

function matchesName(roomName: string, pattern: string): boolean {
  return roomName.toLowerCase().includes(pattern.toLowerCase());
}

function isWedding(text: string): boolean {
  return text.toLowerCase().includes("wedding");
}

// Given a booked source room and its purpose, returns all room IDs that should be blocked.
// Used by the GCal sync to cascade unavailable_periods into dependent rooms.
export function getBlockedRoomIds(
  sourceRoom: RoomInfo,
  purpose: string,
  allRooms: RoomInfo[],
): string[] {
  const blocked = new Set<string>();

  for (const rule of DEPENDENCY_RULES) {
    if (!matchesName(sourceRoom.name, rule.source)) continue;
    if (rule.condition === "wedding" && !isWedding(purpose)) continue;

    for (const pattern of rule.blocks) {
      for (const room of allRooms) {
        if (room.id !== sourceRoom.id && matchesName(room.name, pattern)) {
          blocked.add(room.id);
        }
      }
    }
  }

  return Array.from(blocked);
}

// Returns the set of time slot strings blocked for targetRoomId due to
// other rooms' existing bookings, based on DEPENDENCY_RULES.
export async function getDependencyBlockedSlots(
  targetRoomId: string,
  selectedDate: Date,
  timezone: string,
  excludeBookingId?: number,
): Promise<Set<string>> {
  const blocked = new Set<string>();
  const supabase = await createClient();

  const { data: allRooms } = await supabase.from("rooms").select("id, name");
  if (!allRooms) return blocked;

  const targetRoom = allRooms.find((r: RoomInfo) => r.id === targetRoomId);
  if (!targetRoom) return blocked;

  // Find rules where the target room appears in the `blocks` list
  const relevantRules = DEPENDENCY_RULES.filter((rule) =>
    rule.blocks.some((pattern) => matchesName(targetRoom.name, pattern)),
  );

  if (relevantRules.length === 0) return blocked;

  const startOfDayLocal = toZonedTime(selectedDate, timezone);
  startOfDayLocal.setHours(0, 0, 0, 0);
  const endOfDayLocal = toZonedTime(selectedDate, timezone);
  endOfDayLocal.setHours(23, 59, 59, 999);
  const dayStartISO = startOfDayLocal.toISOString();
  const dayEndISO = endOfDayLocal.toISOString();

  for (const rule of relevantRules) {
    // Find source rooms matching this rule
    const sourceRooms = allRooms.filter(
      (r: RoomInfo) => r.id !== targetRoomId && matchesName(r.name, rule.source),
    );
    if (sourceRooms.length === 0) continue;

    const sourceRoomIds = sourceRooms.map((r: RoomInfo) => r.id);

    // Query bookings for source rooms in the time range
    let query = supabase
      .from("bookings")
      .select("id, start_time, end_time, purpose, event_name")
      .in("room_id", sourceRoomIds)
      .in("status", ["pending", "confirmed"])
      .lt("start_time", dayEndISO)
      .gt("end_time", dayStartISO);

    if (excludeBookingId != null) {
      query = query.neq("id", excludeBookingId);
    }

    const { data: sourceBookings } = await query;
    if (!sourceBookings || sourceBookings.length === 0) continue;

    for (const booking of sourceBookings) {
      // Apply the wedding condition if present
      if (rule.condition === "wedding") {
        const purposeText = `${booking.purpose ?? ""} ${booking.event_name ?? ""}`;
        if (!isWedding(purposeText)) continue;
      }

      let currentSlot = toZonedTime(parseISO(String(booking.start_time)), timezone);
      const endTimeLocal = toZonedTime(parseISO(String(booking.end_time)), timezone);
      while (currentSlot < endTimeLocal) {
        blocked.add(format(currentSlot, "HH:mm"));
        currentSlot = addMinutes(currentSlot, 30);
      }
    }
  }

  return blocked;
}

// Server-side check: returns whether the proposed booking is allowed
// given existing dependency bookings.
export async function isBookingAllowed(
  roomId: string,
  _dayType: null | string,
  _date: string,
  startTime: string,
  endTime: string,
  purpose?: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();

  const { data: allRooms } = await supabase.from("rooms").select("id, name");
  if (!allRooms) return { allowed: true };

  const targetRoom = allRooms.find((r: RoomInfo) => r.id === roomId);
  if (!targetRoom) return { allowed: true };

  const relevantRules = DEPENDENCY_RULES.filter((rule) =>
    rule.blocks.some((pattern) => matchesName(targetRoom.name, pattern)),
  );
  if (relevantRules.length === 0) return { allowed: true };

  for (const rule of relevantRules) {
    const sourceRooms = allRooms.filter(
      (r: RoomInfo) => r.id !== roomId && matchesName(r.name, rule.source),
    );
    if (sourceRooms.length === 0) continue;

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id, purpose, event_name, room_name")
      .in(
        "room_id",
        sourceRooms.map((r: RoomInfo) => r.id),
      )
      .in("status", ["pending", "confirmed"])
      .lt("start_time", endTime)
      .gt("end_time", startTime);

    if (!conflicts || conflicts.length === 0) continue;

    for (const conflict of conflicts) {
      if (rule.condition === "wedding") {
        const purposeText = `${conflict.purpose ?? ""} ${conflict.event_name ?? ""}`;
        if (!isWedding(purposeText)) continue;
      }

      const sourceName = sourceRooms[0]?.name ?? "another room";
      return {
        allowed: false,
        reason: `${sourceName} is booked during this time, which blocks access to ${targetRoom.name}.`,
      };
    }
  }

  return { allowed: true };
}
