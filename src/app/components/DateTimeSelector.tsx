'use client'

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateTimeSlots } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Bookings } from "@/types/booking";
import { addMinutes, addMonths, format, isSameDay, startOfToday } from "date-fns";
import { ChevronDown, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Rooms } from "../../types/room";

interface Props {
    date: Date | undefined
    endTime: string | undefined
    goToStep2: () => void
    rooms: Rooms[]
    selectedRoom: null | Rooms
    setDate: (time: Date | undefined) => void
    setEndTime: (time: string | undefined) => void
    setSelectedRoom: (room: null | Rooms) => void
    setStartTime: (time: string | undefined) => void
    startTime: string | undefined
}

export default function DateTimeSelector({date, endTime, goToStep2, rooms, selectedRoom, setDate, setEndTime, setSelectedRoom, setStartTime, startTime} : Props) {
    const [loading] = useState(false)
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
    const [bookedSlots, setBookedSlots] = useState<Set<string>>(() => new Set())
    const [open, setOpen] = useState(false)

    const timeSlots = generateTimeSlots();

    const handleRoomChange = (roomId: string) => {
        const newRoom = rooms.find((r) => r.id === roomId);
    
        if (newRoom) {
            setSelectedRoom(newRoom)
            setOpen(false)
            setStartTime(undefined)
            setEndTime(undefined)
        }
      };

    useEffect(() => {
        if (date && selectedRoom) {
            void checkAvailability(date, selectedRoom.id);
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
            .or(`status.eq.pending, status.eq.approved`)
            .gte("start_time", `${dateStr}T00:00:00`)
            .lt("start_time", `${dateStr}T23:59:59`);
    
          const booked = new Set<string>();
    
          if (bookings && bookings.length > 0) {
            for(const booking of bookings as Bookings[]) {
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
            };
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
      }
    
    const getNextTimeSlot = (currentTime: string): null | string => {
      const currentIndex = timeSlots.indexOf(currentTime)
      if (currentIndex === -1 || currentIndex >= timeSlots.length - 1) return null
      return timeSlots[currentIndex + 1]
    }

    const areAllSlotsAvailable = (start: string, end: string): boolean => {
        if (!date || isCheckingAvailability) return false
        
        const startIndex = timeSlots.indexOf(start)
        const endIndex = timeSlots.indexOf(end)
        
        if (startIndex === -1 || endIndex === -1) return false
      
        for (let i = startIndex; i < endIndex; i++) {
          if (bookedSlots.has(timeSlots[i])) {
            return false
          }
        }
  
          return true
    }

    const handleDateSelect = (selectedDate: Date | undefined) => {
      setDate(selectedDate)
      setStartTime(undefined)
      setEndTime(undefined)
    }

    const handleTimeSelect = (time: string) => {
        // Case 1: No time selected yet - set as start time and auto-select 30-min end time
        if (!startTime) {
          setStartTime(time);
          
          // Automatically set end time to next 30-min slot
          const nextSlot = getNextTimeSlot(time);
          if (nextSlot && !bookedSlots.has(time)) {
            setEndTime(nextSlot);
          }
        } 
        // Case 2: Time selected and clicked on same start time - deselect all
        else if (time === startTime) {
          setStartTime(undefined);
          setEndTime(undefined);
        }
        // Case 3: Time selected and clicked on current end time - deselect end time only
        else if (endTime && time === endTime) {
          setEndTime(undefined);
        }
        // Case 4: Time selected and clicked on earlier time - start new selection
        else if (time < startTime) {
          setStartTime(time);
          
          // Automatically set end time to next 30-min slot
          const nextSlot = getNextTimeSlot(time);
          if (nextSlot && !bookedSlots.has(time)) {
            setEndTime(nextSlot);
          } else {
            setEndTime(undefined);
          }
        }
        // Case 5: Time selected and clicked on later time - extend selection if available
        else if (time > startTime) {
          // Check if all slots between start and this time are available
          if (areAllSlotsAvailable(startTime, time)) {
            // Set the end time to the next slot after the selected time
            const nextSlot = getNextTimeSlot(time);
            setEndTime(nextSlot ?? time);
          } else {
            toast("Unavailable Time Range", {
              description: "Your selected time range contains unavailable slots. Please select a fully available range.",
            });
          }
        }
      };
    // const handleTimeSelect = (time: string) => {
    //   if (!startTime) {
    //     setStartTime(time)
    //     const nextSlot = getNextTimeSlot(time)
    //     if (nextSlot && !bookedSlots.has(time)) {
    //       setEndTime(nextSlot);
    //     }
    //   } else if (time === startTime) {
    //     setStartTime(undefined)
    //     setEndTime(undefined)
    //   } else if (!endTime && time > startTime && areAllSlotsAvailable(startTime, time)) {
    //       setEndTime(time)
    //   } else if (endTime && time === endTime) {
    //     setEndTime(undefined)
    //   } else if (
    //     time < startTime ||
    //     (endTime !== undefined && time !== endTime)
    //   ) {
    //     setStartTime(time)
    //     setEndTime(undefined)
    //   }
    // }
  
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

    return (
        <Card>
            <CardContent className="grid grid-cols-1">
                <Label className="mt-6 mb-2">Select Room</Label>
                <Popover onOpenChange={setOpen} open={open}>
                    <PopoverTrigger asChild>
                        <Button
                            aria-expanded={open}
                            className="w-[200px] justify-between"
                            role="combobox"
                            variant="outline"
                        >
                            {selectedRoom?.name}
                            <ChevronDown opacity={50} />
                        </Button>
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
                                    onSelect={() => {
                                    handleRoomChange(room.id);
                                    }}
                                    value={room.id}
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
                    className=""
                    disabled={(date) =>
                    date < startOfToday() ||
                    date > addMonths(new Date(), 1)
                    }
                    mode="single"
                    onSelect={handleDateSelect}
                    selected={date}
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
                            className={cn(
                              "h-10 px-2 text-xs",
                              isSelected && "bg-primary text-primary-foreground",
                              !isAvailable && "opacity-50 cursor-not-allowed",
                            )}
                            disabled={!isAvailable}
                            key={time}
                            onClick={() => { handleTimeSelect(time); }}
                            variant={
                            isSelected ? "default" : "outline"
                            }
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
                    disabled={!date || !startTime || !endTime}
                    onClick={goToStep2}
                >
                    Continue
                </Button>   
            </CardContent>
        </Card>
    )
}