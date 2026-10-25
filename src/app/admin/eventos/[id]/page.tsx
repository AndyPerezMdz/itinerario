import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { fechaLarga } from "@/lib/fechas";
import { EventoCampos } from "../EventoCampos";
import { asignar, borrarEvento, guardarEvento, quitarAsignacion } from "../actions";
import { Formulario } from "@/components/Formulario";

export const dynamic = "force-dynamic";

type Asig = { id: string; miembro: { id: string; nombre: string } | null; rol: { id: string; nombre: string } | null };

export default async function EditarEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { supabase } = await requerirMiembro();
  const { id } = await params;
  const { nuevo } = await searchParams;

  const [{ data: e }, { data: actividades }, { data: miembros }, { data: roles }, { data: asigs }] = await Promise.all([
    supabase.from("eventos")
      .select("id, actividad_id, regla_id, fecha, hora, titulo, notas, estado, actividad:actividades(nombre, color)")
      .eq("id", id).maybeSingle(),
    supabase.from("actividades").select("id, nombre, es_especial").order("nombre"),
    supabase.from("miembros").select("id, nombre, miembro_roles(rol_id)").eq("activo", true).order("nombre"),
    supabase.from("roles").select("id, nombre").order("nombre"),
    supabase.from("asignaciones")
      .select("id, miembro:miembros(id, nombre), rol:roles(id, nombre)")
      .eq("evento_id", id)
      .returns<Asig[]>(),
  ]);
  if (!e) notFound();

  const act = e.actividad as unknown as { nombre: string; color: string } | null;
  const ocupados = new Set((asigs ?? []).map((a) => `${a.miembro?.id}:${a.rol?.id}`));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Formulario action={guardarEvento} className={`${ui.card} space-y-5`}>
        <input type="hidden" name="id" value={e.id} />
        <div className="flex items-start gap-3">
          <span className="mt-1.5 size-3 rounded-full" style={{ background: act?.color }} />
          <div>
            <h1 className="titulo text-2xl font-semibold text-titulo">{e.titulo ?? act?.nombre}</h1>
            <p className="text-sm text-stone-500">{fechaLarga(e.fecha)}</p>
          </div>
          {e.regla_id && (
            <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
              {e.estado === "modificado" ? "Generado · modificado" : "Generado por regla"}
            </span>
          )}
        </div>

        {nuevo && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Evento creado. Ahora asígnale responsables →</p>
        )}

        <EventoCampos actividades={actividades ?? []} e={e} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="estado" value="cancelado" defaultChecked={e.estado === "cancelado"} className="size-4" />
          Cancelado <span className="text-stone-400">(se sigue viendo tachado, para que nadie llegue de balde)</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Submit>Guardar</Submit>
          <Link href={`/?mes=${e.fecha.slice(0, 7)}`} className={ui.btnSec}>Volver</Link>
        </div>
      </Formulario>

      <div className="space-y-6">
        <section className={ui.card}>
          <h2 className={ui.h2}>Responsables</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {(asigs ?? []).map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="font-medium">{a.miembro?.nombre}</span>
                <span className="text-stone-400">·</span>
                <span className="text-stone-500">{a.rol?.nombre}</span>
                <Formulario action={quitarAsignacion} silencioso className="ml-auto">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="evento_id" value={e.id} />
                  <Submit variante="btnMini">Quitar</Submit>
                </Formulario>
              </li>
            ))}
            {!asigs?.length && <li className="py-2 text-sm text-stone-400">Nadie asignado todavía.</li>}
          </ul>

          <Formulario action={asignar} silencioso className="mt-4 space-y-2 border-t border-stone-100 pt-4">
            <input type="hidden" name="evento_id" value={e.id} />
            <select name="rol_id" required defaultValue="" className={ui.input}>
              <option value="" disabled>Rol…</option>
              {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
            <select name="miembro_id" required defaultValue="" className={ui.input}>
              <option value="" disabled>Persona…</option>
              {(miembros ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {(m.miembro_roles as { rol_id: string }[]).length
                    ? ` (${(m.miembro_roles as { rol_id: string }[])
                        .map((x) => roles?.find((r) => r.id === x.rol_id)?.nombre)
                        .filter(Boolean)
                        .join(", ")})`
                    : ""}
                </option>
              ))}
            </select>
            <Submit variante="btnSec">+ Asignar</Submit>
            {ocupados.size > 0 && <p className="text-xs text-stone-400">Si ya estaba asignado con ese rol, no se duplica.</p>}
          </Formulario>
        </section>

        <Formulario action={borrarEvento} className={ui.card}>
          <input type="hidden" name="id" value={e.id} />
          <input type="hidden" name="fecha" value={e.fecha} />
          <h2 className={ui.h2}>Borrar evento</h2>
          <p className={`${ui.ayuda} mb-3`}>
            {e.regla_id
              ? "Ojo: si lo borras y vuelves a generar el mes, la regla lo crea otra vez. Para quitarlo de verdad, mejor márcalo como cancelado."
              : "Se borra con todo y sus responsables."}
          </p>
          <Submit variante="btnPeligro" confirmar="¿Borrar este evento? No hay deshacer.">Borrar</Submit>
        </Formulario>
      </div>
    </div>
  );
}
