import { unstable_rethrow } from "next/navigation";
import { createClient, getSesion } from "@/lib/supabase/server";
import { puedeEditar } from "@/lib/tipos";

export const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const opt = (fd: FormData, k: string) => txt(fd, k) || null;
export const num = (fd: FormData, k: string) => {
  const v = txt(fd, k);
  return v === "" ? null : Number(v);
};
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** Opción de un modal que la acción pide antes de continuar. */
export type Opcion = { valor: string; texto: string; peligro?: boolean };
export type Confirmacion = { titulo: string; detalle?: string; campo: string; opciones: Opcion[] };

/**
 * Lo que regresa cada acción del admin. `t` hace que el aviso salga aunque el mensaje se repita.
 * Si trae `confirmar`, el formulario abre un modal y reenvía con `campo=valor` elegido.
 */
export type Resultado = { ok: boolean; mensaje: string; t: number; confirmar?: Confirmacion } | null;

/** Lánzala dentro de intentar() para pedirle al admin que confirme algo antes de seguir. */
export class Pregunta extends Error {
  constructor(public confirmacion: Confirmacion) {
    super(confirmacion.titulo);
  }
}

/**
 * Corre la acción y, si algo falla, DEVUELVE el mensaje en vez de lanzarlo.
 * (En producción, React esconde el texto de los errores lanzados → "Minified React error #441".)
 * Los redirect() de Next sí se dejan pasar.
 */
export async function intentar(fn: () => Promise<void>, exito = "Listo."): Promise<Resultado> {
  try {
    await fn();
    return { ok: true, mensaje: exito, t: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof Pregunta) return { ok: false, mensaje: "", t: Date.now(), confirmar: e.confirmacion };
    const mensaje = e instanceof Error && e.message ? e.message : "Algo falló. Intenta de nuevo.";
    return { ok: false, mensaje, t: Date.now() };
  }
}

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
  if (error.code === "23503" || /foreign key/i.test(m)) throw new Error("No se puede borrar: se está usando en otro lado.");
  if (error.code === "23514" || /check constraint/i.test(m)) throw new Error("Faltan datos o hay un valor inválido.");
  if (error.code === "42501" || /row-level security|permission/i.test(m)) throw new Error("No tienes permiso para hacer eso.");
  throw new Error(m);
}
