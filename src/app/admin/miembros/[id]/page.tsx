import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { fechaLarga, hoyISO } from "@/lib/fechas";
import { MiembroCampos } from "../MiembroCampos";
import { borrarMiembro, guardarMiembro } from "../actions";
import { Formulario } from "@/components/Formulario";

export const dynamic = "force-dynamic";

type Turno = { evento: { id: string; fecha: string; titulo: string | null; actividad: { nombre: string } | null } | null; rol: { nombre: string } | null };

export default async function EditarMiembro({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requerirMiembro();
  const { id } = await params;

  const [{ data: m }, { data: roles }, { data: turnos }] = await Promise.all([
    supabase.from("miembros")
      .select("id, nombre, email, telefono, notas, activo, perfil_id, miembro_roles(rol_id)")
      .eq("id", id).maybeSingle(),
    supabase.from("roles").select("id, nombre").order("nombre"),
    supabase.from("asignaciones")
      .select("evento:eventos!inner(id, fecha, titulo, actividad:actividades(nombre)), rol:roles(nombre)")
      .eq("miembro_id", id)
      .gte("evento.fecha", hoyISO())
      .returns<Turno[]>(),
  ]);
  if (!m) notFound();

  const proximos = (turnos ?? [])
    .filter((t) => t.evento)
    .sort((a, b) => a.evento!.fecha.localeCompare(b.evento!.fecha))
    .slice(0, 8);

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
        <section className={ui.card}>
          <h2 className={ui.h2}>Próximos turnos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {proximos.map((t, i) => (
              <li key={i}>
                <Link href={`/admin/eventos/${t.evento!.id}`} className="hover:underline">
                  <span className="font-medium">{t.evento!.titulo ?? t.evento!.actividad?.nombre}</span>
                </Link>
                <div className="text-xs text-stone-500">{fechaLarga(t.evento!.fecha)} · {t.rol?.nombre}</div>
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
