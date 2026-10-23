import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/supabase/same-origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "same_origin_required" }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let body: { latitude?: unknown; longitude?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "valid_location_required" }, { status: 400 });
  }
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "valid_location_required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("next_discovery_profile", {
    p_latitude: latitude,
    p_longitude: longitude,
  });
  if (error) {
    if (error.message.includes("profile_required")) return NextResponse.json({ error: "profile_required" }, { status: 409 });
    if (error.message.includes("authentication_required")) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    return NextResponse.json({ error: "discovery_unavailable" }, { status: 500 });
  }
  return NextResponse.json({ profile: Array.isArray(data) ? data[0] ?? null : data ?? null });
}
