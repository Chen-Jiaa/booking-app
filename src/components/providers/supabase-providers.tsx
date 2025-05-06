"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type SupabaseContextType = {
  user: User | null;
  loading: boolean;
  role: string | null;
};

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  loading: true,
  role: null,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
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
              .single();

            if (error) {
              console.error("Error fetching role:", error.message);
              setRole(null);
            } else {
              setRole(data?.role ?? null);
            }
          } catch (err) {
            console.error("Unexpected error fetching role:", err);
            setRole(null);
          }
        } else {
          setRole(null);
        }

        setLoading(false);
      }
    );

    // Trigger initial check to sync auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            setRole(error ? null : data?.role ?? null);
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

  return (
    <SupabaseContext.Provider value={{ user, loading, role }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);