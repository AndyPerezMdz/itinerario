-- TODO EN UNO: migraciones + seed. Pégalo completo en el SQL Editor y dale Run (una sola vez, en base vacía).

-- ===== migrations/20261025000001_esquema.sql =====
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

-- ===== migrations/20261025000002_generador.sql =====
-- ============================================================
-- Itinerario · Generador de eventos a partir de reglas
-- ============================================================

-- ¿La regla cae en esta fecha?
create or replace function public.regla_ocurre(r public.reglas, f date)
returns boolean language sql stable set search_path = public as $$
  select
    f >= r.vigente_desde
    and (r.vigente_hasta is null or f <= r.vigente_hasta)
    and case r.tipo
      when 'semanal' then
        extract(isodow from f)::int = r.dia_semana
        -- semanas transcurridas entre los lunes de vigente_desde y f
        and (((f - (extract(isodow from f)::int - 1))
              - (r.vigente_desde - (extract(isodow from r.vigente_desde)::int - 1))) / 7)
            % r.intervalo_semanas = 0
      when 'mensual_dia' then
        extract(day from f)::int = r.dia_mes
      when 'mensual_ordinal' then
        extract(isodow from f)::int = r.dia_semana
        and case
          when r.ordinal = -1 then extract(month from f + 7) <> extract(month from f)
          else (extract(day from f)::int - 1) / 7 + 1 = r.ordinal
        end
    end
$$;

