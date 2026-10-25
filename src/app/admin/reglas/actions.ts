"use server";

import { revalidatePath } from "next/cache";
import { clienteEditor, num, ok, opt, txt } from "@/lib/forms";

export async function crearRegla(fd: FormData) {
  const supabase = await clienteEditor();
  const tipo = txt(fd, "tipo");
  if (!["semanal", "mensual_dia", "mensual_ordinal"].includes(tipo)) throw new Error("Tipo de regla inválido.");

  const fila = {
    actividad_id: txt(fd, "actividad_id"),
    tipo,
    dia_semana: tipo === "mensual_dia" ? null : num(fd, "dia_semana"),
    intervalo_semanas: tipo === "semanal" ? num(fd, "intervalo_semanas") ?? 1 : 1,
    dia_mes: tipo === "mensual_dia" ? num(fd, "dia_mes") : null,
    ordinal: tipo === "mensual_ordinal" ? num(fd, "ordinal") : null,
    hora: opt(fd, "hora"),
    vigente_desde: txt(fd, "vigente_desde"),
    vigente_hasta: opt(fd, "vigente_hasta"),
    rotacion_id: opt(fd, "rotacion_id"),
    reemplaza_actividad_id: opt(fd, "reemplaza_actividad_id"),
  };
  if (!fila.actividad_id) throw new Error("Elige la actividad.");
  if (!fila.vigente_desde) throw new Error("Pon desde cuándo aplica.");

  ok((await supabase.from("reglas").insert(fila)).error);
  revalidatePath("/admin/reglas");
}

export async function alternarRegla(fd: FormData) {
  const supabase = await clienteEditor();
  ok((await supabase.from("reglas").update({ activa: fd.get("activa") === "true" }).eq("id", txt(fd, "id"))).error);
  revalidatePath("/admin/reglas");
}

export async function borrarRegla(fd: FormData) {
  const supabase = await clienteEditor();
  // Los eventos ya generados se quedan (regla_id → null)
  ok((await supabase.from("reglas").delete().eq("id", txt(fd, "id"))).error);
  revalidatePath("/admin/reglas");
}
