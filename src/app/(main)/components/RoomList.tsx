"use client";

import { useSupabase } from "@/components/providers/supabase-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Rooms } from "@/db/schema";
import { canBookRoom, canCreateMultiDayBooking } from "@/lib/roles";
import type { User } from "@supabase/supabase-js";
import { Circle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import BookingForm2 from "./BookingForm";
import BookingSummary from "./BookingSummary";
import DateTimeSelector from "./DateTimeSelector";
import MultiDayBookingForm from "./MultiDayBookingForm";

interface RoomListProps {
  initialProfile: null | { email: null | string; fullName: null | string; phone: null | string };
  roomData: Rooms[];
}

interface RoomCardProps {
  initialProfile: RoomListProps["initialProfile"];
  role: null | string;
  room: Rooms;
  rooms: Rooms[];
  user: null | User;
}

function RoomCard({ initialProfile, role, room, rooms, user }: RoomCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState("1");
  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [date, setDate] = useState<Date | undefined>(() => createTodayDate());
  const [bookingMode, setBookingMode] = useState<"multi_day" | "standard">("standard");
  const [selectedRoom, setSelectedRoom] = useState<null | Rooms>(room);
  const router = useRouter();

  const showMultiDayOption = canCreateMultiDayBooking(role);
  const userCanBook = canBookRoom(role, room.availableTo);

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setStep("1");
      setStartTime(undefined);
      setEndTime(undefined);
      setBookingMode("standard");
      setSelectedRoom(room);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span>{room.name}</span>
            <span className="flex items-center gap-1 text-sm font-normal">
              <Users size={16} />
              {room.capacity}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-success-bg rounded-[20px] px-3">
            <Circle className="fill-success stroke-none w-[10px]" />
            <span className="text-sm font-normal text-success">
              {room.availability ? "Available" : "Unavailable"}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog onOpenChange={handleDialogOpenChange} open={isDialogOpen}>
          {user && !userCanBook ? (
            <a
              href="https://api.whatsapp.com/send?phone=60108257573"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Button className="w-full" variant="outline">
                Contact Us
              </Button>
            </a>
          ) : user ? (
            <DialogTrigger asChild>
              <Button
                className="w-full"
                onClick={() => {
                  setIsDialogOpen(true);
                }}
                variant="outline"
              >
                Book now
              </Button>
            </DialogTrigger>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                router.push("/login");
              }}
              variant="outline"
            >
              Book now
            </Button>
          )}
          <DialogContent className="max-h-[90vh] overflow-y-scroll">
            <DialogTitle>Availability</DialogTitle>
            {showMultiDayOption && (
              <div className="flex gap-2 mb-2">
                <Button
                  onClick={() => {
                    setBookingMode("standard");
                  }}
                  size="sm"
                  variant={bookingMode === "standard" ? "default" : "outline"}
                >
                  Standard Booking
                </Button>
                <Button
                  onClick={() => {
                    setBookingMode("multi_day");
                  }}
                  size="sm"
                  variant={bookingMode === "multi_day" ? "default" : "outline"}
                >
                  Multi-Day Booking
                </Button>
              </div>
            )}
            {bookingMode === "multi_day" && selectedRoom ? (
              <MultiDayBookingForm rooms={rooms} selectedRoom={selectedRoom} />
            ) : (
              <Tabs onValueChange={setStep} value={step}>
                <TabsList>
                  <TabsTrigger value="1">1. Select Date & Time</TabsTrigger>
                  <TabsTrigger disabled={!date || !startTime || !endTime} value="2">
                    2. Your Information
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="1">
                  <DateTimeSelector
                    date={date}
                    endTime={endTime}
                    goToStep2={() => {
                      setStep("2");
                    }}
                    rooms={rooms}
                    selectedRoom={selectedRoom}
                    setDate={setDate}
                    setEndTime={setEndTime}
                    setSelectedRoom={setSelectedRoom}
                    setStartTime={setStartTime}
                    startTime={startTime}
                  />
                </TabsContent>
                <TabsContent className="mt-6" value="2">
                  <BookingSummary
                    date={date}
                    endTime={endTime}
                    selectedRoom={selectedRoom}
                    startTime={startTime}
                  />
                  <div className="mt-6">
                    {date && startTime && endTime && selectedRoom && (
                      <BookingForm2
                        date={date}
                        endTime={endTime}
                        initialProfile={initialProfile}
                        selectedRoom={selectedRoom}
                        startTime={startTime}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function RoomList({ initialProfile, roomData }: RoomListProps) {
  const { role, user } = useSupabase();

  return (
    <div className="container mt-2 mx-auto py-3 px-6">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {roomData.map((room) => (
          <RoomCard
            key={room.id}
            initialProfile={initialProfile}
            role={role}
            room={room}
            rooms={roomData}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}

function createTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
