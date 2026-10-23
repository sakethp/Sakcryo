import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { matchId } = await params;
  if (!uuidPattern.test(matchId)) return NextResponse.json({ error: "invalid_match" }, { status: 400 });

  const { data, error } = await supabase.rpc("get_chat_overview", { p_match_id: matchId });
  if (error || !data?.length) return NextResponse.json({ error: "not_a_match_participant" }, { status: 403 });
  return NextResponse.json({ partner: data[0] });
}
