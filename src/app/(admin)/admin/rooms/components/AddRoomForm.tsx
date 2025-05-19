'use client'

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

const RoomSchema = z.object({
    approval_required: z.boolean(),
    approvers: z.array(z.string().email()).optional(),
    available_to: z.string().min(1, "Please select who is this room viewable to"),
    capacity: z.coerce.number().int().positive("Capacity must be a positive number"),
    name: z.string().min(2, "Name is required"),
}).superRefine((data, ctx) => {
  if (data.approval_required && (!data.approvers || data.approvers.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one approver",
      path: ["approvers"]
    })
  }
})

const userOptions = [
    { label: "User", value: "user" },
    { label: "Super User", value: "superUser" },
    { label: "Admin", value: "admin" },
]

type RoomFormData = z.infer<typeof RoomSchema>
    
export default function AddRooms({adminEmails} : {adminEmails: string[]}) {
    const [formError, setFormError] = useState<null | string>(null)
    const [isLoading, setIsLoading] = useState(false)

    const adminEmailOptions = adminEmails.map(email => ({
        label: email,
        value: email,
    }))

    const form = useForm<z.infer<typeof RoomSchema>>({
        defaultValues: {
          approval_required: false,
          approvers: [],
          available_to: "",
          capacity: 0,
          name: "",
        },
        resolver: zodResolver(RoomSchema),
      })
    
    const approvalRequired = useWatch({
        control: form.control,
        name: "approval_required",
    })
    
    const onSubmit = async (data: RoomFormData) => {
        setIsLoading(true)
        const { error } = await supabase
            .from("rooms")
            .insert([data])

        if (error) {
        console.log(error)
        setFormError("Something went wrong. Please try again.")
        setIsLoading(false)
        } else {
        setFormError(null)
        setIsLoading(false)
        form.reset()
        }
    };


    return (
        <Form {...form}>
            <form 
                className="grid grid-cols-1 gap-4 px-6" 
                onSubmit={form.handleSubmit(onSubmit) as unknown as () => void}
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Room Name:</FormLabel>
                            <FormControl>
                                <Input placeholder="Class Room" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Room Capacity:</FormLabel>
                            <FormControl>
                                <Input placeholder="20" {...field} type="number"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="available_to"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Who can book this room:</FormLabel>
                            <Select defaultValue={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select who can book this room" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {userOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="approval_required"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Approval Required</FormLabel>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {approvalRequired && (
                    <FormField 
                        control={form.control}
                        name="approvers"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Who can approve this room:</FormLabel>
                                <FormControl>
                                    <MultiSelect 
                                        animation={2}
                                        defaultValue={field.value}
                                        onValueChange={field.onChange}
                                        options={adminEmailOptions}
                                        placeholder="Select Admins"
                                        variant="inverted"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                
                {formError && (
                    <p className="text-sm text-red-500">
                        {formError}
                    </p>
                )}
                {!formError && form.formState.isSubmitSuccessful && (
                    <p className="text-sm text-green-600">
                        Room successfully added!
                    </p>
                )}

                <Button disabled={isLoading} type="submit">
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Add a Room"
                    )}
                </Button>
            </form>
        </Form>
    )
}