-- Genera eventos (y asignaciones por rotación) para un rango de fechas.
-- Idempotente: no duplica si ya existe un evento de esa actividad ese día,
-- así que puedes correrlo las veces que quieras sin miedo.
-- Devuelve cuántos eventos creó.
create or replace function public.generar_eventos(p_desde date, p_hasta date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  f         date;
  r         public.reglas;
  v_evento  uuid;
  v_creados integer := 0;
  v_n       integer;
  v_pos     integer;
  v_rol     uuid;
  v_turno   uuid;
begin
  if not public.puede_editar() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_hasta < p_desde or p_hasta - p_desde > 400 then
    raise exception 'Rango inválido (máximo ~13 meses)';
  end if;

  for f in select d::date from generate_series(p_desde, p_hasta, interval '1 day') d loop
    for r in select * from public.reglas where activa order by created_at loop
      continue when not public.regla_ocurre(r, f);

      -- Otra regla activa reemplaza esta actividad ese día (p. ej. Servicio de niños → Servicio)
      continue when exists (
        select 1 from public.reglas o
         where o.activa and o.id <> r.id
           and o.reemplaza_actividad_id = r.actividad_id
           and public.regla_ocurre(o, f)
      );

      -- Ya existe (importado, manual o generado antes)
      continue when exists (
        select 1 from public.eventos e
         where e.actividad_id = r.actividad_id and e.fecha = f
      );

      insert into public.eventos (actividad_id, regla_id, fecha, hora)
      values (r.actividad_id, r.id, f, r.hora)
      returning id into v_evento;
      v_creados := v_creados + 1;

      -- Asignación por rotación: turno = (# ocurrencias desde la fecha ancla) mod (# turnos)
      if r.rotacion_id is not null then
        select count(*) into v_n from public.rotacion_turnos where rotacion_id = r.rotacion_id;
        if v_n > 0 then
          select ro.rol_id,
                 (select count(*)
                    from generate_series(ro.fecha_ancla, f - 1, interval '1 day') d
                   where public.regla_ocurre(r, d::date))::int % v_n
            into v_rol, v_pos
            from public.rotaciones ro
           where ro.id = r.rotacion_id;

          select id into v_turno
            from public.rotacion_turnos
           where rotacion_id = r.rotacion_id
           order by posicion
           offset v_pos limit 1;

          insert into public.asignaciones (evento_id, miembro_id, rol_id)
          select v_evento, tm.miembro_id, v_rol
            from public.rotacion_turno_miembros tm
           where tm.turno_id = v_turno
          on conflict do nothing;
        end if;
      end if;
    end loop;
  end loop;

  return v_creados;
end $$;

revoke all on function public.generar_eventos(date, date) from public, anon;
grant execute on function public.generar_eventos(date, date) to authenticated;

-- ===== seed.sql =====
-- Generado por scripts/generar_seed.py desde CALENDARIO_LLDM.xlsx
-- 368 eventos, 2026-10-01 a 2027-09-14. Reglas desde 2027-10-01.
begin;

insert into public.roles (nombre) values
  ('Fotografía'),
  ('Maestro(a) dominical'),
  ('Responsable')
on conflict (nombre) do nothing;

insert into public.actividades (nombre, color, es_especial) values
  ('100 años Guadalajara', '#64748b', true),
  ('Aniversario de la Restauración', '#64748b', true),
  ('Aniversario de vida', '#64748b', true),
  ('Asociación', '#64748b', true),
  ('Cultural', '#64748b', true),
  ('Dominical', '#7c3aed', false),
  ('Fotografía', '#db2777', false),
  ('Jornada de evangelización', '#16a34a', false),
  ('Lectura de carta', '#0d9488', false),
  ('Oración 5 a.m.', '#ca8a04', false),
  ('Recordación de la Iglesia', '#9333ea', false),
  ('Servicio', '#2563eb', false),
  ('Servicio de Año Nuevo', '#64748b', true),
  ('Servicio de niños', '#0ea5e9', false),
  ('Tema de capacitación', '#ea580c', false),
  ('Tema matrimonios', '#e11d48', false)
on conflict (nombre) do nothing;

insert into public.miembros (nombre) values
  ('Andrés'),
  ('Dina'),
  ('Eva'),
  ('Horeb'),
  ('Jael');

-- Eventos del Excel
with nuevos (fecha, actividad, titulo) as (values
  (date '2026-10-01', 'Oración 5 a.m.', null),
  (date '2026-10-01', 'Servicio', null),
  (date '2026-10-02', 'Tema de capacitación', null),
  (date '2026-10-03', 'Asociación', null),
  (date '2026-10-03', 'Jornada de evangelización', null),
  (date '2026-10-04', 'Dominical', null),
  (date '2026-10-04', 'Fotografía', null),
  (date '2026-10-04', 'Servicio', null),
  (date '2026-10-06', 'Lectura de carta', null),
  (date '2026-10-07', 'Tema matrimonios', null),
  (date '2026-10-08', 'Servicio', null),
  (date '2026-10-09', 'Tema de capacitación', null),
  (date '2026-10-10', 'Jornada de evangelización', null),
  (date '2026-10-11', 'Dominical', 'Dominical retirados'),
  (date '2026-10-11', 'Fotografía', null),
  (date '2026-10-11', 'Servicio', null),
  (date '2026-10-13', 'Lectura de carta', null),
  (date '2026-10-14', 'Recordación de la Iglesia', null),
  (date '2026-10-14', 'Tema matrimonios', null),
  (date '2026-10-15', 'Servicio', null),
  (date '2026-10-16', 'Tema de capacitación', null),
  (date '2026-10-17', 'Jornada de evangelización', null),
  (date '2026-10-18', 'Dominical', null),
  (date '2026-10-18', 'Fotografía', null),
  (date '2026-10-18', 'Servicio', null),
  (date '2026-10-20', 'Lectura de carta', null),
  (date '2026-10-21', 'Tema matrimonios', null),
  (date '2026-10-22', 'Servicio', null),
  (date '2026-10-23', 'Tema de capacitación', null),
  (date '2026-10-24', 'Jornada de evangelización', null),
  (date '2026-10-25', 'Dominical', null),
  (date '2026-10-25', 'Fotografía', null),
  (date '2026-10-25', 'Servicio', null),
  (date '2026-10-27', 'Lectura de carta', null),
  (date '2026-10-28', 'Tema matrimonios', null),
  (date '2026-10-29', 'Servicio de niños', null),
  (date '2026-10-30', 'Tema de capacitación', null),
  (date '2026-10-31', 'Jornada de evangelización', null),
  (date '2026-11-01', 'Dominical', null),
  (date '2026-11-01', 'Fotografía', null),
  (date '2026-11-01', 'Oración 5 a.m.', null),
  (date '2026-11-01', 'Servicio', null),
  (date '2026-11-03', 'Lectura de carta', null),
  (date '2026-11-04', 'Tema matrimonios', null),
  (date '2026-11-05', 'Servicio', null),
  (date '2026-11-06', 'Tema de capacitación', null),
  (date '2026-11-07', 'Jornada de evangelización', null),
  (date '2026-11-08', 'Dominical', 'Dominical de visitas'),
  (date '2026-11-08', 'Fotografía', null),
  (date '2026-11-08', 'Servicio', null),
  (date '2026-11-10', 'Lectura de carta', null),
  (date '2026-11-11', 'Tema matrimonios', null),
  (date '2026-11-12', 'Servicio', null),
  (date '2026-11-13', 'Tema de capacitación', null),
  (date '2026-11-14', 'Jornada de evangelización', null),
  (date '2026-11-14', 'Recordación de la Iglesia', null),
  (date '2026-11-15', 'Dominical', null),
  (date '2026-11-15', 'Fotografía', null),
  (date '2026-11-15', 'Servicio', null),
  (date '2026-11-17', 'Lectura de carta', null),
  (date '2026-11-18', 'Tema matrimonios', null),
  (date '2026-11-19', 'Servicio', null),
  (date '2026-11-20', 'Tema de capacitación', null),
  (date '2026-11-21', 'Jornada de evangelización', null),
  (date '2026-11-22', 'Cultural', null),
  (date '2026-11-22', 'Dominical', null),
  (date '2026-11-22', 'Fotografía', null),
  (date '2026-11-22', 'Servicio', null),
  (date '2026-11-24', 'Lectura de carta', null),
  (date '2026-11-25', 'Tema matrimonios', null),
  (date '2026-11-26', 'Servicio de niños', null),
  (date '2026-11-27', 'Tema de capacitación', null),
  (date '2026-11-28', 'Jornada de evangelización', null),
  (date '2026-11-29', 'Dominical', null),
  (date '2026-11-29', 'Fotografía', null),
  (date '2026-11-29', 'Servicio', null),
  (date '2026-12-01', 'Lectura de carta', null),
  (date '2026-12-01', 'Oración 5 a.m.', null),
  (date '2026-12-02', 'Tema matrimonios', null),
  (date '2026-12-03', 'Servicio', null),
  (date '2026-12-04', 'Tema de capacitación', null),
  (date '2026-12-05', 'Jornada de evangelización', null),
  (date '2026-12-06', 'Dominical', null),
  (date '2026-12-06', 'Fotografía', null),
  (date '2026-12-06', 'Servicio', null),
  (date '2026-12-08', 'Lectura de carta', null),
  (date '2026-12-09', 'Tema matrimonios', null),
  (date '2026-12-10', 'Servicio', null),
  (date '2026-12-11', 'Tema de capacitación', null),
  (date '2026-12-12', '100 años Guadalajara', null),
  (date '2026-12-12', 'Jornada de evangelización', null),
  (date '2026-12-13', 'Dominical', null),
  (date '2026-12-13', 'Fotografía', null),
  (date '2026-12-13', 'Servicio', null),
  (date '2026-12-14', 'Recordación de la Iglesia', null),
  (date '2026-12-15', 'Lectura de carta', null),
  (date '2026-12-16', 'Tema matrimonios', null),
  (date '2026-12-17', 'Servicio', null),
  (date '2026-12-18', 'Tema de capacitación', null),
  (date '2026-12-19', 'Jornada de evangelización', null),
  (date '2026-12-20', 'Dominical', null),
  (date '2026-12-20', 'Fotografía', null),
  (date '2026-12-20', 'Servicio', null),
  (date '2026-12-22', 'Lectura de carta', null),
  (date '2026-12-23', 'Tema matrimonios', null),
  (date '2026-12-24', 'Servicio', null),
  (date '2026-12-25', 'Tema de capacitación', null),
  (date '2026-12-26', 'Jornada de evangelización', null),
  (date '2026-12-27', 'Dominical', null),
  (date '2026-12-27', 'Fotografía', null),
  (date '2026-12-27', 'Servicio', null),
  (date '2026-12-29', 'Lectura de carta', null),
  (date '2026-12-30', 'Tema matrimonios', null),
  (date '2026-12-31', 'Servicio de Año Nuevo', null),
  (date '2027-01-01', 'Oración 5 a.m.', null),
  (date '2027-01-02', 'Jornada de evangelización', null),
  (date '2027-01-03', 'Dominical', null),
  (date '2027-01-03', 'Fotografía', null),
  (date '2027-01-03', 'Servicio', null),
  (date '2027-01-05', 'Lectura de carta', null),
  (date '2027-01-06', 'Tema matrimonios', null),
  (date '2027-01-07', 'Servicio', null),
  (date '2027-01-08', 'Tema de capacitación', null),
  (date '2027-01-09', 'Jornada de evangelización', null),
  (date '2027-01-10', 'Dominical', null),
  (date '2027-01-10', 'Fotografía', null),
  (date '2027-01-10', 'Servicio', null),
  (date '2027-01-12', 'Lectura de carta', null),
  (date '2027-01-13', 'Tema matrimonios', null),
  (date '2027-01-14', 'Recordación de la Iglesia', null),
  (date '2027-01-14', 'Servicio', null),
  (date '2027-01-15', 'Tema de capacitación', null),
  (date '2027-01-16', 'Jornada de evangelización', null),
  (date '2027-01-17', 'Dominical', null),
  (date '2027-01-17', 'Fotografía', null),
  (date '2027-01-17', 'Servicio', null),
  (date '2027-01-19', 'Lectura de carta', null),
  (date '2027-01-20', 'Tema matrimonios', null),
  (date '2027-01-21', 'Servicio', null),
  (date '2027-01-22', 'Tema de capacitación', null),
  (date '2027-01-23', 'Jornada de evangelización', null),
  (date '2027-01-24', 'Dominical', null),
  (date '2027-01-24', 'Fotografía', null),
  (date '2027-01-24', 'Servicio', null),
  (date '2027-01-26', 'Lectura de carta', null),
  (date '2027-01-27', 'Tema matrimonios', null),
  (date '2027-01-29', 'Tema de capacitación', null),
  (date '2027-01-30', 'Jornada de evangelización', null),
  (date '2027-01-31', 'Dominical', null),
  (date '2027-01-31', 'Fotografía', null),
  (date '2027-01-31', 'Servicio', null),
  (date '2027-02-01', 'Oración 5 a.m.', null),
  (date '2027-02-02', 'Lectura de carta', null),
  (date '2027-02-03', 'Tema matrimonios', null),
  (date '2027-02-04', 'Servicio', null),
  (date '2027-02-05', 'Tema de capacitación', null),
  (date '2027-02-07', 'Dominical', null),
  (date '2027-02-07', 'Fotografía', null),
  (date '2027-02-07', 'Servicio', null),
  (date '2027-02-09', 'Lectura de carta', null),
  (date '2027-02-10', 'Tema matrimonios', null),
  (date '2027-02-11', 'Servicio', null),
  (date '2027-02-12', 'Tema de capacitación', null),
  (date '2027-02-13', 'Jornada de evangelización', null),
  (date '2027-02-14', 'Dominical', null),
  (date '2027-02-14', 'Fotografía', null),
  (date '2027-02-14', 'Recordación de la Iglesia', null),
  (date '2027-02-14', 'Servicio', null),
  (date '2027-02-16', 'Lectura de carta', null),
  (date '2027-02-17', 'Tema matrimonios', null),
  (date '2027-02-18', 'Servicio', null),
  (date '2027-02-19', 'Tema de capacitación', null),
  (date '2027-02-20', 'Jornada de evangelización', null),
  (date '2027-02-21', 'Dominical', null),
  (date '2027-02-21', 'Fotografía', null),
  (date '2027-02-21', 'Servicio', null),
  (date '2027-02-23', 'Lectura de carta', null),
  (date '2027-02-24', 'Tema matrimonios', null),
  (date '2027-02-25', 'Servicio de niños', null),
  (date '2027-02-26', 'Tema de capacitación', null),
  (date '2027-02-27', 'Jornada de evangelización', null),
  (date '2027-02-28', 'Dominical', null),
  (date '2027-02-28', 'Fotografía', null),
  (date '2027-02-28', 'Servicio', null),
  (date '2027-03-01', 'Oración 5 a.m.', null),
  (date '2027-03-02', 'Lectura de carta', null),
  (date '2027-03-03', 'Tema matrimonios', null),
  (date '2027-03-04', 'Servicio', null),
  (date '2027-03-05', 'Tema de capacitación', null),
  (date '2027-03-06', 'Jornada de evangelización', null),
  (date '2027-03-07', 'Dominical', null),
  (date '2027-03-07', 'Fotografía', null),
  (date '2027-03-07', 'Servicio', null),
  (date '2027-03-09', 'Lectura de carta', null),
  (date '2027-03-10', 'Tema matrimonios', null),
  (date '2027-03-11', 'Servicio', null),
  (date '2027-03-12', 'Tema de capacitación', null),
  (date '2027-03-13', 'Jornada de evangelización', null),
  (date '2027-03-14', 'Dominical', null),
  (date '2027-03-14', 'Fotografía', null),
  (date '2027-03-14', 'Recordación de la Iglesia', null),
  (date '2027-03-14', 'Servicio', null),
  (date '2027-03-16', 'Lectura de carta', null),
  (date '2027-03-17', 'Tema matrimonios', null),
  (date '2027-03-18', 'Servicio', null),
  (date '2027-03-19', 'Tema de capacitación', null),
  (date '2027-03-20', 'Jornada de evangelización', null),
  (date '2027-03-21', 'Dominical', null),
  (date '2027-03-21', 'Fotografía', null),
  (date '2027-03-21', 'Servicio', null),
  (date '2027-03-23', 'Lectura de carta', null),
  (date '2027-03-24', 'Tema matrimonios', null),
  (date '2027-03-25', 'Servicio de niños', null),
  (date '2027-03-26', 'Tema de capacitación', null),
  (date '2027-03-27', 'Jornada de evangelización', null),
  (date '2027-03-28', 'Dominical', null),
  (date '2027-03-28', 'Fotografía', null),
  (date '2027-03-28', 'Servicio', null),
  (date '2027-03-30', 'Lectura de carta', null),
  (date '2027-03-31', 'Tema matrimonios', null),
  (date '2027-04-01', 'Oración 5 a.m.', null),
  (date '2027-04-01', 'Servicio', null),
  (date '2027-04-02', 'Tema de capacitación', null),
  (date '2027-04-03', 'Jornada de evangelización', null),
  (date '2027-04-04', 'Dominical', null),
  (date '2027-04-04', 'Fotografía', null),
  (date '2027-04-04', 'Servicio', null),
  (date '2027-04-06', 'Aniversario de la Restauración', null),
  (date '2027-04-06', 'Lectura de carta', null),
  (date '2027-04-07', 'Tema matrimonios', null),
  (date '2027-04-08', 'Servicio', null),
  (date '2027-04-09', 'Tema de capacitación', null),
  (date '2027-04-10', 'Jornada de evangelización', null),
  (date '2027-04-11', 'Dominical', null),
  (date '2027-04-11', 'Fotografía', null),
  (date '2027-04-11', 'Servicio', null),
  (date '2027-04-13', 'Lectura de carta', null),
  (date '2027-04-14', 'Recordación de la Iglesia', null),
  (date '2027-04-14', 'Tema matrimonios', null),
  (date '2027-04-15', 'Servicio', null),
  (date '2027-04-16', 'Tema de capacitación', null),
  (date '2027-04-17', 'Jornada de evangelización', null),
  (date '2027-04-18', 'Dominical', null),
  (date '2027-04-18', 'Fotografía', null),
  (date '2027-04-18', 'Servicio', null),
  (date '2027-04-20', 'Lectura de carta', null),
  (date '2027-04-21', 'Tema matrimonios', null),
  (date '2027-04-22', 'Servicio', null),
  (date '2027-04-23', 'Tema de capacitación', null),
  (date '2027-04-24', 'Jornada de evangelización', null),
  (date '2027-04-25', 'Dominical', null),
  (date '2027-04-25', 'Fotografía', null),
  (date '2027-04-25', 'Servicio', null),
  (date '2027-04-27', 'Lectura de carta', null),
  (date '2027-04-28', 'Tema matrimonios', null),
  (date '2027-04-29', 'Servicio de niños', null),
  (date '2027-05-01', 'Jornada de evangelización', null),
  (date '2027-05-01', 'Oración 5 a.m.', null),
  (date '2027-05-02', 'Dominical', null),
  (date '2027-05-02', 'Fotografía', null),
  (date '2027-05-02', 'Servicio', null),
  (date '2027-05-04', 'Lectura de carta', null),
  (date '2027-05-05', 'Tema matrimonios', null),
  (date '2027-05-06', 'Servicio', null),
  (date '2027-05-07', 'Aniversario de vida', null),
  (date '2027-05-07', 'Tema de capacitación', null),
  (date '2027-05-08', 'Jornada de evangelización', null),
  (date '2027-05-09', 'Dominical', null),
  (date '2027-05-09', 'Fotografía', null),
  (date '2027-05-09', 'Servicio', null),
  (date '2027-05-11', 'Lectura de carta', null),
  (date '2027-05-12', 'Tema matrimonios', null),
  (date '2027-05-13', 'Servicio', null),
  (date '2027-05-14', 'Recordación de la Iglesia', null),
  (date '2027-05-14', 'Tema de capacitación', null),
  (date '2027-05-15', 'Jornada de evangelización', null),
  (date '2027-05-16', 'Dominical', null),
  (date '2027-05-16', 'Fotografía', null),
  (date '2027-05-16', 'Servicio', null),
  (date '2027-05-18', 'Lectura de carta', null),
  (date '2027-05-19', 'Tema matrimonios', null),
  (date '2027-05-20', 'Servicio', null),
  (date '2027-05-21', 'Tema de capacitación', null),
  (date '2027-05-22', 'Jornada de evangelización', null),
  (date '2027-05-23', 'Dominical', null),
  (date '2027-05-23', 'Fotografía', null),
  (date '2027-05-23', 'Servicio', null),
  (date '2027-05-25', 'Lectura de carta', null),
  (date '2027-05-26', 'Tema matrimonios', null),
  (date '2027-05-27', 'Servicio de niños', null),
  (date '2027-05-28', 'Tema de capacitación', null),
  (date '2027-05-29', 'Jornada de evangelización', null),
  (date '2027-05-30', 'Dominical', null),
  (date '2027-05-30', 'Fotografía', null),
  (date '2027-05-30', 'Servicio', null),
  (date '2027-06-01', 'Lectura de carta', null),
  (date '2027-06-01', 'Oración 5 a.m.', null),
  (date '2027-06-02', 'Tema matrimonios', null),
  (date '2027-06-03', 'Servicio', null),
  (date '2027-06-04', 'Tema de capacitación', null),
  (date '2027-06-05', 'Jornada de evangelización', null),
  (date '2027-06-06', 'Dominical', null),
  (date '2027-06-06', 'Fotografía', null),
  (date '2027-06-06', 'Servicio', null),
  (date '2027-06-08', 'Lectura de carta', null),
  (date '2027-06-09', 'Tema matrimonios', null),
  (date '2027-06-10', 'Servicio', null),
  (date '2027-06-11', 'Tema de capacitación', null),
  (date '2027-06-12', 'Jornada de evangelización', null),
  (date '2027-06-13', 'Dominical', null),
  (date '2027-06-13', 'Fotografía', null),
  (date '2027-06-13', 'Servicio', null),
  (date '2027-06-14', 'Recordación de la Iglesia', null),
  (date '2027-06-15', 'Lectura de carta', null),
  (date '2027-06-16', 'Tema matrimonios', null),
  (date '2027-06-17', 'Servicio', null),
  (date '2027-06-18', 'Tema de capacitación', null),
  (date '2027-06-19', 'Jornada de evangelización', null),
  (date '2027-06-20', 'Dominical', null),
  (date '2027-06-20', 'Fotografía', null),
  (date '2027-06-20', 'Servicio', null),
  (date '2027-06-22', 'Lectura de carta', null),
  (date '2027-06-23', 'Tema matrimonios', null),
  (date '2027-06-24', 'Servicio de niños', null),
  (date '2027-06-25', 'Tema de capacitación', null),
  (date '2027-06-26', 'Jornada de evangelización', null),
  (date '2027-06-27', 'Dominical', null),
  (date '2027-06-27', 'Fotografía', null),
  (date '2027-06-27', 'Servicio', null),
  (date '2027-06-29', 'Lectura de carta', null),
  (date '2027-06-30', 'Tema matrimonios', null),
  (date '2027-07-01', 'Oración 5 a.m.', null),
  (date '2027-07-01', 'Servicio', null),
  (date '2027-07-02', 'Tema de capacitación', null),
  (date '2027-07-03', 'Jornada de evangelización', null),
  (date '2027-07-04', 'Dominical', null),
  (date '2027-07-04', 'Fotografía', null),
  (date '2027-07-04', 'Servicio', null),
  (date '2027-07-06', 'Lectura de carta', null),
  (date '2027-07-07', 'Tema matrimonios', null),
  (date '2027-07-08', 'Servicio', null),
  (date '2027-07-09', 'Tema de capacitación', null),
  (date '2027-07-10', 'Jornada de evangelización', null),
  (date '2027-07-11', 'Dominical', null),
  (date '2027-07-11', 'Fotografía', null),
  (date '2027-07-11', 'Servicio', null),
  (date '2027-07-12', 'Recordación de la Iglesia', null),
  (date '2027-07-13', 'Lectura de carta', null),
  (date '2027-07-14', 'Tema matrimonios', null),
  (date '2027-07-15', 'Servicio', null),
  (date '2027-07-16', 'Tema de capacitación', null),
  (date '2027-07-17', 'Jornada de evangelización', null),
  (date '2027-07-18', 'Dominical', null),
  (date '2027-07-18', 'Fotografía', null),
  (date '2027-07-18', 'Servicio', null),
  (date '2027-07-20', 'Lectura de carta', null),
  (date '2027-07-21', 'Tema matrimonios', null),
  (date '2027-07-22', 'Servicio de niños', null),
  (date '2027-07-23', 'Tema de capacitación', null),
  (date '2027-07-24', 'Jornada de evangelización', null),
  (date '2027-07-25', 'Dominical', null),
  (date '2027-07-25', 'Fotografía', null),
  (date '2027-07-25', 'Servicio', null),
  (date '2027-07-27', 'Lectura de carta', null),
  (date '2027-07-28', 'Tema matrimonios', null),
  (date '2027-08-01', 'Oración 5 a.m.', null),
  (date '2027-09-01', 'Oración 5 a.m.', null),
  (date '2027-09-14', 'Recordación de la Iglesia', null)
)
insert into public.eventos (actividad_id, fecha, titulo, created_by)
select a.id, n.fecha, n.titulo, null from nuevos n join public.actividades a on a.nombre = n.actividad;

with asig (fecha, actividad, miembro, rol) as (values
  (date '2026-10-04', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2026-10-04', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-10-04', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-10-04', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-10-11', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-10-11', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-10-11', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-10-18', 'Dominical', 'Andrés', 'Maestro(a) dominical'),
  (date '2026-10-18', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-10-18', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-10-18', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-10-25', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2026-10-25', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-10-25', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-10-25', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-11-01', 'Dominical', 'Andrés', 'Maestro(a) dominical'),
  (date '2026-11-01', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-11-01', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-11-01', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-11-08', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2026-11-08', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-11-08', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-11-08', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-11-15', 'Dominical', 'Andrés', 'Maestro(a) dominical'),
  (date '2026-11-15', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-11-15', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-11-15', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-11-22', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2026-11-22', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-11-22', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-11-22', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-11-29', 'Dominical', 'Andrés', 'Maestro(a) dominical'),
  (date '2026-11-29', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-11-29', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-11-29', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-12-06', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2026-12-06', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-12-06', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-12-06', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-12-13', 'Dominical', 'Andrés', 'Maestro(a) dominical'),
  (date '2026-12-13', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-12-13', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-12-13', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-12-20', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2026-12-20', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-12-20', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-12-20', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2026-12-27', 'Dominical', 'Andrés', 'Maestro(a) dominical'),
  (date '2026-12-27', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2026-12-27', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2026-12-27', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-01-03', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-01-03', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-01-03', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-01-03', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-01-10', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-01-10', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-01-10', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-01-10', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-01-17', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-01-17', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-01-17', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-01-17', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-01-24', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-01-24', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-01-24', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-01-24', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-01-31', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-01-31', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-01-31', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-01-31', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-02-07', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-02-07', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-02-07', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-02-07', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-02-14', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-02-14', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-02-14', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-02-14', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-02-21', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-02-21', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-02-21', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-02-21', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-02-28', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-02-28', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-02-28', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-02-28', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-03-07', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-03-07', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-03-07', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-03-07', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-03-14', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-03-14', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-03-14', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-03-14', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-03-21', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-03-21', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-03-21', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-03-21', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-03-28', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-03-28', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-03-28', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-03-28', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-04-04', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-04-04', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-04-04', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-04-04', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-04-11', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-04-11', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-04-11', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-04-11', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-04-18', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-04-18', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-04-18', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-04-18', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-04-25', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-04-25', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-04-25', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-04-25', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-05-02', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-05-02', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-05-02', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-05-02', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-05-09', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-05-09', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-05-09', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-05-09', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-05-16', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-05-16', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-05-16', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-05-16', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-05-23', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-05-23', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-05-23', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-05-23', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-05-30', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-05-30', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-05-30', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-05-30', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-06-06', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-06-06', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-06-06', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-06-06', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-06-13', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-06-13', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-06-13', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-06-13', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-06-20', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-06-20', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-06-20', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-06-20', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-06-27', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-06-27', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-06-27', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-06-27', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-07-04', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-07-04', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-07-04', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-07-04', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-07-11', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-07-11', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-07-11', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-07-11', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-07-18', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-07-18', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-07-18', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-07-18', 'Fotografía', 'Jael', 'Fotografía'),
  (date '2027-07-25', 'Dominical', 'Horeb', 'Maestro(a) dominical'),
  (date '2027-07-25', 'Dominical', 'Eva', 'Maestro(a) dominical'),
  (date '2027-07-25', 'Fotografía', 'Dina', 'Fotografía'),
  (date '2027-07-25', 'Fotografía', 'Jael', 'Fotografía')
)
insert into public.asignaciones (evento_id, miembro_id, rol_id)
select e.id, m.id, r.id from asig s
  join public.actividades a on a.nombre = s.actividad
  join public.eventos e on e.actividad_id = a.id and e.fecha = s.fecha
  join public.miembros m on m.nombre = s.miembro
  join public.roles r on r.nombre = s.rol
on conflict do nothing;

-- Rotaciones (ajústalas desde el panel cuando cambien los turnos)
insert into public.rotaciones (nombre, rol_id, fecha_ancla)
select 'Dominical', id, date '2027-10-01' from public.roles where nombre = 'Maestro(a) dominical';
insert into public.rotacion_turnos (rotacion_id, posicion, etiqueta)
select id, 0, 'Horeb y Eva' from public.rotaciones where nombre = 'Dominical';
insert into public.rotacion_turno_miembros (turno_id, miembro_id)
select t.id, m.id from public.rotacion_turnos t join public.rotaciones r on r.id = t.rotacion_id
  join public.miembros m on m.nombre in ('Horeb', 'Eva')
 where r.nombre = 'Dominical' and t.posicion = 0;

insert into public.rotaciones (nombre, rol_id, fecha_ancla)
select 'Fotografía', id, date '2027-10-01' from public.roles where nombre = 'Fotografía';
insert into public.rotacion_turnos (rotacion_id, posicion, etiqueta)
select id, 0, 'Dina y Jael' from public.rotaciones where nombre = 'Fotografía';
insert into public.rotacion_turno_miembros (turno_id, miembro_id)
select t.id, m.id from public.rotacion_turnos t join public.rotaciones r on r.id = t.rotacion_id
  join public.miembros m on m.nombre in ('Dina', 'Jael')
 where r.nombre = 'Fotografía' and t.posicion = 0;

-- Reglas recurrentes (arrancan después del Excel)
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Lectura de carta'), 'semanal'::public.tipo_regla, 2, null, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Tema matrimonios'), 'semanal'::public.tipo_regla, 3, null, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Servicio'), 'semanal'::public.tipo_regla, 4, null, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Tema de capacitación'), 'semanal'::public.tipo_regla, 5, null, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Jornada de evangelización'), 'semanal'::public.tipo_regla, 6, null, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Dominical'), 'semanal'::public.tipo_regla, 7, null, null, null::time, date '2027-10-01', (select id from public.rotaciones where nombre = 'Dominical'), null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Fotografía'), 'semanal'::public.tipo_regla, 7, null, null, null::time, date '2027-10-01', (select id from public.rotaciones where nombre = 'Fotografía'), null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Servicio'), 'semanal'::public.tipo_regla, 7, null, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Oración 5 a.m.'), 'mensual_dia'::public.tipo_regla, null, 1, null, '05:00'::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Recordación de la Iglesia'), 'mensual_dia'::public.tipo_regla, null, 14, null, null::time, date '2027-10-01', null::uuid, null::uuid;
insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)
select (select id from public.actividades where nombre = 'Servicio de niños'), 'mensual_ordinal'::public.tipo_regla, 4, null, -1, null::time, date '2027-10-01', null::uuid, (select id from public.actividades where nombre = 'Servicio');

commit;
