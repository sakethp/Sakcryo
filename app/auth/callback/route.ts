import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function redirectWithCookies(path: string, source: NextResponse) {
  const response = new NextResponse(null, { status: 303 });
  response.headers.set("Location", path);
  for (const cookie of source.cookies.getAll()) {
    const { name, value, ...options } = cookie;
    response.cookies.set(name, value, options);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return new NextResponse("Supabase is not configured.", { status: 503 });

  const response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { sameSite: "none", secure: true, path: "/" },
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectWithCookies("/login?auth=confirmation_failed", response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirectWithCookies("/login?auth=confirmation_failed", response);
  return redirectWithCookies("/onboarding", response);
}
