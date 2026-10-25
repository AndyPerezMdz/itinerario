"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type Estado = { ok: boolean; mensaje: string } | null;

export async function cambiarContrasena(_prev: Estado, formData: FormData): Promise<Estado> {
  const password = String(formData.get("password") ?? "");
  const repetir = String(formData.get("repetir") ?? "");
  if (password.length < 8) return { ok: false, mensaje: "Mínimo 8 caracteres." };
  if (password !== repetir) return { ok: false, mensaje: "Las dos contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old|same/i.test(error.message)) return { ok: false, mensaje: "Esa es la misma que ya tienes." };
    return { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo." };
  }
  return { ok: true, mensaje: "Listo. La próxima vez entra con esta contraseña." };
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

export async function cambiarCorreo(_prev: Estado, formData: FormData): Promise<Estado> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, mensaje: "Ese correo no se ve bien." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Tu sesión se cerró. Vuelve a entrar." };
  if (user.email?.toLowerCase() === email) return { ok: false, mensaje: "Ese ya es tu correo." };

  const origen = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${(await headers()).get("host")}`;
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origen}/auth/confirm` });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { ok: false, mensaje: "Ese correo ya lo usa otra cuenta." };
    if (/rate|seconds/i.test(error.message)) return { ok: false, mensaje: "Espera un minuto antes de pedirlo otra vez." };
    return { ok: false, mensaje: "No se pudo enviar el correo de confirmación." };
  }
  return {
    ok: true,
    mensaje: `Te mandamos un correo a ${email}. En cuanto le des clic al enlace, ese será tu correo para entrar. Mientras, sigues entrando con el de ahora.`,
  };
}
