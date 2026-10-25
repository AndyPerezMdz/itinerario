"use server";

import { revalidatePath } from "next/cache";
import { clienteEditor, ok, txt } from "@/lib/forms";

const refrescar = () => revalidatePath("/admin/rotaciones");

export async function crearRotacion(fd: FormData) {
  const supabase = await clienteEditor();
  const fila = { nombre: txt(fd, "nombre"), rol_id: txt(fd, "rol_id"), fecha_ancla: txt(fd, "fecha_ancla") };
  if (!fila.nombre || !fila.rol_id || !fila.fecha_ancla) throw new Error("Llena nombre, rol y fecha de inicio.");
  ok((await supabase.from("rotaciones").insert(fila)).error);
  refrescar();
}

export async function guardarRotacion(fd: FormData) {
  const supabase = await clienteEditor();
  ok((await supabase.from("rotaciones")
    .update({ nombre: txt(fd, "nombre"), rol_id: txt(fd, "rol_id"), fecha_ancla: txt(fd, "fecha_ancla") })
    .eq("id", txt(fd, "id"))).error);
  refrescar();
}

export async function borrarRotacion(fd: FormData) {
  const supabase = await clienteEditor();
  ok((await supabase.from("rotaciones").delete().eq("id", txt(fd, "id"))).error);
  refrescar();
}

/** Agrega un turno al final con las personas marcadas. */
export async function agregarTurno(fd: FormData) {
  const supabase = await clienteEditor();
  const rotacion_id = txt(fd, "rotacion_id");
  const miembros = fd.getAll("miembros").map(String).filter(Boolean);
  if (!miembros.length) throw new Error("Marca al menos a una persona para el turno.");

  const { data: ultimo } = await supabase
    .from("rotacion_turnos").select("posicion").eq("rotacion_id", rotacion_id)
    .order("posicion", { ascending: false }).limit(1).maybeSingle();

  const { data: nombres } = await supabase.from("miembros").select("nombre").in("id", miembros);
  const etiqueta = (nombres ?? []).map((n) => n.nombre).join(" y ");

  const { data: turno, error } = await supabase
    .from("rotacion_turnos")
    .insert({ rotacion_id, posicion: (ultimo?.posicion ?? -1) + 1, etiqueta })
    .select("id").single();
  ok(error);
  ok((await supabase.from("rotacion_turno_miembros").insert(miembros.map((miembro_id) => ({ turno_id: turno!.id, miembro_id })))).error);
  refrescar();
}

export async function quitarTurno(fd: FormData) {
  const supabase = await clienteEditor();
  const rotacion_id = txt(fd, "rotacion_id");
  ok((await supabase.from("rotacion_turnos").delete().eq("id", txt(fd, "id"))).error);

  // Re-numerar para que no queden huecos (0, 1, 2…)
  const { data: turnos } = await supabase
    .from("rotacion_turnos").select("id").eq("rotacion_id", rotacion_id).order("posicion");
  for (const [i, t] of (turnos ?? []).entries()) {
    ok((await supabase.from("rotacion_turnos").update({ posicion: 1000 + i }).eq("id", t.id)).error);
  }
  for (const [i, t] of (turnos ?? []).entries()) {
    ok((await supabase.from("rotacion_turnos").update({ posicion: i }).eq("id", t.id)).error);
  }
  refrescar();
}

/** Sube un turno una posición (intercambia con el de arriba). */
export async function subirTurno(fd: FormData) {
  const supabase = await clienteEditor();
  const rotacion_id = txt(fd, "rotacion_id");
  const id = txt(fd, "id");
  const { data: turnos } = await supabase
    .from("rotacion_turnos").select("id, posicion").eq("rotacion_id", rotacion_id).order("posicion");
  const i = (turnos ?? []).findIndex((t) => t.id === id);
  if (i <= 0) return;
  const a = turnos![i], b = turnos![i - 1];
  ok((await supabase.from("rotacion_turnos").update({ posicion: 99999 }).eq("id", a.id)).error);
  ok((await supabase.from("rotacion_turnos").update({ posicion: a.posicion }).eq("id", b.id)).error);
  ok((await supabase.from("rotacion_turnos").update({ posicion: b.posicion }).eq("id", a.id)).error);
  refrescar();
}
