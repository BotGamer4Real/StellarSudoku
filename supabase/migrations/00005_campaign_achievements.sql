insert into public.achievements (user_id, achievement_id)
select user_id, 'campaign_level_' || level::text
from (
  select user_id, level
  from public.campaign_progress
  group by user_id, level
  having count(*) >= 20
) s
on conflict do nothing;

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
  level_done boolean;
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
  select count(*) >= 20 into level_done
    from public.campaign_progress
    where user_id = auth.uid() and level = p_level;
  if level_done then
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
  return jsonb_build_object(
    'coins', grant_amt,
    'already', already,
    'perfect', perfect,
    'accepted_ms', accepted,
    'balance', balance,
    'level_complete', level_done,
    'achievement', case when level_done then 'campaign_level_' || p_level else null end
  );
end;
$$;
