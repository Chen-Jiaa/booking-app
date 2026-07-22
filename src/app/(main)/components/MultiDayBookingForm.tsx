"use client";

import { useSupabase } from "@/components/providers/supabase-providers";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Rooms } from "@/db/schema";
import { eachDayOfInterval, format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type DateRange } from "react-day-picker";
import { toast } from "sonner";

import { getUserProfile } from "../actions/getUserProfile";
import { submitMultiDayBooking } from "../actions/submitMultiDayBooking";
import MultiDayDateConfig, { type DayConfig } from "./MultiDayDateConfig";

interface MultiDayBookingFormProps {
  rooms: Rooms[];
  selectedRoom: Rooms;
}

export default function MultiDayBookingForm({ rooms, selectedRoom }: MultiDayBookingFormProps) {
  const { user } = useSupabase();
  const router = useRouter();

  // Event info
  const [eventName, setEventName] = useState("");
  const [clientName, setClientName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [expectedAttendance, setExpectedAttendance] = useState("");

  // Date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Lobby prompt
  const [needsLobby, setNeedsLobby] = useState<boolean | null>(null);

  // Per-day config
  const [showDayConfig, setShowDayConfig] = useState(false);
  const [dayConfigs, setDayConfigs] = useState<DayConfig[]>([]);

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // Autofill manager info from profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setManagerName(profile.fullName ?? "");
          setManagerPhone(profile.phone ?? "");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    }
    if (user) {
      void loadProfile();
    }
  }, [user]);

  const isMainHall = selectedRoom.name === "Main Hall";

  const canContinue =
    eventName.trim() !== "" &&
    clientName.trim() !== "" &&
    dateRange?.from != null &&
    dateRange.to != null &&
    (!isMainHall || needsLobby !== null);

  const handleContinue = () => {
    if (!dateRange?.from || !dateRange.to) return;

    const days = eachDayOfInterval({
      end: dateRange.to,
      start: dateRange.from,
    });
    setDayConfigs(
      days.map((date) => ({
        date,
        dayType: "rehearsal_setup" as const,
        endTime: undefined,
        isAllDay: false,
        startTime: undefined,
      })),
    );
    setShowDayConfig(true);
  };

  const allDaysConfigured = dayConfigs.every(
    (day) => day.isAllDay || (day.startTime && day.endTime),
  );

  const lobbyRoom = rooms.find((r) => r.name === "Lobby to Main Hall");

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const result = await submitMultiDayBooking({
        clientName,
        days: dayConfigs.map((day) => ({
          date: day.date.toISOString(),
          dayType: day.dayType,
          endTime: day.endTime,
          isAllDay: day.isAllDay,
          startTime: day.startTime,
        })),
        email: user.email ?? "",
        eventName,
        expectedAttendance: expectedAttendance ? Number.parseInt(expectedAttendance) : null,
        managerName,
        managerPhone,
        needsLobby: needsLobby ?? false,
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        userId: user.id,
      });

      if (result.success) {
        toast.success("Multi-day booking submitted successfully! Awaiting approval.");
        router.push(`/booking-confirmation/${result.booking.id.toString()}`);
      } else {
        toast.error(`Booking conflicts detected:\n${result.conflicts.join("\n")}`);
      }
    } catch (error) {
      console.error("Multi-day booking error:", error);
      toast.error("Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Event Name</Label>
            <Input
              onChange={(e) => {
                setEventName(e.target.value);
              }}
              placeholder="Enter event name"
              value={eventName}
            />
          </div>
          <div>
            <Label>Client Name</Label>
            <Input
              onChange={(e) => {
                setClientName(e.target.value);
              }}
              placeholder="Enter client name"
              value={clientName}
            />
          </div>
          <div>
            <Label>Event Manager Name</Label>
            <Input className="bg-muted" readOnly value={managerName} />
          </div>
          <div>
            <Label>Event Manager Phone</Label>
            <Input className="bg-muted" readOnly value={managerPhone} />
          </div>
          <div>
            <Label>Expected Attendance</Label>
            <Input
              onChange={(e) => {
                setExpectedAttendance(e.target.value);
              }}
              placeholder="Number of attendees"
              type="number"
              value={expectedAttendance}
            />
          </div>
        </CardContent>
      </Card>

      {/* Room & Date Range */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Room</Label>
            <p className="font-medium">{selectedRoom.name}</p>
          </div>

          <div>
            <Label>Select Date Range</Label>
            <Calendar
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              mode="range"
              numberOfMonths={1}
              onSelect={(range) => {
                setDateRange(range);
                setShowDayConfig(false);
                setDayConfigs([]);
              }}
              selected={dateRange}
            />
            {dateRange?.from && dateRange.to && (
              <p className="text-sm text-muted-foreground mt-2">
                {format(dateRange.from, "MMM d, yyyy")} — {format(dateRange.to, "MMM d, yyyy")} (
                {
                  eachDayOfInterval({
                    end: dateRange.to,
                    start: dateRange.from,
                  }).length
                }{" "}
                days)
              </p>
            )}
          </div>

          {/* Lobby prompt for Main Hall */}
          {isMainHall && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="font-medium mb-2">
                Will the client also need the Lobby for setup/event?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setNeedsLobby(true);
                  }}
                  size="sm"
                  variant={needsLobby === true ? "default" : "outline"}
                >
                  Yes
                </Button>
                <Button
                  onClick={() => {
                    setNeedsLobby(false);
                  }}
                  size="sm"
                  variant={needsLobby === false ? "default" : "outline"}
                >
                  No
                </Button>
              </div>
              {needsLobby && lobbyRoom && (
                <p className="text-sm text-muted-foreground mt-2">
                  The Lobby to Main Hall will be included and blocked for the same dates/times.
                </p>
              )}
            </div>
          )}

          {!showDayConfig && (
            <Button className="w-full" disabled={!canContinue} onClick={handleContinue}>
              Continue to Day Configuration
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Per-Day Configuration */}
      {showDayConfig && (
        <>
          <MultiDayDateConfig
            dayConfigs={dayConfigs}
            onChange={setDayConfigs}
            roomId={selectedRoom.id}
          />

          {/* Booking Summary */}
          {allDaysConfigured && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-4">Booking Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Event:</span>
                    <span className="font-medium">{eventName}</span>
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{clientName}</span>
                    <span className="text-muted-foreground">Room:</span>
                    <span className="font-medium">{selectedRoom.name}</span>
                    {needsLobby && (
                      <>
                        <span className="text-muted-foreground">+ Lobby:</span>
                        <span className="font-medium">Included</span>
                      </>
                    )}
                    {expectedAttendance !== "" && (
                      <>
                        <span className="text-muted-foreground">Attendance:</span>
                        <span className="font-medium">{expectedAttendance}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Time</th>
                        <th className="px-3 py-2 text-left">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayConfigs.map((day) => (
                        <tr className="border-t" key={day.date.toISOString()}>
                          <td className="px-3 py-2">{format(day.date, "EEE, MMM d")}</td>
                          <td className="px-3 py-2">
                            {day.isAllDay
                              ? "All Day"
                              : `${day.startTime ?? ""} – ${day.endTime ?? ""}`}
                          </td>
                          <td className="px-3 py-2">
                            {day.dayType === "main_event" ? "Main Event Day" : "Rehearsal / Setup"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  className="w-full mt-4"
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime state
                  disabled={!allDaysConfigured || submitting || !user}
                  onClick={() => {
                    void handleSubmit();
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Multi-Day Booking"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
