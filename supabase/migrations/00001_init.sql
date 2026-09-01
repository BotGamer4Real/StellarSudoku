-- StellarSudoku v1 schema. RLS on every public table. No solution columns exposed to clients.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sudoku_valid_complete(grid text, givens text)
returns boolean
language plpgsql
immutable
as $$
declare
  i int;
  d int;
  given_ch text;
  r int;
  c int;
  b int;
  rows int[] := array_fill(0, array[9]);
  cols int[] := array_fill(0, array[9]);
  boxes int[] := array_fill(0, array[9]);
  bit int;
begin
  if grid is null or givens is null or length(grid) <> 81 or length(givens) <> 81 then
    return false;
  end if;
  if grid !~ '^[1-9]{81}$' or givens !~ '^[0-9]{81}$' then
    return false;
  end if;
  for i in 1..81 loop
    d := substr(grid, i, 1)::int;
    given_ch := substr(givens, i, 1);
    if given_ch <> '0' and given_ch <> substr(grid, i, 1) then
      return false;
    end if;
    r := (i - 1) / 9;
    c := (i - 1) % 9;
    b := (r / 3) * 3 + (c / 3);
    bit := 1 << (d - 1);
    if (rows[r + 1] & bit) <> 0 or (cols[c + 1] & bit) <> 0 or (boxes[b + 1] & bit) <> 0 then
      return false;
    end if;
    rows[r + 1] := rows[r + 1] | bit;
    cols[c + 1] := cols[c + 1] | bit;
    boxes[b + 1] := boxes[b + 1] | bit;
  end loop;
  return true;
end;
$$;

create or replace function public.current_daily_window()
returns table (day_id date, valid_from timestamptz, valid_to timestamptz)
language sql
stable
as $$
  with start as (
    select
      case
        when (now() at time zone 'utc')::time < time '07:00' then
          ((now() at time zone 'utc')::date - 1) + time '07:00'
        else
          (now() at time zone 'utc')::date + time '07:00'
      end as valid_from
  )
  select
    (valid_from)::date as day_id,
    valid_from at time zone 'utc' as valid_from,
    (valid_from + interval '1 day') at time zone 'utc' as valid_to
  from start;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  display_name_normalized text generated always as (lower(display_name)) stored,
  coins integer not null default 0 check (coins >= 0),
  equipped_background text,
  equipped_pad text,
  equipped_flourish text,
  equipped_avatar text,
  equipped_banner text,
  total_solves integer not null default 0,
  best_times jsonb not null default '{}'::jsonb,
  campaign_best_times jsonb not null default '{}'::jsonb,
  daily_streak integer not null default 0,
  last_daily_date date,
  tutorial_completed boolean not null default false,
  needs_display_name boolean not null default true,
  settings jsonb not null default jsonb_build_object(
    'music', 0,
    'sfx', 0,
    'theme', 'dark',
    'notesDefault', false,
    'leftHanded', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint display_name_len check (char_length(display_name) between 3 and 20)
);

create unique index profiles_display_name_unique on public.profiles (display_name_normalized);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.campaign_puzzles (
  id uuid primary key default gen_random_uuid(),
  level integer not null check (level between 1 and 6),
  puzzle_index integer not null check (puzzle_index between 1 and 20),
  difficulty text not null,
  givens text not null check (char_length(givens) = 81),
  solution text not null check (char_length(solution) = 81),
  unique (level, puzzle_index)
);

create table public.daily_puzzles (
  id uuid primary key default gen_random_uuid(),
  day_id date not null unique,
  difficulty text not null,
  givens text not null check (char_length(givens) = 81),
  solution text not null check (char_length(solution) = 81),
  valid_from timestamptz not null,
  valid_to timestamptz not null
);

create view public.campaign_catalog as
  select id, level, puzzle_index, difficulty, givens
  from public.campaign_puzzles;

create view public.daily_catalog as
  select id, day_id, difficulty, givens, valid_from, valid_to
  from public.daily_puzzles;

