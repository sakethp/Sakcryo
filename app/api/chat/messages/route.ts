import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/supabase/same-origin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeMatch(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, matchId: string) {
  const { data, error } = await supabase.rpc("get_chat_overview", { p_match_id: matchId });
  return !error && Boolean(Array.isArray(data) ? data[0] : data);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const matchId = new URL(request.url).searchParams.get("matchId") ?? "";
  if (!uuidPattern.test(matchId) || !(await authorizeMatch(supabase, matchId))) {
    return NextResponse.json({ error: "not_a_match_participant" }, { status: 403 });
  }

  const { data, error } = await supabase.from("messages").select("id,match_id,sender_id,body,created_at")
    .eq("match_id", matchId).order("created_at", { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: "messages_unavailable" }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "same_origin_required" }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let body: { matchId?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!uuidPattern.test(matchId) || text.length < 1 || text.length > 2000) {
    return NextResponse.json({ error: "message_must_be_1_to_2000_characters" }, { status: 400 });
  }
  if (!(await authorizeMatch(supabase, matchId))) {
    return NextResponse.json({ error: "not_a_match_participant" }, { status: 403 });
  }

  const { data, error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: user.id, body: text })
    .select("id,match_id,sender_id,body,created_at").single();
  if (error) return NextResponse.json({ error: "message_could_not_be_sent" }, { status: 403 });
  return NextResponse.json({ message: data }, { status: 201 });
}
