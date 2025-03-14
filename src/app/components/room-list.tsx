'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";


type Rooms = {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
}

export default function RoomList() {
  const[fetchError, setFetchError] = useState<null | string>(null)
  const[rooms, setRooms] = useState<Rooms[]>([])

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select()

        if (error) {
          setFetchError("Error Fetching Rooms")
          setRooms([])
          console.log(error)
        } else if (data) {
          const sortedRooms = [...data].sort((a,b) => a.name.localeCompare(b.name))
          
          setRooms(sortedRooms)
          setFetchError(null)
        }
    }

    fetchRooms()

  }, [])

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
                <Button className="w-full">Check Availability</Button>
              </CardContent>
            </Card>
            ))}
        </div>
      )}
    </div>
  )
}