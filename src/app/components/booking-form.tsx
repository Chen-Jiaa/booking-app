import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useState } from "react";



export default function BookingForm ({roomName}:{roomName : string}) {
    const[name, setName] = useState("")
    const[email, setEmail] = useState("")
    const[phone, setPhone] = useState("")
    const[formError, setFormError] = useState("")
    const[loading, setLoading] = useState(false)
    const[successMessage, setSuccessMessage] = useState("")

    async function handleSubmit(e:any) {
        e.preventDefault()
        setLoading(true)

        if(!name || !email || !phone) {
            setFormError('Please fill in all the fields correctly.')
            setLoading(false)
            return
        }

        const { data , error } = await supabase
            .from('bookings')
            .insert([{name, email, phone}])

            setLoading(false)

            if(error) {
                console.log(error)
                setFormError('Please fill in all the fields correctly.')
            }
            if (data) {
                setSuccessMessage("Your booking has been captured!")
                setName("")
                setFormError("")
            }
    }

    

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <Label htmlFor="name">Name:</Label>
                <Input 
                    type="text"
                    id="name"
                    value={name}
                    placeholder="Your Full Name"
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={formError && !name ? "border-red-500" : ""}
                />
                <Label htmlFor="email">E-mail:</Label>
                <Input 
                    type="email"
                    id="email"
                    value={email}
                    placeholder="Your e-mail"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={formError && !email ? "border-red-500" : ""}
                />
                <Label htmlFor="phone" >Phone:</Label>
                <Input 
                    type="tel"
                    id="phone"
                    value={phone}
                    placeholder="Your phone number"
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className={formError && !phone ? "border-red-500" : ""}
                />
                <Input type="select"/>
                <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Booking"}</Button>
                {formError && <p className="error">{formError}</p>}
                {successMessage && <p>{successMessage}</p>}
            </form>
        </div>
    )
}