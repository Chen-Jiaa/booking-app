"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { sendOtp } from "./actions"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function LoginPage() {
  const [serverError, setServerError] = useState<React.ReactNode>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    defaultValues: { email: "" },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("email", data.email)

    const result = await sendOtp(formData)

    if (result.error === "user_not_found") {
      setServerError(
        <span>
          There is no account associated with this email address. Consider{" "}
          <Link className="font-bold underline" href="/signup">
            signing up
          </Link>{" "}
          ?
        </span>
      )
      
    } else if (result.error === "server_error") {
      setServerError("Something went wrong. Please try again later.")
    }
  };

  return (
    <div className="max-w-sm w-full mx-auto mt-24 space-y-4 px-6">
      <h1 className="text-2xl font-bold">Login</h1>

      <Form {...form}>
        <form className="space-y-4" onSubmit={() => form.handleSubmit(onSubmit)}>
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

          {!form.formState.errors.email && serverError ? (
            <p className="text-sm text-red-500">{serverError}</p>
          ): null}

          <Button disabled={form.formState.isSubmitting} type="submit">
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