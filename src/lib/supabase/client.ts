'use client'

import { createBrowserClient } from '@supabase/ssr'

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (supabaseAnonKey === undefined || supabaseUrl === undefined) {
    throw new Error('Missing Supabase environment variables')
  }

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)