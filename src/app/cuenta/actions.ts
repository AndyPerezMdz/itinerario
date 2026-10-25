"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Estado = { ok: boolean; mensaje: string } | null;

export async function cambiarContrasena(_prev: Estado, formData: FormData): Promise<Estado> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, mensaje: "Mínimo 8 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo." };
  return { ok: true, mensaje: "Listo. Ya puedes entrar con tu correo y esta contraseña." };
}

export async function cambiarNombre(_prev: Estado, formData: FormData): Promise<Estado> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (nombre.length < 2) return { ok: false, mensaje: "El nombre es muy corto." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_mi_nombre", { p_nombre: nombre });
  if (error) return { ok: false, mensaje: error.message || "No se pudo guardar." };

  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Nombre actualizado. Así saldrás en el calendario." };
}
