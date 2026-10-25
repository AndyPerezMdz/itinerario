"use server";

import { revalidatePath } from "next/cache";
import { clienteEditor, ok, txt } from "@/lib/forms";

export async function cambiarRol(fd: FormData) {
  const supabase = await clienteEditor();
  const rol = txt(fd, "rol");
  if (!["admin", "miembro"].includes(rol)) throw new Error("Rol inválido.");
  // cambiar_rol valida que seas admin y que no se quede la app sin admins
  ok((await supabase.rpc("cambiar_rol", { p_perfil: txt(fd, "id"), p_rol: rol })).error);
  revalidatePath("/admin/usuarios");
}

export async function ligarFicha(fd: FormData) {
  const supabase = await clienteEditor();
  const perfil = txt(fd, "perfil_id");
  const miembro = txt(fd, "miembro_id");
  const { data: p } = await supabase.from("perfiles").select("email, nombre").eq("id", perfil).single();
  if (!p) throw new Error("Esa cuenta no existe.");

  if (miembro === "nueva") {
    ok((await supabase.from("miembros").insert({ nombre: p.nombre, email: p.email })).error);
  } else {
    // Poner su correo en la ficha dispara el trigger que la liga
    const { error } = await supabase.from("miembros").update({ email: p.email }).eq("id", miembro);
    if (error?.code === "23505") throw new Error("Otra ficha ya tiene ese correo.");
    ok(error);
  }
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/miembros");
}
