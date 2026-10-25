"use server";

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
