"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Circle, Clock, Dot, Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  addMinutes,
  addMonths,
  format,
  isSameDay,
  startOfToday,
} from "date-fns";
import { interval, room_endHour, room_startHour } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabase } from "@/components/providers/supabase-providers";

type Rooms = {
  id: string;
  name: string;
  capacity: number;
  availability: boolean;
};

export default function RoomList() {
  const [fetchError, setFetchError] = useState<null | string>(null);
  const [rooms, setRooms] = useState<Rooms[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Rooms | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<string | undefined>(undefined);
  const [endTime, setEndTime] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("1");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmedRoom, setConfirmedRoom] = useState<Rooms | null>(null);
  const router = useRouter();
  const { user } = useSupabase();

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true)

      await supabase.auth.getSession()

      const { data, error } = await supabase
        .from("rooms")
        .select()
        .eq("availability", true)

      if (error) {
        setFetchError("Error Fetching Rooms")
        setRooms([])
        console.log(error)
      } else if (data) {
        const sortedRooms = [...data].sort((a, b) =>
          a.name.localeCompare(b.name),
        )
        setRooms(sortedRooms)
        setFetchError(null)
      }
      setLoading(false)
    }

    fetchRooms()
  }, []);

  const generateTimeSlots = () => {
    const slots = [];

    for (let i = room_startHour; i <= room_endHour; i += interval / 60) {
      const hour = Math.floor(i);
      const minutes = i % 1 === 0 ? "00" : "30";
      slots.push(`${hour.toString().padStart(2, "0")}:${minutes}`);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  function handleContinue() {
    if (!date || !startTime || !endTime) {
      return;
    }

    setStep("2");
  }

  useEffect(() => {
    if (date && selectedRoom) {
      checkAvailability(date, selectedRoom.id);
    }
  }, [date, selectedRoom]);

  const checkAvailability = async (selectedDate: Date, roomId: string) => {
    setIsCheckingAvailability(true);

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data: bookings } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("room_id", roomId)
        // .or(`status.eq.pending, status.eq.approved`)
        .gte("start_time", `${dateStr}T00:00:00`)
        .lt("start_time", `${dateStr}T23:59:59`);

      const booked = new Set<string>();

      if (bookings && bookings.length > 0) {
        bookings.forEach((booking) => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);

          if (isSameDay(bookingStart, selectedDate)) {
            let currentSlot = new Date(bookingStart);

            while (currentSlot < bookingEnd) {
              try {
                const timeStr = format(currentSlot, "HH:mm");
                booked.add(timeStr);
                currentSlot = addMinutes(currentSlot, 30);
              } catch (error) {
                console.error("Error processing time slot:", error);
                break;
              }
            }
          }
        });
      }
      setBookedSlots(booked);
    } catch (error) {
      console.error("Error checking availability:", error);
      toast("Error", {
        description: "Failed to check room availability. Please try again.",
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleRoomChange = (roomId: string) => {
    const newRoom = rooms.find((r) => r.id === roomId);

    if (newRoom) {
      setSelectedRoom(newRoom);
      setOpen(false);
      setStartTime(undefined);
      setEndTime(undefined);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setStartTime(undefined);
    setEndTime(undefined);
  };

  const handleTimeSelect = (time: string) => {
    if (startTime === undefined) {
      setStartTime(time);
    } else if (time === startTime) {
      setStartTime(undefined);
      setEndTime(undefined);
    } else if (endTime === undefined && time > startTime) {
      setEndTime(time);
    } else if (endTime !== undefined && time === endTime) {
      setEndTime(undefined);
    } else if (
      time < startTime ||
      (endTime !== undefined && time !== endTime)
    ) {
      setStartTime(time);
      setEndTime(undefined);
    }
  };

  const isTimeSlotAvailable = (timeSlots: string) => {
    if (!date || isCheckingAvailability) return false;

    return !bookedSlots.has(timeSlots);
  };

  const isTimeSlotSelected = (timeSlots: string) => {
    if (!startTime) return false;

    if (!endTime) {
      return timeSlots === startTime;
    }

    return timeSlots >= startTime && timeSlots < endTime;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  function combineDateAndTime(date: Date, time: string) {
    const [hours, minutes] = time.split(":").map(Number);

    const combined = new Date(date);
    combined.setHours(hours);
    combined.setMinutes(minutes);
    combined.setSeconds(0);
    combined.setMilliseconds(0);

    return combined;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (
      !name ||
      !email ||
      !phone ||
      !startTime ||
      !endTime ||
      !date ||
      !selectedRoom
    ) {
      setFormError("Please fill in all the fields correctly.");

      return;
    }

    const fullStartTime = combineDateAndTime(date, startTime).toISOString();
    const fullEndTime = combineDateAndTime(date, endTime).toISOString();

    const userId = user?.id;
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          name,
          email,
          phone,
          room_id: selectedRoom?.id,
          room_name: selectedRoom?.name,
          start_time: fullStartTime,
          end_time: fullEndTime,
          status: "pending",
          user_id: userId,
        },
      ])
      .select();

    if (error) {
      console.log(error);
      setFormError(error.message || "Please fill in all the fields correctly.");
    }
    if (data) {
      setName("");
      setEmail("");
      setPhone("");
      setFormError("");
      setConfirmedRoom(selectedRoom);
    }

    if (data && data[0]?.id) {
      router.push(`/booking-confirmation/${data[0].id}`);
    }
  }

  const purposeOptions = [
    { value: "connect_group", label: "Connect Group" },
    { value: "combine_connect_group", label: "Combine Connect Group" },
    { value: "bible_study", label: "Bible Study" },
    { value: "prayer_meeting", label: "Prayer Meeting" },
    { value: "zone_meeting", label: "Zone Meeting" },
    { value: "practice", label: "Practice (Email Admin for approval)" },
    { value: "event", label: "Event (Email Admin for approval)" },
    { value: "others", label: "Others" },
  ]

  return (
    <div className="container mt-2 mx-auto py-3 px-6">
      
      {fetchError && <p>{fetchError}</p>}
      {rooms && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <span>{room.name}</span>
                    <span className="flex items-center gap-1 text-sm font-normal ">
                      <Users size={16} />
                      {room.capacity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-green-50 rounded-[20px] px-3 ">
                    <Circle className="fill-green-700 w-[10px]"/>
                    <span className="text-sm font-normal text-green-700">
                      {room.availability ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog>
                  {user ? (
                    <DialogTrigger asChild>
                      <Button className="w-full text-black" variant={"outline"} onClick={() => setSelectedRoom(room)}>
                        Book now
                      </Button>
                    </DialogTrigger>
                  ) : (
                    <Button onClick={() => router.push("/login")}>
                      Book now
                    </Button>
                  )}

                  <DialogContent className="max-h-[90vh] overflow-y-scroll">
                    <DialogTitle>Availability</DialogTitle>
                    <Tabs value={step} onValueChange={setStep} className="">
                      <TabsList>
                        <TabsTrigger value="1">
                          1. Select Date & Time
                        </TabsTrigger>
                        <TabsTrigger
                          value="2"
                          disabled={!date || !startTime || !endTime}
                        >
                          2. Your Information
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="1">
                        <Card>
                          <CardContent className="grid grid-cols-1">
                            <Label className="mt-6 mb-2">Select Room</Label>
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild className="">
                                {selectedRoom && (
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-[200px] justify-between"
                                  >
                                    {selectedRoom.name}
                                    <ChevronDown opacity={50} />
                                  </Button>
                                )}
                              </PopoverTrigger>
                              <PopoverContent>
                                <Command>
                                  <CommandInput placeholder="Select room" />
                                  <CommandList>
                                    <CommandEmpty>No rooms found.</CommandEmpty>
                                    <CommandGroup>
                                      {rooms.map((room) => (
                                        <CommandItem
                                          key={room.id}
                                          value={room.id}
                                          onSelect={() => {
                                            handleRoomChange(room.id);
                                          }}
                                        >
                                          {room.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Label className="mt-6">Select Date</Label>
                            <Calendar
                              mode="single"
                              onSelect={handleDateSelect}
                              selected={date}
                              disabled={(date) =>
                                date < startOfToday() ||
                                date > addMonths(new Date(), 1)
                              }
                              className=""
                            />
                            <div className="flex justify-between items-center mt-2 mb-2">
                              <Label>Select Time</Label>
                              {startTime && !endTime && (
                                <Badge>Select end time</Badge>
                              )}
                              {startTime && endTime && (
                                <Badge>
                                  {startTime} - {endTime}
                                </Badge>
                              )}
                            </div>
                            {isCheckingAvailability ? (
                              <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span>Checking availability...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1">
                                {timeSlots.map((time) => {
                                  const isSelected = isTimeSlotSelected(time);
                                  const isAvailable = isTimeSlotAvailable(time);

                                  return (
                                    <Button
                                      key={time}
                                      variant={
                                        isSelected ? "default" : "outline"
                                      }
                                      className={cn(
                                        "h-10 px-2 text-xs",
                                        isSelected &&
                                          "bg-primary text-primary-foreground",
                                        !isAvailable &&
                                          "opacity-50 cursor-not-allowed",
                                      )}
                                      onClick={() => handleTimeSelect(time)}
                                      disabled={!isAvailable}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      {time}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                            <Button
                              className="mt-6"
                              onClick={handleContinue}
                              disabled={!date || !startTime || !endTime}
                            >
                              Continue
                            </Button>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="2" className="mt-6">
                        <Card>
                          <CardContent className="rounded-lg">
                            <div className="pt-6">
                              <h3 className="font-medium text-lg mb-2">
                                Booking Summary
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Rooms
                                  </p>
                                  <p className="font-medium">
                                    {selectedRoom?.name}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Date
                                  </p>
                                  <p className="font-medium">
                                    {date
                                      ? format(date, "EEEE, MMMM d, yyyy")
                                      : ""}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Time
                                  </p>
                                  <p className="font-medium">
                                    {startTime} - {endTime}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Duration
                                  </p>
                                  <p className="font-medium">
                                    {startTime && endTime
                                      ? `${
                                          parseInt(endTime.split(":")[0]) * 60 +
                                          parseInt(endTime.split(":")[1]) -
                                          (parseInt(startTime.split(":")[0]) *
                                            60 +
                                            parseInt(startTime.split(":")[1]))
                                        } minutes`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        {selectedRoom && (
                          <div className="mt-6">
                            <form
                              onSubmit={handleSubmit}
                              className="grid grid-cols-1 gap-1"
                            >
                              <Label htmlFor="name">Name:</Label>
                              <Input
                                type="text"
                                id="name"
                                value={name}
                                placeholder="Your Full Name"
                                onChange={(e) => setName(e.target.value)}
                                required
                                className={
                                  formError && !name ? "border-red-500" : ""
                                }
                              />
                              <Label htmlFor="email" className="mt-2">
                                E-mail:
                              </Label>
                              <Input
                                type="email"
                                id="email"
                                value={email}
                                placeholder="Your e-mail"
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={
                                  formError && !email ? "border-red-500" : ""
                                }
                              />
                              <Label htmlFor="phone" className="mt-2">
                                Phone:
                              </Label>
                              <Input
                                type="tel"
                                id="phone"
                                value={phone}
                                placeholder="Your phone number"
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                className={
                                  formError && !phone ? "border-red-500" : ""
                                }
                              />
                              <Label htmlFor="purpose" className="mt-2">
                                Purpose of Booking:
                              </Label>
                              <Select>
                                
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a purpose" />
                                  </SelectTrigger>
                                
                                <SelectContent>
                                  {purposeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Button
                                type="submit"
                                disabled={loading}
                                className="mt-4"
                              >
                                {loading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  "Submit Booking"
                                )}
                              </Button>
                              {formError && (
                                <p className="error">{formError}</p>
                              )}
                              {successMessage && <p>{successMessage}</p>}
                            </form>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent
                        value="3"
                        className="flex justify-items-center items-center"
                      >
                        <Card>
                          <CardContent className="m-6">
                            <div className="text-center mb-6">
                              <h2 className="text-2xl font-bold mb-2">
                                Booking Submitted!
                              </h2>
                              <p className="text-muted-foreground">
                                Your booking request has been submitted and is
                                pending approval.
                              </p>
                            </div>

                            <div className="space-y-4 mb-6">
                              <div>
                                <h3 className="font-medium">Room</h3>
                                <p>{confirmedRoom?.name}</p>
                              </div>
                              <div>
                                <h3 className="font-medium">Date</h3>
                                <p>
                                  {date
                                    ? format(date, "EEEE, MMMM d, yyyy")
                                    : ""}
                                </p>
                              </div>
                              <div>
                                <h3 className="font-medium">Time</h3>
                                <p>
                                  {startTime} - {endTime}
                                </p>
                              </div>
                              <div>
                                <h3 className="font-medium">Status</h3>
                                <p>Pending Approval</p>
                              </div>
                            </div>

                            <div className="flex justify-center space-x-4">
                              <Button
                                onClick={() => router.push("/my-bookings")}
                              >
                                View My Bookings
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => router.push("/")}
                              >
                                Back to Home
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
