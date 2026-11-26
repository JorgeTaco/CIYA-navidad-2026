begin;
create or replace function public.ciya_receipts_take() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare batch jsonb;
begin
  update ciya.receipts set status='uncertain'
    where status='sending' and next_attempt<=now() and first_attempt <= now()-interval '10 minutes';
  with available as (
    select id from ciya.receipts where status in ('pending','sending') and next_attempt<=now()
    order by created_at limit 25 for update skip locked
  ), leased as (
    update ciya.receipts r set status='sending', next_attempt=now()+interval '75 seconds',
      attempts=attempts+1, first_attempt=coalesce(first_attempt,now())
    from available where r.id=available.id returning r.id,r.email,r.nombre,r.tickets,r.created_at
  )
  select coalesce(jsonb_agg(to_jsonb(leased)),'[]') into batch from leased;
  return batch;
end $$;

create or replace function public.ciya_receipts_finish(receipt_id uuid, outcome text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if outcome is null or outcome not in ('accepted','failed','retry') then raise exception 'Resultado desconocido.'; end if;
  update ciya.receipts set status=case when outcome='retry' then 'sending' else outcome end
  where id=receipt_id and status='sending';
  return found;
end $$;
revoke all on function public.ciya_receipts_take(), public.ciya_receipts_finish(uuid,text) from public,anon,authenticated;
grant execute on function public.ciya_receipts_take(), public.ciya_receipts_finish(uuid,text) to service_role;
commit;
