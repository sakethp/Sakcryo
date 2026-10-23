import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import { SetupNotice } from "@/components/setup-notice";
import type { Profile } from "@/lib/types";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <section className="narrow-wrap"><SetupNotice /></section>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <section className="narrow-wrap"><div className="panel"><h1 className="page-title">Your account first</h1><p className="page-subtitle">Log in or create an account before setting up your profile.</p><Link className="primary-button" href="/login">Log in</Link></div></section>;

  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return (
    <section className="narrow-wrap">
      <div className="page-kicker">A note about you</div>
      <h1 className="page-title">Set the scene.</h1>
      <p className="page-subtitle">Share a little about yourself and choose what feels right. We use only distance and mutual gender preferences for discovery.</p>
      <ProfileForm initialProfile={(data as Profile | null) ?? null} />
    </section>
  );
}
