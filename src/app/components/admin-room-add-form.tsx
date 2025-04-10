import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/router"
import { supabase } from "@/lib/supabase"
import { useState } from "react"


export default function AddRooms () {

    const[name, setName] = useState('')
    const[description,setDescription] = useState('')
    const[capacity, setCapacity] = useState('')
    const[formError, setFormError] = useState<null | string>(null)
    
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
            }

    }
    
    return (
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
                        <Button onSubmit={handleSubmit}>Add Rooms</Button>
                        {formError && <p>{formError}</p>}
                    </form>
                </CardContent>
            
            </Card>
    )
}