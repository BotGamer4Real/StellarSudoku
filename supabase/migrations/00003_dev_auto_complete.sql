-- Tester-only auto-complete. Gated to BotGamer4Real in the function body.

create or replace function public.is_dev_tester()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and (
        p.display_name = 'BotGamer4Real'
        or lower(u.email) = 'botgamer4real@gmail.com'
      )
  );
$$;

create or replace function public.dev_complete_campaign_puzzle(p_level integer, p_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puz public.campaign_puzzles;
begin
  if not public.is_dev_tester() then
    raise exception 'Not allowed';
  end if;
  select * into puz
  from public.campaign_puzzles
  where level = p_level and puzzle_index = p_index;
  if puz.id is null then
    raise exception 'Unknown campaign puzzle';
  end if;
  return public.submit_campaign_completion(p_level, p_index, puz.solution, 5000, 0, 0, 0);
end;
$$;

create or replace function public.dev_complete_campaign_level(p_level integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  n integer := 0;
begin
  if not public.is_dev_tester() then
    raise exception 'Not allowed';
  end if;
  if p_level < 1 or p_level > 6 then
    raise exception 'Bad level';
  end if;
  if p_level > 1 and (
    select count(*) from public.campaign_progress
    where user_id = auth.uid() and level = p_level - 1
  ) < 20 then
    raise exception 'Previous level is still locked';
  end if;
  for i in 1..20 loop
    if not exists (
      select 1 from public.campaign_progress
      where user_id = auth.uid() and level = p_level and puzzle_index = i
    ) then
      perform public.dev_complete_campaign_puzzle(p_level, i);
      n := n + 1;
    end if;
  end loop;
  return jsonb_build_object('completed_now', n, 'level', p_level);
end;
$$;

create or replace function public.dev_complete_daily()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puz public.daily_puzzles;
  win record;
begin
  if not public.is_dev_tester() then
    raise exception 'Not allowed';
  end if;
  select * into win from public.current_daily_window();
  select * into puz from public.daily_puzzles where day_id = win.day_id;
  if puz.id is null then
    raise exception 'Daily puzzle not published';
  end if;
  return public.submit_daily_completion(win.day_id, puz.solution, 5000, 0, 0);
end;
$$;

revoke all on function public.is_dev_tester() from public, anon;
revoke all on function public.dev_complete_campaign_puzzle(integer, integer) from public, anon;
revoke all on function public.dev_complete_campaign_level(integer) from public, anon;
revoke all on function public.dev_complete_daily() from public, anon;

grant execute on function public.is_dev_tester() to authenticated;
grant execute on function public.dev_complete_campaign_puzzle(integer, integer) to authenticated;
grant execute on function public.dev_complete_campaign_level(integer) to authenticated;
grant execute on function public.dev_complete_daily() to authenticated;
