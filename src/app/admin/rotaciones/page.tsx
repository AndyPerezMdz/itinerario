import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { hoyISO } from "@/lib/fechas";
import { ui } from "@/lib/ui";
import { agregarTurno, borrarRotacion, crearRotacion, guardarRotacion, quitarTurno, subirTurno } from "./actions";

export const dynamic = "force-dynamic";

type Rotacion = {
  id: string; nombre: string; rol_id: string; fecha_ancla: string;
  rotacion_turnos: { id: string; posicion: number; etiqueta: string | null }[];
};
type Miembro = { id: string; nombre: string; miembro_roles: { rol_id: string }[] };

export default async function Rotaciones() {
  const { supabase } = await requerirMiembro();
  const [{ data: rotaciones }, { data: roles }, { data: miembros }] = await Promise.all([
    supabase.from("rotaciones")
      .select("id, nombre, rol_id, fecha_ancla, rotacion_turnos(id, posicion, etiqueta)")
      .order("nombre").returns<Rotacion[]>(),
    supabase.from("roles").select("id, nombre").order("nombre"),
    supabase.from("miembros").select("id, nombre, miembro_roles(rol_id)").eq("activo", true).order("nombre").returns<Miembro[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo text-2xl font-semibold text-marca">Rotaciones</h1>
        <p className={ui.ayuda}>
          El orden en que se turnan las personas. La regla que use la rotación asigna el turno 1, luego el 2… y vuelve a empezar.
          La “fecha de inicio” es cuándo le toca al turno 1.
        </p>
      </div>

      {(rotaciones ?? []).map((rot) => {
        const turnos = [...rot.rotacion_turnos].sort((a, b) => a.posicion - b.posicion);
        // Primero los que tienen el rol de la rotación
        const candidatos = [...(miembros ?? [])].sort(
          (a, b) =>
            Number(b.miembro_roles.some((r) => r.rol_id === rot.rol_id)) -
            Number(a.miembro_roles.some((r) => r.rol_id === rot.rol_id)),
        );
        return (
          <section key={rot.id} className={`${ui.card} space-y-4`}>
            <form action={guardarRotacion} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <input type="hidden" name="id" value={rot.id} />
              <label className={ui.label}>Nombre<input name="nombre" defaultValue={rot.nombre} required className={ui.input} /></label>
              <label className={ui.label}>
                Rol que se asigna
                <select name="rol_id" defaultValue={rot.rol_id} className={ui.input}>
                  {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </label>
              <label className={ui.label}>Inicio<input type="date" name="fecha_ancla" defaultValue={rot.fecha_ancla} required className={ui.input} /></label>
              <Submit variante="btnSec">Guardar</Submit>
            </form>

            <ol className="divide-y divide-stone-100 rounded-lg border border-stone-200">
              {turnos.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex size-6 items-center justify-center rounded-full bg-marca/10 text-xs font-semibold text-marca">{i + 1}</span>
                  <span className="font-medium">{t.etiqueta}</span>
                  <span className="ml-auto flex gap-1">
                    {i > 0 && (
                      <form action={subirTurno}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="rotacion_id" value={rot.id} />
                        <Submit variante="btnMini">↑ Subir</Submit>
                      </form>
                    )}
                    <form action={quitarTurno}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="rotacion_id" value={rot.id} />
                      <Submit variante="btnMini">Quitar</Submit>
                    </form>
                  </span>
                </li>
              ))}
              {!turnos.length && <li className="px-3 py-3 text-sm text-stone-400">Sin turnos. Agrega el primero abajo.</li>}
            </ol>

            <form action={agregarTurno} className="space-y-2">
              <input type="hidden" name="rotacion_id" value={rot.id} />
              <p className="text-sm font-medium text-stone-700">Nuevo turno: marca quién va junto</p>
              <div className="flex flex-wrap gap-2">
                {candidatos.map((m) => (
                  <label key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-sm has-[:checked]:border-marca has-[:checked]:bg-marca/5 has-[:checked]:text-marca">
                    <input type="checkbox" name="miembros" value={m.id} className="size-3.5" />
                    {m.nombre}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Submit variante="btnSec">+ Agregar turno</Submit>
              </div>
            </form>

            <form action={borrarRotacion} className="border-t border-stone-100 pt-3 text-right">
              <input type="hidden" name="id" value={rot.id} />
              <Submit variante="btnMini" confirmar={`¿Borrar la rotación “${rot.nombre}”? Las reglas que la usan se quedan sin rotación.`}>
                Borrar rotación
              </Submit>
            </form>
          </section>
        );
      })}

      <form action={crearRotacion} className={`${ui.card} grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end`}>
        <h2 className={`${ui.h2} sm:col-span-4`}>Nueva rotación</h2>
        <label className={ui.label}>Nombre<input name="nombre" placeholder="Ej. Lectura de carta" required className={ui.input} /></label>
        <label className={ui.label}>
          Rol que se asigna
          <select name="rol_id" required defaultValue="" className={ui.input}>
            <option value="" disabled>Elige…</option>
            {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <label className={ui.label}>Inicio<input type="date" name="fecha_ancla" defaultValue={hoyISO()} required className={ui.input} /></label>
        <Submit>Crear</Submit>
      </form>
    </div>
  );
}
