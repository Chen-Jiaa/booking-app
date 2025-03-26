'use client'

import { Calendar } from "@/components/ui/calendar";
import { interval, room_endHour, room_startHour } from "@/lib/config";
import { useState } from "react";
import { addMonths, startOfToday } from "date-fns"
import { Button } from "@/components/ui/button";

// const generateTimeSlots = () => {
//     const slots = []
    
//     for (let hour = room_startHour; hour < room_endHour; hour+interval) {
//         slots.push(hour)
//     }

//     return slots
// }

// const slots = generateTimeSlots()

export default function DateTimePicker() {
    const [date, setDate] = useState<Date | undefined>(new Date())

    console.log(date)

    return (
        <>
        <Calendar 
            mode="single"
            onSelect={setDate}
            selected={date}
            disabled={(date) => (date < startOfToday() || date > addMonths(new Date(), 1))}
        />
        {/* {date && 
            <div>
                {slots.map((slot,hour) => (
                    <Button key={`slot-${hour}`}>{hour}</Button>
                ))}
            </div>
        } */}
        </>
    )

}