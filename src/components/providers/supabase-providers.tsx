"use client";

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface Profiles {
  role: null | string
}

interface SupabaseContextType {
  loading: boolean;
  role: null | string;
  user: null | User;
}

const SupabaseContext = createContext<SupabaseContextType>({
  loading: true,
  role: null,
  user: null,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<null | User>(null);
  const [role, setRole] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const { data: {subscription} } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", currentUser.id)
              .single<Profiles>();

            if (error) {
              console.error("Error fetching role:", error.message);
              setRole(null);
            } else {
              setRole(data.role ?? null);
            }
          } catch (error) {
            console.error("Unexpected error fetching role:", error);
            setRole(null);
          }
        } else {
          setRole(null);
        }

        setLoading(false);
      }
    );

    // Trigger initial check to sync auth
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single<Profiles>()
          .then(({ data, error }) => {
            setRole(error ? null : data.role ?? null);
            setLoading(false);
          });
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo (
    () => ({ loading, role, user }),
    [loading, role, user]
  )

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);