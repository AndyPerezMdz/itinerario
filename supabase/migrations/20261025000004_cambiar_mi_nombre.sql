-- ============================================================
-- Itinerario · Cada quien puede cambiar su propio nombre
-- (y si su cuenta está ligada a una ficha, la ficha también cambia,
--  para que en el calendario salga igual)
-- ============================================================

create or replace function public.cambiar_mi_nombre(p_nombre text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_nombre text := nullif(trim(regexp_replace(p_nombre, '\s+', ' ', 'g')), '');
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión' using errcode = '42501';
  end if;
  if v_nombre is null or length(v_nombre) < 2 then
    raise exception 'El nombre es muy corto';
  end if;
  if length(v_nombre) > 60 then
    raise exception 'El nombre es muy largo (máximo 60 letras)';
  end if;

  update public.perfiles set nombre = v_nombre where id = auth.uid();
  update public.miembros set nombre = v_nombre where perfil_id = auth.uid();
end $$;

revoke all on function public.cambiar_mi_nombre(text) from public, anon;
grant execute on function public.cambiar_mi_nombre(text) to authenticated;

-- Si el admin cambia el nombre de una ficha ligada, que también cambie en la cuenta
create or replace function public.sincronizar_nombre_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.perfil_id is not null and new.nombre is distinct from old.nombre then
    update public.perfiles set nombre = new.nombre where id = new.perfil_id and nombre is distinct from new.nombre;
  end if;
  return new;
end $$;

drop trigger if exists miembros_sincronizar_nombre on public.miembros;
create trigger miembros_sincronizar_nombre
  after update of nombre on public.miembros
  for each row execute function public.sincronizar_nombre_perfil();
