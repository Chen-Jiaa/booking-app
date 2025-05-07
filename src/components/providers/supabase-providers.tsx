"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface SupabaseContextProps {
  user: User | null;
  role: string | null;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextProps>({
  user: null,
  role: null,
  loading: true,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSessionAndRole() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    setUser(session?.user ?? null);

    if (session?.user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!error) {
        setRole(data?.role ?? null);
      } else {
        console.error("Error fetching role:", error.message);
        setRole(null);
      }
    } else {
      setRole(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchSessionAndRole();

    const onFocus = () => {
      fetchSessionAndRole();
    };

    window.addEventListener("focus", onFocus);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error) setRole(data?.role ?? null);
            else console.error("Error fetching role:", error.message);
          });
      } else {
        setRole(null);
      }
    });

    return () => {
      window.removeEventListener("focus", onFocus);
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ user, role, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}