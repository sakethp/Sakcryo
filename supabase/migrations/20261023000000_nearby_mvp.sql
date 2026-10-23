create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  gender text not null check (gender in ('woman', 'man', 'non_binary', 'another_identity')),
  bio text not null default '' check (char_length(bio) <= 240),
  preferred_genders text[] not null check (
    cardinality(preferred_genders) between 1 and 4
    and preferred_genders <@ array['woman', 'man', 'non_binary', 'another_identity']::text[]
  ),
  max_distance_km integer not null default 50 check (max_distance_km between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_locations (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_views (
  viewer_id uuid not null references public.profiles(user_id) on delete cascade,
  viewed_user_id uuid not null references public.profiles(user_id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (viewer_id, viewed_user_id),
  check (viewer_id <> viewed_user_id)
);

create table if not exists public.swipes (
  viewer_id uuid not null references public.profiles(user_id) on delete cascade,
  target_user_id uuid not null references public.profiles(user_id) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_user_id),
  check (viewer_id <> target_user_id)
);

create table if not exists public.matches (
  id uuid not null unique default gen_random_uuid(),
  user_one uuid not null references public.profiles(user_id) on delete cascade,
  user_two uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_one, user_two),
  check (user_one < user_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

create index if not exists profile_locations_coords_idx on public.profile_locations(user_id);
create index if not exists profile_views_viewer_idx on public.profile_views(viewer_id, viewed_at desc);
create index if not exists swipes_target_idx on public.swipes(target_user_id, direction);
create index if not exists messages_match_created_idx on public.messages(match_id, created_at);

alter table public.profiles enable row level security;
alter table public.profile_locations enable row level security;
alter table public.profile_views enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles, public.profile_locations, public.profile_views, public.swipes, public.matches, public.messages from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profile_views, public.swipes, public.matches to authenticated;
grant select, insert on public.messages to authenticated;

 drop policy if exists "Profiles are visible to their owner" on public.profiles;
create policy "Profiles are visible to their owner" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users edit their own profile" on public.profiles;
create policy "Users edit their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete their own profile" on public.profiles;
create policy "Users delete their own profile" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

 drop policy if exists "Users can read their own discovery history" on public.profile_views;
create policy "Users can read their own discovery history" on public.profile_views
  for select to authenticated using ((select auth.uid()) = viewer_id);
drop policy if exists "Users can read their own swipe decisions" on public.swipes;
create policy "Users can read their own swipe decisions" on public.swipes
  for select to authenticated using ((select auth.uid()) = viewer_id);
drop policy if exists "Match participants can read their matches" on public.matches;
create policy "Match participants can read their matches" on public.matches
  for select to authenticated using ((select auth.uid()) in (user_one, user_two));
drop policy if exists "Match participants can read messages" on public.messages;
create policy "Match participants can read messages" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (select auth.uid()) in (m.user_one, m.user_two)
    )
  );
drop policy if exists "Matched users can send their own messages" on public.messages;
create policy "Matched users can send their own messages" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (select auth.uid()) in (m.user_one, m.user_two)
    )
  );

create or replace function public.next_discovery_profile(p_latitude double precision, p_longitude double precision)
returns table (candidate_id uuid, display_name text, gender text, bio text, distance_km double precision)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate_id uuid;
  v_display_name text;
  v_gender text;
  v_bio text;
  v_distance double precision;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'valid_location_required';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = v_user_id) then
    raise exception 'profile_required';
  end if;

  insert into public.profile_locations(user_id, latitude, longitude, updated_at)
  values (v_user_id, p_latitude, p_longitude, now())
  on conflict (user_id) do update
    set latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();

  select c.user_id, c.display_name, c.gender, c.bio, d.distance_km
    into v_candidate_id, v_display_name, v_gender, v_bio, v_distance
  from public.profiles me
  join public.profiles c on c.user_id <> me.user_id
  join public.profile_locations loc on loc.user_id = c.user_id
  cross join lateral (
    select 6371.0088 * 2 * asin(sqrt(least(1.0,
      power(sin(radians(loc.latitude - p_latitude) / 2), 2)
      + cos(radians(p_latitude)) * cos(radians(loc.latitude))
        * power(sin(radians(loc.longitude - p_longitude) / 2), 2)
    ))) as distance_km
  ) d
  where me.user_id = v_user_id
    and me.preferred_genders @> array[c.gender]::text[]
    and c.preferred_genders @> array[me.gender]::text[]
    and d.distance_km <= me.max_distance_km
    and d.distance_km <= c.max_distance_km
    and not exists (
      select 1 from public.profile_views seen
      where seen.viewer_id = v_user_id and seen.viewed_user_id = c.user_id
    )
  order by d.distance_km asc
  limit 1
  for update of c skip locked;

  if v_candidate_id is null then
    return;
  end if;

  insert into public.profile_views(viewer_id, viewed_user_id)
  values (v_user_id, v_candidate_id);

  return query select v_candidate_id, v_display_name, v_gender, v_bio, round(v_distance)::double precision;
