import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { EventoChip } from "@/components/EventoChip";
import { FiltroPersona } from "@/components/FiltroPersona";
import { requerirMiembro } from "@/lib/supabase/server";
import { cuadricula, DIAS, hoyISO, MESES, mesClave, parseMes } from "@/lib/fechas";
import { puedeEditar, SELECT_EVENTO, type EventoConDetalle } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const btnNav = "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm hover:border-oro hover:bg-oro-suave";

export default async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; persona?: string }>;
}) {
  const { supabase, user, perfil } = await requerirMiembro();
  const editor = puedeEditar(perfil.rol);

  const { mes: mesParam, persona } = await searchParams;
  const { anio, mes } = parseMes(mesParam);
  const { semanas, desde, hasta } = cuadricula(anio, mes);
  const hoy = hoyISO();

  const [{ data }, { data: miembros }, { data: yo }] = await Promise.all([
    supabase
      .from("eventos")
      .select(SELECT_EVENTO)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha")
      .order("hora", { nullsFirst: true })
      .returns<EventoConDetalle[]>(),
    supabase.from("miembros").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("miembros").select("id").eq("perfil_id", user.id).maybeSingle(),
  ]);

  // Filtro por persona: solo eventos donde está asignada
  const eventos = persona
    ? (data ?? []).filter((e) => e.asignaciones.some((a) => a.miembro?.id === persona))
    : data ?? [];

  const porDia = new Map<string, EventoConDetalle[]>();
  for (const e of eventos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);

  const mesStr = `-${String(mes).padStart(2, "0")}-`;
  const q = (m: string) => `/?mes=${m}${persona ? `&persona=${persona}` : ""}`;
  const hrefEvento = (e: EventoConDetalle) => (editor ? `/admin/eventos/${e.id}` : undefined);
  const nombrePersona = persona ? miembros?.find((m) => m.id === persona)?.nombre : null;

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="titulo text-3xl font-semibold text-marca">
            {MESES[mes - 1]} <span className="text-oro">{anio}</span>
          </h1>
          <div className="no-print flex gap-1">
            <Link href={q(mesClave(anio, mes - 1))} className={btnNav} aria-label="Mes anterior">←</Link>
            <Link href={persona ? `/?persona=${persona}` : "/"} className={btnNav}>Hoy</Link>
            <Link href={q(mesClave(anio, mes + 1))} className={btnNav} aria-label="Mes siguiente">→</Link>
          </div>
          <div className="no-print ml-auto flex flex-wrap items-center gap-2">
            <Suspense>
              <FiltroPersona miembros={miembros ?? []} miId={yo?.id ?? null} />
            </Suspense>
            {editor && (
              <Link href="/admin/eventos/nuevo" className="rounded-lg bg-marca px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-marca-oscuro">
                + Evento
              </Link>
            )}
          </div>
        </div>

        {nombrePersona && (
          <p className="mb-3 text-sm text-stone-500">
            Mostrando solo los eventos de <b className="text-stone-800">{nombrePersona}</b> ({eventos.length} este mes).
          </p>
        )}

        {/* Escritorio: cuadrícula */}
        <div className="hidden overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm md:block">
          <div className="grid grid-cols-7 bg-marca text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80">
            {DIAS.map((d, i) => <div key={d} className={`px-2 py-2.5 ${i === 6 ? "text-oro-claro" : ""}`}>{d}</div>)}
          </div>
          {semanas.map((semana) => (
            <div key={semana[0]} className="grid grid-cols-7 border-b border-stone-100 last:border-0">
              {semana.map((f) => {
                const delMes = f.includes(mesStr);
                return (
                  <div key={f} className={`group min-h-32 border-r border-stone-100 p-1.5 last:border-0 ${delMes ? (f === hoy ? "bg-oro-suave/60" : "") : "bg-papel/70"}`}>
                    <div className="mb-1 flex items-center">
                      <span className={`text-xs font-medium ${f === hoy ? "inline-flex size-6 items-center justify-center rounded-full bg-marca text-white ring-2 ring-oro-claro ring-offset-1" : delMes ? "text-stone-700" : "text-stone-300"}`}>
                        {+f.slice(8)}
                      </span>
                      {editor && delMes && (
                        <Link href={`/admin/eventos/nuevo?fecha=${f}`}
                          className="no-print ml-auto rounded px-1.5 text-sm leading-none text-stone-300 opacity-0 hover:bg-stone-100 hover:text-marca group-hover:opacity-100"
                          title="Agregar evento este día">
                          +
                        </Link>
                      )}
                    </div>
                    {delMes && (
                      <div className="space-y-1">
                        {(porDia.get(f) ?? []).map((e) => <EventoChip key={e.id} e={e} href={hrefEvento(e)} resaltar={persona} />)}
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
            <section key={f} className={`rounded-2xl border bg-white p-3 shadow-sm ${f === hoy ? "border-oro ring-1 ring-oro/40" : "border-stone-200/80"}`}>
              <div className="mb-2 flex items-center">
                <h2 className={`text-sm font-semibold ${f === hoy ? "text-oro" : "text-marca"}`}>
                  {DIAS[(new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7]} {+f.slice(8)}
                  {f === hoy && " · Hoy"}
                </h2>
                {editor && (
                  <Link href={`/admin/eventos/nuevo?fecha=${f}`} className="ml-auto px-2 text-lg leading-none text-stone-400">+</Link>
                )}
              </div>
              <div className="space-y-1.5">
                {porDia.get(f)!.map((e) => <EventoChip key={e.id} e={e} href={hrefEvento(e)} resaltar={persona} />)}
              </div>
            </section>
          ))}
          {!eventos.length && (
            <p className="py-12 text-center text-stone-500">
              {persona ? "Esta persona no tiene nada este mes. Qué suerte." : "Nada programado este mes."}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
