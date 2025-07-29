"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createElement, type ReactElement } from "react";
import { Button } from "./button";



interface PaginationButtonProps {
  disabled: boolean;
  icon: LucideIcon;
  pageNumber: number;
}

interface PaginationProps {
  page: number;
  pageCount: number;
}

export function Pagination(props: PaginationProps): null | ReactElement {
  const { page, pageCount } = props;

  if (pageCount === 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-x-4">
      <span className="text-sm">
        Page {page} of {pageCount}
      </span>
      <div className="flex items-center gap-x-2">
        <PaginationButton
          disabled={page === 1}
          icon={ChevronsLeft}
          pageNumber={1}
        />
        <PaginationButton
          disabled={page === 1}
          icon={ChevronLeft}
          pageNumber={page - 1}
        />
        <PaginationButton
          disabled={page === pageCount}
          icon={ChevronRight}
          pageNumber={page + 1}
        />
        <PaginationButton
          disabled={page === pageCount}
          icon={ChevronsRight}
          pageNumber={pageCount}
        />
      </div>
    </div>
  );
}

function PaginationButton(props: PaginationButtonProps): ReactElement {
  const { disabled, icon, pageNumber } = props;
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Button
      className="h-8 w-8 rounded-xl border dark:border-gray-800/80 disabled:dark:text-gray-700"
      disabled={disabled}
      onClick={() => {
        const query = new URLSearchParams([["page", String(pageNumber)]]);
        router.push(`${pathname}?${query.toString()}`);
      }}
    >
      {createElement(icon, { size: 18 })}
    </Button>
  );
}
