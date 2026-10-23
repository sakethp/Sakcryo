import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MatchList } from "@/components/match-list";
import { SetupNotice } from "@/components/setup-notice";

export default async function MatchesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="content-wrap"><SetupNotice /></section>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <section className="content-wrap">
      <div className="page-kicker">The feeling is mutual</div>
      <h1 className="page-title">Your matches.</h1>
      <p className="page-subtitle">A conversation opens only after you’ve both liked each other.</p>
      <MatchList />
    </section>
  );
}
