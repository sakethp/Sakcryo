import Link from "next/link";
import { ArrowRight, Heart, LockKeyhole, MapPin, SlidersHorizontal, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } = { user: null } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> A softer way to meet</span>
          <h1>A little closer to <em>love.</em></h1>
          <p>Thoughtful introductions, close to home. Nearby keeps discovery simple: distance, mutual preferences, and a choice that’s yours.</p>
          <div className="hero-actions">
            <Link className="primary-button" href={user ? "/discover" : "/signup"}>
              {user ? "See who’s nearby" : "Find your nearby"}<ArrowRight size={17} />
            </Link>
            <Link className="secondary-button" href="/login">I already have an account</Link>
          </div>
        </div>
        <div className="hero-art" aria-label="An abstract romantic profile-card illustration">
          <span className="art-halo" />
          <Sparkles className="art-sparkle one" size={24} />
          <Heart className="art-sparkle two" size={26} fill="currentColor" />
          <div className="art-card" aria-hidden="true">
            <span className="art-sticker top"><Heart size={23} fill="currentColor" /></span>
            <span className="art-sticker bottom"><Sparkles size={19} /></span>
            <div className="art-card-label">
              <strong>Your next card</strong>
              <span>One person at a time. No endless scroll.</span>
            </div>
          </div>
          <span className="art-caption">An illustration · not a real member profile</span>
        </div>
      </section>
      <section className="trust-strip" aria-label="How Nearby works">
        <article className="trust-item">
          <span className="trust-icon"><MapPin size={18} /></span>
          <div><strong>Close, by choice</strong><p>Turn on location to see people within the distance you choose.</p></div>
        </article>
        <article className="trust-item">
          <span className="trust-icon"><SlidersHorizontal size={18} /></span>
          <div><strong>Your preferences matter</strong><p>Discovery uses distance and the genders each of you is interested in—nothing else.</p></div>
        </article>
        <article className="trust-item">
          <span className="trust-icon"><LockKeyhole size={18} /></span>
          <div><strong>Mutual means mutual</strong><p>Chat is for two people who have both said yes.</p></div>
        </article>
      </section>
    </>
  );
}
