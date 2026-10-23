"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import type { MatchSummary } from "@/lib/types";

export function MatchList() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let mounted = true;
    fetch("/api/matches").then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error("Unable to load matches");
      if (mounted) {
        setMatches((result.matches ?? []) as MatchSummary[]);
        setState("ready");
      }
    }).catch(() => { if (mounted) setState("error"); });
    return () => { mounted = false; };
  }, []);

  if (state === "loading") return <div className="panel">Gathering the mutual maybes…</div>;
  if (state === "error") return <div className="form-error" role="alert">We couldn’t load your matches. Please refresh and try again.</div>;
  if (matches.length === 0) return (
    <div className="empty-state">
      <span className="location-icon"><Heart size={27} /></span>
      <h2>No mutual matches yet.</h2>
      <p>Only when you and someone else both choose each other will a chat appear here.</p>
      <Link className="primary-button" href="/discover">Meet someone nearby</Link>
    </div>
  );

  return (
    <div className="match-list">
      {matches.map((match) => (
        <Link className="match-row" href={`/chat/${match.match_id}`} key={match.match_id}>
          <span className="match-avatar" aria-hidden="true">{match.partner_name.trim().charAt(0).toUpperCase()}</span>
          <span style={{ flex: 1 }}><strong>{match.partner_name}</strong><span>A mutual like · matched {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(match.created_at))}</span></span>
          <MessageCircle size={20} color="var(--rose)" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
