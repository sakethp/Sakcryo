import Link from "next/link";
import { Heart } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } = { user: null } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Nearby home">
        <span className="brand-mark"><Heart size={19} fill="currentColor" strokeWidth={2.2} /></span>
        <span>nearby</span>
      </Link>
      <nav className="header-links" aria-label="Main navigation">
        {user ? (
          <>
            <Link className="header-link" href="/discover">Discover</Link>
            <Link className="header-link" href="/matches">Matches</Link>
            <Link className="header-cta" href="/onboarding">My profile</Link>
            <form action="/auth/logout" method="post">
              <button className="header-link" type="submit">Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link className="header-link" href="/login">Log in</Link>
            <Link className="header-cta" href="/signup">Create account</Link>
          </>
        )}
      </nav>
    </header>
  );
}
