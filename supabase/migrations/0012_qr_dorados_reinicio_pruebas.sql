begin;

alter table ciya.event add column gold_test_reset_enabled boolean not null default false;

create function public.ciya_gold_test_reset(apply_reset boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  schedule ciya.event%rowtype;
  reset_count integer;
begin
  perform ciya.require_role('admin');

  if apply_reset is not true then
    return jsonb_build_object('enabled',exists (
      select 1 from ciya.event where gold_test_reset_enabled and snapshot is null
    ));
  end if;

  -- Serialize with scans, redemptions and the reception seal.
  select * into schedule from ciya.event where singleton for update;
  if schedule.gold_test_reset_enabled is distinct from true then
    raise exception 'El reinicio de QR Dorados solo se habilita en una base de pruebas.';
  end if;
  if schedule.snapshot is not null then
    raise exception 'Recepción sellada. Ya no se pueden reiniciar los escaneos.';
  end if;

  with reset_slots as (
    update ciya.gold g set first_scan_token=null
    where g.winner is null and (
      g.first_scan_token is not null or exists (
        select 1 from ciya.gold_keys k where k.slot=g.slot
      )
    )
    returning g.slot
  ), removed_keys as (
    delete from ciya.gold_keys k using reset_slots r where k.slot=r.slot
  )
  select count(*) into reset_count from reset_slots;

  return jsonb_build_object('reset',reset_count);
end $$;

revoke all on function public.ciya_gold_test_reset(boolean) from public, anon, authenticated;
grant execute on function public.ciya_gold_test_reset(boolean) to authenticated;

commit;
