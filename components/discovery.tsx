"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MapPin, ShieldCheck, Sparkles, X } from "lucide-react";
import { GENDER_OPTIONS, type DiscoveryCandidate, type Gender } from "@/lib/types";
import { SetupNotice } from "@/components/setup-notice";

function genderLabel(value: Gender) {
  return {
    woman: "Woman",
    man: "Man",
    non_binary: "Non-binary",
    another_identity: "Another identity",
  }[value];
}

function distanceLabel(value: number) {
  if (value < 1) return "Less than 1 km away";
  return `${Math.round(value)} km away`;
}

type DiscoveryState = "idle" | "loading" | "ready" | "empty" | "error";

export function Discovery() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<DiscoveryCandidate | null>(null);
  const [state, setState] = useState<DiscoveryState>("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  function getPosition() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Your browser doesn't support location access. Try a browser with location services enabled."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (positionError) => {
        if (positionError.code === positionError.PERMISSION_DENIED) {
          reject(new Error("Location permission is off. Allow location for Nearby in your browser or device settings, then try again."));
        } else if (positionError.code === positionError.POSITION_UNAVAILABLE) {
          reject(new Error("We couldn't read your location. Turn on device location services and try again."));
        } else {
          reject(new Error("That location request took too long. Check that location is on, then try again."));
        }
      }, { enableHighAccuracy: false, maximumAge: 0, timeout: 15000 });
    });
  }

  async function loadNext() {
    setBusy(true);
    setError("");
    setState("loading");
    setCandidate(null);
    try {
      const position = await getPosition();
      const response = await fetch("/api/discovery/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === "profile_required") {
          router.replace("/onboarding");
          return;
        }
        if (result.error === "authentication_required") {
          router.replace("/login");
          return;
        }
        throw new Error(result.error === "supabase_not_configured" ? "Connect Supabase to start real discovery." : "We couldn't load nearby profiles. Please try again.");
      }
      const next = result.profile as DiscoveryCandidate | null;
      setCandidate(next);
      setState(next ? "ready" : "empty");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't get your location. Please try again.");
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  async function decide(direction: "left" | "right") {
    if (!candidate || busy) return;
    const current = candidate;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/discovery/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: current.candidate_id, direction }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === "swipe_already_recorded" ? "That choice was already saved. Let's find your next card." : "Your choice didn't save. Please try that card again.");
      if (result.matched) setMatched(true);
      await loadNext();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your choice didn't save. Please try again.");
      setState("ready");
      setBusy(false);
    }
  }

  if (!configured) {
    return <div className="content-wrap"><div className="page-kicker">Discovery</div><h1 className="page-title">People, a little closer.</h1><div style={{ marginTop: 24 }}><SetupNotice /></div></div>;
  }

  return (
    <div className="discovery-layout">
      <section>
        <div className="discovery-head">
          <div><div className="page-kicker">One face at a time</div><h1 className="page-title">A little closer.</h1></div>
          {state === "ready" && candidate && <span className="distance-note">Distance is the only sort</span>}
        </div>
        {matched && <div className="form-success" style={{ marginBottom: 14 }} role="status">It’s mutual! You can start a conversation in <Link className="text-link" href="/matches">your matches</Link>.</div>}
        {error && <div className="form-error" style={{ marginBottom: 14 }} role="alert">{error}</div>}

        {state === "ready" && candidate ? (
          <article className="profile-card" aria-label="Potential match profile">
            <div className="profile-portrait">
              <span className="distance-badge"><MapPin size={14} /> {distanceLabel(candidate.distance_km)}</span>
              <span className="avatar-letter" aria-hidden="true">{candidate.display_name.trim().charAt(0).toUpperCase()}</span>
              <Sparkles size={22} color="white" style={{ position: "absolute", right: "17%", top: "27%", zIndex: 1 }} />
            </div>
            <div className="profile-copy">
              <div className="profile-title-line"><h2>{candidate.display_name}</h2><span className="profile-gender">{genderLabel(candidate.gender)}</span></div>
              {candidate.bio ? <p className="profile-bio">{candidate.bio}</p> : <p className="profile-bio">Still writing their little introduction.</p>}
            </div>
            <div className="swipe-actions" aria-label="Choose what to do with this profile">
              <button className="swipe-button" type="button" onClick={() => void decide("left")} disabled={busy} aria-label={`Pass on ${candidate.display_name}`} title="Pass"><X size={25} /></button>
              <button className="swipe-button like" type="button" onClick={() => void decide("right")} disabled={busy} aria-label={`Like ${candidate.display_name}`} title="Like"><Heart size={23} fill="currentColor" /></button>
            </div>
          </article>
        ) : state === "idle" || state === "error" ? (
          <div className="panel location-gate">
            <span className="location-icon"><MapPin size={32} /></span>
            <div className="page-kicker">Your location, your call</div>
            <h2>Let love get local.</h2>
            <p>Nearby needs your device location to show any match cards. We use it to calculate distance, keep your exact coordinates private, and never display your location to other people.</p>
            <button className="primary-button" type="button" onClick={() => void loadNext()} disabled={busy}><MapPin size={17} /> {busy ? "Finding your location…" : "Enable location to discover"}</button>
            <p className="form-hint" style={{ margin: "15px auto 0" }}>Your browser may ask you to allow location access. You can change that permission in your device settings.</p>
          </div>
        ) : state === "loading" ? (
          <div className="panel location-gate"><span className="location-icon"><MapPin size={30} /></span><h2>Finding your little corner…</h2><p>Checking your location and looking for a compatible nearby profile.</p><span className="loading-dots" aria-label="Loading">•••</span></div>
        ) : (
          <div className="empty-state">
            <h2>No new cards just yet.</h2>
            <p>You’ve seen everyone currently eligible within both of your distance choices and mutual gender preferences. Your earlier cards won’t repeat.</p>
            <Link className="secondary-button" href="/onboarding">Adjust my preferences</Link>
          </div>
        )}
      </section>

      <aside className="discovery-aside">
        <h3>Just the nearby part.</h3>
        <p>No popularity score, age filter, or hidden ranking. People appear only when distance and both stated gender preferences fit.</p>
        <div className="privacy-note"><ShieldCheck size={18} /><span>Your exact location is private. A profile card shows only rounded distance, never a map pin or coordinates.</span></div>
        <p style={{ marginTop: 18 }}><Link className="text-link" href="/onboarding">Edit your preferences</Link></p>
        <div className="form-hint" style={{ display: "flex", gap: 6, alignItems: "center" }}><Heart size={14} fill="currentColor" /> {GENDER_OPTIONS.length} explicit preference choices</div>
      </aside>
    </div>
  );
}
