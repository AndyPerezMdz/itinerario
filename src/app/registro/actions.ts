"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type Estado = { ok: boolean; mensaje: string } | null;

export async function registrarse(_prev: Estado, formData: FormData): Promise<Estado> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (nombre.length < 2) return { ok: false, mensaje: "Escribe tu nombre." };
  if (password.length < 8) return { ok: false, mensaje: "La contraseña necesita mínimo 8 caracteres." };

  const origen =
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://${(await headers()).get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre },
      emailRedirectTo: `${origen}/auth/confirm`,
    },
  });

  if (error) {
    if (/registered|exists/i.test(error.message)) {
      return { ok: false, mensaje: "Ese correo ya tiene cuenta. Intenta iniciar sesión." };
    }
    return { ok: false, mensaje: "No se pudo crear la cuenta. Revisa los datos." };
  }

  return {
    ok: true,
    mensaje: "Listo. Te mandamos un correo para confirmar tu cuenta; en cuanto le des clic, ya entras al calendario.",
  };
}
