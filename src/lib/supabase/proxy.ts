import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy sits in front of every page render, so a hung auth call stalls the whole
// response until the platform kills it (25s => MIDDLEWARE_INVOCATION_TIMEOUT).
// Cap the auth round-trip far below that and fail open instead.
const AUTH_TIMEOUT_MS = 3_000;

function withTimeout(init?: RequestInit): RequestInit {
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  return {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  };
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (input, init) => fetch(input, withTimeout(init)),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    // Verifies the JWT locally via WebCrypto (asymmetric signing keys) and only
    // reaches the Auth server when the token is close to expiring and needs a
    // refresh. `getUser()` would instead hit the network on every request.
    await supabase.auth.getClaims();
  } catch {
    // Auth was slow or unreachable. Serve the request with the cookies we
    // already have rather than blocking; this is not the security boundary —
    // every protected page re-verifies with `getUser()`.
  }

  return response;
}
