"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SetupNotice } from "@/components/setup-notice";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isSignup = mode === "signup";
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Account access is not connected yet. Add the Supabase values shown below first.");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/onboarding");
          router.refresh();
        } else {
          setMessage("Check your inbox for a confirmation link. Once confirmed, we’ll help you finish your profile.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.replace("/discover");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel auth-panel">
      <div className="page-kicker">A little closer</div>
      <h1 className="auth-title">{isSignup ? "Make room for a maybe." : "Good to see you."}</h1>
      <p className="auth-intro">{isSignup ? "Create your account to set your preferences and meet people nearby." : "Sign in to pick up where your heart left off."}</p>
      {!configured && <div style={{ marginBottom: 18 }}><SetupNotice /></div>}
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="form-row">
          <span className="form-label">Email address</span>
          <input className="form-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <label className="form-row">
          <span className="form-label">Password</span>
          <input className="form-input" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "At least 8 characters" : "Your password"} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        <button className="primary-button" type="submit" disabled={busy || !configured}>
          {busy ? "One moment…" : isSignup ? "Create my account" : "Log in"}
        </button>
      </form>
      <p className="auth-switch">
        {isSignup ? "Already have an account? " : "New around here? "}
        <Link className="text-link" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create one"}</Link>
      </p>
    </div>
  );
}
