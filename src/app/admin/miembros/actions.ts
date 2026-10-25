"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteEditor, intentar, type Resultado, ok, opt, txt } from "@/lib/forms";

function datos(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (nombre.length < 2) throw new Error("Escribe el nombre.");
  const email = opt(fd, "email")?.toLowerCase() ?? null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("El correo no es válido.");
  return { nombre, email, telefono: opt(fd, "telefono"), notas: opt(fd, "notas") };
}

async function guardarRoles(supabase: Awaited<ReturnType<typeof clienteEditor>>, miembro_id: string, fd: FormData) {
  const roles = fd.getAll("roles").map(String).filter(Boolean);
  ok((await supabase.from("miembro_roles").delete().eq("miembro_id", miembro_id)).error);
  if (roles.length) {
    ok((await supabase.from("miembro_roles").insert(roles.map((rol_id) => ({ miembro_id, rol_id })))).error);
  }
}

export async function crearMiembro(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { data, error } = await supabase.from("miembros").insert(datos(fd)).select("id").single();
    if (error?.code === "23505") throw new Error("Ya hay otra ficha con ese correo.");
    ok(error);
    await guardarRoles(supabase, data!.id, fd);
    revalidatePath("/admin/miembros");
    redirect("/admin/miembros");
  }, "Miembro agregado.");
}

export async function guardarMiembro(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const { error } = await supabase
      .from("miembros")
      .update({ ...datos(fd), activo: fd.get("activo") === "on" })
      .eq("id", id);
    if (error?.code === "23505") throw new Error("Ya hay otra ficha con ese correo.");
    ok(error);
    await guardarRoles(supabase, id, fd);
    revalidatePath("/admin/miembros");
    revalidatePath("/");
    redirect("/admin/miembros");
  }, "Cambios guardados.");
}

export async function borrarMiembro(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { error } = await supabase.from("miembros").delete().eq("id", txt(fd, "id"));
    ok(error);
    revalidatePath("/admin/miembros");
    revalidatePath("/");
    redirect("/admin/miembros");
  }, "Ficha borrada.");
}
