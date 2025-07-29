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
import { Rooms } from "@/db/schema";
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
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { updateRoomApprovers, updateRoomAvailabilityTo, updateRoomBoolean } from "../actions";

interface RoomTableProps {
  adminEmails: string[]
  initialData: Rooms[];
}

export default function RoomTable({adminEmails, initialData} : RoomTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({email:false})
  const [rowSelection, setRowSelection] = useState({})
  const [rooms, setRooms] = useState<Rooms[]>(initialData)

  const handleToggle = useCallback(async (id: string, field: 'approval_required' | 'availability', value: boolean) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

    const result = await updateRoomBoolean(id, field, value);
    if (!result.success) {
      toast.error(result.error);
      // Revert UI on failure
      setRooms(prev => prev.map(r => r.id === id ? { ...r, [field]: !value } : r));
    }
}, [])

  const handleAvailabilityTo = useCallback(async (id: string, value: 'superUser' | 'user') => {
    const originalValue = rooms.find(r => r.id === id)?.availableTo;
    setRooms(prev => prev.map(r => r.id === id ? { ...r, availableTo: value } : r));

    const result = await updateRoomAvailabilityTo(id, value);
    if (!result.success) {
      toast.error(result.error);
      setRooms(prev => prev.map(r => r.id === id ? { ...r, availableTo: originalValue ?? null } : r));
    }
  }, [rooms])

  const toggleApprover = useCallback(async (room: Rooms, email: string) => {
    const originalApprovers = room.approvers ?? [];
    const newApprovers = originalApprovers.includes(email)
      ? originalApprovers.filter(e => e !== email)
      : [...originalApprovers, email];
    
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, approvers: newApprovers } : r));
    
    const result = await updateRoomApprovers(room.id, newApprovers);
    if (!result.success) {
      toast.error(result.error);
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, approvers: originalApprovers } : r));
    }
  }, [])

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
                <DropdownMenuItem onClick={() => void handleToggle(rooms.id, 'availability', true)}>Available</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleToggle(rooms.id, 'availability', false)}>Unavailable</DropdownMenuItem>
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
                  {rooms.availableTo === "superUser" ? "super user" : "user"} <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Make Available To</DropdownMenuLabel>
                <DropdownMenuItem disabled={rooms.availableTo === 'user'} onClick={() => {void handleAvailabilityTo(rooms.id, 'user')}}>User</DropdownMenuItem>
                <DropdownMenuItem disabled={rooms.availableTo === 'superUser'} onClick={() => {void handleAvailabilityTo(rooms.id, 'superUser')}}>Super User</DropdownMenuItem>
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
            checked={rooms.approvalRequired === true}
            onClick={() => void handleToggle(rooms.id, 'approval_required', !rooms.approvalRequired)}
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
                  onClick={() => void toggleApprover(room, email)}
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
  ], [adminEmails, handleToggle, handleAvailabilityTo, toggleApprover])

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
