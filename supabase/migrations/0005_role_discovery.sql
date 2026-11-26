begin;
create or replace function public.ciya_my_roles() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'email', (select u.email from auth.users u where u.id = auth.uid()),
    'roles', coalesce(
      (select jsonb_agg(r.panel order by array_position(array['recepcion','escenario','admin'], r.panel))
       from ciya.roles r where r.user_id = auth.uid()),
      '[]'::jsonb
    )
  );
$$;
revoke all on function public.ciya_my_roles() from public, anon, authenticated;
grant execute on function public.ciya_my_roles() to authenticated;
commit;
