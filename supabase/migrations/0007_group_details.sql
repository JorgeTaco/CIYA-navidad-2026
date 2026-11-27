begin;

create or replace function public.ciya_group_details(group_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'nombre', g.data->>'nombre',
    'representante', g.data->>'representante',
    'carrera', g.data->>'carrera',
    'ciclo', g.data->>'ciclo',
    'categoria', g.data->>'categoria',
    'cancion', g.data->>'cancion',
    'integrantes', case when jsonb_typeof(g.data->'integrantes') = 'array'
      then g.data->'integrantes' else '[]'::jsonb end,
    'orden', g.orden
  )
  from ciya.groups g
  where g.id = group_id;
$$;

revoke all on function public.ciya_group_details(uuid) from public, anon, authenticated;
grant execute on function public.ciya_group_details(uuid) to anon, authenticated;

commit;