create table public.completed_singles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  puzzle_hash text not null,
  difficulty text not null,
  elapsed_ms integer,
  coins_granted integer not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, puzzle_hash)
);

create table public.campaign_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  level integer not null,
  puzzle_index integer not null,
  best_ms integer,
  first_completed_at timestamptz not null default now(),
  coins_granted integer not null default 0,
  perfect boolean not null default false,
  primary key (user_id, level, puzzle_index)
);

create table public.in_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('single', 'campaign', 'daily')),
  difficulty text,
  campaign_level integer,
  campaign_index integer,
  daily_day_id date,
  givens text not null,
  grid text not null,
  notes jsonb not null default '{}'::jsonb,
  elapsed_ms integer not null default 0,
  undo_stack jsonb not null default '[]'::jsonb,
  invalid_attempts integer not null default 0,
  undos integer not null default 0,
  power_ups_used integer not null default 0,
  puzzle_hash text not null,
  timer_started boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

create trigger in_progress_touch
  before update on public.in_progress
  for each row execute function public.touch_updated_at();

create table public.achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);

create table public.cosmetic_items (
  id text primary key,
  name text not null,
  slot text not null,
  cost integer not null check (cost > 0)
);

create table public.owned_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.cosmetic_items (id),
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.daily_leaderboard (
  day_id date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  elapsed_ms integer not null check (elapsed_ms > 0),
  undos integer not null default 0,
  accepted_at timestamptz not null default now(),
  primary key (day_id, user_id)
);

create table public.campaign_leaderboard (
  level integer not null check (level between 1 and 6),
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  elapsed_ms integer not null check (elapsed_ms > 0),
  updated_at timestamptz not null default now(),
  primary key (level, user_id)
);

insert into public.cosmetic_items (id, name, slot, cost) values
  ('starfield_background', 'Starfield Background', 'background', 150),
  ('nebula_number_orbs', 'Nebula Number Orbs', 'pad', 250),
  ('spaceship_avatar', 'Spaceship Avatar Set', 'avatar', 400),
  ('comet_trail', 'Comet Trail Pack', 'flourish', 300),
  ('holographic_grid', 'Holographic Grid Skin', 'background', 200),
  ('black_hole_flourish', 'Black Hole Completion Flourish', 'flourish', 500),
  ('galaxy_banner', 'Galaxy Profile Banner', 'banner', 350),
  ('supernova_glow', 'Supernova Glow', 'flourish', 450);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'Pilot' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.base_coins(diff text)
returns integer
language sql
immutable
as $$
  select case diff
    when 'asteroid_belt' then 10
    when 'nebula_drift' then 25
    when 'star_cluster' then 50
    when 'galaxy_edge' then 80
    when 'supernova' then 150
    when 'black_hole' then 250
    else 0
  end;
$$;

