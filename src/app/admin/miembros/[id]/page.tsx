import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { fechaLarga, hoyISO } from "@/lib/fechas";
import { MiembroCampos } from "../MiembroCampos";
import { borrarMiembro, guardarMiembro, quitarTurnosSinRol } from "../actions";
import { Formulario } from "@/components/Formulario";

export const dynamic = "force-dynamic";

type Turno = {
  rol_id: string;
  evento: { id: string; fecha: string; titulo: string | null; actividad: { nombre: string } | null } | null;
  rol: { nombre: string } | null;
};

export default async function EditarMiembro({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requerirMiembro();
  const { id } = await params;

  const [{ data: m }, { data: roles }, { data: turnos }] = await Promise.all([
    supabase.from("miembros")
      .select("id, nombre, email, telefono, notas, activo, perfil_id, miembro_roles(rol_id)")
      .eq("id", id).maybeSingle(),
    supabase.from("roles").select("id, nombre").order("nombre"),
    supabase.from("asignaciones")
      .select("rol_id, evento:eventos!inner(id, fecha, titulo, actividad:actividades(nombre)), rol:roles(nombre)")
      .eq("miembro_id", id)
      .gte("evento.fecha", hoyISO())
      .returns<Turno[]>(),
  ]);
  if (!m) notFound();

  const susRoles = new Set((m.miembro_roles as { rol_id: string }[]).map((r) => r.rol_id));
  const todos = (turnos ?? [])
    .filter((t) => t.evento)
    .sort((a, b) => a.evento!.fecha.localeCompare(b.evento!.fecha));
  const proximos = todos.slice(0, 8);
  // Turnos que quedaron colgados: tiene el turno pero ya no el rol
  const sinRol = todos.filter((t) => !susRoles.has(t.rol_id));
  const rolesSinRol = [...new Set(sinRol.map((t) => t.rol?.nombre ?? "?"))];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Formulario action={guardarMiembro} className={`${ui.card} space-y-5`}>
        <input type="hidden" name="id" value={m.id} />
        <div className="flex items-center gap-3">
          <h1 className="titulo text-2xl font-semibold text-titulo">{m.nombre}</h1>
          {m.perfil_id && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Con cuenta</span>}
        </div>
        <MiembroCampos roles={roles ?? []} m={m} rolesActuales={(m.miembro_roles as { rol_id: string }[]).map((r) => r.rol_id)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={m.activo} className="size-4" />
          Activo <span className="text-stone-400">(los inactivos no salen para asignar)</span>
        </label>
        <div className="flex gap-2">
          <Submit>Guardar</Submit>
          <Link href="/admin/miembros" className={ui.btnSec}>Volver</Link>
        </div>
      </Formulario>

      <div className="space-y-6">
        {sinRol.length > 0 && (
          <Formulario action={quitarTurnosSinRol} className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <input type="hidden" name="id" value={m.id} />
            <h2 className="font-semibold text-amber-900">
              {sinRol.length} {sinRol.length === 1 ? "turno" : "turnos"} sin rol
            </h2>
            <p className="mt-1 text-sm text-amber-900/80">
              Tiene turnos próximos como {rolesSinRol.join(", ")}, pero ese rol ya no está en su ficha. Por eso sigue saliendo en el calendario.
            </p>
            <div className="mt-3">
              <Submit variante="btnPeligro"
                confirmar={`¿Quitar ${sinRol.length === 1 ? "ese turno" : `esos ${sinRol.length} turnos`} del calendario? Los que ya pasaron se quedan.`}>
                Quitarlos del calendario
              </Submit>
            </div>
          </Formulario>
        )}

        <section className={ui.card}>
          <h2 className={ui.h2}>Próximos turnos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {proximos.map((t, i) => (
              <li key={i}>
                <Link href={`/admin/eventos/${t.evento!.id}`} className="hover:underline">
                  <span className="font-medium">{t.evento!.titulo ?? t.evento!.actividad?.nombre}</span>
                </Link>
                <div className="text-xs text-stone-500">
                  {fechaLarga(t.evento!.fecha)} · {t.rol?.nombre}
                  {!susRoles.has(t.rol_id) && <span className="ml-1 rounded-full bg-amber-50 px-1.5 text-amber-700">sin rol</span>}
                </div>
              </li>
            ))}
            {!proximos.length && <li className="text-stone-400">Sin turnos próximos.</li>}
          </ul>
        </section>

        <Formulario action={borrarMiembro} className={ui.card}>
          <input type="hidden" name="id" value={m.id} />
          <h2 className={ui.h2}>Borrar ficha</h2>
          <p className={`${ui.ayuda} mb-3`}>
            Se borran también sus asignaciones. Si solo ya no participa, mejor desmárcalo como activo.
          </p>
          <Submit variante="btnPeligro" confirmar={`¿Borrar a ${m.nombre} y todos sus turnos?`}>Borrar</Submit>
        </Formulario>
      </div>
    </div>
  );
}
