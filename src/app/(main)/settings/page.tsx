'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { getUserProfile } from "../actions/getUserProfile"
import { updateProfile } from "../actions/updateProfile"

const profileSchema = z.object({
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
    },
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getUserProfile()
        if (profile) {
          form.reset({
            email: profile.email ?? "",
            fullName: profile.fullName ?? "",
            phone: profile.phone ?? "",
          })
        }
      } catch (error) {
        console.error("Failed to load profile:", error)
      } finally {
        setIsFetching(false)
      }
    }
    void loadProfile()
  }, [form])

  async function onSubmit(values: ProfileFormValues) {
    setIsLoading(true)
    try {
      const result = await updateProfile(values)
      if (result.success) {
        toast("Profile updated", { description: "Your profile has been saved." })
      } else {
        toast("Error", { description: result.error ?? "Failed to update profile." })
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast("Error", { description: "An unexpected error occurred." })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <main className="container mx-auto max-w-lg py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(onSubmit) as unknown as () => void}
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Your email" {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button disabled={isLoading} type="submit">
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}