create or replace function public.unlock_achievements(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  solves int;
  streak int;
  perfects int;
  lvl int;
  diff text;
begin
  select total_solves, daily_streak into solves, streak from public.profiles where id = p_user;
  if solves >= 1 then
    insert into public.achievements (user_id, achievement_id) values (p_user, 'first_solve') on conflict do nothing;
  end if;
  if solves >= 10 then
    insert into public.achievements (user_id, achievement_id) values (p_user, 'solves_10') on conflict do nothing;
  end if;
  if solves >= 100 then
    insert into public.achievements (user_id, achievement_id) values (p_user, 'solves_100') on conflict do nothing;
  end if;
  if solves >= 1000 then
    insert into public.achievements (user_id, achievement_id) values (p_user, 'solves_1000') on conflict do nothing;
  end if;
  if streak >= 7 then
    insert into public.achievements (user_id, achievement_id) values (p_user, 'daily_streak_7') on conflict do nothing;
  end if;

  for diff in select unnest(array['asteroid_belt','nebula_drift','star_cluster','galaxy_edge','supernova','black_hole']) loop
    if exists (
      select 1 from public.completed_singles where user_id = p_user and difficulty = diff
    ) or exists (
      select 1 from public.campaign_progress cp
      join public.campaign_puzzles p on p.level = cp.level and p.puzzle_index = cp.puzzle_index
      where cp.user_id = p_user and p.difficulty = diff
    ) then
      insert into public.achievements (user_id, achievement_id)
      values (p_user, 'first_' || diff)
      on conflict do nothing;
    end if;
  end loop;

  for lvl in 1..6 loop
    if (
      select count(*) from public.campaign_progress
      where user_id = p_user and level = lvl
    ) >= 20 then
      insert into public.achievements (user_id, achievement_id)
      values (p_user, 'campaign_level_' || lvl)
      on conflict do nothing;
    end if;
  end loop;

  select count(*) into perfects from public.campaign_progress where user_id = p_user and perfect;
  if perfects >= 3 then
    insert into public.achievements (user_id, achievement_id) values (p_user, 'perfect_series_3') on conflict do nothing;
  end if;
end;
$$;

create or replace function public.apply_coins(p_user uuid, p_amount integer, p_reason text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_amount = 0 then
    select coins into new_balance from public.profiles where id = p_user;
    return new_balance;
  end if;
  update public.profiles
    set coins = coins + p_amount,
        updated_at = now()
    where id = p_user
    returning coins into new_balance;
  insert into public.coin_ledger (user_id, amount, reason, ref)
  values (p_user, p_amount, p_reason, p_ref);
  return new_balance;
end;
$$;

create or replace function public.set_display_name(p_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text;
  rec public.profiles;
begin
  trimmed := trim(p_name);
  if trimmed !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$' then
    raise exception 'Display name must be 3-20 letters, numbers, spaces, _ or -';
  end if;
  update public.profiles
    set display_name = trimmed,
        needs_display_name = false
    where id = auth.uid()
    returning * into rec;
  if rec.id is null then
    raise exception 'Not signed in';
  end if;
  update public.daily_leaderboard set display_name = trimmed where user_id = auth.uid();
  update public.campaign_leaderboard set display_name = trimmed where user_id = auth.uid();
  return rec;
end;
$$;

create or replace function public.save_in_progress(
  p_mode text,
  p_difficulty text,
  p_campaign_level integer,
  p_campaign_index integer,
  p_daily_day_id date,
  p_givens text,
  p_grid text,
  p_notes jsonb,
  p_elapsed_ms integer,
  p_undo_stack jsonb,
  p_invalid_attempts integer,
  p_undos integer,
  p_power_ups_used integer,
  p_puzzle_hash text,
  p_timer_started boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into public.in_progress as ip (
    user_id, mode, difficulty, campaign_level, campaign_index, daily_day_id,
    givens, grid, notes, elapsed_ms, undo_stack, invalid_attempts, undos,
    power_ups_used, puzzle_hash, timer_started
  ) values (
    auth.uid(), p_mode, p_difficulty, p_campaign_level, p_campaign_index, p_daily_day_id,
    p_givens, p_grid, coalesce(p_notes, '{}'::jsonb), coalesce(p_elapsed_ms, 0),
    coalesce(p_undo_stack, '[]'::jsonb), coalesce(p_invalid_attempts, 0),
    coalesce(p_undos, 0), coalesce(p_power_ups_used, 0), p_puzzle_hash, coalesce(p_timer_started, false)
  )
  on conflict (user_id, mode) do update set
    difficulty = excluded.difficulty,
    campaign_level = excluded.campaign_level,
    campaign_index = excluded.campaign_index,
    daily_day_id = excluded.daily_day_id,
    givens = excluded.givens,
    grid = excluded.grid,
    notes = excluded.notes,
    elapsed_ms = excluded.elapsed_ms,
    undo_stack = excluded.undo_stack,
    invalid_attempts = excluded.invalid_attempts,
    undos = excluded.undos,
    power_ups_used = excluded.power_ups_used,
    puzzle_hash = excluded.puzzle_hash,
    timer_started = excluded.timer_started,
    updated_at = now();
end;
$$;

create or replace function public.clear_in_progress(p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.in_progress where user_id = auth.uid() and mode = p_mode;
end;
$$;

create or replace function public.merge_guest_progress(
  p_hashes text[],
  p_difficulty text[],
  p_coins integer
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.profiles;
  i int;
begin
  select * into rec from public.profiles where id = auth.uid();
  if rec.id is null then
    raise exception 'Not signed in';
  end if;
  if rec.total_solves > 0 or rec.coins > 0 then
    raise exception 'Account already has progress';
  end if;
  if p_hashes is not null then
    for i in 1..coalesce(array_length(p_hashes, 1), 0) loop
      insert into public.completed_singles (user_id, puzzle_hash, difficulty, coins_granted)
      values (auth.uid(), p_hashes[i], coalesce(p_difficulty[i], 'asteroid_belt'), 0)
      on conflict do nothing;
    end loop;
  end if;
  update public.profiles
    set coins = greatest(coalesce(p_coins, 0), 0),
        total_solves = (select count(*) from public.completed_singles where user_id = auth.uid())
    where id = auth.uid()
    returning * into rec;
  if coalesce(p_coins, 0) > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref)
    values (auth.uid(), p_coins, 'guest_merge', null);
  end if;
  perform public.unlock_achievements(auth.uid());
  return rec;
end;
$$;

create or replace function public.submit_single_completion(
  p_hash text,
  p_givens text,
  p_grid text,
  p_difficulty text,
  p_elapsed_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  already boolean;
  grant_amt integer := 0;
  balance integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not public.sudoku_valid_complete(p_grid, p_givens) then
    raise exception 'Invalid solution';
  end if;
  select exists(
    select 1 from public.completed_singles
    where user_id = auth.uid() and puzzle_hash = p_hash
  ) into already;
  if not already then
    grant_amt := public.base_coins(p_difficulty);
  end if;
  insert into public.completed_singles (user_id, puzzle_hash, difficulty, elapsed_ms, coins_granted)
  values (auth.uid(), p_hash, p_difficulty, p_elapsed_ms, grant_amt)
  on conflict do nothing;
  update public.profiles
    set total_solves = total_solves + 1,
        best_times = case
          when coalesce((best_times ->> p_difficulty)::int, 2147483647) > p_elapsed_ms
            then jsonb_set(best_times, array[p_difficulty], to_jsonb(p_elapsed_ms))
          else best_times
        end
    where id = auth.uid();
  balance := public.apply_coins(auth.uid(), grant_amt, 'single_first', p_hash);
  delete from public.in_progress where user_id = auth.uid() and mode = 'single';
  perform public.unlock_achievements(auth.uid());
  return jsonb_build_object('coins', grant_amt, 'already', already, 'balance', balance);
end;
$$;

create or replace function public.submit_campaign_completion(
  p_level integer,
  p_index integer,
  p_grid text,
  p_elapsed_ms integer,
  p_invalid_attempts integer,
  p_undos integer,
  p_power_ups integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puz public.campaign_puzzles;
  already boolean;
  perfect boolean;
  grant_amt integer := 0;
  accepted integer;
  balance integer;
  sum_ms integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select * into puz from public.campaign_puzzles where level = p_level and puzzle_index = p_index;
  if puz.id is null then
    raise exception 'Unknown campaign puzzle';
  end if;
  if not public.sudoku_valid_complete(p_grid, puz.givens) then
    raise exception 'Invalid solution';
  end if;
  accepted := p_elapsed_ms + coalesce(p_undos, 0) * 5000;
  perfect := coalesce(p_invalid_attempts, 0) = 0 and coalesce(p_undos, 0) = 0 and coalesce(p_power_ups, 0) = 0;
  select exists(
    select 1 from public.campaign_progress
    where user_id = auth.uid() and level = p_level and puzzle_index = p_index
  ) into already;
  if not already then
    grant_amt := public.base_coins(puz.difficulty);
    if perfect then
      grant_amt := grant_amt * 2;
    end if;
  end if;
  insert into public.campaign_progress (user_id, level, puzzle_index, best_ms, coins_granted, perfect)
  values (auth.uid(), p_level, p_index, accepted, grant_amt, perfect)
  on conflict (user_id, level, puzzle_index) do update
    set best_ms = least(public.campaign_progress.best_ms, excluded.best_ms),
        perfect = public.campaign_progress.perfect or excluded.perfect;
  update public.profiles set total_solves = total_solves + 1 where id = auth.uid();
  balance := public.apply_coins(auth.uid(), grant_amt, 'campaign_first', p_level || '-' || p_index);
  select coalesce(sum(best_ms), 0) into sum_ms
    from public.campaign_progress
    where user_id = auth.uid() and level = p_level;
  if (select count(*) from public.campaign_progress where user_id = auth.uid() and level = p_level) = 20 then
    insert into public.campaign_leaderboard (level, user_id, display_name, elapsed_ms)
    select p_level, auth.uid(), pr.display_name, sum_ms
    from public.profiles pr where pr.id = auth.uid()
    on conflict (level, user_id) do update
      set elapsed_ms = least(public.campaign_leaderboard.elapsed_ms, excluded.elapsed_ms),
          display_name = excluded.display_name,
          updated_at = now();
    update public.profiles
      set campaign_best_times = jsonb_set(campaign_best_times, array[p_level::text], to_jsonb(sum_ms))
      where id = auth.uid();
  end if;
  delete from public.in_progress where user_id = auth.uid() and mode = 'campaign';
  perform public.unlock_achievements(auth.uid());
  return jsonb_build_object('coins', grant_amt, 'already', already, 'perfect', perfect, 'accepted_ms', accepted, 'balance', balance);
end;
$$;

create or replace function public.submit_daily_completion(
  p_day_id date,
  p_grid text,
  p_elapsed_ms integer,
  p_undos integer,
  p_invalid_attempts integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puz public.daily_puzzles;
  win record;
  already boolean;
  perfect boolean;
  grant_amt integer := 0;
  accepted integer;
  streak int;
  last_day date;
  balance integer;
  rec public.daily_leaderboard;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select * into win from public.current_daily_window();
  if p_day_id <> win.day_id then
    raise exception 'Not today''s daily';
  end if;
  select * into puz from public.daily_puzzles where day_id = p_day_id;
  if puz.id is null then
    raise exception 'Daily puzzle not published';
  end if;
  if now() < puz.valid_from or now() >= puz.valid_to then
    raise exception 'Daily window closed';
  end if;
  if not public.sudoku_valid_complete(p_grid, puz.givens) then
    raise exception 'Invalid solution';
  end if;
  if p_elapsed_ms < 5000 or p_elapsed_ms > 86400000 then
    raise exception 'Unreasonable time';
  end if;
  accepted := p_elapsed_ms + coalesce(p_undos, 0) * 5000;
  select exists(
    select 1 from public.daily_leaderboard
    where day_id = p_day_id and user_id = auth.uid()
  ) into already;
  if already then
    select * into rec from public.daily_leaderboard where day_id = p_day_id and user_id = auth.uid();
    return jsonb_build_object(
      'coins', 0,
      'already', true,
      'accepted_ms', rec.elapsed_ms,
      'kept_first', true
    );
  end if;
  select daily_streak, last_daily_date into streak, last_day from public.profiles where id = auth.uid();
  if last_day is null then
    streak := 1;
  elsif last_day = p_day_id then
    streak := streak;
  elsif last_day = p_day_id - 1 then
    streak := streak + 1;
  else
    streak := 1;
  end if;
  perfect := coalesce(p_invalid_attempts, 0) = 0 and coalesce(p_undos, 0) = 0;
  grant_amt := public.base_coins(puz.difficulty);
  if perfect then
    grant_amt := grant_amt * 2;
  end if;
  grant_amt := grant_amt + (public.base_coins(puz.difficulty) * least(streak, 5) * 10) / 100;
  insert into public.daily_leaderboard (day_id, user_id, display_name, elapsed_ms, undos)
  select p_day_id, auth.uid(), pr.display_name, accepted, coalesce(p_undos, 0)
  from public.profiles pr where pr.id = auth.uid();
  update public.profiles
    set total_solves = total_solves + 1,
        daily_streak = streak,
        last_daily_date = p_day_id
    where id = auth.uid();
  balance := public.apply_coins(auth.uid(), grant_amt, 'daily_first', p_day_id::text);
  delete from public.in_progress where user_id = auth.uid() and mode = 'daily';
  perform public.unlock_achievements(auth.uid());
  return jsonb_build_object(
    'coins', grant_amt,
    'already', false,
    'perfect', perfect,
    'accepted_ms', accepted,
    'streak', streak,
    'balance', balance
  );
end;
$$;

create or replace function public.purchase_cosmetic(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.cosmetic_items;
  rec public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select * into item from public.cosmetic_items where id = p_item_id;
  if item.id is null then
    raise exception 'Unknown item';
  end if;
  select * into rec from public.profiles where id = auth.uid() for update;
  if exists (select 1 from public.owned_cosmetics where user_id = auth.uid() and item_id = p_item_id) then
    raise exception 'Already owned';
  end if;
  if rec.coins < item.cost then
    raise exception 'Not enough coins';
  end if;
  perform public.apply_coins(auth.uid(), -item.cost, 'shop', p_item_id);
  insert into public.owned_cosmetics (user_id, item_id) values (auth.uid(), p_item_id);
  if item.slot = 'background' then
    update public.profiles set equipped_background = p_item_id where id = auth.uid();
  elsif item.slot = 'pad' then
    update public.profiles set equipped_pad = p_item_id where id = auth.uid();
  elsif item.slot = 'flourish' then
    update public.profiles set equipped_flourish = p_item_id where id = auth.uid();
  elsif item.slot = 'avatar' then
    update public.profiles set equipped_avatar = p_item_id where id = auth.uid();
  elsif item.slot = 'banner' then
    update public.profiles set equipped_banner = p_item_id where id = auth.uid();
  end if;
  select coins into rec.coins from public.profiles where id = auth.uid();
  return jsonb_build_object('balance', rec.coins, 'item', p_item_id);
end;
$$;

create or replace function public.reset_campaign()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.campaign_progress where user_id = auth.uid();
  delete from public.campaign_leaderboard where user_id = auth.uid();
  delete from public.in_progress where user_id = auth.uid() and mode = 'campaign';
  update public.profiles set campaign_best_times = '{}'::jsonb where id = auth.uid();
end;
$$;

create or replace function public.patch_settings(p_settings jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.profiles;
begin
  update public.profiles
    set settings = coalesce(settings, '{}'::jsonb) || p_settings,
        tutorial_completed = case
          when p_settings ? 'tutorial_completed' then (p_settings ->> 'tutorial_completed')::boolean
          else tutorial_completed
        end
    where id = auth.uid()
    returning * into rec;
  return rec;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.campaign_puzzles enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.completed_singles enable row level security;
alter table public.campaign_progress enable row level security;
alter table public.in_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.cosmetic_items enable row level security;
alter table public.owned_cosmetics enable row level security;
alter table public.daily_leaderboard enable row level security;
alter table public.campaign_leaderboard enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own_safe on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy catalog_campaign_select on public.campaign_puzzles
  for select to authenticated using (true);
create policy catalog_daily_select on public.daily_puzzles
  for select to authenticated using (true);

create policy singles_select_own on public.completed_singles
  for select to authenticated using (user_id = auth.uid());
create policy campaign_progress_select_own on public.campaign_progress
  for select to authenticated using (user_id = auth.uid());
create policy in_progress_own on public.in_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy achievements_select_own on public.achievements
  for select to authenticated using (user_id = auth.uid());
create policy ledger_select_own on public.coin_ledger
  for select to authenticated using (user_id = auth.uid());
create policy cosmetics_read on public.cosmetic_items
  for select to authenticated using (true);
create policy owned_select_own on public.owned_cosmetics
  for select to authenticated using (user_id = auth.uid());
create policy daily_lb_read on public.daily_leaderboard
  for select to authenticated using (true);
create policy campaign_lb_read on public.campaign_leaderboard
  for select to authenticated using (true);

-- Column lockdown: clients cannot write coins / solves directly.
revoke insert, update, delete on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;
revoke update (coins, total_solves, daily_streak, last_daily_date, best_times, campaign_best_times)
  on public.profiles from authenticated;

revoke insert, update, delete on public.campaign_puzzles from authenticated, anon;
revoke insert, update, delete on public.daily_puzzles from authenticated, anon;
grant select (id, level, puzzle_index, difficulty, givens) on public.campaign_puzzles to authenticated;
grant select (id, day_id, difficulty, givens, valid_from, valid_to) on public.daily_puzzles to authenticated;
revoke select (solution) on public.campaign_puzzles from authenticated, anon;
revoke select (solution) on public.daily_puzzles from authenticated, anon;

grant select on public.campaign_catalog to authenticated;
grant select on public.daily_catalog to authenticated;

revoke insert, update, delete on public.completed_singles from authenticated;
revoke insert, update, delete on public.campaign_progress from authenticated;
revoke insert, update, delete on public.achievements from authenticated;
revoke insert, update, delete on public.coin_ledger from authenticated;
revoke insert, update, delete on public.owned_cosmetics from authenticated;
revoke insert, update, delete on public.daily_leaderboard from authenticated;
revoke insert, update, delete on public.campaign_leaderboard from authenticated;
revoke insert, update, delete on public.cosmetic_items from authenticated, anon;

grant execute on function public.set_display_name(text) to authenticated;
grant execute on function public.save_in_progress(text, text, integer, integer, date, text, text, jsonb, integer, jsonb, integer, integer, integer, text, boolean) to authenticated;
grant execute on function public.clear_in_progress(text) to authenticated;
grant execute on function public.merge_guest_progress(text[], text[], integer) to authenticated;
grant execute on function public.submit_single_completion(text, text, text, text, integer) to authenticated;
grant execute on function public.submit_campaign_completion(integer, integer, text, integer, integer, integer, integer) to authenticated;
grant execute on function public.submit_daily_completion(date, text, integer, integer, integer) to authenticated;
grant execute on function public.purchase_cosmetic(text) to authenticated;
grant execute on function public.reset_campaign() to authenticated;
grant execute on function public.patch_settings(jsonb) to authenticated;
create or replace function public.campaign_hint(p_level integer, p_index integer, p_grid text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puz public.campaign_puzzles;
  i int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_level = 6 then
    raise exception 'No power-ups on Black Hole';
  end if;
  select * into puz from public.campaign_puzzles where level = p_level and puzzle_index = p_index;
  if puz.id is null then
    raise exception 'Unknown campaign puzzle';
  end if;
  if p_grid is null or length(p_grid) <> 81 then
    raise exception 'Bad grid';
  end if;
  for i in 1..81 loop
    if substr(p_grid, i, 1) = '0' then
      return jsonb_build_object('index', i - 1, 'digit', substr(puz.solution, i, 1)::int);
    end if;
  end loop;
  return jsonb_build_object('index', null);
end;
$$;

grant execute on function public.campaign_hint(integer, integer, text) to authenticated;
grant execute on function public.current_daily_window() to authenticated, anon;

revoke execute on function public.apply_coins(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.unlock_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
