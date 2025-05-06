// 'use client'

// import { Button } from "@/components/ui/button";
// import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
// import { useState } from "react";
// import { handleVerify } from "./action";

// export default function otp() {
//     const [otp, setOtp] = useState('')

//     return (
//         <div>
//             <form action={handleVerify} className='grid grid-cols-1 gap-1 mt-6'>
//             <h1 className='text-xl text-center'>One-Time Password</h1>
//                 <InputOTP maxLength={6} value={otp} id="otp" onChange={setOtp} className='flex items-center'>
//                     <InputOTPGroup>
//                         {[...Array(6)].map((_, i) => (
//                           <InputOTPSlot className="w-12 h-12 p-4 text-xl" key={i} index={i}/>
//                         ))}
//                     </InputOTPGroup>
//                 </InputOTP>
//                 <p className='text-muted-foreground'>Please enter the one-time password sent to your email.</p>
//                 <Button>Login</Button>
//             </form>
//           </div>
//     )
// }

"use client";

import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { handleVerify } from "./actions";
import { Suspense, useState, useTransition } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";

function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

      if(result?.error) {
        setError("Invalid or expired code. Please try again.")
        return
      }

      window.location.href = "/"
    })
  }

  return (
    <div className="max-w-sm w-full mx-auto mt-24 space-y-4">

      <h1 className="text-2xl font-bold just">Check your email</h1>
      <p>We've just sent a 6-digit verification code to {email}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <InputOTP 
          maxLength={6} 
          id="otp" 
          onChange={(val) => setOtp(val)}
          className='flex items-center'
        >
          <InputOTPGroup>
          {[...Array(6)].map((_, i) => (
            <InputOTPSlot className="w-12 h-12 p-4 text-xl" key={i} index={i}/>
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin"/> : "Verify"}
        </Button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
      <Suspense fallback={<p>Loading...</p>}>
        <VerifyForm />
      </Suspense>
  );
}
