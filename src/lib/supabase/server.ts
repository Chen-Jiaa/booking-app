import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { isInvalidRefreshTokenError, isMissingAuthSessionError } from "./auth-cookies";

interface Profile {
  role: string;
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseAnonKey === undefined || supabaseUrl === undefined) {
    throw new Error("Missing Supabase environment variables");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, options, value } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

export const getAuthUser = cache(async () => {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isInvalidRefreshTokenError(error)) return null;
      if (isMissingAuthSessionError(error)) return null;
      throw error;
    }

    return user ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) return null;
    if (isMissingAuthSessionError(error)) return null;
    throw error;
  }
});

export const getUserAndRole = cache(async () => {
  const user = await getAuthUser();

  if (!user) {
    return { role: null, user: null };
  }

  const supabase = await createClient();

  let role: null | string = null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Profile>();

  if (!error && data.role) {
    role = data.role;
  }

  return { role, user };
});
