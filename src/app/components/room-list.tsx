'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Clock, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import BookingForm from "./booking-form";
import { addMinutes, addMonths, format, getTime, isSameDay, startOfToday } from "date-fns"
import { interval, room_endHour, room_startHour } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Rooms = {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  availability: boolean;
}

export default function RoomList() {
  const[fetchError, setFetchError] = useState<null | string>(null)
  const[rooms, setRooms] = useState<Rooms[]>([])
  const[selectedRoom, setSelectedRoom] = useState<Rooms | null>(null)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  const[startTime, setStartTime] = useState<string | undefined>(undefined)
  const[endTime, setEndTime] = useState<string | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const[step,setStep] = useState("1")
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select()
        .eq('availability', true)

        if (error) {
          setFetchError("Error Fetching Rooms")
          setRooms([])
          console.log(error)
        } else if (data) {
          const sortedRooms = [...data].sort((a,b) => a.name.localeCompare(b.name))
          
          setRooms(sortedRooms)
          setFetchError(null)
          setLoading(false)
        }
    }

    fetchRooms()

  }, [])

  const generateTimeSlots = () => {
    const slots = []

    for(let i = room_startHour; i<= room_endHour; i+=interval/60) {
      const hour = Math.floor(i)
      const minutes = i % 1 === 0 ? "00" : "30"
      slots.push(`${hour.toString().padStart(2,"0")}:${minutes}`)
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  function handleContinue(){
    if(!date|| !startTime || !endTime) {
      return
    }

    setStep("2")  
}

useEffect(() => {
  if (date && selectedRoom) {
    checkAvailability(date, selectedRoom.id)
  }
}, [date, selectedRoom])

const checkAvailability = async (selectedDate: Date, roomId: string) => {
  setIsCheckingAvailability(true)

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const {data: bookings} = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq("room_id", roomId)
    .or(`status.eq.pending, status.eq.approved`)
    .gte("start_time", `${dateStr}T00:00:00`)
    .lt("start_time", `${dateStr}T23:59:59`)

  const booked = new Set<string>()

  bookings?.forEach((booking) => {
    const bookingStart = new Date(booking.start_time)
    const bookingEnd = new Date(booking.end_time)

    if (isSameDay(bookingStart, selectedDate)) {
      let currentSlot = new Date(bookingStart)

      while (currentSlot < bookingEnd) {
        const timeStr = format(currentSlot,"HH:mm")
        booked.add(timeStr)
        currentSlot = addMinutes(currentSlot, 30)
      }
    }
  })

  setBookedSlots(booked)
  setIsCheckingAvailability(false)
}

const handleRoomChange = (roomId: string) => {
  const newRoom = rooms.find((r) => r.id === roomId)

  if (newRoom) {
    setSelectedRoom(newRoom)
    setOpen(false)
    setStartTime(undefined)
    setEndTime(undefined)
  }
}

const handleDateSelect = (selectedDate: Date | undefined) => {
  setDate(selectedDate)
  setStartTime(undefined)
  setEndTime(undefined)
}

const handleTimeSelect = (time: string) => {
  if (startTime === undefined) {
    setStartTime(time)
  } else if (time === startTime) {
    setStartTime(undefined)
    setEndTime(undefined)
  } else if (endTime === undefined && time > startTime) {
    setEndTime(time)
  } else if (endTime !== undefined && time === endTime) {
    setEndTime(undefined)
  } else if (time < startTime || (endTime !== undefined && time !== endTime)) {
    setStartTime(time)
    setEndTime(undefined)
  }
}

const isTimeSlotAvailable = (timeSlots: string) => {
  if (!date || isCheckingAvailability) return false

  return !bookedSlots.has(timeSlots)
}

const isTimeSlotSelected = (timeSlots: string) => {
  if (!startTime) return false

  if (!endTime) {
    return timeSlots === startTime
  }

  return timeSlots >= startTime && timeSlots < endTime
}

  if(loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }


  return (
    <div className="container mx-auto py-3 px-4">
      {fetchError && (<p>{fetchError}</p>)}
      {rooms && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{room.name}</span>
                    <span className="flex items-center gap-1 text-sm font-normal">
                      <Users size={16}/>
                      {room.capacity}
                    </span>
                    </CardTitle>
                  <CardDescription>{room.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedRoom(room)}>Check Availability</Button>
                  </DialogTrigger>
                  <DialogContent className="h-[90vh] overflow-y-scroll">
                    <DialogTitle>Availability</DialogTitle>
                    <Tabs value={step} onValueChange={setStep}>
                      <TabsList>
                          <TabsTrigger value="1">1. Select Date & Time</TabsTrigger>
                          <TabsTrigger value="2">2. Your Information</TabsTrigger>
                      </TabsList>
                      <TabsContent value="1" >
                          <Card>
                              <CardContent>
                                  <Label>Select Room</Label>
                                      <Popover open={open} onOpenChange={setOpen}>
                                          <PopoverTrigger asChild className="">
                                              {selectedRoom && 
                                                <Button 
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-[200px] justify-between"
                                                >
                                                    {selectedRoom.name}
                                                <ChevronDown opacity={50} />
                                                </Button>
                                              }
                                          </PopoverTrigger>
                                          <PopoverContent>
                                              <Command>
                                                  <CommandInput placeholder="Select room" />
                                                  <CommandList>
                                                      <CommandEmpty>No rooms found.</CommandEmpty>
                                                      <CommandGroup>
                                                          {rooms.map((room)=>(
                                                              <CommandItem 
                                                                  key={room.id}
                                                                  value={room.id}
                                                                  onSelect={()=> {
                                                                    handleRoomChange(room.id)
                                                                  }}
                                                              >
                                                                  {room.name}
                                                              </CommandItem>
                                                          ))
                                                          }
                                                      </CommandGroup>
                                                  </CommandList>
                                              </Command>
                                          </PopoverContent>
                                      </Popover>
                                  
                                  <Label>Select Date</Label>
                                  <Calendar 
                                      mode="single"
                                      onSelect={handleDateSelect}
                                      selected={date}
                                      disabled={(date) => (date < startOfToday() || date > addMonths(new Date(), 1))}
                                  />
                                  <div className="flex justify-between items-center mb-2">
                                    <Label>Select Time</Label>
                                    {startTime && !endTime && (
                                      <Badge>Select end time</Badge>
                                    )}
                                    {startTime && endTime && (
                                      <Badge>{startTime} - {endTime}</Badge>
                                    )}
                                  </div>
                                  {isCheckingAvailability ? (
                                    <div className="flex items-center justify-center p-8">
                                      <Loader2 className="h-5 w-5 animate-spin mr-2"/>
                                      <span>Checking availability...</span>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-4 gap-1">
                                    {timeSlots.map((time) => {
                                      const isSelected = isTimeSlotSelected(time)
                                      const isAvailable = isTimeSlotAvailable(time)

                                      return (
                                          <Button
                                          key={time} 
                                          variant={isSelected ? "default" : "outline"}
                                          className={cn(
                                            "h-10 px-2 text-xs",
                                            isSelected && "bg-primary text-primary-foreground",
                                            !isAvailable && "opacity-50 cursor-not-allowed",
                                            time === startTime && "ring-2 ring-primary"
                                          )}
                                          onClick={() => handleTimeSelect(time)}
                                          disabled={!isAvailable}
                                          >
                                          <Clock className="h-3 w-3 mr-1" />
                                          {time}
                                          </Button>
                                      )})}
                                    </div>
                                  )}
                                  <Button className="mt-6" onClick={handleContinue} disabled={!date || !startTime || !endTime}>Continue</Button>
                              </CardContent>
                          </Card>
                      </TabsContent>
                      <TabsContent value="2">
                        {selectedRoom && <BookingForm roomName={selectedRoom.name} />}
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
  )
}


