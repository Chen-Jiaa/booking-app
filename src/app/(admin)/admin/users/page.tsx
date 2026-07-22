import { db } from "@/db";
import { profiles } from "@/db/schema";
import { desc } from "drizzle-orm";

import UserTable from "./components/UserTable";

export default async function page() {
  const users = await db
    .select({
      email: profiles.email,
      id: profiles.id,
      role: profiles.role,
    })
    .from(profiles)
    .orderBy(desc(profiles.createdAt));

  return <UserTable users={users} />;
}
