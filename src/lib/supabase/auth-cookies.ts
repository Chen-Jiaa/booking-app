export function getSupabaseAuthCookieName(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split(".")[0]}-auth-token`;
}

export function isSupabaseAuthCookieName(authCookieName: string, cookieName: string) {
  return cookieName === authCookieName || cookieName.startsWith(`${authCookieName}.`);
}

export function isInvalidRefreshTokenError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const authError = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };

  return (
    "__isAuthError" in authError &&
    authError["__isAuthError" as keyof typeof authError] === true &&
    authError.status === 400 &&
    (authError.code === "refresh_token_not_found" ||
      (typeof authError.message === "string" &&
        authError.message.toLowerCase().includes("refresh token")))
  );
}

export function isMissingAuthSessionError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const authError = error as {
    message?: unknown;
    status?: unknown;
  };

  return (
    "__isAuthError" in authError &&
    authError["__isAuthError" as keyof typeof authError] === true &&
    authError.status === 400 &&
    typeof authError.message === "string" &&
    authError.message.includes("Auth session missing")
  );
}
