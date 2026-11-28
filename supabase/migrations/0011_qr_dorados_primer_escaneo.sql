begin;

alter table ciya.gold add column first_scan_token uuid;

drop function public.ciya_gold(uuid);

create function public.ciya_gold(secret uuid, scan_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  slot_number integer;
  reception_sealed boolean;
  dorado ciya.gold%rowtype;
  redemption_code text;
begin
  if scan_token is null then return jsonb_build_object('status','invalid'); end if;

  select g.slot into slot_number from ciya.gold g where g.secret=ciya_gold.secret;
  if not found then return jsonb_build_object('status','invalid'); end if;

  -- Take the event lock before the slot lock, in the same order as redemption.
  select snapshot is not null into reception_sealed from ciya.event where singleton for share;
  select g.* into dorado from ciya.gold g
    where g.slot=slot_number and g.secret=ciya_gold.secret for update;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if dorado.winner is not null then return jsonb_build_object('status','claimed'); end if;
  if reception_sealed then return jsonb_build_object('status','closed'); end if;

  redemption_code := 'CIYA-ORO-' || lpad(slot_number::text,2,'0');
  if dorado.first_scan_token is null then
    -- Keep previously issued credentials redeemable without revealing them again.
    if exists (select 1 from ciya.gold_keys where code=redemption_code) then
      return jsonb_build_object('status','scanned');
    end if;
    update ciya.gold set first_scan_token=scan_token where slot=slot_number;
    insert into ciya.gold_keys (code,slot,expires_at) values (redemption_code,slot_number,'infinity');
  elsif dorado.first_scan_token <> scan_token then
    return jsonb_build_object('status','scanned');
  end if;

  return jsonb_build_object('status','available','code',redemption_code);
end $$;

revoke all on function public.ciya_gold(uuid,uuid) from public, anon, authenticated;
grant execute on function public.ciya_gold(uuid,uuid) to anon;

commit;
