"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cuadricula, parseMes } from "@/lib/fechas";

type Estado = { ok: boolean; mensaje: string } | null;

export async function generarMes(_prev: Estado, formData: FormData): Promise<Estado> {
  const { anio, mes } = parseMes(String(formData.get("mes") ?? ""));
  const { primerDia, ultimoDia } = cuadricula(anio, mes);

  const supabase = await createClient();
  // La función valida permisos en la base de datos; aquí no se confía en nadie.
  const { data, error } = await supabase.rpc("generar_eventos", {
    p_desde: primerDia,
    p_hasta: ultimoDia,
  });

  if (error) return { ok: false, mensaje: error.message === "No autorizado" ? "No tienes permiso." : "Algo falló al generar." };
  revalidatePath("/");
  return {
    ok: true,
    mensaje: data === 0 ? "No había nada nuevo que generar (ya estaba todo)." : `Se crearon ${data} eventos.`,
  };
}
