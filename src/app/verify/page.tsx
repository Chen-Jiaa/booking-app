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
import { Suspense } from "react";

function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="max-w-sm mx-auto mt-24 space-y-4">
      <h1 className="text-2xl font-bold">Enter OTP</h1>
      <form action={handleVerify} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <Input
          type="text"
          name="otp"
          placeholder="6-digit code"
          required
          maxLength={6}
        />
        <Button type="submit">Verify</Button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="max-w-sm mx-auto mt-24 space-y-4">
      <h1 className="text-2xl font-bold">Enter OTP</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