end;
$$;

create or replace function public.submit_swipe(p_target_user_id uuid, p_direction text)
returns table (matched boolean, match_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_match_id uuid;
  v_existing_direction text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_target_user_id is null or p_target_user_id = v_user_id then
    raise exception 'invalid_target';
  end if;
  if p_direction not in ('left', 'right') then
    raise exception 'invalid_swipe';
  end if;
  if not exists (
    select 1 from public.profile_views v
    where v.viewer_id = v_user_id and v.viewed_user_id = p_target_user_id
  ) then
    raise exception 'profile_not_exposed';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(v_user_id::text, p_target_user_id::text) || ':' || greatest(v_user_id::text, p_target_user_id::text), 0
  ));

  select s.direction into v_existing_direction
  from public.swipes s
  where s.viewer_id = v_user_id and s.target_user_id = p_target_user_id;
  if v_existing_direction is not null then
    if v_existing_direction <> p_direction then
      raise exception 'swipe_already_recorded';
    end if;
    if p_direction = 'right' and exists (
      select 1 from public.swipes s
      where s.viewer_id = p_target_user_id
        and s.target_user_id = v_user_id
        and s.direction = 'right'
    ) then
      select m.id into v_match_id
      from public.matches m
      where m.user_one = least(v_user_id, p_target_user_id)
        and m.user_two = greatest(v_user_id, p_target_user_id);
    end if;
    return query select (v_match_id is not null), v_match_id;
    return;
  end if;

  insert into public.swipes(viewer_id, target_user_id, direction)
  values (v_user_id, p_target_user_id, p_direction);

  if p_direction = 'right' and exists (
    select 1 from public.swipes s
    where s.viewer_id = p_target_user_id
      and s.target_user_id = v_user_id
      and s.direction = 'right'
  ) then
    insert into public.matches(user_one, user_two)
    values (least(v_user_id, p_target_user_id), greatest(v_user_id, p_target_user_id))
    on conflict (user_one, user_two) do nothing;

    select m.id into v_match_id
    from public.matches m
    where m.user_one = least(v_user_id, p_target_user_id)
      and m.user_two = greatest(v_user_id, p_target_user_id);
  end if;

  return query select (v_match_id is not null), v_match_id;
end;
$$;

create or replace function public.list_my_matches()
returns table (match_id uuid, partner_id uuid, partner_name text, partner_gender text, partner_bio text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id,
         p.user_id,
         p.display_name,
         p.gender,
         p.bio,
         m.created_at
  from public.matches m
  join public.profiles p
    on p.user_id = case when m.user_one = auth.uid() then m.user_two else m.user_one end
  where auth.uid() in (m.user_one, m.user_two)
  order by m.created_at desc;
$$;

create or replace function public.get_chat_overview(p_match_id uuid)
returns table (match_id uuid, partner_id uuid, partner_name text, partner_gender text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.matches m
    where m.id = p_match_id and auth.uid() in (m.user_one, m.user_two)
  ) then
    raise exception 'not_a_match_participant';
  end if;

  return query
  select m.id,
         p.user_id,
         p.display_name,
         p.gender
  from public.matches m
  join public.profiles p
    on p.user_id = case when m.user_one = auth.uid() then m.user_two else m.user_one end
  where m.id = p_match_id;
end;
$$;

revoke all on function public.next_discovery_profile(double precision, double precision) from public, anon;
revoke all on function public.submit_swipe(uuid, text) from public, anon;
revoke all on function public.list_my_matches() from public, anon;
revoke all on function public.get_chat_overview(uuid) from public, anon;
grant execute on function public.next_discovery_profile(double precision, double precision) to authenticated;
grant execute on function public.submit_swipe(uuid, text) to authenticated;
grant execute on function public.list_my_matches() to authenticated;
grant execute on function public.get_chat_overview(uuid) to authenticated;
