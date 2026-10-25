-- ============================================================
-- Itinerario · Esquema base
-- Calendario de actividades con reglas recurrentes, rotaciones
-- de responsables y acceso solo para miembros con cuenta.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.rol_app as enum ('admin', 'editor', 'miembro');
create type public.estado_evento as enum ('programado', 'modificado', 'cancelado');
create type public.tipo_regla as enum ('semanal', 'mensual_dia', 'mensual_ordinal');

-- ---------- Perfiles (1:1 con auth.users) ----------
create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  rol         public.rol_app not null default 'miembro',
  created_at  timestamptz not null default now()
);

-- ---------- Miembros de la congregación ----------
-- Un miembro puede existir sin cuenta; cuando se registra con el mismo
-- correo, se vincula solo (ver trigger handle_new_user).
create table public.miembros (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  email       text unique,
  telefono    text,
  perfil_id   uuid unique references public.perfiles (id) on delete set null,
  activo      boolean not null default true,
  notas       text,
  created_at  timestamptz not null default now()
);

-- ---------- Roles / funciones dentro de una actividad ----------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  descripcion text
);

-- ---------- Tipos de actividad ----------
create table public.actividades (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  color         text not null default '#64748b',
  descripcion   text,
  es_especial   boolean not null default false,   -- aniversarios, eventos únicos
  duracion_min  integer,
  created_at    timestamptz not null default now()
);

-- ---------- Rotaciones de responsables ----------
create table public.rotaciones (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique,
  rol_id       uuid not null references public.roles (id),
  fecha_ancla  date not null,          -- la primera ocurrencia en/tras esta fecha es el turno 0
  created_at   timestamptz not null default now()
);

create table public.rotacion_turnos (
  id           uuid primary key default gen_random_uuid(),
  rotacion_id  uuid not null references public.rotaciones (id) on delete cascade,
  posicion     integer not null check (posicion >= 0),
  etiqueta     text,                   -- "Horeb y Eva"
  unique (rotacion_id, posicion)
);

create table public.rotacion_turno_miembros (
  turno_id   uuid not null references public.rotacion_turnos (id) on delete cascade,
  miembro_id uuid not null references public.miembros (id) on delete cascade,
  primary key (turno_id, miembro_id)
);

-- ---------- Reglas recurrentes ----------
-- semanal:         dia_semana (1=lunes … 7=domingo), cada intervalo_semanas
-- mensual_dia:     dia_mes (1–31)
-- mensual_ordinal: dia_semana + ordinal (1–5, o -1 = último del mes)
create table public.reglas (
  id                      uuid primary key default gen_random_uuid(),
  actividad_id            uuid not null references public.actividades (id) on delete cascade,
  tipo                    public.tipo_regla not null,
  dia_semana              smallint check (dia_semana between 1 and 7),
  intervalo_semanas       smallint not null default 1 check (intervalo_semanas >= 1),
  dia_mes                 smallint check (dia_mes between 1 and 31),
  ordinal                 smallint check (ordinal in (-1, 1, 2, 3, 4, 5)),
  hora                    time,
  vigente_desde           date not null,
  vigente_hasta           date,
  rotacion_id             uuid references public.rotaciones (id) on delete set null,
  reemplaza_actividad_id  uuid references public.actividades (id) on delete set null,
  activa                  boolean not null default true,
  created_at              timestamptz not null default now(),
  check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  check (
    (tipo = 'semanal'         and dia_semana is not null) or
    (tipo = 'mensual_dia'     and dia_mes    is not null) or
    (tipo = 'mensual_ordinal' and dia_semana is not null and ordinal is not null)
  )
);

-- ---------- Eventos concretos ----------
create table public.eventos (
  id            uuid primary key default gen_random_uuid(),
  actividad_id  uuid not null references public.actividades (id) on delete restrict,
  regla_id      uuid references public.reglas (id) on delete set null,  -- null = evento manual/importado
  fecha         date not null,
  hora          time,
  titulo        text,                  -- sobrescribe el nombre de la actividad ("Dominical de visitas")
  notas         text,
  estado        public.estado_evento not null default 'programado',
  created_by    uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index eventos_fecha_idx on public.eventos (fecha);
create index eventos_actividad_fecha_idx on public.eventos (actividad_id, fecha);

-- ---------- Asignaciones (quién hace qué en cada evento) ----------
create table public.asignaciones (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  miembro_id  uuid not null references public.miembros (id) on delete cascade,
  rol_id      uuid not null references public.roles (id),
  unique (evento_id, miembro_id, rol_id)
);
create index asignaciones_miembro_idx on public.asignaciones (miembro_id);

-- ============================================================
-- Helpers de permisos (security definer para evitar recursión RLS)
-- ============================================================
create or replace function public.rol_actual()
returns public.rol_app language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.es_miembro()
returns boolean language sql stable security definer set search_path = public as $$
  select public.rol_actual() is not null
$$;

create or replace function public.puede_editar()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() in ('admin', 'editor'), false)
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() = 'admin', false)
$$;

-- ============================================================
-- Alta automática de perfil + vínculo con miembro por correo
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)));

  update public.miembros
     set perfil_id = new.id
   where lower(email) = lower(new.email) and perfil_id is null;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS: leer = cualquier miembro con cuenta; escribir = admin/editor
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'miembros', 'roles', 'actividades', 'rotaciones', 'rotacion_turnos',
    'rotacion_turno_miembros', 'reglas', 'eventos', 'asignaciones'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_leer" on public.%I for select to authenticated using (public.es_miembro())', t, t);
    execute format('create policy "%s_insertar" on public.%I for insert to authenticated with check (public.puede_editar())', t, t);
    execute format('create policy "%s_editar" on public.%I for update to authenticated using (public.puede_editar()) with check (public.puede_editar())', t, t);
    execute format('create policy "%s_borrar" on public.%I for delete to authenticated using (public.puede_editar())', t, t);
  end loop;
end $$;

-- Perfiles: todos los miembros ven nombres; solo admin cambia roles.
alter table public.perfiles enable row level security;
create policy "perfiles_leer"  on public.perfiles for select to authenticated using (public.es_miembro());
create policy "perfiles_admin" on public.perfiles for update to authenticated using (public.es_admin()) with check (public.es_admin());
