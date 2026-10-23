import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/supabase/same-origin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "same_origin_required" }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let body: { candidateId?: unknown; direction?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (typeof body.candidateId !== "string" || !uuidPattern.test(body.candidateId)) {
    return NextResponse.json({ error: "invalid_candidate" }, { status: 400 });
  }
  if (body.direction !== "left" && body.direction !== "right") {
    return NextResponse.json({ error: "invalid_swipe" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("submit_swipe", {
    p_target_user_id: body.candidateId,
    p_direction: body.direction,
  });
  if (error) {
    if (error.message.includes("profile_not_exposed")) return NextResponse.json({ error: "profile_not_exposed" }, { status: 409 });
    if (error.message.includes("duplicate key") || error.code === "23505") return NextResponse.json({ error: "swipe_already_recorded" }, { status: 409 });
    return NextResponse.json({ error: "swipe_could_not_be_saved" }, { status: 400 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ matched: Boolean(result?.matched), matchId: result?.match_id ?? null });
}
