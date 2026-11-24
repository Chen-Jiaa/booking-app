"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { type CreateClosureResult, createClosure } from "../actions";

interface RoomOption {
  building: string;
  id: string;
  name: string;
}

export default function ClosureForm({ rooms }: { rooms: RoomOption[] }) {
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("23:00");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateClosureResult | null>(null);

  const buildings = [...new Set(rooms.map((r) => r.building))];

  function toggleRooms(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);
    const response = await createClosure({
      allDay,
      endDate: endDate || startDate,
      endTime,
      label,
      roomIds: [...selected],
      startDate,
      startTime,
    });
    setResult(response);
    setIsLoading(false);
    if (response.success) {
      setLabel("");
      setSelected(new Set());
    }
  }

  return (
    <form className="space-y-6 rounded-lg border p-4 sm:p-6" onSubmit={(e) => void handleSubmit(e)}>
      <h2 className="text-lg font-medium">New closure</h2>

      <div className="space-y-2">
        <Label htmlFor="closure-label">Name</Label>
        <Input
          id="closure-label"
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Kancil Awards"
          value={label}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="closure-start">First day</Label>
          <Input
            id="closure-start"
            onChange={(e) => setStartDate(e.target.value)}
            type="date"
            value={startDate}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closure-end">Last day (leave empty for one day)</Label>
          <Input
            id="closure-end"
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            type="date"
            value={endDate}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allDay}
            id="closure-all-day"
            onCheckedChange={(checked) => setAllDay(checked === true)}
          />
          <Label htmlFor="closure-all-day">Closed for the whole day (24 hours)</Label>
        </div>
        {!allDay && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closure-from">From (each day)</Label>
              <Input
                id="closure-from"
                onChange={(e) => setStartTime(e.target.value)}
                type="time"
                value={startTime}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closure-to">Until (each day)</Label>
              <Input
                id="closure-to"
                onChange={(e) => setEndTime(e.target.value)}
                type="time"
                value={endTime}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Rooms ({selected.size} selected)</Label>
          <Button
            onClick={() =>
              toggleRooms(
                rooms.map((r) => r.id),
                selected.size !== rooms.length,
              )
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {selected.size === rooms.length ? "Clear all" : "Select all rooms"}
          </Button>
        </div>
        {buildings.map((building) => {
          const buildingRooms = rooms.filter((r) => r.building === building);
          const allOn = buildingRooms.every((r) => selected.has(r.id));
          return (
            <fieldset className="space-y-2 rounded-md border p-3" key={building}>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allOn}
                  id={`building-${building}`}
                  onCheckedChange={(checked) =>
                    toggleRooms(
                      buildingRooms.map((r) => r.id),
                      checked === true,
                    )
                  }
                />
                <Label className="font-semibold" htmlFor={`building-${building}`}>
                  {building}
                </Label>
              </div>
              <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
                {buildingRooms.map((room) => (
                  <div className="flex items-center gap-2" key={room.id}>
                    <Checkbox
                      checked={selected.has(room.id)}
                      id={`room-${room.id}`}
                      onCheckedChange={(checked) => toggleRooms([room.id], checked === true)}
                    />
                    <Label className="font-normal" htmlFor={`room-${room.id}`}>
                      {room.name}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      {result && !result.success && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.success && (
        <div className="space-y-2 rounded-md border border-green-600/40 bg-green-50 p-3 text-sm">
          <p className="font-medium">Closure created. These rooms can no longer be booked.</p>
          {result.totalAffected > 0 && (
            <div className="space-y-1">
              <p className="text-amber-700">
                {result.totalAffected} existing booking(s) overlap and were NOT cancelled:
              </p>
              <ul className="list-disc pl-5">
                {result.affectedBookings.map((b) => (
                  <li key={b.id}>
                    #{b.id} {b.roomName} — {b.name} (
                    {new Date(b.startTime).toLocaleString("en-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                    })}
                    , {b.status})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full sm:w-auto"
        disabled={isLoading || !label.trim() || !startDate || selected.size === 0}
        type="submit"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Close selected rooms
      </Button>
    </form>
  );
}
