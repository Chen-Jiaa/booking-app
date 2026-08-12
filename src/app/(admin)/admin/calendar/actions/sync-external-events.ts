"use server";

import { getBlockedRoomIds } from "@/lib/room-dependencies";
import { listCalendarEvents } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { addMonths, addYears } from "date-fns";

interface Room {
  id: string;
  name: string;
}

// Calendar labels that intentionally refer to a differently named website room.
// Keep this explicit: fuzzy prefix matching previously turned "Office Common Area"
// into "Office Pantry" and "VIP Room 3" into the wrong room.
const CALENDAR_ROOM_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "artist room": ["VIP Room 4"],
  "class room 1": ["Holding Room 1"],
  "class room 2": ["Holding Room 2"],
  "ex eight": ["Auditorium", "Glass Room", "Green Room", "Lobby", "Stage 8"],
  greenroom: ["Green Room"],
  "main hall": ["Auditorium"],
  "vip room": ["VIP Room 3"],
  "vip room 1": ["VIP Room 3"],
};

function normalizeRoomName(name: string): string {
  return name.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

// Extracts the room identifier from a GCal event title.
// "LOBBY BOOKED FOR WEDDING REHEARSAL" → "lobby"
// "AUDITORIUM BOOKED FOR CONCERT" → "auditorium"
function extractRoomFromTitle(title: string): string | null {
  // Skip events the app itself created (e.g. "[CONFIRMED] Lobby by John...")
  if (title.trimStart().startsWith("[")) return null;

  const match = title.match(/^(.+?)\s+BOOKED\b/i);
  return match ? match[1].trim().toLowerCase() : null;
}

// Handles comma-separated room identifiers extracted from a title.
// "lobby, auditorium, vip room 3, green room" → [Room, Room, Room, Room].
// "EX Eight" expands to its four rooms because it represents a whole-venue hold.
function matchAllRooms(identifier: string, rooms: Room[]): Room[] {
  const roomsByName = new Map(rooms.map((room) => [normalizeRoomName(room.name), room]));
  const matched: Room[] = [];
  const seenIds = new Set<string>();

  for (const part of identifier.split(",")) {
    const calendarName = normalizeRoomName(part);
    const targetRoomNames = CALENDAR_ROOM_ALIASES[calendarName] ?? [calendarName];

    for (const targetRoomName of targetRoomNames) {
      const room = roomsByName.get(normalizeRoomName(targetRoomName));
      if (room && !seenIds.has(room.id)) {
        matched.push(room);
        seenIds.add(room.id);
      }
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

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

async function upsertPeriods(
  supabase: SupabaseClient,
  eventId: string,
  roomIds: Set<string>,
  startTime: Date,
  endTime: Date,
  existingPeriodMap: Map<string, string>,
) {
  for (const roomId of roomIds) {
    const reason = `gcal:${eventId}:${roomId}`;
    const existingId = existingPeriodMap.get(reason);
    if (existingId) {
      const { error } = await supabase
        .from("unavailable_periods")
        .update({ end_time: endTime.toISOString(), start_time: startTime.toISOString() })
        .eq("id", existingId);
      if (error) console.error(`Failed to update unavailable period ${existingId}:`, error);
    } else {
      const { error } = await supabase.from("unavailable_periods").insert({
        end_time: endTime.toISOString(),
        reason,
        room_id: roomId,
        start_time: startTime.toISOString(),
      });
      if (error) console.error(`Failed to insert unavailable period for room ${roomId}:`, error);
    }
  }
}

export async function syncExternalCalendarEvents(): Promise<SyncResult> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const threeMonthsBack = addMonths(now, -3);
    const oneYearAhead = addYears(now, 1);

    const [gcalEvents, { data: rooms }, { data: existingExternal }, { data: existingPeriods }] =
      await Promise.all([
        listCalendarEvents(threeMonthsBack, oneYearAhead),
        supabase.from("rooms").select("id, name"),
        supabase
          .from("bookings")
          .select("id, event_id")
          .eq("booking_type", "external")
          .not("event_id", "is", null),
        supabase.from("unavailable_periods").select("id, reason").like("reason", "gcal:%"),
      ]);

    if (!rooms) return { cancelled: 0, error: "Failed to fetch rooms", inserted: 0, skipped: 0 };

    // event_id → booking row id, for updating times on existing bookings
    const existingBookingMap = new Map(
      (existingExternal ?? []).map((b) => [b.event_id as string, b.id]),
    );
    // reason format: "gcal:<eventId>:<roomId>" → period row id for updates
    const existingPeriodMap = new Map((existingPeriods ?? []).map((p) => [p.reason, p.id]));
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

      const roomIdentifier = extractRoomFromTitle(event.summary);
      if (!roomIdentifier) {
        skipped++;
        continue;
      }

      // Support comma-separated room names, e.g. "LOBBY, AUDITORIUM, VIP ROOM 3 BOOKED FOR X".
      // Unknown labels (such as Office Common Area) are intentionally ignored.
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
        // All-day: block from 00:00 of the first day to 23:59:59 of the last day (UTC+8).
        // Google's end.date is exclusive (e.g. a Sep 15–16 event has end.date = "2026-09-17"),
        // so subtract 1ms from midnight of the exclusive end to land on 23:59:59.999 of Sep 16.
        startTime = new Date(event.start.date + "T00:00:00+08:00");
        endTime = new Date(new Date(event.end!.date! + "T00:00:00+08:00").getTime() - 1);
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

      const existingBookingId = existingBookingMap.get(event.id);
      if (existingBookingId) {
        // Update times and room_name in case they were stored incorrectly
        await supabase
          .from("bookings")
          .update({
            end_time: endTime.toISOString(),
            room_name: matchedRooms.map((r) => r.name).join(", "),
            start_time: startTime.toISOString(),
          })
          .eq("id", existingBookingId);
        // Upsert unavailable_periods for all affected rooms (fixes stale times + adds missing rooms)
        await upsertPeriods(
          supabase,
          event.id,
          allAffectedRoomIds,
          startTime,
          endTime,
          existingPeriodMap,
        );
        skipped++;
        continue;
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

      // Upsert unavailable_periods for all affected rooms (blocks user booking form)
      await upsertPeriods(
        supabase,
        event.id,
        allAffectedRoomIds,
        startTime,
        endTime,
        existingPeriodMap,
      );

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
