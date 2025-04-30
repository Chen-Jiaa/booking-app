"use client";

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { Input } from '@/components/ui/input'
// import { Button } from '@/components/ui/button'
// import { supabase } from '@/lib/supabase'
// import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
// import { Loader2 } from 'lucide-react'
// import { createClient } from '@/lib/supabase/server'

// export default function LoginPage() {
//   const [email, setEmail] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [otp, setOtp] = useState('')
//   const [step, setStep] = useState<'email' | 'otp'>('email')
//   const router = useRouter()

//   const handleLogin = async () => {
//     setLoading(true)
//     const supabase = await createClient()
//     const { error } = await supabase.auth.signInWithOtp({
//       email,
//     })

//     if (error) {
//       if (error.message.includes('User not found')) {
//         router.push(`/signup?email=${encodeURIComponent(email)}`)
//       } else {
//         alert('Error sending OTP: ' + error.message)
//       }
//     } else {
//       setStep('otp')
//     }

//     setLoading(false)
//   }

//   const handleVerify = async () => {
//     setLoading(true)
//     const { data, error } = await supabase.auth.verifyOtp({
//       email,
//       token: otp,
//       type: 'email'
//     })

//     if (error) {
//       alert('Invalid OTP: ' + error.message)
//     } else if (data?.session) {
//       router.push('/')
//     }
//     setLoading(false)
//   }

//   return (
//     <div className="max-w-md m-auto mt-20 space-y-4">
//         {step === 'email' && (
//           <div>
//             <form action={handleLogin} className="grid grid-cols-1 gap-1 mt-6">
//               <h1 className='text-xl text-center'>Log in to Collective</h1>
//               <Input
//                   id='email'
//                   type="email"
//                   placeholder="Enter your email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//               />
//               <Button disabled={loading} className='mt-2'>
//                   {loading ? <Loader2 className='animate-spin'/> : 'Continue with email'}
//               </Button>
//               <h3 className='mt-6 text-center text-muted-foreground'>Don't have an account yet? <a href='/signup' className='text-black'>Sign Up</a></h3>
//             </form>
//           </div>
//         )}
//         {step === 'otp' && (
//           <div>
//             <form action={handleVerify} className='grid grid-cols-1 gap-1 mt-6'>
//             <h1 className='text-xl text-center'>One-Time Password</h1>
//                 <InputOTP maxLength={6} value={otp} onChange={setOtp} className='flex items-center'>
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
//         )}
//     </div>
//   )
// }

// 'use client'

// import { handleLogin } from './actions'
// import { Input } from '@/components/ui/input'
// import { Button } from '@/components/ui/button'

// export default function LoginPage() {
//   return (
//     <div className="max-w-sm mx-auto mt-24 space-y-4">
//       <h1 className="text-2xl font-bold">Login</h1>
//       <form action={handleLogin} className="space-y-4">
//         <Input type="email" name="email" placeholder="Enter your email" required />
//         <Button type="submit">Send OTP</Button>
//       </form>
//     </div>
//   )
// }

import { useState } from "react";
import { sendOtp } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-sm mx-auto mt-24 space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      <form
        action={async (formData) => {
          setLoading(true);
          setError(null);
          const result = await sendOtp(formData);
          setLoading(false);

          if (result?.error === "user_not_found") {
            setError("No account found. Please sign up instead.");
          }
        }}
        className="space-y-4"
      >
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button disabled={loading} type="submit">
          {loading ? <Loader2 className="animate-spin" /> : "Send OTP"}
        </Button>
      </form>
    </div>
  );
}
