'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function AdminDashboard() {

    type Bookings = {
        id: string;
        name: string;
        email: string;
        phone: string;
        room_id: string;
        start_time: string;
        end_time: string;
        purpose: string;
        status: string;
    }

    const router = useRouter()

    const[name, setName] = useState('')
    const[description,setDescription] = useState('')
    const[capacity, setCapacity] = useState('')
    const[formError, setFormError] = useState<null | string>(null)
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

    const handleSubmit = async (e: any) => {
        e.preventDefault()

        if(!name || !description || !capacity) {
            setFormError('Please fill in all the fields correctly')
            return
        }

        const { data, error } = await supabase
            .from('rooms')
            .insert([{name, description, capacity}])
        
            if (error) {
                console.log(error)
                setFormError('Please fill in all the fields correctly')
            }

            if (data) {
                console.log(data)
                setFormError(null)
                router.push("/")
            }

    }

    return (
        <div className="container items-center mx-auto mt-5 grid gap-5">
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
                                    <TableHead>Rooms</TableHead>
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
            <Card className="">
                <CardHeader>
                    <CardTitle>Add more rooms:</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Label htmlFor="name">Room Name:</Label>
                        <Input 
                            type="text"
                            id="name"
                            placeholder="Class Room 2"
                            value={name}
                            required
                            onChange={(e) => setName(e.target.value)}
                            />
                        <Label htmlFor="description">Room Description:</Label>
                        <Input 
                            type="text"
                            id="description"
                            placeholder="Class Room 2"
                            value={description}
                            required
                            onChange={(e) => setDescription(e.target.value)}
                            />
                        <Label htmlFor="capacity">Room Capacity:</Label>
                        <Input 
                            type="number"
                            id="capacity"
                            placeholder="20"
                            value={capacity}
                            required
                            onChange={(e) => setCapacity(e.target.value)}
                            />
                        <Button>Add Rooms</Button>
                        {formError && <p>{formError}</p>}
                    </form>
                </CardContent>
            
            </Card>
        </div>
    )
}