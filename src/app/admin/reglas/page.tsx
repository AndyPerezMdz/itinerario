import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { hoyISO } from "@/lib/fechas";
import { ui } from "@/lib/ui";
import { ReglaForm } from "./ReglaForm";
import { alternarRegla, borrarRegla } from "./actions";

export const dynamic = "force-dynamic";

const DIA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

type Regla = {
  id: string; tipo: string; dia_semana: number | null; dia_mes: number | null; intervalo_semanas: number;
  ordinal: number | null; hora: string | null; vigente_desde: string; vigente_hasta: string | null; activa: boolean;
  actividad: { nombre: string; color: string } | null;
  reemplaza: { nombre: string } | null;
  rotacion: { nombre: string } | null;
};

function describir(r: Regla) {
  if (r.tipo === "semanal")
    return r.intervalo_semanas > 1 ? `Cada ${r.intervalo_semanas} semanas, ${DIA[r.dia_semana!]}` : `Cada ${DIA[r.dia_semana!]}`;
  if (r.tipo === "mensual_dia") return `El día ${r.dia_mes} de cada mes`;
  const ord = r.ordinal === -1 ? "Último" : `${r.ordinal}º`;
  return `${ord} ${DIA[r.dia_semana!]} del mes`;
}

export default async function Reglas() {
  const { supabase } = await requerirMiembro();
  const [{ data: reglas }, { data: actividades }, { data: rotaciones }] = await Promise.all([
    supabase.from("reglas")
      .select(`id, tipo, dia_semana, dia_mes, intervalo_semanas, ordinal, hora, vigente_desde, vigente_hasta, activa,
        actividad:actividades!reglas_actividad_id_fkey(nombre, color),
        reemplaza:actividades!reglas_reemplaza_actividad_id_fkey(nombre),
        rotacion:rotaciones(nombre)`)
      .order("activa", { ascending: false }).order("tipo").order("dia_semana")
      .returns<Regla[]>(),
    supabase.from("actividades").select("id, nombre").order("nombre"),
    supabase.from("rotaciones").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h1 className={ui.h2}>Reglas recurrentes</h1>
        <p className={ui.ayuda}>
          Con esto se arma el calendario al darle “Generar mes”. Pausar o borrar una regla no toca los eventos que ya se crearon.
        </p>
        <ul className="mt-4 divide-y divide-stone-100">
          {(reglas ?? []).map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm ${r.activa ? "" : "opacity-50"}`}>
              <span className="size-2.5 rounded-full" style={{ background: r.actividad?.color }} />
              <span className="font-medium">{r.actividad?.nombre}</span>
              <span className="text-stone-500">
                {describir(r)}{r.hora && ` · ${r.hora.slice(0, 5)}`}
              </span>
              {r.rotacion && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">Rotación: {r.rotacion.nombre}</span>}
              {r.reemplaza && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">Reemplaza: {r.reemplaza.nombre}</span>}
              <span className="text-xs text-stone-400">
                desde {r.vigente_desde}{r.vigente_hasta && ` hasta ${r.vigente_hasta}`}
              </span>
              <span className="ml-auto flex gap-1">
                <form action={alternarRegla}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="activa" value={String(!r.activa)} />
                  <Submit variante="btnMini">{r.activa ? "Pausar" : "Activar"}</Submit>
                </form>
                <form action={borrarRegla}>
                  <input type="hidden" name="id" value={r.id} />
                  <Submit variante="btnMini" confirmar="¿Borrar esta regla? Los eventos ya creados se quedan.">Borrar</Submit>
                </form>
              </span>
            </li>
          ))}
          {!reglas?.length && <li className="py-6 text-center text-sm text-stone-400">Sin reglas todavía.</li>}
        </ul>
      </section>

      <section className={ui.card}>
        <h2 className={`${ui.h2} mb-4`}>Nueva regla</h2>
        <ReglaForm actividades={actividades ?? []} rotaciones={rotaciones ?? []} hoy={hoyISO()} />
      </section>
    </div>
  );
}
