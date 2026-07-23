import { db } from "@/db";
import { rooms, type Rooms } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export const fetchRooms = unstable_cache(
  async (): Promise<Rooms[]> => {
    return db.select().from(rooms).where(eq(rooms.availability, true)).orderBy(asc(rooms.name));
  },
  ["rooms-list"],
  { revalidate: 300, tags: ["rooms"] },
);
