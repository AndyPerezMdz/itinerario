"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function iniciarSesion(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "Correo o contraseña incorrectos.";

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
