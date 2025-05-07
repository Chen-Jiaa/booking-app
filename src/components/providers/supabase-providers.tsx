"use client";

import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface Profile {
  role: null | string;
}

interface SupabaseContextProps {
  loading: boolean;
  role: null | string;
  user: null | User;
}

const SupabaseContext = createContext<SupabaseContextProps>({
  loading: true,
  role: null,
  user: null,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<null | User>(null);
  const [role, setRole] = useState<null | string>(null);
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
        .single<Profile>();

      if (error) {
        console.error("Error fetching role:", error.message);
        setRole(null);
      } else {
        setRole(data.role ?? null);
      }
    } else {
      setRole(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    void fetchSessionAndRole();

    const onFocus = () => {
      void fetchSessionAndRole();
    };

    window.addEventListener("focus", onFocus);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single<Profile>()
          .then(({ data, error }) => {
            if (error) {console.error("Error fetching role:", error.message);}
            else {setRole(data.role ?? null);}
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

  const contextValue = useMemo(() => ({ loading, role, user }), [loading, role, user]);

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}