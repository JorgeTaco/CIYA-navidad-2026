begin;
create or replace function public.ciya_import_v1(backup jsonb, verified text[], import_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  imported uuid;
  item jsonb;
  id_number text;
  previous_id text;
  person uuid;
  raffle_winner boolean;
  message text;
  known_people jsonb := '{}'::jsonb;
  group_map jsonb := '{}'::jsonb;
  subject_id text;
  office text;
  slot_number integer;
  amount integer;
begin
  perform ciya.require_role('admin');
  if import_id is null or jsonb_typeof(backup->'attendees') is distinct from 'array' then
    raise exception 'Se requiere un respaldo de la primera versión.';
  end if;
  select legacy_import into imported from ciya.event where singleton for update;
  lock table ciya.groups, ciya.deseos, ciya.evaluations in share row exclusive mode;
  if imported=import_id then return jsonb_build_object('imported',true); end if;
  if imported is not null or exists(select 1 from ciya.event where snapshot is not null)
    or exists(select 1 from ciya.attendees) or exists(select 1 from ciya.groups)
    or exists(select 1 from ciya.deseos) or exists(select 1 from ciya.evaluations) then
    raise exception 'La importación requiere una instancia sin datos y sin cierre.';
  end if;

  -- Preserve original IDs in memory only while rewriting their references.
  for item in select value from jsonb_array_elements(backup->'attendees') loop
    id_number := btrim(item->>'cedula');
    if id_number is null or id_number !~ '^[0-9]{10}$' then
      raise exception 'Hay cédulas inválidas en el respaldo.';
    end if;
    if id_number = any(verified) then
      if coalesce(item->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
        raise exception 'Una acreditación confirmada carece de correo válido.';
      end if;
      select left(btrim(m->>'mensaje'),140) into message
      from jsonb_array_elements(coalesce(backup->'muro','[]')) m
      where m->>'cedula'=id_number and nullif(btrim(m->>'mensaje'),'') is not null limit 1;
      raffle_winner := exists (select 1 from jsonb_array_elements(coalesce(backup->'winners','[]')) w
        where w->>'cedula'=id_number);
      insert into ciya.attendees(cedula,nombre,email,carrera,wall_message,checked_in_at,previous_winner)
      values(id_number,ciya.clean(item->>'nombre',120),lower(btrim(item->>'email')),
        ciya.clean(item->>'carrera',32),message,statement_timestamp(),raffle_winner)
      returning id into person;
      if message is not null then perform ciya.issue(person,'wall:'||person,1); end if;
    else
      insert into ciya.attendees(cedula,nombre) values(id_number,left(btrim(item->>'nombre'),120)) returning id into person;
    end if;
    known_people := known_people || jsonb_build_object(id_number,person);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(backup->'donations','[]')) loop
    person := (known_people->>btrim(item->>'cedula'))::uuid;
    amount := (item->>'cantidad')::integer;
    insert into ciya.donations(attendee,carrera,tipo,cantidad)
      values(person,item->>'carrera',item->>'tipo',amount) returning id::text into previous_id;
    perform ciya.issue(person,'donation:'||previous_id,amount * case item->>'tipo' when 'juguete' then 2 else 1 end);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(backup->'qrClaims','[]')) where value->>'canjeado'='true' loop
    person := (known_people->>btrim(item->>'cedula'))::uuid;
    slot_number := case item->>'codigo' when 'CIYA-ORO-01' then 1 when 'CIYA-ORO-02' then 2 when 'CIYA-ORO-03' then 3 end;
    if person is null or slot_number is null then raise exception 'Hay un canje anterior inválido.'; end if;
    update ciya.gold set winner=person,claimed_at=statement_timestamp() where slot=slot_number and winner is null;
    if not found then raise exception 'Hay canjes duplicados en el respaldo.'; end if;
    perform ciya.issue(person,'gold:'||slot_number,3);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(backup->'groups','[]'))
    order by case when value->>'orden' ~ '^[0-9]+$' then (value->>'orden')::numeric end
  loop
    previous_id := ciya.clean(item->>'id',120);
    if group_map ? previous_id then raise exception 'Hay grupos duplicados.'; end if;
    office := item->'carreras'->>0;
    if not exists(select 1 from ciya.carreras where id=office) then raise exception 'Hay una carrera de grupo inválida.'; end if;
    if jsonb_typeof(item->'integrantes') is distinct from 'array' then raise exception 'Hay una nómina de grupo inválida.'; end if;
    insert into ciya.groups(data) values(jsonb_build_object(
      'nombre',ciya.clean(item->>'nombre',120),'carrera',office,'cancion',ciya.clean(item->>'cancion',160),
      'categoria',ciya.clean(item->>'categoria',100),'integrantes',item->'integrantes',
      'representante',coalesce(item->>'representante',item->'integrantes'->>0))) returning id into person;
    group_map := group_map || jsonb_build_object(previous_id,person);
  end loop;

  for item in select value from jsonb_array_elements(coalesce(backup->'deseos','[]')) loop
    insert into ciya.deseos(data,aprobado) values(jsonb_build_object(
      'nombre',ciya.clean(item->>'nombre',120),'rol',lower(ciya.clean(item->>'rol',20)),
      'carrera',ciya.clean(item->>'carrera',120),'frase',ciya.clean(item->>'frase',280)),item->>'aprobado' is not distinct from 'true');
  end loop;

  for item in select value from jsonb_array_elements(coalesce(backup->'scores','[]')) loop
    subject_id := group_map->>(item->>'grupoId');
    if subject_id is null then raise exception 'Hay una evaluación sin grupo en el respaldo.'; end if;
    insert into ciya.evaluations values ('score',subject_id,jsonb_build_object('grupoId',subject_id,
      'criterios',coalesce((select jsonb_object_agg(key,value::integer) from jsonb_each_text(item->'detalle')),'{}'),
      'total',(item->>'total')::integer,'aplauso',round((item->>'aplauso')::numeric)::integer));
  end loop;
  for item in select value from jsonb_array_elements(coalesce(backup->'puertas','[]')) loop
    subject_id := item->>'carrera';
    if not exists(select 1 from ciya.carreras where id=subject_id) then raise exception 'Hay una evaluación de puertas sin carrera.'; end if;
    insert into ciya.evaluations values ('door',subject_id,jsonb_build_object('carrera',subject_id,
      'criterios',coalesce((select jsonb_object_agg(key,value::integer) from jsonb_each_text(item->'detalle')),'{}'),
      'total',(item->>'total')::integer,'observaciones',left(item->>'notas',500)));
  end loop;
  update ciya.event set legacy_import=import_id where singleton;
  return jsonb_build_object('imported',true);
end $$;
revoke all on function public.ciya_import_v1(jsonb,text[],uuid) from public,anon,authenticated;
grant execute on function public.ciya_import_v1(jsonb,text[],uuid) to authenticated;
commit;
