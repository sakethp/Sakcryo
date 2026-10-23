import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GENDER_OPTIONS, type Gender } from "@/lib/types";
import { isSameOriginRequest } from "@/lib/supabase/same-origin";

const genders = new Set<string>(GENDER_OPTIONS.map((option) => option.value));

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "same_origin_required" }, { status: 403 });
  const { supabase, user } = await currentUser();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const gender = body.gender;
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const preferredGenders = Array.isArray(body.preferredGenders) ? body.preferredGenders : [];
  const maxDistanceKm = Number(body.maxDistanceKm);
  if (displayName.length < 1 || displayName.length > 40) {
    return NextResponse.json({ error: "display_name_must_be_1_to_40_characters" }, { status: 400 });
  }
  if (typeof gender !== "string" || !genders.has(gender)) {
    return NextResponse.json({ error: "choose_a_gender_identity" }, { status: 400 });
  }
  if (bio.length > 240) return NextResponse.json({ error: "bio_must_be_240_characters_or_less" }, { status: 400 });
  if (preferredGenders.length < 1 || preferredGenders.length > 4 || !preferredGenders.every((value) => typeof value === "string" && genders.has(value))) {
    return NextResponse.json({ error: "choose_at_least_one_match_preference" }, { status: 400 });
  }
  if (!Number.isInteger(maxDistanceKm) || maxDistanceKm < 1 || maxDistanceKm > 200) {
    return NextResponse.json({ error: "distance_must_be_between_1_and_200_km" }, { status: 400 });
  }

  const { data, error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    gender: gender as Gender,
    bio,
    preferred_genders: [...new Set(preferredGenders as Gender[])],
    max_distance_km: maxDistanceKm,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select("*").single();

  if (error) return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  return NextResponse.json({ profile: data }, { status: 200 });
}
