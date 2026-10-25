-- Restaura el rol del Dominical, quién lo tiene, la rotación y TODOS los turnos del Dominical del Excel.
-- 85 turnos: Andrés 6, Eva 43, Horeb 36
-- Si quieres otro nombre para el rol, cámbialo aquí abajo (o después en Administrar → Actividades y roles).
begin;

-- 1) El rol
insert into roles (nombre) values ('Dominical') on conflict (nombre) do nothing;

-- 2) Quién lo tiene (Andrés, Eva y Horeb)
insert into miembro_roles (miembro_id, rol_id)
select m.id, r.id from miembros m, roles r
where m.nombre in ('Andrés', 'Eva', 'Horeb') and r.nombre = 'Dominical'
on conflict do nothing;

-- 3) Los turnos, tal cual el Excel
with excel (fecha, persona) as (values
  (date '2026-10-04', 'Horeb'),
  (date '2026-10-04', 'Eva'),
  (date '2026-10-11', 'Eva'),
  (date '2026-10-18', 'Andrés'),
  (date '2026-10-18', 'Eva'),
  (date '2026-10-25', 'Horeb'),
  (date '2026-10-25', 'Eva'),
  (date '2026-11-01', 'Andrés'),
  (date '2026-11-01', 'Eva'),
  (date '2026-11-08', 'Horeb'),
  (date '2026-11-08', 'Eva'),
  (date '2026-11-15', 'Andrés'),
  (date '2026-11-15', 'Eva'),
  (date '2026-11-22', 'Horeb'),
  (date '2026-11-22', 'Eva'),
  (date '2026-11-29', 'Andrés'),
  (date '2026-11-29', 'Eva'),
  (date '2026-12-06', 'Horeb'),
  (date '2026-12-06', 'Eva'),
  (date '2026-12-13', 'Andrés'),
  (date '2026-12-13', 'Eva'),
  (date '2026-12-20', 'Horeb'),
  (date '2026-12-20', 'Eva'),
  (date '2026-12-27', 'Andrés'),
  (date '2026-12-27', 'Eva'),
  (date '2027-01-03', 'Horeb'),
  (date '2027-01-03', 'Eva'),
  (date '2027-01-10', 'Horeb'),
  (date '2027-01-10', 'Eva'),
  (date '2027-01-17', 'Horeb'),
  (date '2027-01-17', 'Eva'),
  (date '2027-01-24', 'Horeb'),
  (date '2027-01-24', 'Eva'),
  (date '2027-01-31', 'Horeb'),
  (date '2027-01-31', 'Eva'),
  (date '2027-02-07', 'Horeb'),
  (date '2027-02-07', 'Eva'),
  (date '2027-02-14', 'Horeb'),
  (date '2027-02-14', 'Eva'),
  (date '2027-02-21', 'Horeb'),
  (date '2027-02-21', 'Eva'),
  (date '2027-02-28', 'Horeb'),
  (date '2027-02-28', 'Eva'),
  (date '2027-03-07', 'Horeb'),
  (date '2027-03-07', 'Eva'),
  (date '2027-03-14', 'Horeb'),
  (date '2027-03-14', 'Eva'),
  (date '2027-03-21', 'Horeb'),
  (date '2027-03-21', 'Eva'),
  (date '2027-03-28', 'Horeb'),
  (date '2027-03-28', 'Eva'),
  (date '2027-04-04', 'Horeb'),
  (date '2027-04-04', 'Eva'),
  (date '2027-04-11', 'Horeb'),
  (date '2027-04-11', 'Eva'),
  (date '2027-04-18', 'Horeb'),
  (date '2027-04-18', 'Eva'),
  (date '2027-04-25', 'Horeb'),
  (date '2027-04-25', 'Eva'),
  (date '2027-05-02', 'Horeb'),
  (date '2027-05-02', 'Eva'),
  (date '2027-05-09', 'Horeb'),
  (date '2027-05-09', 'Eva'),
  (date '2027-05-16', 'Horeb'),
  (date '2027-05-16', 'Eva'),
  (date '2027-05-23', 'Horeb'),
  (date '2027-05-23', 'Eva'),
  (date '2027-05-30', 'Horeb'),
  (date '2027-05-30', 'Eva'),
  (date '2027-06-06', 'Horeb'),
  (date '2027-06-06', 'Eva'),
  (date '2027-06-13', 'Horeb'),
  (date '2027-06-13', 'Eva'),
  (date '2027-06-20', 'Horeb'),
  (date '2027-06-20', 'Eva'),
  (date '2027-06-27', 'Horeb'),
  (date '2027-06-27', 'Eva'),
  (date '2027-07-04', 'Horeb'),
  (date '2027-07-04', 'Eva'),
  (date '2027-07-11', 'Horeb'),
  (date '2027-07-11', 'Eva'),
  (date '2027-07-18', 'Horeb'),
  (date '2027-07-18', 'Eva'),
  (date '2027-07-25', 'Horeb'),
  (date '2027-07-25', 'Eva')
)
insert into asignaciones (evento_id, miembro_id, rol_id)
select e.id, m.id, r.id
from excel x
join actividades a on a.nombre = 'Dominical'
join eventos e on e.actividad_id = a.id and e.fecha = x.fecha
join miembros m on m.nombre = x.persona
join roles r on r.nombre = 'Dominical'
on conflict do nothing;

-- 4) La rotación para los meses que genere la app (después del Excel): Horeb y Eva
insert into rotaciones (nombre, rol_id, fecha_ancla)
select 'Dominical', id, date '2027-10-01' from roles where nombre = 'Dominical'
on conflict (nombre) do nothing;
insert into rotacion_turnos (rotacion_id, posicion, etiqueta)
select id, 0, 'Horeb y Eva' from rotaciones where nombre = 'Dominical'
on conflict do nothing;
insert into rotacion_turno_miembros (turno_id, miembro_id)
select t.id, m.id from rotacion_turnos t
join rotaciones ro on ro.id = t.rotacion_id and ro.nombre = 'Dominical'
join miembros m on m.nombre in ('Horeb', 'Eva')
where t.posicion = 0
on conflict do nothing;
update reglas set rotacion_id = (select id from rotaciones where nombre = 'Dominical')
where actividad_id = (select id from actividades where nombre = 'Dominical') and rotacion_id is null;

commit;

-- Para revisar: cuántos turnos quedaron por persona
select m.nombre, count(*) turnos from asignaciones s
join miembros m on m.id = s.miembro_id join roles r on r.id = s.rol_id
where r.nombre = 'Dominical' group by 1 order by 1;
