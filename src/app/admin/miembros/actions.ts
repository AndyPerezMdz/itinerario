"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteEditor, intentar, ok, opt, Pregunta, type Resultado, txt } from "@/lib/forms";
import { hoyISO } from "@/lib/fechas";

function datos(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (nombre.length < 2) throw new Error("Escribe el nombre.");
  const email = opt(fd, "email")?.toLowerCase() ?? null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("El correo no es válido.");
  return { nombre, email, telefono: opt(fd, "telefono"), notas: opt(fd, "notas") };
}

type Cliente = Awaited<ReturnType<typeof clienteEditor>>;
type TurnoFuturo = { id: string; rol: { nombre: string } | null };

/** Turnos de hoy en adelante de esta persona con alguno de estos roles. */
async function turnosFuturos(supabase: Cliente, miembro_id: string, roles: string[]) {
  if (!roles.length) return [];
  const { data, error } = await supabase
    .from("asignaciones")
    .select("id, rol:roles(nombre), evento:eventos!inner(fecha)")
    .eq("miembro_id", miembro_id)
    .in("rol_id", roles)
    .gte("evento.fecha", hoyISO())
    .returns<TurnoFuturo[]>();
  ok(error);
  return data ?? [];
}

const lista = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

async function guardarRoles(supabase: Awaited<ReturnType<typeof clienteEditor>>, miembro_id: string, fd: FormData) {
  const roles = fd.getAll("roles").map(String).filter(Boolean);
  ok((await supabase.from("miembro_roles").delete().eq("miembro_id", miembro_id)).error);
  if (roles.length) {
    ok((await supabase.from("miembro_roles").insert(roles.map((rol_id) => ({ miembro_id, rol_id })))).error);
  }
}

export async function crearMiembro(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { data, error } = await supabase.from("miembros").insert(datos(fd)).select("id").single();
    if (error?.code === "23505") throw new Error("Ya hay otra ficha con ese correo.");
    ok(error);
    await guardarRoles(supabase, data!.id, fd);
    revalidatePath("/admin/miembros");
    redirect("/admin/miembros");
  }, "Miembro agregado.");
}

export async function guardarMiembro(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const fila = { ...datos(fd), activo: fd.get("activo") === "on" };

    // ¿Le quitaron roles con los que todavía tiene turnos próximos?
    const nuevos = fd.getAll("roles").map(String).filter(Boolean);
    const { data: actuales } = await supabase.from("miembro_roles").select("rol_id").eq("miembro_id", id);
    const quitados = (actuales ?? []).map((r) => r.rol_id).filter((r) => !nuevos.includes(r));
    const pendientes = await turnosFuturos(supabase, id, quitados);
    const decision = txt(fd, "turnos");

    if (pendientes.length && !decision) {
      const roles = [...new Set(pendientes.map((t) => t.rol?.nombre ?? "ese rol"))];
      const n = pendientes.length;
      throw new Pregunta({
        titulo: `${fila.nombre} tiene ${n} ${n === 1 ? "turno próximo" : "turnos próximos"} como ${lista(roles)}`,
        detalle: "¿También los quito del calendario? Los turnos que ya pasaron se quedan como historial.",
        campo: "turnos",
        opciones: [
          { valor: "dejar", texto: "No, déjalos" },
          { valor: "quitar", texto: "Sí, quitarlos", peligro: true },
        ],
      });
    }

    const { error } = await supabase.from("miembros").update(fila).eq("id", id);
    if (error?.code === "23505") throw new Error("Ya hay otra ficha con ese correo.");
    ok(error);
    await guardarRoles(supabase, id, fd);
    if (decision === "quitar" && pendientes.length) {
      ok((await supabase.from("asignaciones").delete().in("id", pendientes.map((t) => t.id))).error);
    }
    revalidatePath("/admin/miembros");
    revalidatePath("/");
    redirect("/admin/miembros");
  }, "Cambios guardados.");
}

/** Quita los turnos próximos que tiene con roles que ya no están en su ficha. */
export async function quitarTurnosSinRol(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const id = txt(fd, "id");
    const { data: tiene } = await supabase.from("miembro_roles").select("rol_id").eq("miembro_id", id);
    const permitidos = new Set((tiene ?? []).map((r) => r.rol_id));
    const { data, error } = await supabase
      .from("asignaciones")
      .select("id, rol_id, evento:eventos!inner(fecha)")
      .eq("miembro_id", id)
      .gte("evento.fecha", hoyISO());
    ok(error);
    const sobran = (data ?? []).filter((a) => !permitidos.has(a.rol_id)).map((a) => a.id);
    if (sobran.length) ok((await supabase.from("asignaciones").delete().in("id", sobran)).error);
    revalidatePath(`/admin/miembros/${id}`);
    revalidatePath("/");
  }, "Turnos quitados del calendario.");
}

export async function borrarMiembro(_prev: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const supabase = await clienteEditor();
    const { error } = await supabase.from("miembros").delete().eq("id", txt(fd, "id"));
    ok(error);
    revalidatePath("/admin/miembros");
    revalidatePath("/");
    redirect("/admin/miembros");
  }, "Ficha borrada.");
}
