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
import { memo, useCallback, useState } from "react";

import BookingForm2 from "./BookingForm";
import BookingSummary from "./BookingSummary";
import DateTimeSelector from "./DateTimeSelector";
import MultiDayBookingForm from "./MultiDayBookingForm";

type RoomAction = "book" | "contact" | "sign-in";
type RoomStatus = "available" | "contact" | "unavailable";

const BUILDING_ORDER = ["Office Block", "Main Hall", "Stage 8"];

const ROOM_PICKER_DETAILS: Record<string, null | string> = {
  Auditorium: null,
  "Holding Room 1": "Rooms under Stage 8",
  "Holding Room 2": "Rooms under Stage 8",
  Lobby: null,
  "Stage 8": null,
  "VIP Room 3": "VIP Room",
  "VIP Room 4": "Artist Room",
};

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.768.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.478-.883-.788-1.479-1.762-1.652-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.496.099-.198.05-.372-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.075-.792.372-.273.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.214 3.074.148.198 2.098 3.204 5.08 4.495.71.307 1.264.49 1.696.627.713.227 1.36.195 1.872.118.571-.085 1.758-.718 2.005-1.412.248-.694.248-1.289.173-1.412-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.003a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.738.981.998-3.648-.235-.375a9.87 9.87 0 0 1-1.51-5.26c.001-5.454 4.437-9.89 9.892-9.89a9.87 9.87 0 0 1 6.99 2.896 9.87 9.87 0 0 1 2.892 6.997c-.002 5.454-4.438 9.89-9.894 9.89m8.413-18.296A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.89c0 2.097.548 4.145 1.588 5.951L.058 24l6.335-1.662a11.87 11.87 0 0 0 5.653 1.438h.005c6.554 0 11.89-5.336 11.893-11.892a11.82 11.82 0 0 0-3.48-8.395" />
    </svg>
  );
}

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

function getRoomAction(room: Rooms, role: null | string, user: null | User): RoomAction {
  if (!room.availability || (user && !canBookRoom(role, room.availableTo))) {
    return "contact";
  }

  return user ? "book" : "sign-in";
}

function getRoomStatus(room: Rooms, action: RoomAction): RoomStatus {
  if (!room.availability) return "unavailable";
  return action === "contact" ? "contact" : "available";
}

function getRoomSubtitle(room: Rooms) {
  if (Object.prototype.hasOwnProperty.call(ROOM_PICKER_DETAILS, room.name)) {
    return ROOM_PICKER_DETAILS[room.name];
  }

  return room.description;
}

const RoomCard = memo(function RoomCard({
  initialProfile,
  role,
  room,
  rooms,
  user,
}: RoomCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState("1");
  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [date, setDate] = useState<Date | undefined>(() => createTodayDate());
  const [bookingMode, setBookingMode] = useState<"multi_day" | "standard">("standard");
  const [selectedRoom, setSelectedRoom] = useState<null | Rooms>(room);
  const router = useRouter();

  const action = getRoomAction(room, role, user);
  const status = getRoomStatus(room, action);
  const subtitle = getRoomSubtitle(room);
  const showMultiDayOption = canCreateMultiDayBooking(role);
  const statusLabels = {
    available: "Available",
    contact: "Contact Us",
    unavailable: "Unavailable",
  };
  const statusStyles = {
    available: "bg-success-bg text-success",
    contact: "bg-warning-bg text-warning",
    unavailable: "bg-muted text-muted-foreground",
  };

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) {
        setStep("1");
        setStartTime(undefined);
        setEndTime(undefined);
        setBookingMode("standard");
        setSelectedRoom(room);
      }
    },
    [room],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug">{room.name}</CardTitle>
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${statusStyles[status]}`}
          >
            <Circle aria-hidden="true" className="size-2 fill-current stroke-none" />
            <span className="text-xs font-medium">{statusLabels[status]}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users aria-hidden="true" className="size-4" />
          <span>
            {room.capacity} {room.capacity === 1 ? "person" : "people"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <Dialog onOpenChange={handleDialogOpenChange} open={isDialogOpen}>
          {action === "contact" ? (
            <Button asChild className="w-full" variant="outline">
              <a
                href="https://api.whatsapp.com/send?phone=60108257573"
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon />
                Contact Us
              </a>
            </Button>
          ) : action === "book" ? (
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogTitle>Availability</DialogTitle>
            {showMultiDayOption ? (
              <div className="mb-2 flex gap-2">
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
            ) : null}
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
                    {date && startTime && endTime && selectedRoom ? (
                      <BookingForm2
                        date={date}
                        endTime={endTime}
                        initialProfile={initialProfile}
                        selectedRoom={selectedRoom}
                        startTime={startTime}
                      />
                    ) : null}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});

export function RoomList({ initialProfile, roomData }: RoomListProps) {
  const { role, user } = useSupabase();
  const roomsByBuilding = new Map<string, Rooms[]>();

  for (const room of roomData) {
    const roomsInBuilding = roomsByBuilding.get(room.building) ?? [];
    roomsInBuilding.push(room);
    roomsByBuilding.set(room.building, roomsInBuilding);
  }

  const groups = BUILDING_ORDER.flatMap((title) => {
    const rooms = roomsByBuilding.get(title);
    return rooms ? [{ rooms, title }] : [];
  });
  const otherRooms = roomData.filter((room) => !BUILDING_ORDER.includes(room.building));

  if (otherRooms.length > 0) {
    groups.push({ rooms: otherRooms, title: "Other rooms" });
  }

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Available Rooms</h1>
      </div>
      <section aria-label="Rooms" className="space-y-8">
        {groups.map((group) => {
          const sectionId = `rooms-${group.title.toLowerCase().replaceAll(" ", "-")}`;

          return (
            <section aria-labelledby={sectionId} key={group.title}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold" id={sectionId}>
                  {group.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {group.rooms.length} {group.rooms.length === 1 ? "room" : "rooms"}
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                {group.rooms.map((room) => (
                  <RoomCard
                    initialProfile={initialProfile}
                    key={room.id}
                    role={role}
                    room={room}
                    rooms={roomData}
                    user={user}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}

function createTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
