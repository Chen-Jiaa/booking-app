"use client";

import { useSupabase } from "@/components/providers/supabase-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Rooms } from "@/db/schema";
import { Circle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import BookingForm2 from "./BookingForm";
import BookingSummary from "./BookingSummary";
import DateTimeSelector from "./DateTimeSelector";

export function RoomList({ roomData }: { roomData: Rooms[] }) {
  const { user } = useSupabase();
  const [selectedRoom, setSelectedRoom] = useState<null | Rooms>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState("1");
  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(() => createTodayDate());

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setStep("1");
      setStartTime(undefined);
      setEndTime(undefined);
    }
  };

  const handleBookNowClickAlwaysReset = useCallback((room: Rooms) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
    setDate(createTodayDate()); // Always reset to clean today
  }, []);

  return (
    <div className="container mt-2 mx-auto py-3 px-6">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <span>{room.name}</span>
                  <span className="flex items-center gap-1 text-sm font-normal">
                    <Users size={16} />
                    {room.capacity}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-green-50 rounded-[20px] px-3">
                  <Circle className="fill-green-700 w-[10px]" />
                  <span className="text-sm font-normal text-green-700">
                    {room.availability ? "Available" : "Unavailable"}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog
                onOpenChange={handleDialogOpenChange}
                open={isDialogOpen && selectedRoom?.id === room.id}
              >
                {user ? (
                  <DialogTrigger asChild>
                    <Button
                      className="w-full text-black"
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsDialogOpen(true);
                      }}
                      variant="outline"
                    >
                      Book now
                    </Button>
                  </DialogTrigger>
                ) : (
                  <Button
                    className="w-full text-black"
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
                  <Tabs className="" onValueChange={setStep} value={step}>
                    <TabsList>
                      <TabsTrigger value="1">1. Select Date & Time</TabsTrigger>
                      <TabsTrigger
                        disabled={!date || !startTime || !endTime}
                        value="2"
                      >
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
                            selectedRoom={selectedRoom}
                            startTime={startTime}
                          />
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function createTodayDate(): Date {
  const today = new Date();
  // Set to start of day to avoid timing issues
  today.setHours(0, 0, 0, 0);
  return today;
}
