-- ============================================================
-- Itinerario · Admins fijos, roles por miembro y vínculo por correo
-- Corre esto en el SQL Editor (una vez) sobre la base que ya tienes.
-- ============================================================

-- ---------- Correo en perfiles (para ligar con fichas) ----------
alter table public.perfiles add column if not exists email text;
update public.perfiles p set email = lower(u.email)
  from auth.users u where u.id = p.id and p.email is null;

-- ---------- Lista de correos que entran como admin ----------
create table if not exists public.correos_admin (
  email text primary key check (email = lower(email))
);
insert into public.correos_admin (email) values
  ('aperezmdz21@gmail.com'),
  ('amitaileon35@gmail.com')
on conflict do nothing;

alter table public.correos_admin enable row level security;
drop policy if exists "correos_admin_admin" on public.correos_admin;
create policy "correos_admin_admin" on public.correos_admin
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Los que ya se registraron con esos correos → admin ya
update public.perfiles set rol = 'admin'
 where lower(email) in (select email from public.correos_admin);

-- ---------- Roles que puede desempeñar cada miembro ----------
create table if not exists public.miembro_roles (
  miembro_id uuid not null references public.miembros (id) on delete cascade,
  rol_id     uuid not null references public.roles (id) on delete cascade,
  primary key (miembro_id, rol_id)
);
alter table public.miembro_roles enable row level security;
drop policy if exists "miembro_roles_leer"     on public.miembro_roles;
drop policy if exists "miembro_roles_escribir" on public.miembro_roles;
create policy "miembro_roles_leer"     on public.miembro_roles for select to authenticated using (public.es_miembro());
create policy "miembro_roles_escribir" on public.miembro_roles for all    to authenticated
  using (public.puede_editar()) with check (public.puede_editar());

-- Lo que ya hacían según el Excel cuenta como su rol
insert into public.miembro_roles (miembro_id, rol_id)
select distinct a.miembro_id, a.rol_id from public.asignaciones a
on conflict do nothing;

-- ---------- Alta de usuario: perfil + admin por correo + liga con ficha ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case when exists (select 1 from public.correos_admin where email = lower(new.email))
         then 'admin'::public.rol_app else 'miembro' end
  );

  update public.miembros
     set perfil_id = new.id
   where lower(email) = lower(new.email) and perfil_id is null;

  return new;
end $$;

-- ---------- Al poner/cambiar el correo de una ficha, ligarla si ya hay cuenta ----------
create or replace function public.ligar_miembro_por_correo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  if new.email is distinct from old.email then
    new.perfil_id := null;
  end if;
  if new.email is not null and new.perfil_id is null then
    select p.id into new.perfil_id
      from public.perfiles p
     where p.email = new.email
       and not exists (select 1 from public.miembros m where m.perfil_id = p.id and m.id <> new.id)
     limit 1;
  end if;
  return new;
end $$;

drop trigger if exists miembros_ligar on public.miembros;
create trigger miembros_ligar
  before insert or update of email on public.miembros
  for each row execute function public.ligar_miembro_por_correo();

-- ---------- Cambiar rol de cuenta sin quedarse sin admins ----------
create or replace function public.cambiar_rol(p_perfil uuid, p_rol public.rol_app)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_rol <> 'admin'
     and (select rol from public.perfiles where id = p_perfil) = 'admin'
     and (select count(*) from public.perfiles where rol = 'admin') <= 1 then
    raise exception 'Debe quedar al menos un admin';
  end if;
  update public.perfiles set rol = p_rol where id = p_perfil;
end $$;

revoke all on function public.cambiar_rol(uuid, public.rol_app) from public, anon;
grant execute on function public.cambiar_rol(uuid, public.rol_app) to authenticated;
