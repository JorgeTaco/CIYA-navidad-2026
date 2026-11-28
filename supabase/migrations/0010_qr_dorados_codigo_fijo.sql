begin;

create or replace function public.ciya_gold(secret uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  slot_number integer;
  reception_sealed boolean;
  redemption_code text;
begin
  select g.slot into slot_number from ciya.gold g where g.secret=ciya_gold.secret;
  if not found then return jsonb_build_object('status','invalid'); end if;

  -- Coordinate issuing the credential with reception's redemption and seal lock.
  select snapshot is not null into reception_sealed from ciya.event where singleton for share;
  if exists (select 1 from ciya.gold where slot=slot_number and winner is not null) then
    return jsonb_build_object('status','claimed');
  end if;
  if reception_sealed then return jsonb_build_object('status','closed'); end if;

  redemption_code := 'CIYA-ORO-' || lpad(slot_number::text,2,'0');
  -- A screenshot remains usable until the first redemption or reception seal.
  insert into ciya.gold_keys (code,slot,expires_at) values (redemption_code,slot_number,'infinity')
  on conflict (code) do nothing;
  return jsonb_build_object('status','available','code',redemption_code);
end $$;

commit;
