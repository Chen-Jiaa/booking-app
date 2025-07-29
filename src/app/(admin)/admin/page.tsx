import { db } from "@/db";
import { bookings } from "@/db/schema";
import { count, desc } from "drizzle-orm";
import { ReactElement } from "react";

import { Table2 } from "./components/admin-booking-table-2";
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function page(
  props: PageProps
): Promise<ReactElement> {
  const searchParams = await props.searchParams;

  const pageSize = 20;

  const page =
    typeof searchParams.page === "string" 
      ? Number(searchParams.page) || 1 
      : 1;

  const bookingData = await db
    .select()
    .from(bookings)
    .orderBy(desc(bookings.startTime))
    .limit(pageSize)
    .offset(pageSize * (page - 1))

  const total = await db.select({ count: count() }).from(bookings)
  const totalCount = total[0]?.count ?? 0;
  const pageCount = Math.ceil(totalCount / pageSize);


  return (
      <div className="container items-center mx-auto grid gap-5 max-w-full">
        <Table2 bookingData={bookingData} page={page} pageCount={pageCount}/>
      </div>
  );
}
