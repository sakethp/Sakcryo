"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GENDER_OPTIONS, type Gender, type Profile } from "@/lib/types";

function errorLabel(code: string) {
  const labels: Record<string, string> = {
    display_name_must_be_1_to_40_characters: "Your display name needs 1–40 characters.",
    choose_a_gender_identity: "Choose your gender identity to continue.",
    bio_must_be_240_characters_or_less: "Keep your bio to 240 characters or fewer.",
    choose_at_least_one_match_preference: "Choose at least one gender preference.",
    distance_must_be_between_1_and_200_km: "Choose a distance between 1 and 200 km.",
    profile_save_failed: "We couldn't save your profile. Please try again.",
    authentication_required: "Please log in again to save your profile.",
  };
  return labels[code] ?? "We couldn't save your profile. Check your connection and try again.";
}

export function ProfileForm({ initialProfile }: { initialProfile: Profile | null }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [gender, setGender] = useState<Gender | "">(initialProfile?.gender ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [preferred, setPreferred] = useState<Gender[]>(initialProfile?.preferred_genders ?? []);
  const [distance, setDistance] = useState(initialProfile?.max_distance_km ?? 50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function togglePreference(value: Gender) {
    setPreferred((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, gender, bio, preferredGenders: preferred, maxDistanceKm: distance }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(errorLabel(result.error ?? ""));
        return;
      }
      router.replace("/discover");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form-stack" onSubmit={saveProfile}>
      <label className="form-row">
        <span className="form-label">What should we call you?</span>
        <input className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required autoComplete="nickname" placeholder="Your first name or a nickname" />
      </label>
      <label className="form-row">
        <span className="form-label">Your gender identity</span>
        <select className="form-select" value={gender} onChange={(event) => setGender(event.target.value as Gender | "")} required>
          <option value="" disabled>Choose one</option>
          <option value="woman">Woman</option>
          <option value="man">Man</option>
          <option value="non_binary">Non-binary</option>
          <option value="another_identity">Another identity</option>
        </select>
      </label>
      <fieldset className="form-row" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="form-label" style={{ marginBottom: 8 }}>Who would you like to meet?</legend>
        <span className="form-hint" style={{ display: "block", marginBottom: 10 }}>Only mutual gender preferences are used to decide who appears.</span>
        <div className="preference-list">
          {GENDER_OPTIONS.map((option) => (
            <label className="preference-choice" key={option.value}>
              <input type="checkbox" checked={preferred.includes(option.value)} onChange={() => togglePreference(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="form-row">
        <span className="form-label">A little about you <span className="form-hint">(optional)</span></span>
        <textarea className="form-textarea" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} placeholder="A few words that sound like you…" />
        <span className="form-hint">{bio.length}/240 characters</span>
      </label>
      <div className="form-row">
        <span className="form-label">How far should we look?</span>
        <div className="range-row">
          <input type="range" min={1} max={200} step={1} value={distance} onChange={(event) => setDistance(Number(event.target.value))} aria-label="Maximum distance in kilometers" />
          <span className="range-pill">{distance} km</span>
        </div>
        <span className="form-hint">Default is 50 km. Discovery only considers distance and mutual gender preferences.</span>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy || preferred.length === 0 || !gender}>
        {busy ? "Saving your profile…" : initialProfile ? "Save changes" : "Save and continue"}
      </button>
      <p className="form-hint">Location permission is requested only when you start discovery. Your exact coordinates are private and never shown on your profile.</p>
    </form>
  );
}
