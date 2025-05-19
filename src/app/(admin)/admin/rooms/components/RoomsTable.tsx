"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import { Rooms } from "@/types/room";
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

export default function RoomTable({adminEmails} : {adminEmails: string[]}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({email:false})
  const [rowSelection, setRowSelection] = useState({})
  const [rooms, setRooms] = useState<Rooms[]>([])
  const [fetchError, setFetchError] = useState<null | string>(null)

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase.from("rooms").select()

      if (error) {
        setFetchError("Error loading rooms")
        setRooms([])
        console.log(error)
      }
      
      if (data) {
        setRooms(data)
        setFetchError(null)
      }
    };

    void fetchRooms()
  }, [])

  const handleToggle = useCallback(async (id: string, newApproval: boolean) => {
    const {error} = await supabase
    .from("rooms")
    .update({approval_required: newApproval})
    .eq("id", id)
    .select()

    if (error) {
      console.log(error)
    } else {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === id ? { ...room, approval_required: newApproval } : room
        ))
    }
    
  },[])

  const handleAvailabilityChange = useCallback(async (id: string, newAvailability: boolean) => {
    const {error} = await supabase
    .from("rooms")
    .update({availability: newAvailability})
    .eq("id", id)
    .select()

    if (error) {
      console.log("Error updating availability", error)
    } else {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === id ? { ...room, availability: newAvailability } : room
        ))
    }

    const updatedBooking = rooms.find((booking) => booking.id === id)
  if (!updatedBooking) return

  }, [rooms])

  const handleAvailabilityTo = useCallback(async (id: string, newAvailabilityTo: string) => {
    const {error} = await supabase
    .from("rooms")
    .update({available_to: newAvailabilityTo})
    .eq("id", id)
    .select()

    if (error) {
      console.log("Error updating availability", error)
    } else {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === id ? { ...room, available_to: newAvailabilityTo } : room
        ))
    }

    const updatedBooking = rooms.find((booking) => booking.id === id)
  if (!updatedBooking) return

  }, [rooms])

  const columns = useMemo<ColumnDef<Rooms>[]>(()=> [
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
      accessorKey: "capacity",
      cell: ({ row }) => <div className="ml-4">{row.getValue("capacity")}</div>,
      header: ({ column }) => {
        return (
          <Button
            onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
            variant="ghost"
          >
            Capacity
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "availability",
      cell: ({ row }) => {
        const rooms = row.original

        return (
          <div className="capitalize">
            <DropdownMenu>
              <DropdownMenuTrigger 
                asChild
                className="px-1 py-1 rounded text-sm"
                >
                <Button className="flex" variant="ghost">
                  {rooms.availability ? "Available" : "Unvailable"} <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Make room</DropdownMenuLabel>
                <DropdownMenuItem disabled={rooms.availability} onClick={() => {void handleAvailabilityChange(rooms.id, true)}}>Available</DropdownMenuItem>
                <DropdownMenuItem className="text-red-500" disabled={!rooms.availability} onClick={() => {void handleAvailabilityChange(rooms.id, false)}}>Unavailable</DropdownMenuItem>
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
            Availability
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "available_to",
      cell: ({ row }) => {
        const rooms = row.original

        return (
          <div className="capitalize">
            <DropdownMenu>
              <DropdownMenuTrigger 
                asChild
                className="px-1 py-1 rounded text-sm"
                >
                <Button className="flex capitalize" variant="ghost">
                  {rooms.available_to === "superUser" ? "super user" : "user"} <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Make Available To</DropdownMenuLabel>
                <DropdownMenuItem disabled={rooms.available_to === 'user'} onClick={() => {void handleAvailabilityTo(rooms.id, 'user')}}>User</DropdownMenuItem>
                <DropdownMenuItem disabled={rooms.available_to === 'superUser'} onClick={() => {void handleAvailabilityTo(rooms.id, 'superUser')}}>Super User</DropdownMenuItem>
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
            Is available To
            <ArrowUpDown />
          </Button>
        );
      },
    },
    {
      accessorKey: "approval_required",
      cell: ({ row }) => {
        const rooms = row.original;

        return (
          <Checkbox
            checked={rooms.approval_required}
            onClick={() => void handleToggle(rooms.id, !rooms.approval_required)}
          />
        );
      },
      enableSorting: true,
      header: ({ column }) => (
        <Button
          onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
          variant="ghost"
        >
          Requires Approval
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "approvers",
      cell: ({ row }) => {
        const room = row.original
        const approvers = room.approvers ?? []

        const toggleApprover = async (email: string) => {
          const updatedApprovers = approvers.includes(email)
            ? approvers.filter(e => e !== email)
            : [...approvers, email]

          const { error } = await supabase
            .from("rooms")
            .update({ approvers: updatedApprovers })
            .eq("id", room.id)

          if (error) {
            console.error("Error updating approvers", error)
          } else {
            setRooms((prev) =>
              prev.map((r) =>
                r.id === room.id ? { ...r, approvers: updatedApprovers } : r
              )
            )
          }
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex" variant="ghost">
                {approvers.length > 0 ? `${String(approvers.length)} selected` : "Select"} <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
              <DropdownMenuLabel>Select Approvers</DropdownMenuLabel>
              {adminEmails.map((email) => (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  key={email}
                  onClick={() => void toggleApprover(email)}
                >
                  <input
                    checked={approvers.includes(email)}
                    readOnly
                    type="checkbox"
                  />
                  <span>{email}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      header: ({ column }) => (
        <Button
          onClick={() => {
            column.toggleSorting(column.getIsSorted() === "asc");
          }}
          variant="ghost"
        >
          Approvers
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
  ], [handleAvailabilityChange, handleAvailabilityTo, handleToggle, adminEmails])

  const table = useReactTable({
    columns,
    data: rooms,
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
  })

  return (
    <div className="px-6">
      <h2 className="font-bold">All Rooms</h2>
      <div className="rounded-md mt-4 border overflow-auto">
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
