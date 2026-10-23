import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Discovery } from "@/components/discovery";
import { SetupNotice } from "@/components/setup-notice";

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="content-wrap"><SetupNotice /></section>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  return <Discovery />;
}
