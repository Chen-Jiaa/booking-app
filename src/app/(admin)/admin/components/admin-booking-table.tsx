"use client";

{
  /*
  Current Goal:
  1. Filter the bookings based on email
  2. Button to cancel my booking
  3. Sort my bookings

  Future Goal:
  1. Ability to modify booking (later on in the project)
*/
}

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase/client";
import { Bookings } from "@/types/booking";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [bookings, setBookings] = useState<Bookings[]>([])
  const [fetchError, setFetchError] = useState<null | string>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      const { data, error } = await supabase.from("bookings").select();

      if (error) {
        setFetchError("Error loading bookings");
        setBookings([]);
        console.log(error);
      }
      
      if (data) {
        const sortedBookings = [...data as Bookings[]].sort(
          (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        setBookings(sortedBookings);
        setFetchError(null);
      }
    };

    void fetchBookings();
  }, []);

  const handleStatusChange = useCallback( async (id: string, newStatus: 'confirmed' | 'rejected') => {
    const {error} = await supabase
    .from("bookings")
    .update({status: newStatus})
    .eq("id", id)

    if (error) {
      console.log("error changing booking status", error)
    } else {
      setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, status: newStatus } : booking
      ))
    }

    const updatedBooking = bookings.find((booking) => booking.id === id)
  if (!updatedBooking) return

  await fetch("/api/update-calendar-event", {
    body: JSON.stringify({
      eventId: updatedBooking.event_id,
      name: updatedBooking.name,
      newStatus,
      room_name: updatedBooking.room_name,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
  }, [bookings])

  const columns = useMemo<ColumnDef<Bookings>[]>(()=> [
    {
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => { row.toggleSelected(!!value); }}
        />
      ),
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => { table.toggleAllPageRowsSelected(!!value); }}
        />
      ),
      id: "select",
    },
    {
      accessorKey: "name",
      cell: ({ row }) => <div className="ml-4">{row.getValue("name")}</div>,
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Name
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "room_name",
      cell: ({ row }) => <div className="ml-4">{row.getValue("room_name")}</div>,
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Room
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "phone",
      cell: ({ row }) => <div className="ml-4">0{row.getValue("phone")}</div>,
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Phone Number
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "email",
      cell: ({ row }) => (
        <div className="lowercase ml-4">{row.getValue("email")}</div>
      ),
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Email
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "start_time",
      cell: ({ row }) => (
        <div className="ml-4">
          {formatBookingDate(row.getValue("start_time"))}
        </div>
      ),
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Booking Date
            <ArrowUpDown />
          </Button>
        );
      },
      id: "date",
    },
    {
      accessorKey: "start_time",
      cell: ({ row }) => (
        <div className="ml-4">
          {formatBookingTime(row.getValue("start_time"))}
        </div>
      ),
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Start Time
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "end_time",
      cell: ({ row }) => (
        <div className="ml-4">{formatBookingTime(row.getValue("end_time"))}</div>
      ),
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            End Time
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "status",
      cell: ({ row }) => {
        const booking = row.original

        return (
          <div className="capitalize">
            <DropdownMenu>
              <DropdownMenuTrigger 
                asChild
                className={`
                  "px-1 py-1 rounded text-sm",
                  ${row.getValue("status") === "pending" ? "bg-[#f9ddc7] rounded-sm p-1 text-center" : ""}
                  ${row.getValue("status") === "confirmed" ? "text-green-700 bg-green-50" : ""}
                  ${row.getValue("status") === "rejected" ? "text-red-700 bg-red-50" : ""}
                  `}
                >
                <Button className="flex" variant="ghost">
                  {booking.status} <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => {void handleStatusChange(booking.id, 'confirmed')}}>Approve</DropdownMenuItem>
                <DropdownMenuItem className="text-red-500" onClick={() => {void handleStatusChange(booking.id, 'rejected')}}>Reject</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableSorting: true,
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Status
            <ArrowUpDown />
          </Button>
        );
      },
    },
  ], [handleStatusChange])

  const table = useReactTable({
    columns,
    data: bookings,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnVisibility,
      rowSelection,
      sorting,
    },
  });

  return (
    <div className="mt-2 px-6">
      <h2 className="font-bold">Recent Bookings</h2>
      <p>Kindly approve or reject bookings here</p>
      <div className="flex items-center py-4 overflow-x-scroll">
        <Input
          className="max-w-sm"
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          placeholder="Filter emails..."
          value={(table.getColumn("email")?.getFilterValue() as string) || ""}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="ml-auto" variant="outline">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    checked={column.getIsVisible()}
                    className="capitalize"
                    key={column.id}
                    onCheckedChange={(value) =>
                      { column.toggleVisibility(!!value); }
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {fetchError ? <p>{fetchError}</p> : ""}
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  data-state={row.getIsSelected() && "selected"}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={columns.length}
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            disabled={!table.getCanPreviousPage()}
            onClick={() => { table.previousPage(); }}
            size="sm"
            variant="outline"
          >
            Previous
          </Button>
          <Button
            disabled={!table.getCanNextPage()}
            onClick={() => { table.nextPage(); }}
            size="sm"
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
