"use client";

import { Button } from "@/components/ui/button";
import { addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface WeekNavigatorProps {
  weekStart: Date;
}

export function WeekNavigator({ weekStart }: WeekNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToWeek = useCallback(
    (date: Date) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("week", format(date, "yyyy-MM-dd"));
      router.push(`/admin/calendar?${params.toString()}`);
    },
    [router, searchParams],
  );

  const goToPrevWeek = () => {
    navigateToWeek(subWeeks(weekStart, 1));
  };

  const goToNextWeek = () => {
    navigateToWeek(addWeeks(weekStart, 1));
  };

  const goToToday = () => {
    navigateToWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={goToPrevWeek} size="icon" variant="outline">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button onClick={goToToday} variant="outline">
        Today
      </Button>
      <Button onClick={goToNextWeek} size="icon" variant="outline">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="ml-2 font-medium">Week of {format(weekStart, "EEE, MMM d")}</span>
    </div>
  );
}
