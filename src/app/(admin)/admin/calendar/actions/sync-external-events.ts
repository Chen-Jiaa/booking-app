"use server";

import { getBlockedRoomIds } from "@/lib/room-dependencies";
import { listCalendarEvents } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { addMonths } from "date-fns";

interface Room {
  id: string;
  name: string;
}

// Extracts the room identifier from a GCal event title.
// "LOBBY BOOKED FOR WEDDING REHEARSAL" → "lobby"
// "MAIN HALL BOOKED FOR CONCERT" → "main hall"
function extractRoomFromTitle(title: string): string | null {
  // Skip events the app itself created (e.g. "[CONFIRMED] Lobby by John...")
  if (title.trimStart().startsWith("[")) return null;

  const match = title.match(/^(.+?)\s+BOOKED\b/i);
  return match ? match[1].trim().toLowerCase() : null;
}

// Finds the best-matching room for a single identifier token.
function matchRoom(identifier: string, rooms: Room[]): Room | null {
  const id = identifier.trim().toLowerCase();
  for (const room of rooms) {
    const nameLower = room.name.toLowerCase();
    if (nameLower.startsWith(id) || id.startsWith(nameLower.split(" ")[0])) {
      return room;
    }
  }
  return null;
}

// Handles comma-separated room identifiers extracted from a title.
// "lobby, auditorium, vip room 3, green room" → [Room, Room, Room, Room]
function matchAllRooms(identifier: string, rooms: Room[]): Room[] {
  const parts = identifier.split(",");
  const matched: Room[] = [];
  const seenIds = new Set<string>();
  for (const part of parts) {
    const room = matchRoom(part.trim(), rooms);
    if (room && !seenIds.has(room.id)) {
      matched.push(room);
      seenIds.add(room.id);
    }
  }
  return matched;
}

export interface SyncResult {
  cancelled: number;
  error?: string;
  inserted: number;
  skipped: number;
}

export async function syncExternalCalendarEvents(): Promise<SyncResult> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const threeMonthsAhead = addMonths(now, 3);

    const [gcalEvents, { data: rooms }, { data: existingExternal }, { data: existingPeriods }] =
      await Promise.all([
        listCalendarEvents(now, threeMonthsAhead),
        supabase.from("rooms").select("id, name"),
        supabase
          .from("bookings")
          .select("id, event_id")
          .eq("booking_type", "external")
          .not("event_id", "is", null),
        supabase
          .from("unavailable_periods")
          .select("id, reason")
          .like("reason", "gcal:%"),
      ]);

    if (!rooms) return { cancelled: 0, error: "Failed to fetch rooms", inserted: 0, skipped: 0 };

    const existingEventIds = new Set((existingExternal ?? []).map((b) => b.event_id as string));
    // reason format: "gcal:<eventId>:<roomId>"
    const existingPeriodEventIds = new Set(
      (existingPeriods ?? []).map((p) => p.reason.replace("gcal:", "")),
    );
    const gcalEventIds = new Set(gcalEvents.map((e) => e.id).filter(Boolean) as string[]);

    // Cancel bookings and remove unavailable_periods whose GCal event was deleted
    let cancelled = 0;
    const toCancel = (existingExternal ?? []).filter((b) => !gcalEventIds.has(b.event_id!));
    if (toCancel.length > 0) {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .in(
          "id",
          toCancel.map((b) => b.id),
        );
      if (!error) cancelled = toCancel.length;
    }

    // Delete unavailable_periods whose GCal event no longer exists
    // reason starts with "gcal:<eventId>:" — extract eventId as the second segment
    const periodsToDelete = (existingPeriods ?? []).filter((p) => {
      const eventId = p.reason.split(":")[1];
      return eventId ? !gcalEventIds.has(eventId) : false;
    });
    if (periodsToDelete.length > 0) {
      await supabase
        .from("unavailable_periods")
        .delete()
        .in(
          "id",
          periodsToDelete.map((p) => p.id),
        );
    }

    // Insert new external events
    let inserted = 0;
    let skipped = 0;

    for (const event of gcalEvents) {
      if (!event.id || !event.summary) {
        skipped++;
        continue;
      }

      // Skip if booking already exists (periods may still need updating for new dependent rooms)
      if (existingEventIds.has(event.id)) {
        skipped++;
        continue;
      }

      const roomIdentifier = extractRoomFromTitle(event.summary);
      if (!roomIdentifier) {
        skipped++;
        continue;
      }

      // Support comma-separated room names, e.g. "LOBBY, AUDITORIUM, VIP ROOM 3 BOOKED FOR X"
      const matchedRooms = matchAllRooms(roomIdentifier, rooms as Room[]);
      if (matchedRooms.length === 0) {
        skipped++;
        continue;
      }

      // Resolve start/end times (all-day events use date strings, not dateTime)
      let startTime: Date;
      let endTime: Date;

      if (event.start?.dateTime) {
        startTime = new Date(event.start.dateTime);
        endTime = new Date(event.end!.dateTime!);
      } else if (event.start?.date) {
        // All-day: block the full day (00:00 → 23:59 UTC+8)
        const base = new Date(event.start.date + "T00:00:00+08:00");
        startTime = base;
        endTime = new Date(event.end!.date! + "T23:59:59+08:00");
      } else {
        skipped++;
        continue;
      }

      // Collect all affected room IDs: every matched room + their dependents
      const allAffectedRoomIds = new Set<string>();
      for (const room of matchedRooms) {
        allAffectedRoomIds.add(room.id);
        for (const depId of getBlockedRoomIds(room, event.summary, rooms as Room[])) {
          allAffectedRoomIds.add(depId);
        }
      }

      // Insert booking for the primary (first) room for admin calendar display
      const primaryRoom = matchedRooms[0];
      const { error: bookingError } = await supabase.from("bookings").insert({
        booking_type: "external",
        email: event.creator?.email ?? "",
        end_time: endTime.toISOString(),
        event_id: event.id,
        name: event.creator?.displayName ?? event.creator?.email ?? "External Calendar Event",
        phone: "",
        purpose: event.summary,
        room_id: primaryRoom.id,
        room_name: matchedRooms.map((r) => r.name).join(", "),
        start_time: startTime.toISOString(),
        status: "confirmed",
      });
      if (bookingError) {
        console.error("Failed to insert external booking:", bookingError);
        skipped++;
        continue;
      }

      // Insert unavailable_periods for all affected rooms (blocks user booking form)
      for (const affectedRoomId of allAffectedRoomIds) {
        if (existingPeriodEventIds.has(`${event.id}:${affectedRoomId}`)) continue;
        const { error: periodError } = await supabase.from("unavailable_periods").insert({
          end_time: endTime.toISOString(),
          reason: `gcal:${event.id}:${affectedRoomId}`,
          room_id: affectedRoomId,
          start_time: startTime.toISOString(),
        });
        if (periodError) {
          console.error(`Failed to insert unavailable period for room ${affectedRoomId}:`, periodError);
        }
      }

      inserted++;
    }

    return { cancelled, inserted, skipped };
  } catch (error) {
    console.error("Sync failed:", error);
    return {
      cancelled: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      inserted: 0,
      skipped: 0,
    };
  }
}
