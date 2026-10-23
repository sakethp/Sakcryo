import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/supabase/same-origin";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse("Same-origin request required.", { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const response = new NextResponse(null, { status: 303 });
    response.headers.set("Location", "/");
    return response;
  }

  const sessionResponse = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { sameSite: "none", secure: true, path: "/" },
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) sessionResponse.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.signOut();

  const response = new NextResponse(null, { status: 303 });
  response.headers.set("Location", "/");
  for (const cookie of sessionResponse.cookies.getAll()) {
    const { name, value, ...options } = cookie;
    response.cookies.set(name, value, options);
  }
  return response;
}
