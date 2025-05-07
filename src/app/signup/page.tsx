"use client";

import { useState } from "react";
import { signup } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { z } from "zod"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export default function SignupPage() {
  const [serverError, setServerError] = useState<React.ReactNode>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("email", data.email);

    const result = await signup(formData);

    if (result?.error === "user_exists") {
      setServerError(
        <span>
          The email address already exists.{" "}
          <Link href="/login" className="underline font-bold">
            Log in instead
          </Link>
          ?
        </span>
      );
    } else if (result?.error === "server_error") {
      setServerError("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="max-w-sm w-full mx-auto mt-24 space-y-4 px-6">
      <h1 className="text-2xl font-bold">Sign Up</h1>

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
              "Continue with Email"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
