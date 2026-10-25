import { createClient, getSesion } from "@/lib/supabase/server";
import { puedeEditar } from "@/lib/tipos";

export const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const opt = (fd: FormData, k: string) => txt(fd, k) || null;
export const num = (fd: FormData, k: string) => {
  const v = txt(fd, k);
  return v === "" ? null : Number(v);
};
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** Para server actions de admin: valida sesión y permiso antes de tocar nada. */
export async function clienteEditor() {
  const { user, perfil } = await getSesion();
  if (!user || !puedeEditar(perfil?.rol)) throw new Error("No tienes permiso para hacer eso.");
  return createClient();
}

/** Convierte errores de Postgres en algo que un humano entienda. */
export function ok(error: { message: string; code?: string } | null) {
  if (!error) return;
  const m = error.message;
  if (error.code === "23505" || /duplicate key/i.test(m)) throw new Error("Ya existe uno con ese nombre.");
  if (error.code === "23503" || /foreign key/i.test(m)) throw new Error("No se puede: está en uso en otro lado.");
  if (error.code === "23514" || /check constraint/i.test(m)) throw new Error("Faltan datos o hay un valor inválido.");
  throw new Error(m);
}
