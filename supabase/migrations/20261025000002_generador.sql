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
