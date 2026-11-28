begin;

create or replace function public.ciya_read(panel text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
  sealed jsonb;
begin
  if panel is null or panel not in ('public','qr','recepcion','escenario','admin') then
    raise exception 'Panel desconocido.';
  end if;
  if panel not in ('public','qr') then perform ciya.require_role(panel); end if;
  select snapshot into sealed from ciya.event where singleton;
  result := jsonb_build_object('ranking',coalesce(sealed->'ranking',ciya.ranking()),
    'sealed',sealed is not null, 'recepcionCerrada',sealed is not null,
    'counts',jsonb_build_object('attendees',(select count(*) from ciya.attendees where checked_in_at is not null),
      'tickets',(select count(*) from ciya.tickets t join ciya.attendees a on a.id=t.attendee where a.checked_in_at is not null),
      'donations',(select count(*) from ciya.donations),'groups',(select count(*) from ciya.groups),'wishes',(select count(*) from ciya.deseos where aprobado)));
  if panel in ('public','escenario','admin') then
    result := result || jsonb_build_object(
      'groups', coalesce((select jsonb_agg((case when panel='public'
        then jsonb_build_object('nombre',data->'nombre','carrera',data->'carrera','ciclo',data->'ciclo','categoria',data->'categoria')
        else data end) || jsonb_build_object('id',id,'orden',orden) order by orden) from ciya.groups),'[]'),
      'deseos', coalesce((select jsonb_agg(data || jsonb_build_object('id',id,'aprobado',aprobado,
        'creado',creado) order by creado) from ciya.deseos where aprobado or panel='admin'),'[]'));
  end if;
  if panel in ('escenario','admin') then
    result := result || jsonb_build_object('scores',coalesce((select jsonb_agg(data) from ciya.evaluations where kind='score'),'[]'),
      'puertas',coalesce((select jsonb_agg(data) from ciya.evaluations where kind='door'),'[]'));
  end if;
  if panel='escenario' then result := result || jsonb_build_object('snapshot',sealed); end if;
  if panel='recepcion' then
    result := result || jsonb_build_object(
      'attendees',coalesce((select jsonb_agg(to_jsonb(a)) from (
        select id,cedula,nombre,email,carrera,ciclo,checked_in_at from ciya.attendees
        order by checked_in_at desc nulls last limit 30) a),'[]'),
      'donations',coalesce((select jsonb_agg(to_jsonb(d)) from (
        select d.tipo,d.carrera,d.cantidad,d.creado,a.cedula,a.nombre,
          d.cantidad * case d.tipo when 'juguete' then 5 else 2 end as puntos
        from ciya.donations d join ciya.attendees a on a.id=d.attendee order by creado desc limit 30) d),'[]'),
      'qrClaims',coalesce((select jsonb_agg(jsonb_build_object('slot',slot,'canjeado',winner is not null)
        order by slot) from ciya.gold),'[]'),
      'receipts',coalesce((select jsonb_object_agg(id,status) from (
        select id,status from ciya.receipts order by created_at desc limit 100) r),'{}'));
  end if;
  if panel='admin' then
    result := result || jsonb_build_object('goldLinks',(select jsonb_agg(jsonb_build_object('slot',slot,'secret',secret)
      order by slot) from ciya.gold));
  end if;
  return result;
end $$;

create or replace function public.ciya_write(action text, payload jsonb, request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  prior ciya.requests%rowtype;
  a ciya.attendees%rowtype;
  grant_id uuid;
  id_number text;
  email_address text;
  wall text;
  donation jsonb;
  career text;
  ciclo_value text;
  quantity integer;
  gold_slot integer;
  gold_source text;
  kind text;
  criterion jsonb;
  scores jsonb;
  result jsonb := '{}'::jsonb;
  score_total integer := 0;
  schedule ciya.event%rowtype;
  points integer;
  activity_time timestamptz := clock_timestamp();
begin
  if request_id is null or payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Solicitud no válida.';
  end if;
  case action
    when 'checkin','donate','redeem','seal' then perform ciya.require_role('recepcion');
    when 'score' then perform ciya.require_role('escenario');
    when 'door','moderate' then perform ciya.require_role('admin');
    when 'wish','group' then null;
    else raise exception 'Operación desconocida.';
  end case;
  perform pg_advisory_xact_lock(hashtextextended(request_id::text,2026));
  select * into prior from ciya.requests where id=request_id;
  if found then
    if prior.owner is distinct from auth.uid() or prior.action <> ciya_write.action or prior.payload <> ciya_write.payload then
      raise exception 'La solicitud ya fue usada para otra operación.';
    end if;
    return prior.result;
  end if;

  if action in ('checkin','donate','redeem','seal') then
    -- Serializes receipt changes against the seal and against other desks.
    select * into schedule from ciya.event where singleton for update;
    activity_time := clock_timestamp();
    if action <> 'seal' then
      if schedule.snapshot is not null then
        raise exception 'Recepción sellada. El registro está cerrado.';
      end if;
      id_number := ciya.clean(payload->>'cedula',10);
      if id_number !~ '^[0-9]{10}$' then raise exception 'La cédula debe tener 10 dígitos.'; end if;
      insert into ciya.attendees(cedula) values (id_number) on conflict do nothing;
      select * into a from ciya.attendees where cedula=id_number;
    end if;
  end if;

  if action='checkin' then
    if a.checked_in_at is not null and (payload->>'confirmOnly' is distinct from 'true' or
      a.wall_message is not null or nullif(btrim(payload->>'wall'),'') is null) then
      raise exception 'La cédula ya está acreditada.';
    end if;
    wall := nullif(btrim(payload->>'wall'),'');
    if length(wall)>140 then raise exception 'El mensaje admite hasta 140 caracteres.'; end if;
    if a.checked_in_at is null then
      if payload->>'confirmOnly' = 'true' then raise exception 'Acredita al estudiante antes de confirmar el mensaje.'; end if;
      if payload->>'confirmed' is distinct from 'true' then raise exception 'Verifica la acreditación presencial.'; end if;
      email_address := lower(ciya.clean(payload->>'email',254));
      if email_address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Correo inválido.'; end if;
      if exists (select 1 from ciya.attendees where email=email_address and id<>a.id) then raise exception 'El correo ya está registrado.'; end if;
      ciclo_value := payload->>'ciclo';
      if coalesce(ciclo_value,'') not in ('nivelacion','ciclo1','ciclo2','ciclo3','ciclo4',
        'ciclo5','ciclo6','ciclo7','ciclo8') then
        raise exception 'Selecciona un ciclo válido.';
      end if;
      update ciya.attendees set nombre=ciya.clean(payload->>'nombre',120), email=email_address,
        carrera=ciya.clean(payload->>'carrera',32), ciclo=ciclo_value,
        checked_in_at=activity_time, wall_message=wall where id=a.id;
    else
      update ciya.attendees set wall_message=wall where id=a.id;
    end if;
    if wall is not null then perform ciya.issue(a.id,'wall:'||a.id,1); end if;
  end if;

  if action='donate' or (action='checkin' and jsonb_typeof(payload->'donation')='object') then
    donation := case when action='donate' then payload else payload->'donation' end;
    quantity := (donation->>'cantidad')::integer;
    kind := donation->>'tipo';
    if kind is null or kind not in ('juguete','caramelos') or quantity is null or quantity not between 1 and 1000
      or donation->>'confirmed' is distinct from 'true' then
      raise exception 'Verifica el tipo, la cantidad y los requisitos de la donación.';
    end if;
    insert into ciya.donations(attendee,carrera,tipo,cantidad)
      values (a.id,donation->>'carrera',kind,quantity) returning id into grant_id;
    perform ciya.issue(a.id,'donation:'||grant_id,quantity * case kind when 'juguete' then 2 else 1 end);
  end if;

  if action='redeem' then
    if payload->>'confirmed' is distinct from 'true' then raise exception 'Confirma la pantalla activa, la credencial y el juego limpio.'; end if;
    select slot into gold_slot from ciya.gold_keys where code=upper(btrim(payload->>'code')) and expires_at>activity_time;
    if gold_slot is null then raise exception 'Clave inválida o vencida. Pide al estudiante que la actualice.'; end if;
    if exists(select 1 from ciya.gold where winner=a.id) then raise exception 'Este estudiante ya canjeó un QR Dorado.'; end if;
    update ciya.gold set winner=a.id,claimed_at=activity_time where slot=gold_slot and winner is null;
    if not found then raise exception 'Este QR Dorado ya fue canjeado.'; end if;
    gold_source := 'gold:'||gold_slot;
    perform ciya.issue(a.id,gold_source,3);
  end if;

  if action in ('checkin','donate','redeem') then
    result := ciya.receipt(a.id);
  elsif action='seal' then
    update ciya.event set snapshot=ciya.snapshot(activity_time) where snapshot is null;
    result := jsonb_build_object('sealed',true);
  elsif action='group' then
    career := payload->>'carrera';
    ciclo_value := payload->>'ciclo';
    if not exists(select 1 from ciya.carreras where id=career)
      or coalesce(payload->>'categoria','') not in ('Acústico / Rock Navideño','Villancico Parodia CIYA','Coro de Carrera') then
      raise exception 'Selecciona la carrera y una categoría oficial.';
    end if;
    if coalesce(ciclo_value,'') not in ('nivelacion','ciclo1','ciclo2','ciclo3','ciclo4',
      'ciclo5','ciclo6','ciclo7','ciclo8') then
      raise exception 'Selecciona un ciclo válido.';
    end if;
    if jsonb_typeof(payload->'integrantes') is distinct from 'array' then raise exception 'Ingresa la nómina de integrantes.'; end if;
    if jsonb_array_length(payload->'integrantes') not between 1 and 100 then raise exception 'Ingresa entre 1 y 100 integrantes.'; end if;
    insert into ciya.groups(data) values (jsonb_build_object('nombre',ciya.clean(payload->>'nombre',120),
      'representante',ciya.clean(payload->>'representante',120),'carrera',career,'ciclo',ciclo_value,
      'cancion',ciya.clean(payload->>'cancion',160),'categoria',payload->>'categoria',
      'integrantes',(select jsonb_agg(ciya.clean(x,120)) from jsonb_array_elements_text(payload->'integrantes') x)));
  elsif action='wish' then
    if coalesce(payload->>'rol','') not in ('estudiante','docente','personal') then raise exception 'Selecciona un rol válido.'; end if;
    insert into ciya.deseos(data) values (jsonb_build_object('nombre',ciya.clean(payload->>'nombre',120),
      'rol',payload->>'rol','carrera',ciya.clean(payload->>'carrera',120),'frase',ciya.clean(payload->>'frase',280)));
  elsif action='moderate' then
    if payload->>'decision'='approve' then
      update ciya.deseos set aprobado=true where id=(payload->>'id')::uuid;
    elsif payload->>'decision'='discard' then
      delete from ciya.deseos where id=(payload->>'id')::uuid;
    else raise exception 'Decisión no válida.';
    end if;
  elsif action in ('score','door') then
    kind := action;
    scores := payload->'criterios';
    if jsonb_typeof(scores) is distinct from 'object' then raise exception 'Criterios inválidos.'; end if;
    if action='score' then
      if not exists(select 1 from ciya.groups where id=(payload->>'subject')::uuid) then raise exception 'Grupo no válido.'; end if;
    elsif not exists(select 1 from ciya.carreras where id=payload->>'subject') then raise exception 'Carrera no válida.';
    end if;
    for criterion in select value from jsonb_array_elements(case action when 'score'
      then '[["creatividad",30],["musical",30],["escena",20],["aplauso",20]]'::jsonb
      else '[["creatividad",30],["sostenibilidad",30],["estetica",25],["equipo",15]]'::jsonb end)
    loop
      points := (scores->>(criterion->>0))::integer;
      if points is null or points<0 or points>(criterion->>1)::integer then raise exception 'Puntaje fuera de rango.'; end if;
      score_total := score_total + points;
    end loop;
    insert into ciya.evaluations values (kind,payload->>'subject',jsonb_build_object(
      'grupoId',payload->>'subject','carrera',payload->>'subject','criterios',
      case when kind='score' then jsonb_build_object('creatividad',(scores->>'creatividad')::integer,
        'musical',(scores->>'musical')::integer,'escena',(scores->>'escena')::integer,'aplauso',(scores->>'aplauso')::integer)
      else jsonb_build_object('creatividad',(scores->>'creatividad')::integer,'sostenibilidad',(scores->>'sostenibilidad')::integer,
        'estetica',(scores->>'estetica')::integer,'equipo',(scores->>'equipo')::integer) end,'total',score_total,
      'aplauso',scores->'aplauso','observaciones',left(payload->>'observaciones',500),'creado',activity_time))
    on conflict on constraint evaluations_pkey do update set data=excluded.data;
  end if;
  insert into ciya.requests values (request_id,auth.uid(),action,payload,result);
  return result;
end $$;

commit;
