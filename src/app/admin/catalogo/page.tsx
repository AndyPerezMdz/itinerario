import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { borrarActividad, borrarRol, guardarActividad, guardarRol } from "./actions";

export const dynamic = "force-dynamic";

export default async function Catalogo() {
  const { supabase } = await requerirMiembro();
  const [{ data: actividades }, { data: roles }] = await Promise.all([
    supabase.from("actividades").select("id, nombre, color, es_especial").order("es_especial").order("nombre"),
    supabase.from("roles").select("id, nombre, descripcion").order("nombre"),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={ui.card}>
        <h1 className={ui.h2}>Actividades</h1>
        <p className={ui.ayuda}>Lo que aparece en el calendario. “Especial” = no es de cada semana.</p>

        <ul className="mt-4 divide-y divide-stone-100">
          {(actividades ?? []).map((a) => (
            <li key={a.id} className="py-2">
              <form action={guardarActividad} className="flex items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <input type="color" name="color" defaultValue={a.color} className="size-8 shrink-0 cursor-pointer rounded border border-stone-200 bg-white" />
                <input name="nombre" defaultValue={a.nombre} required className={`${ui.input} mt-0`} />
                <label className="flex shrink-0 items-center gap-1 text-xs text-stone-500" title="Especial">
                  <input type="checkbox" name="es_especial" defaultChecked={a.es_especial} /> Esp.
                </label>
                <Submit variante="btnMini">Guardar</Submit>
              </form>
              <form action={borrarActividad} className="text-right">
                <input type="hidden" name="id" value={a.id} />
                <Submit variante="btnMini" confirmar={`¿Borrar “${a.nombre}”?`}>Borrar</Submit>
              </form>
            </li>
          ))}
        </ul>

        <form action={guardarActividad} className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4">
          <input type="color" name="color" defaultValue="#1e3a8a" className="size-8 shrink-0 cursor-pointer rounded border border-stone-200 bg-white" />
          <input name="nombre" placeholder="Nueva actividad…" required className={`${ui.input} mt-0`} />
          <label className="flex shrink-0 items-center gap-1 text-xs text-stone-500">
            <input type="checkbox" name="es_especial" /> Esp.
          </label>
          <Submit variante="btnSec">Agregar</Submit>
        </form>
      </section>

      <section className={ui.card}>
        <h2 className={ui.h2}>Roles</h2>
        <p className={ui.ayuda}>Lo que alguien hace en un evento: fotografía, maestro dominical, lectura…</p>

        <ul className="mt-4 divide-y divide-stone-100">
          {(roles ?? []).map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-2">
              <form action={guardarRol} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="nombre" defaultValue={r.nombre} required className={`${ui.input} mt-0`} />
                <Submit variante="btnMini">Guardar</Submit>
              </form>
              <form action={borrarRol}>
                <input type="hidden" name="id" value={r.id} />
                <Submit variante="btnMini" confirmar={`¿Borrar el rol “${r.nombre}”?`}>Borrar</Submit>
              </form>
            </li>
          ))}
        </ul>

        <form action={guardarRol} className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4">
          <input name="nombre" placeholder="Nuevo rol…" required className={`${ui.input} mt-0`} />
          <Submit variante="btnSec">Agregar</Submit>
        </form>
      </section>
    </div>
  );
}
