"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Send } from "lucide-react";
import type { ChatMessage, ChatOverview } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ChatRoomProps = { matchId: string; userId: string };

export function ChatRoom({ matchId, userId }: ChatRoomProps) {
  const [partner, setPartner] = useState<ChatOverview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const [overviewResponse, messagesResponse] = await Promise.all([
      fetch(`/api/chat/overview/${encodeURIComponent(matchId)}`, { signal }),
      fetch(`/api/chat/messages?matchId=${encodeURIComponent(matchId)}`, { signal }),
    ]);
    if (!overviewResponse.ok || !messagesResponse.ok) throw new Error("This conversation is only available to the two people in a mutual match.");
    const [overview, content] = await Promise.all([overviewResponse.json(), messagesResponse.json()]);
    setPartner(overview.partner as ChatOverview);
    setMessages((content.messages ?? []) as ChatMessage[]);
  }, [matchId]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const client = createSupabaseBrowserClient();
    refresh(controller.signal).then(() => { if (mounted) setLoading(false); }).catch((caught: unknown) => {
      if (mounted && !(caught instanceof DOMException && caught.name === "AbortError")) {
        setError(caught instanceof Error ? caught.message : "Conversation unavailable.");
        setLoading(false);
      }
    });

    const channel = client?.channel(`chat:${matchId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
      (payload) => {
        const incoming = payload.new as ChatMessage;
        setMessages((current) => {
          const updated = [...current.filter((message) => message.id !== incoming.id), incoming];
          return updated.sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-200);
        });
      },
    ).subscribe();

    const recoveryInterval = window.setInterval(() => {
      refresh().catch(() => { /* Realtime remains primary; a later refresh recovers transient network errors. */ });
    }, 30000);
    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(recoveryInterval);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [matchId, refresh]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy || body.length > 2000) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, text: body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === "not_a_match_participant" ? "This chat is only for the two matched people." : "Message not sent. Please try again.");
      setMessages((current) => [...current.filter((item) => item.id !== result.message.id), result.message as ChatMessage]);
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Message not sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="panel">Opening your conversation…</div>;
  if (error && !partner) return <div className="empty-state"><span className="location-icon"><Heart size={25} /></span><h2>Conversation unavailable.</h2><p>{error}</p><Link className="secondary-button" href="/matches">Back to matches</Link></div>;
  if (!partner) return null;

  return (
    <section aria-label={`Chat with ${partner.partner_name}`}>
      <header className="chat-top">
        <Link className="chat-back" href="/matches" aria-label="Back to matches"><ArrowLeft size={19} /></Link>
        <span className="match-avatar" style={{ width: 44, height: 44, fontSize: "1.3rem" }} aria-hidden="true">{partner.partner_name.trim().charAt(0).toUpperCase()}</span>
        <div><h1>{partner.partner_name}</h1><p>Your mutual match · just between you two</p></div>
      </header>
      <div className="chat-body" aria-live="polite" aria-label="Messages">
        {messages.length === 0 && <p className="form-hint" style={{ textAlign: "center", margin: "auto" }}>A little hello can go a long way.</p>}
        {messages.map((message) => (
          <div className={`chat-message${message.sender_id === userId ? " mine" : ""}`} key={message.id}>
            {message.body}
            <time dateTime={message.created_at}>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}</time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-compose" onSubmit={sendMessage}>
        <input aria-label="Write a message" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Say something kind…" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send message"><Send size={19} /></button>
      </form>
      {error && <p className="form-error" style={{ marginTop: 10 }} role="alert">{error}</p>}
    </section>
  );
}
