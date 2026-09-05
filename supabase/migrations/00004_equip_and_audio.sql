create or replace function public.equip_cosmetic(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.cosmetic_items;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select * into item from public.cosmetic_items where id = p_item_id;
  if item.id is null then
    raise exception 'Unknown item';
  end if;
  if not exists (
    select 1 from public.owned_cosmetics where user_id = auth.uid() and item_id = p_item_id
  ) then
    raise exception 'Not owned';
  end if;
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
  return jsonb_build_object('item', p_item_id, 'slot', item.slot);
end;
$$;

grant execute on function public.equip_cosmetic(text) to authenticated;

alter table public.profiles alter column settings set default jsonb_build_object(
  'music', 28,
  'sfx', 70,
  'theme', 'dark',
  'notesDefault', false,
  'leftHanded', false
);

update public.profiles
set settings = settings || jsonb_build_object('music', 28, 'sfx', 70)
where coalesce((settings->>'music')::int, 0) = 0
  and coalesce((settings->>'sfx')::int, 0) = 0;
