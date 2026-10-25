"""
Convierte CALENDARIO_LLDM.xlsx en supabase/seed.sql.

Uso:
    pip install openpyxl
    python scripts/generar_seed.py ruta/CALENDARIO_LLDM.xlsx > supabase/seed.sql

- Importa cada celda como evento concreto (con su fecha real), así que el
  año del Excel queda idéntico.
- Separa responsables: "DOMINICAL (HOREB Y EVA)" -> Dominical + Horeb, Eva.
- Crea reglas recurrentes que arrancan DESPUÉS del último mes del Excel,
  para que "Generar" no pise lo importado.
"""
import re
import sys
import datetime as dt
from collections import Counter, defaultdict

from extraer import extraer

# Texto del Excel (normalizado) -> nombre bonito de la actividad
NOMBRES = {
    "ORACIÓN 5 A.M.": "Oración 5 a.m.",
    "TEMA DE CAPACITACIÓN": "Tema de capacitación",
    "ASOCIACION": "Asociación",
    "JORNADA DE EVANDELIZACION": "Jornada de evangelización",
    "SERVICIO": "Servicio",
    "SERVICIO DE NIÑOS": "Servicio de niños",
    "SERVICIO AÑO NUEVO": "Servicio de Año Nuevo",
    "LECTURA CARTA": "Lectura de carta",
    "TEMA MATRIMONIOS": "Tema matrimonios",
    "RECORDACIÓN DE LA IGLESIA": "Recordación de la Iglesia",
    "CULTURAL": "Cultural",
    "100 AÑOS GUADALAJARA": "100 años Guadalajara",
    "ANIVERSARIO DE LA RESTAURACIÓN": "Aniversario de la Restauración",
    "ANIVERSARIO DE VIDA": "Aniversario de vida",
    "DOMINICAL": "Dominical",
    "FOTOGRAFÍA": "Fotografía",
}
COLORES = {
    "Servicio": "#2563eb", "Servicio de niños": "#0ea5e9", "Dominical": "#7c3aed",
    "Fotografía": "#db2777", "Jornada de evangelización": "#16a34a",
    "Tema de capacitación": "#ea580c", "Lectura de carta": "#0d9488",
    "Tema matrimonios": "#e11d48", "Oración 5 a.m.": "#ca8a04",
    "Recordación de la Iglesia": "#9333ea",
}
# Actividad -> rol que desempeñan las personas entre paréntesis
ROL_POR_ACTIVIDAD = {"Dominical": "Maestro(a) dominical", "Fotografía": "Fotografía"}


def bonito(s: str) -> str:
    s = s.strip().lower()
    return s[:1].upper() + s[1:]


def parsear(texto: str):
    """-> (actividad, titulo|None, [personas])"""
    m = re.match(r"^FOTOGRAF[IÍ]A\s+(.+)$", texto)
    if m:
        return "Fotografía", None, personas(m.group(1))
    m = re.match(r"^(.*?)\s*\((.+)\)\s*$", texto)
    base, gente = (m.group(1).strip(), personas(m.group(2))) if m else (texto, [])
    if base.startswith("DOMINICAL"):
        titulo = None if base == "DOMINICAL" else bonito(base)
        return "Dominical", titulo, gente
    return NOMBRES.get(base, bonito(base)), None, gente


def personas(s: str):
    return [bonito(p).replace("Andres", "Andrés") for p in re.split(r"\s+Y\s+|,", s) if p.strip()]


