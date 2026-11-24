export const dynamic = "force-dynamic";

import { db } from "@/db";
import { rooms, unavailablePeriods } from "@/db/schema";
import { asc, like } from "drizzle-orm";

import { CLOSURE_PREFIX, parseClosureReason } from "./closure-format";
import ClosureForm from "./components/ClosureForm";
import ClosureList, { type ClosureSummary } from "./components/ClosureList";

export default async function ClosuresPage() {
  const [roomData, periods] = await Promise.all([
    db
      .select({ building: rooms.building, id: rooms.id, name: rooms.name })
      .from(rooms)
      .orderBy(asc(rooms.building), asc(rooms.name)),
    db
      .select({ reason: unavailablePeriods.reason, roomId: unavailablePeriods.roomId })
      .from(unavailablePeriods)
      .where(like(unavailablePeriods.reason, `${CLOSURE_PREFIX}%`)),
  ]);

  const roomNames = new Map(roomData.map((r) => [r.id, r.name]));
  const groups = new Map<string, ClosureSummary & { roomIds: Set<string> }>();

  for (const period of periods) {
    const parsed = parseClosureReason(period.reason);
    if (!parsed) continue;
    const group = groups.get(parsed.groupId) ?? {
      endDate: parsed.date,
      groupId: parsed.groupId,
      label: parsed.label,
      roomIds: new Set<string>(),
      roomNames: [],
      startDate: parsed.date,
    };
    if (parsed.date < group.startDate) group.startDate = parsed.date;
    if (parsed.date > group.endDate) group.endDate = parsed.date;
    group.roomIds.add(period.roomId);
    groups.set(parsed.groupId, group);
  }

  const closures: ClosureSummary[] = [...groups.values()]
    .map(({ roomIds, ...group }) => ({
      ...group,
      roomNames: [...roomIds].map((id) => roomNames.get(id) ?? "Unknown room").toSorted(),
    }))
    .toSorted((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Closures</h1>
        <p className="text-sm text-muted-foreground">
          Block rooms for a date range so nobody can book them. Existing bookings are not cancelled.
        </p>
      </div>
      <ClosureForm rooms={roomData} />
      <ClosureList closures={closures} />
    </div>
  );
}
