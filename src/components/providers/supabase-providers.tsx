"use client";

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface SupabaseContextType {
  role: null | string;
  user: null | User;
}

const SupabaseContext = createContext<SupabaseContextType>({
  role: null,
  user: null,
});

interface SupabaseProviderProps {
  children: React.ReactNode;
  initialRole: null | string;
  initialUser: null | User;
}

export function SupabaseProvider({ children, initialRole, initialUser }: SupabaseProviderProps) {
  const [user, setUser] = useState<null | User>(initialUser);
  const [role, setRole] = useState<null | string>(initialRole);
  const router = useRouter();

  // Sync role when server re-renders after router.refresh() with a new session.
  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setRole(null);
      }
      // Re-render server components so they pick up the new session and return
      // the correct initialUser/initialRole on the next render.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const value = useMemo(() => ({ role, user }), [role, user]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export const useSupabase = () => useContext(SupabaseContext);
