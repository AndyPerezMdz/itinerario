"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteEditor, intentar, type Resultado, ok, opt, txt } from "@/lib/forms";

function datosEvento(fd: FormData) {
  const actividad_id = txt(fd, "actividad_id");
  const fecha = txt(fd, "fecha");
  if (!actividad_id) throw new Error("Elige la actividad.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("La fecha no es válida.");
  return {
    actividad_id,
    fecha,
    hora: opt(fd, "hora"),
    titulo: opt(fd, "titulo"),
    notas: opt(fd, "notas"),
  };
}

const volverAlMes = (fecha: string) => `/?mes=${fecha.slice(0, 7)}`;

export async function crearEvento(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const datos = datosEvento(fd);
    const { data, error } = await supabase.from("eventos").insert(datos).select("id").single();
    ok(error);
    revalidatePath("/");
    redirect(`/admin/eventos/${data!.id}?nuevo=1`);
  }, "Evento creado.");
}

export async function guardarEvento(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const estado = txt(fd, "estado") === "cancelado" ? "cancelado" : null;
    const { data: actual } = await supabase.from("eventos").select("regla_id").eq("id", id).single();

    const { error } = await supabase
      .from("eventos")
      .update({
        ...datosEvento(fd),
        // Si venía de una regla y lo tocaste, queda marcado como modificado
        estado: estado ?? (actual?.regla_id ? "modificado" : "programado"),
      })
      .eq("id", id);
    ok(error);
    revalidatePath("/");
    redirect(volverAlMes(txt(fd, "fecha")));
  }, "Evento guardado.");
}

export async function borrarEvento(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { error } = await supabase.from("eventos").delete().eq("id", txt(fd, "id"));
    ok(error);
    revalidatePath("/");
    redirect(volverAlMes(txt(fd, "fecha")));
  }, "Evento borrado.");
}

export async function asignar(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const evento_id = txt(fd, "evento_id");
    const miembro_id = txt(fd, "miembro_id");
    const rol_id = txt(fd, "rol_id");
    if (!miembro_id || !rol_id) throw new Error("Elige persona y rol.");
    const { error } = await supabase
      .from("asignaciones")
      .upsert({ evento_id, miembro_id, rol_id }, { onConflict: "evento_id,miembro_id,rol_id", ignoreDuplicates: true });
    ok(error);
    revalidatePath(`/admin/eventos/${evento_id}`);
    revalidatePath("/");
  }, "Asignado.");
}

export async function quitarAsignacion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { error } = await supabase.from("asignaciones").delete().eq("id", txt(fd, "id"));
    ok(error);
    revalidatePath(`/admin/eventos/${txt(fd, "evento_id")}`);
    revalidatePath("/");
  }, "Quitado.");
}
