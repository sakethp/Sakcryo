import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { sameSite: "none", secure: true, path: "/" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) {
    const redirect = new NextResponse(null, { status: 303 });
    redirect.headers.set("Location", "/login");
    for (const cookie of response.cookies.getAll()) {
      const { name, value, ...options } = cookie;
      redirect.cookies.set(name, value, options);
    }
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/onboarding/:path*", "/discover/:path*", "/matches/:path*", "/chat/:path*"],
};
