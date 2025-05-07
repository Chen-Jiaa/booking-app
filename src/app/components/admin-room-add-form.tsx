import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { useState } from "react"

export default function AddRooms() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [formError, setFormError] = useState<null | string>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !description || !capacity) {
      setFormError("Please fill in all the fields correctly");
      return;
    }

    const { error } = await supabase
      .from("rooms")
      .insert([{ capacity, description, name }]);

    if (error) {
      console.log(error);
      setFormError("Please fill in all the fields correctly");
    }
  };

  return (
    <Card className="">
      <CardHeader>
        <CardTitle>Add more rooms:</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={void handleSubmit}>
          <Label htmlFor="name">Room Name:</Label>
          <Input
            id="name"
            onChange={(e) => { setName(e.target.value); }}
            placeholder="Class Room 2"
            required
            type="text"
            value={name}
          />
          <Label htmlFor="description">Room Description:</Label>
          <Input
            id="description"
            onChange={(e) => { setDescription(e.target.value); }}
            placeholder="Class Room 2"
            required
            type="text"
            value={description}
          />
          <Label htmlFor="capacity">Room Capacity:</Label>
          <Input
            id="capacity"
            onChange={(e) => { setCapacity(e.target.value); }}
            placeholder="20"
            required
            type="number"
            value={capacity}
          />
          <Button type="submit">Add Rooms</Button>
          {formError && <p>{formError}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
