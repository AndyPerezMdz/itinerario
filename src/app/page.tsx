import Link from "next/link";
import { Nav } from "@/components/Nav";
import { EventoChip } from "@/components/EventoChip";
import { requerirMiembro } from "@/lib/supabase/server";
import { cuadricula, DIAS, hoyISO, MESES, mesClave, parseMes } from "@/lib/fechas";
import { SELECT_EVENTO, type EventoConDetalle } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { supabase, user, perfil } = await requerirMiembro();

  const { mes: mesParam } = await searchParams;
  const { anio, mes } = parseMes(mesParam);
  const { semanas, desde, hasta } = cuadricula(anio, mes);
  const hoy = hoyISO();

  const { data } = await supabase
    .from("eventos")
    .select(SELECT_EVENTO)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha")
    .order("hora", { nullsFirst: true })
    .returns<EventoConDetalle[]>();

  const porDia = new Map<string, EventoConDetalle[]>();
  for (const e of data ?? []) {
    porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);
  }

  const mesStr = `-${String(mes).padStart(2, "0")}-`;

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {MESES[mes - 1]} <span className="text-stone-400">{anio}</span>
          </h1>
          <div className="no-print ml-auto flex gap-1">
            <Link href={`/?mes=${mesClave(anio, mes - 1)}`} className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm hover:bg-stone-50">←</Link>
            <Link href="/" className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm hover:bg-stone-50">Hoy</Link>
            <Link href={`/?mes=${mesClave(anio, mes + 1)}`} className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm hover:bg-stone-50">→</Link>
          </div>
        </div>

        {/* Escritorio: cuadrícula */}
        <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
            {DIAS.map((d) => (
              <div key={d} className="px-2 py-2">{d}</div>
            ))}
          </div>
          {semanas.map((semana) => (
            <div key={semana[0]} className="grid grid-cols-7 border-b border-stone-100 last:border-0">
              {semana.map((f) => {
                const delMes = f.includes(mesStr);
                return (
                  <div key={f} className={`min-h-28 border-r border-stone-100 p-1.5 last:border-0 ${delMes ? "" : "bg-stone-50/60"}`}>
                    <div className={`mb-1 text-xs font-medium ${f === hoy ? "inline-flex size-6 items-center justify-center rounded-full bg-marca text-white" : delMes ? "text-stone-700" : "text-stone-300"}`}>
                      {+f.slice(8)}
                    </div>
                    {delMes && (
                      <div className="space-y-1">
                        {(porDia.get(f) ?? []).map((e) => <EventoChip key={e.id} e={e} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Celular: lista por día */}
        <div className="space-y-3 md:hidden">
          {semanas.flat().filter((f) => f.includes(mesStr) && porDia.has(f)).map((f) => (
            <section key={f} className="rounded-xl border border-stone-200 bg-white p-3">
              <h2 className={`mb-2 text-sm font-semibold ${f === hoy ? "text-marca" : ""}`}>
                {DIAS[(new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7]} {+f.slice(8)}
                {f === hoy && " · Hoy"}
              </h2>
              <div className="space-y-1.5">
                {porDia.get(f)!.map((e) => <EventoChip key={e.id} e={e} />)}
              </div>
            </section>
          ))}
          {!data?.length && <p className="py-12 text-center text-stone-500">Nada programado este mes.</p>}
        </div>
      </main>
    </>
  );
}
