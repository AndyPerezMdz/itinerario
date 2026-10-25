"use server";

import { revalidatePath } from "next/cache";
import { clienteEditor, intentar, ok, type Resultado } from "@/lib/forms";
import { hoyISO } from "@/lib/fechas";

/** Quita TODOS los turnos próximos de personas que ya no tienen ese rol en su ficha. */
export async function quitarTodosSinRol(_prev: Resultado, _fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const [{ data: asig, error }, { data: roles }] = await Promise.all([
      supabase.from("asignaciones").select("id, miembro_id, rol_id, evento:eventos!inner(fecha)").gte("evento.fecha", hoyISO()),
      supabase.from("miembro_roles").select("miembro_id, rol_id"),
    ]);
    ok(error);
    const tiene = new Set((roles ?? []).map((r) => `${r.miembro_id}:${r.rol_id}`));
    const sobran = (asig ?? []).filter((a) => !tiene.has(`${a.miembro_id}:${a.rol_id}`)).map((a) => a.id);
    // De a poquito para no hacer una URL gigante
    for (let i = 0; i < sobran.length; i += 100) {
      ok((await supabase.from("asignaciones").delete().in("id", sobran.slice(i, i + 100))).error);
    }
    revalidatePath("/admin");
    revalidatePath("/");
  }, "Listo, el calendario ya solo muestra a quien tiene el rol.");
}
