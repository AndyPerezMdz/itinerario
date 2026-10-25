import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/fechas";
import { puedeEditar } from "@/lib/tipos";
import { GenerarForm } from "./GenerarForm";

export const dynamic = "force-dynamic";

const DIA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

type Regla = {
  id: string; tipo: string; dia_semana: number | null; dia_mes: number | null;
  ordinal: number | null; hora: string | null; vigente_desde: string; activa: boolean;
  actividad: { nombre: string; color: string } | null;
  rotacion: { nombre: string } | null;
};

function describir(r: Regla) {
  if (r.tipo === "semanal") return `Cada ${DIA[r.dia_semana!]}`;
  if (r.tipo === "mensual_dia") return `Día ${r.dia_mes} de cada mes`;
  const ord = r.ordinal === -1 ? "Último" : `${r.ordinal}º`;
  return `${ord} ${DIA[r.dia_semana!]} del mes`;
}

export default async function Admin() {
  const { supabase, perfil } = await requerirMiembro();
  if (!puedeEditar(perfil.rol)) redirect("/");

  const [{ data: reglas }, { count: miembros }, { data: ultimo }] = await Promise.all([
    supabase.from("reglas")
      .select("id, tipo, dia_semana, dia_mes, ordinal, hora, vigente_desde, activa, actividad:actividades!reglas_actividad_id_fkey(nombre, color), rotacion:rotaciones(nombre)")
      .order("tipo").order("dia_semana")
      .returns<Regla[]>(),
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("eventos").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Sugerir el mes siguiente al último evento existente
  const base = ultimo?.fecha ?? hoyISO();
  const d = new Date(base + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  const mesSugerido = d.toISOString().slice(0, 7);

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Administrar</h1>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Generar calendario</h2>
          <p className="mb-4 mt-1 text-sm text-stone-500">
            Crea los eventos del mes a partir de las reglas y asigna responsables según la rotación.
            Lo que ya exista no se toca, así que picarle dos veces no rompe nada.
          </p>
          <GenerarForm mesSugerido={mesSugerido} />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Reglas recurrentes</h2>
            <span className="text-sm text-stone-500">{miembros ?? 0} miembros activos</span>
          </div>
          <ul className="divide-y divide-stone-100">
            {(reglas ?? []).map((r) => (
              <li key={r.id} className={`flex items-center gap-3 py-2.5 text-sm ${r.activa ? "" : "opacity-50"}`}>
                <span className="size-2.5 rounded-full" style={{ background: r.actividad?.color }} />
                <span className="font-medium">{r.actividad?.nombre}</span>
                <span className="text-stone-500">{describir(r)}{r.hora && ` · ${r.hora.slice(0, 5)}`}</span>
                {r.rotacion && (
                  <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                    Rotación: {r.rotacion.nombre}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-400">
            Próximo paso: CRUD de reglas, miembros, rotaciones y edición de eventos desde aquí.
          </p>
        </section>
      </main>
    </>
  );
}
