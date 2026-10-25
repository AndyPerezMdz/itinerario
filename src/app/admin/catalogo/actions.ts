"use server";

import { revalidatePath } from "next/cache";
import { clienteEditor, intentar, type Resultado, ok, opt, txt } from "@/lib/forms";

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
    const { error } = await supabase.from("roles").delete().eq("id", txt(fd, "id"));
    if (error?.code === "23503") throw new Error("Ese rol tiene turnos asignados, así que no se puede borrar. Si solo está mal el nombre, cámbialo y dale Guardar.");
    ok(error);
    refrescar();
  }, "Rol borrado.");
}
