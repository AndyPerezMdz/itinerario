"use server";

import { revalidatePath } from "next/cache";
import { clienteEditor, intentar, ok, opt, Pregunta, type Resultado, txt } from "@/lib/forms";
import { hoyISO } from "@/lib/fechas";

const refrescar = () => {
  revalidatePath("/admin/catalogo");
  revalidatePath("/");
};

export async function guardarActividad(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const nombre = txt(fd, "nombre");
    if (!nombre) throw new Error("Escribe el nombre de la actividad.");
    const color = /^#[0-9a-f]{6}$/i.test(txt(fd, "color")) ? txt(fd, "color") : "#64748b";
    const fila = { nombre, color, es_especial: fd.get("es_especial") === "on", descripcion: opt(fd, "descripcion") };

    const { error } = id
      ? await supabase.from("actividades").update(fila).eq("id", id)
      : await supabase.from("actividades").insert(fila);
    ok(error);
    refrescar();
  }, "Actividad guardada.");
}

export async function borrarActividad(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { error } = await supabase.from("actividades").delete().eq("id", txt(fd, "id"));
    if (error?.code === "23503") throw new Error("Esa actividad tiene eventos. Bórralos primero o déjala como está.");
    ok(error);
    refrescar();
  }, "Actividad borrada.");
}

export async function guardarRol(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const nombre = txt(fd, "nombre");
    if (!nombre) throw new Error("Escribe el nombre del rol.");
    const fila = { nombre, descripcion: opt(fd, "descripcion") };
    const { error } = id
      ? await supabase.from("roles").update(fila).eq("id", id)
      : await supabase.from("roles").insert(fila);
    ok(error);
    refrescar();
  }, "Rol guardado.");
}

export async function borrarRol(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const decision = txt(fd, "decision");

    const [{ data: rol }, total, futuros, rotaciones] = await Promise.all([
      supabase.from("roles").select("nombre").eq("id", id).single(),
      supabase.from("asignaciones").select("id", { count: "exact", head: true }).eq("rol_id", id),
      supabase.from("asignaciones").select("id, evento:eventos!inner(fecha)", { count: "exact", head: true })
        .eq("rol_id", id).gte("evento.fecha", hoyISO()),
      supabase.from("rotaciones").select("nombre").eq("rol_id", id),
    ]);
    if (!rol) throw new Error("Ese rol ya no existe.");

    const n = total.count ?? 0;
    const f = futuros.count ?? 0;
    const rots = (rotaciones.data ?? []).map((r) => r.nombre);

    if (decision !== "borrar") {
      const partes: string[] = [];
      if (n) partes.push(`${n} ${n === 1 ? "turno" : "turnos"} en el calendario (${n - f} pasados y ${f} próximos)`);
      if (rots.length) partes.push(`${rots.length === 1 ? "la rotación" : "las rotaciones"} ${rots.map((r) => `“${r}”`).join(", ")}`);
      throw new Pregunta({
        titulo: partes.length ? `“${rol.nombre}” está en uso` : `¿Borrar el rol “${rol.nombre}”?`,
        detalle: partes.length
          ? `Tiene ${partes.join(" y ")}. Si lo borras, se borra todo eso también. Si solo está mal el nombre, mejor cámbialo.`
          : "Nadie lo usa, así que no se pierde nada.",
        campo: "decision",
        opciones: [{ valor: "borrar", texto: partes.length ? "Borrar todo" : "Sí, borrar", peligro: true }],
      });
    }

    // Orden: turnos → rotaciones (sus turnos se van en cascada) → rol
    ok((await supabase.from("asignaciones").delete().eq("rol_id", id)).error);
    ok((await supabase.from("rotaciones").delete().eq("rol_id", id)).error);
    ok((await supabase.from("roles").delete().eq("id", id)).error);
    refrescar();
    revalidatePath("/admin/rotaciones");
  }, "Rol borrado.");
}
