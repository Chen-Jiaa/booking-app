"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { type ReactElement, useOptimistic, useState } from "react";

import { updateBookingStatus } from "../../actions/booking-status-change";

type StatusUpdater = (id: number, newStatus: "confirmed" | "rejected") => void;

const columns: ColumnDef<Bookings>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Name
        <ArrowUpDown />
      </Button>
    ),
  },
  {
    accessorKey: "phone",
    cell: ({ row }) => <div>{row.getValue("phone")}</div>,
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Phone
        <ArrowUpDown />
      </Button>
    ),
  },
  {
    accessorKey: "email",
    cell: ({ row }) => (
      <div className="lowercase ml-4">{row.getValue("email")}</div>
    ),
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Email
        <ArrowUpDown />
      </Button>
    ),
  },
  {
    accessorKey: "roomName",
    cell: ({ row }) => <div>{row.getValue("roomName")}</div>,
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Room
        <ArrowUpDown />
      </Button>
    ),
  },
  {
    accessorFn: (row) => row.startTime,
    cell: ({ row }) => <div>{formatBookingDate(row.getValue("bookingDate"))}</div>,
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Booking Date
        <ArrowUpDown />
      </Button>
    ),
    id: "bookingDate",
  },
  {
    accessorKey: "startTime",
    cell: ({ row }) => (
      <div className="text-right">{formatBookingTime(row.getValue("startTime"))}</div>
    ),
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Start Time
        <ArrowUpDown />
      </Button>
    ),
  },
  {
    accessorKey: "endTime",
    cell: ({ row }) => (
      <div className="text-right">{formatBookingTime(row.getValue("endTime"))}</div>
    ),
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        End Time
        <ArrowUpDown />
      </Button>
    ),
  },
  {
    accessorKey: "status",
    cell: ({ row, table }) => {
      const booking = row.original;
      const onStatusChange = (table.options.meta as { onStatusChange: StatusUpdater }).onStatusChange;

      if (booking.status === "cancelled") {
        return (
          <span className={cn(
            "flex ml-auto px-2 py-1 rounded-sm text-sm capitalize w-fit",
            "bg-muted text-muted-foreground",
          )}>
            {booking.status}
          </span>
        );
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "flex ml-auto px-2 py-1 rounded-sm text-sm capitalize",
                booking.status === "pending" &&
                  "bg-warning-bg text-warning hover:bg-warning/25",
                booking.status === "confirmed" &&
                  "bg-success-bg text-success hover:bg-success/25",
                booking.status === "rejected" &&
                  "bg-error-bg text-error hover:bg-error/25",
              )}
              variant="ghost"
            >
              {booking.status}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                onStatusChange(booking.id, "confirmed");
              }}
            >
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                onStatusChange(booking.id, "rejected");
              }}
            >
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
        variant="ghost"
      >
        Status
        <ArrowUpDown />
      </Button>
    ),
  },
];

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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [optimisticData, setOptimisticStatus] = useOptimistic(
    bookingData,
    (current, { id, status }: { id: number; status: string }) =>
      current.map((b) => (b.id === id ? { ...b, status } : b)),
  );

  const handleStatusChange: StatusUpdater = (id, newStatus) => {
    setOptimisticStatus({ id, status: newStatus });
    void updateBookingStatus(id, newStatus);
  };

  const table = useReactTable({
    columns,
    data: optimisticData,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { onStatusChange: handleStatusChange },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnVisibility,
      sorting,
    },
  });

  return (
    <div className="p-6">
      <h2 className="font-bold">Recent Bookings</h2>
      <p>Kindly approve or reject bookings here</p>
      <div className="flex items-center py-4 overflow-x-scroll">
        <Input
          className="max-w-sm"
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          placeholder="Filter emails..."
          value={(table.getColumn("email")?.getFilterValue() as string | undefined) ?? ""}
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
              .map((column) => (
                <DropdownMenuCheckboxItem
                  checked={column.getIsVisible()}
                  className="capitalize"
                  key={column.id}
                  onCheckedChange={(value) => {
                    column.toggleVisibility(!!value);
                  }}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
      <div className="mt-4">
        <Pagination page={page} pageCount={pageCount} />
      </div>
    </div>
  );
}
