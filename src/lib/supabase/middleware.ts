import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getSupabaseAuthCookieName,
  isInvalidRefreshTokenError,
  isMissingAuthSessionError,
  isSupabaseAuthCookieName,
} from "./auth-cookies";

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
  supabaseUrl: string,
) {
  const authCookieName = getSupabaseAuthCookieName(supabaseUrl);

  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookieName(authCookieName, cookie.name)) continue;

    request.cookies.delete(cookie.name);
    response.cookies.set(cookie.name, "", {
      httpOnly: false,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

function redirectToLoginWithClearedAuthCookies(request: NextRequest, supabaseUrl: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const response = NextResponse.redirect(url);
  return clearSupabaseAuthCookies(request, response, supabaseUrl);
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isInvalidRefreshTokenError(error)) {
        return redirectToLoginWithClearedAuthCookies(request, supabaseUrl);
      }

      if (isMissingAuthSessionError(error)) {
        user = null;
      } else {
        throw error;
      }
    } else {
      user = data.user;
    }
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      return redirectToLoginWithClearedAuthCookies(request, supabaseUrl);
    }

    if (isMissingAuthSessionError(error)) {
      user = null;
    } else {
      throw error;
    }
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
