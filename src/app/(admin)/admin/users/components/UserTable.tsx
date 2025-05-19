"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
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
import { supabase } from "@/lib/supabase/client";
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

interface User {
    id: string,
    role: 'admin' | 'user'
}

export default function UserTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [users, setUsers] = useState<User[]>([])
  const [fetchError, setFetchError] = useState<null | string>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.from("profiles").select();

      if (error) {
        setFetchError("Error loading users");
        setUsers([]);
        console.log(error);
      }
      
      if (data) {
        setUsers(data);
        setFetchError(null);
      }
    };

    void fetchUser();
  }, []);

  const handleRoleChange = useCallback( async (id: string, newRole: User['role']) => {
    const {error} = await supabase
    .from("profiles")
    .update({role: newRole})
    .eq("id", id)
    .select()

    if (error) {
      console.log("error changing user status", error)
      return
    }  
      
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, role: newRole } : user
      ))

  }, [])

  const columns = useMemo<ColumnDef<User>[]>(()=> [
    // {
    //   cell: ({ row }) => (
    //     <Checkbox
    //       aria-label="Select row"
    //       checked={row.getIsSelected()}
    //       onCheckedChange={(value) => { row.toggleSelected(!!value); }}
    //     />
    //   ),
    //   enableHiding: false,
    //   enableSorting: false,
    //   header: ({ table }) => (
    //     <Checkbox
    //       aria-label="Select all"
    //       checked={
    //         table.getIsAllPageRowsSelected() ||
    //         (table.getIsSomePageRowsSelected() && "indeterminate")
    //       }
    //       onCheckedChange={(value) => { table.toggleAllPageRowsSelected(!!value); }}
    //     />
    //   ),
    //   id: "select",
    // },
    // {
    //   accessorKey: "name",
    //   cell: ({ row }) => <div className="ml-4">{row.getValue("name")}</div>,
    //   header: ({ column }) => {
    //     return (
    //       <Button
    //         onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
    //         variant="ghost"
    //       >
    //         Name
    //         <ArrowUpDown />
    //       </Button>
    //     );
    //   },
    // },
    // {
    //   accessorKey: "phone",
    //   cell: ({ row }) => <div className="ml-4">0{row.getValue("phone")}</div>,
    //   header: ({ column }) => {
    //     return (
    //       <Button
    //         onClick={() => { column.toggleSorting(column.getIsSorted() === "asc"); }}
    //         variant="ghost"
    //       >
    //         Phone Number
    //         <ArrowUpDown />
    //       </Button>
    //     );
    //   },
    // },
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
      accessorKey: "role",
      cell: ({ row }) => {
        const user = row.original

        return (
          <div className="capitalize">
            <DropdownMenu>
              <DropdownMenuTrigger 
                asChild
                className="px-1 py-1 rounded text-sm"
                >
                <Button className="flex capitalize" variant="ghost">
                  {user.role} <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Make User</DropdownMenuLabel>
                <DropdownMenuItem disabled={user.role === 'admin'} onClick={() => {void handleRoleChange(user.id, 'admin')}}>Admin</DropdownMenuItem>
                <DropdownMenuItem disabled={user.role === 'user'} onClick={() => {void handleRoleChange(user.id, 'user')}}>User</DropdownMenuItem>
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
  ], [handleRoleChange])

  const table = useReactTable({
    columns,
    data: users,
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
    <div className="px-6 w-full">
      <h2 className="font-bold">Users Table</h2>
      <p>Change user role here</p>
      <div className="flex items-center py-4 overflow-x-scroll">
        <Input
          className="max-w-sm"
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          placeholder="Filter emails..."
          value={(table.getColumn("email")?.getFilterValue() as string) || ""}
        />
        {/* <DropdownMenu>
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
        </DropdownMenu> */}
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
