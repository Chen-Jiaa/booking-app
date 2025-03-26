import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Bookings = {
    id: string;
    name: string;
    email: string;
    phone: string;
    room_id: string;
    start_time: string;
    end_time: string;
    purpose: string;
    status: boolean;
}

export default function BookingTable() {
    const[bookings, setBookings] = useState<Bookings[]>([])
    const[fetchError, setFetchError] = useState<null | string>(null)

    useEffect(() => {
        const fetchBookings = async () => {
            const { data, error } = await supabase
            .from('bookings')
            .select()

            if (error) {
                setFetchError('Error loading bookings')
                setBookings([])
                console.log(error)
            } else if (data) {
                setBookings(data)
                setFetchError(null)
            }
        }

        fetchBookings()

    },[])

    return (
        <Card>
                <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>Kindly approve or reject bookings here</CardDescription>
                </CardHeader>
                <CardContent>

                       <Table>
                            <TableCaption>A list of bookings</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Room</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Start Time</TableHead>
                                    <TableHead>End Time</TableHead>
                                    <TableHead>Purpose</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {bookings.map((booking)=>(
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.room_id}</TableCell>
                                    <TableCell>{booking.name}</TableCell>
                                    <TableCell>{booking.email}</TableCell>
                                    <TableCell>{booking.phone}</TableCell>
                                    <TableCell>{booking.start_time}</TableCell>
                                    <TableCell>{booking.end_time}</TableCell>
                                    <TableCell>{booking.purpose}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                       </Table>
                   
                </CardContent>
            </Card>

    )
}