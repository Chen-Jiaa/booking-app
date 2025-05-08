"use client";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import { handleVerify } from "./actions";

export default function VerifyPage() {
  return (
      <Suspense fallback={<p>Loading...</p>}>
        <VerifyForm />
      </Suspense>
  );
}

function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<null | string>(null)
  const [isPending, startTransition] = useTransition()
  const otpSlots = [0, 1, 2, 3, 4, 5];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if(otp.length !== 6) {
      setError("Please enter the full 6-digit code.")
      return
    }

    const formData = new FormData()
    formData.set("email", email)
    formData.set("otp", otp)

    startTransition(async () => {
      const result = await handleVerify(formData)

      if(result.error) {
        setError("Invalid or expired code. Please try again.")
        return
      }

      if(result.success) {
        globalThis.location.href = "/"
      }

    })
  }

  return (
    <div className="max-w-sm w-full mx-auto mt-24 space-y-4 px-6">

      <h1 className="text-2xl font-bold just">Check your email</h1>
      <p>We&apos;ve just sent a 6-digit verification code to {email}</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <input name="email" type="hidden" value={email} />
        <InputOTP 
          className='flex items-center' 
          id="otp" 
          maxLength={6}
          onChange={(val) => {setOtp(val)}}
        >
          <InputOTPGroup>
          {otpSlots.map(i => (
            <InputOTPSlot className="w-12 h-12 p-4 text-xl" index={i} key={`otp-slot-${String(i)}`} />
          ))}
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button disabled={isPending} type="submit">
          {isPending ? <Loader2 className="animate-spin"/> : "Verify"}
        </Button>
      </form>
    </div>
  );
}