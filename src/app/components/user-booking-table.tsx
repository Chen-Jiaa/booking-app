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

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/providers/supabase-providers";

type Bookings = {
  id: string;
  name: string;
  email: string;
  phone: string;
  room_id: string;
  room_name: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  user_id: string;
}


export default function UserDataTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [bookings, setBookings] = useState<Bookings[]>([])
  const [fetchError, setFetchError] = useState<null | string>(null)
  const { user } = useSupabase()
  const router = useRouter()

  useEffect(() => {
    if (!user?.id) return
    
    const fetchBookings = async () => {

      const { data, error } = await supabase.from("bookings").select("*").eq("user_id", user.id);

      if (error) {
        setFetchError("Error loading bookings")
        setBookings([])
        console.log(error)
      } else if (data) {
        setBookings(data)
        setFetchError(null)
      }
    }

    fetchBookings()
  }, [user?.id])

  const modifyBooking = async () => {

  }

  const cancelBooking = async (id: string) => {
    const {data, error} = await supabase
    .from("bookings")
    .delete()
    .eq('id', id)

    if (error) {
      console.error("Error cancelling booking:", error);
    } else {
      setBookings((prev) => prev.filter((b) => b.id !== id)) 
    }
  }

  const columns = useMemo<ColumnDef<Bookings>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "room_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Room
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => <div className="ml-4">{row.getValue("room_name")}</div>,
    },
    {
      id: "date",
      accessorKey: "start_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="ml-4">
          {formatBookingDate(row.getValue("start_time"))}
        </div>
      ),
    },
    {
      accessorKey: "start_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Start Time
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="ml-4">
          {formatBookingTime(row.getValue("start_time"))}
        </div>
      ),
    },
    {
      accessorKey: "end_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            End Time
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="ml-4">{formatBookingTime(row.getValue("end_time"))}</div>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <div className="w-full text-center">Status</div>
      ),
      cell: ({ row }) => (
        <div className={`
          capitalize text-center
          ${row.getValue("status") === "pending" ? "border-[1px] rounded-[20px] border-dashed border-muted-foreground text-muted-foreground" : ""}
          ${row.getValue("status") === "approved" ? "border-[1px] rounded-[20px] border-dashed border-green-600 text-green-600" : ""}
          ${row.getValue("status") === "rejected" ? "border-[1px] rounded-[20px] border-dashed border-red-600 text-red-600" : ""}
        `}>
          {row.getValue("status")}
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const booking = row.original;
  
        return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => modifyBooking()}
                >
                  Modify Booking
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => cancelBooking(booking.id)}
                  className="text-red-500"
                >
                  Cancel Booking
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        );
      },
    },
  ], [cancelBooking]);

  const table = useReactTable({
    data: bookings,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="mt-2 px-4">
      <div className="flex items-center py-4">
        <h2 className="font-bold">My Bookings</h2>
      </div>
      <div className="rounded-md border">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
                  colSpan={columns.length}
                  className="h-24 text-center"
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
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
