"use client"

import { useState } from "react"
import { sendOtp } from "./actions"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormField,
  FormControl,
  FormMessage,
  FormItem,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function LoginPage() {
  const [serverError, setServerError] = useState<React.ReactNode>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("email", data.email)

    const result = await sendOtp(formData)

    if (result?.error === "user_not_found") {
      setServerError(
        <span>
          There is no account associated with this email address. Consider{" "}
          <Link href="/signup" className="font-bold underline">
            signing up
          </Link>{" "}
          ?
        </span>
      )
      
    } else if (result?.error === "server_error") {
      setServerError("Something went wrong. Please try again later.")
    }
  };

  return (
    <div className="max-w-sm w-full mx-auto mt-24 space-y-4 px-6">
      <h1 className="text-2xl font-bold">Login</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!form.formState.errors.email && serverError && (
            <p className="text-sm text-red-500">{serverError}</p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              "Send OTP"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}