def q(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def main(path):
    eventos = extraer(path)
    parsed = [(f, *parsear(t)) for f, t in eventos]

    conteo = Counter(a for _, a, _, _ in parsed)
    actividades = sorted(conteo)
    miembros = sorted({p for *_, gente in parsed for p in gente})
    roles = sorted(set(ROL_POR_ACTIVIDAD.values()) | {"Responsable"})
    ultimo = max(f for f, *_ in parsed)
    inicio_reglas = (ultimo.replace(day=1) + dt.timedelta(days=32)).replace(day=1)

    out = []
    w = out.append
    w("-- Generado por scripts/generar_seed.py desde CALENDARIO_LLDM.xlsx")
    w(f"-- {len(parsed)} eventos, {parsed[0][0]} a {ultimo}. Reglas desde {inicio_reglas}.")
    w("begin;\n")

    w("insert into public.roles (nombre) values")
    w(",\n".join(f"  ({q(r)})" for r in roles) + "\non conflict (nombre) do nothing;\n")

    w("insert into public.actividades (nombre, color, es_especial) values")
    w(",\n".join(
        f"  ({q(a)}, {q(COLORES.get(a, '#64748b'))}, {'true' if conteo[a] <= 2 else 'false'})"
        for a in actividades) + "\non conflict (nombre) do nothing;\n")

    w("insert into public.miembros (nombre) values")
    w(",\n".join(f"  ({q(m)})" for m in miembros) + ";\n")

    # Eventos importados + asignaciones
    w("-- Eventos del Excel")
    w("with nuevos (fecha, actividad, titulo) as (values")
    w(",\n".join(f"  (date {q(f)}, {q(a)}, {q(t)})" for f, a, t, _ in parsed))
    w(")\ninsert into public.eventos (actividad_id, fecha, titulo, created_by)")
    w("select a.id, n.fecha, n.titulo, null from nuevos n join public.actividades a on a.nombre = n.actividad;\n")

    asig = [(f, a, p) for f, a, _, gente in parsed for p in gente]
    if asig:
        w("with asig (fecha, actividad, miembro, rol) as (values")
        w(",\n".join(
            f"  (date {q(f)}, {q(a)}, {q(p)}, {q(ROL_POR_ACTIVIDAD.get(a, 'Responsable'))})"
            for f, a, p in asig))
        w(")\ninsert into public.asignaciones (evento_id, miembro_id, rol_id)")
        w("select e.id, m.id, r.id from asig s")
        w("  join public.actividades a on a.nombre = s.actividad")
        w("  join public.eventos e on e.actividad_id = a.id and e.fecha = s.fecha")
        w("  join public.miembros m on m.nombre = s.miembro")
        w("  join public.roles r on r.nombre = s.rol")
        w("on conflict do nothing;\n")
        w("-- Lo que cada quien hace según el Excel queda como su rol (requiere migración 0003)")
        w("insert into public.miembro_roles (miembro_id, rol_id)")
        w("select distinct miembro_id, rol_id from public.asignaciones on conflict do nothing;\n")

    # Rotaciones fijas detectadas (el turno más frecuente en el último tramo)
    w("-- Rotaciones (ajústalas desde el panel cuando cambien los turnos)")
    for act in ROL_POR_ACTIVIDAD:
        ultimos = [tuple(g) for f, a, t, g in parsed if a == act and g and t is None][-8:]
        if not ultimos:
            continue
        turno = Counter(ultimos).most_common(1)[0][0]
        nombre = f"{act}"
        w(f"insert into public.rotaciones (nombre, rol_id, fecha_ancla)")
        w(f"select {q(nombre)}, id, date {q(inicio_reglas)} from public.roles where nombre = {q(ROL_POR_ACTIVIDAD[act])};")
        w(f"insert into public.rotacion_turnos (rotacion_id, posicion, etiqueta)")
        w(f"select id, 0, {q(' y '.join(turno))} from public.rotaciones where nombre = {q(nombre)};")
        w(f"insert into public.rotacion_turno_miembros (turno_id, miembro_id)")
        w(f"select t.id, m.id from public.rotacion_turnos t join public.rotaciones r on r.id = t.rotacion_id")
        w(f"  join public.miembros m on m.nombre in ({', '.join(q(p) for p in turno)})")
        w(f" where r.nombre = {q(nombre)} and t.posicion = 0;\n")

    # Reglas recurrentes deducidas del patrón del Excel
    reglas = [
        # (actividad, tipo, dia_semana, dia_mes, ordinal, rotacion, reemplaza)
        ("Lectura de carta", "semanal", 2, None, None, None, None),
        ("Tema matrimonios", "semanal", 3, None, None, None, None),
        ("Servicio", "semanal", 4, None, None, None, None),
        ("Tema de capacitación", "semanal", 5, None, None, None, None),
        ("Jornada de evangelización", "semanal", 6, None, None, None, None),
        ("Dominical", "semanal", 7, None, None, "Dominical", None),
        ("Fotografía", "semanal", 7, None, None, "Fotografía", None),
        ("Servicio", "semanal", 7, None, None, None, None),
        ("Oración 5 a.m.", "mensual_dia", None, 1, None, None, None),
        ("Recordación de la Iglesia", "mensual_dia", None, 14, None, None, None),
        ("Servicio de niños", "mensual_ordinal", 4, None, -1, None, "Servicio"),
    ]
    w("-- Reglas recurrentes (arrancan después del Excel)")
    cols = "insert into public.reglas (actividad_id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, rotacion_id, reemplaza_actividad_id)\n"
    filas = []
    for act, tipo, dsem, dmes, ordn, rot, reem in reglas:
        hora = "'05:00'" if act.startswith("Oración") else "null"
        filas.append(
            cols + f"select (select id from public.actividades where nombre = {q(act)}), {q(tipo)}::public.tipo_regla, "
            f"{dsem or 'null'}, {dmes or 'null'}, {ordn or 'null'}, {hora}::time, date {q(inicio_reglas)}, "
            + (f"(select id from public.rotaciones where nombre = {q(rot)}), " if rot else "null::uuid, ")
            + (f"(select id from public.actividades where nombre = {q(reem)})" if reem else "null::uuid")
        )
    w(";\n".join(filas) + ";\n")
    w("commit;")
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1])
