// 'use client'

// import { useState, useEffect } from 'react'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { supabase } from '@/lib/supabase'
// import { Input } from '@/components/ui/input'
// import { Button } from '@/components/ui/button'
// import { createClient } from '@/lib/supabase/server'

// export default function SignupPage() {
//   const [email, setEmail] = useState('')
//   const [loading, setLoading] = useState(false)
//   const router = useRouter()
//   const searchParams = useSearchParams()

//   useEffect(() => {
//     const emailParam = searchParams.get('email')
//     if (emailParam) {
//       setEmail(emailParam)
//     }
//   }, [searchParams])

//   const handleSignup = async () => {
//     setLoading(true)
//     const supabase = await createClient()
//     const { error } = await supabase.auth.signInWithOtp({
//       email,
//       options: {
//         emailRedirectTo: 'http://localhost:3000/'
//       }
//     })
//     setLoading(false)

//     if (error) {
//       alert('Signup error: ' + error.message)
//     } else {
//       alert('Check your email to confirm your account.')
//     }
//   }

//   return (
//     <div className="max-w-md mx-auto mt-20 space-y-4">
//         <form className="grid grid-cols-1 gap-1" action={handleSignup}>
//             <Input
//             type="email"
//             placeholder="Enter your email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             />
//             <Button disabled={loading}>
//                 {loading ? 'Sending confirmation...' : 'Continue with Email'}
//             </Button>
//         </form>
//     </div>
//   )
// }

"use client";

import { useState } from "react";
import { signup } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-sm mx-auto mt-24 space-y-4">
      <h1 className="text-2xl font-bold">Sign Up</h1>
      <form
        action={async (formData) => {
          setLoading(true);
          await signup(formData);
          setLoading(false);
        }}
        className="space-y-4"
      >
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
        />
        <Button disabled={loading} type="submit">
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Continue with Email"
          )}
        </Button>
      </form>
    </div>
  );
}
