"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Bookings } from "@/db/schema";
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { type ReactElement } from "react";

import { updateBookingStatus } from "../../actions/booking-status-change";

interface TableProps {
  bookingData: Bookings[];
  page: number;
  pageCount: number;
}

export function Table2({
  bookingData,
  page,
  pageCount,
}: TableProps): ReactElement {
  return (
    <div className="p-6">
      <h2 className="font-bold">Recent Bookings</h2>
      <p>Kindly approve or reject bookings here</p>
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Name</TableHead>
            <TableHead className="text-left">Phone</TableHead>
            <TableHead className="text-left">Room</TableHead>
            <TableHead className="text-left">Booking Date</TableHead>
            <TableHead className="text-right">Start Time</TableHead>
            <TableHead className="text-right">End Time</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookingData.map(
            ({ endTime, id, name, phone, roomName, startTime, status }) => (
              <TableRow key={id}>
                <TableCell>{name}</TableCell>
                <TableCell className="text-left">{phone}</TableCell>
                <TableCell className="text-left">{roomName}</TableCell>
                <TableCell className="text-left">
                  {formatBookingDate(startTime)}
                </TableCell>
                <TableCell className="text-right">
                  {formatBookingTime(startTime)}
                </TableCell>
                <TableCell className="text-right">
                  {formatBookingTime(endTime)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className={cn(
                          "flex ml-auto px-2 py-1 rounded-sm text-sm capitalize",
                          status === "pending" &&
                            "bg-orange-100 text-orange-800 hover:bg-orange-200",
                          status === "confirmed" &&
                            "bg-green-100 text-green-800 hover:bg-green-200",
                          status === "rejected" &&
                            "bg-red-100 text-red-800 hover:bg-red-200"
                        )}
                        variant="ghost"
                      >
                        {status}
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          void updateBookingStatus(id, "confirmed");
                        }}
                      >
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => {
                          void updateBookingStatus(id, "rejected");
                        }}
                      >
                        Reject
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Pagination page={page} pageCount={pageCount} />
      </div>
    </div>
  );
}
