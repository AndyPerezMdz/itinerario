import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { EventoChip } from "@/components/EventoChip";
import { FiltroPersona } from "@/components/FiltroPersona";
import { requerirMiembro } from "@/lib/supabase/server";
import { cuadricula, DIAS, fechaLarga, hoyISO, MESES, mesClave, parseMes } from "@/lib/fechas";
import { puedeEditar, SELECT_EVENTO, type EventoConDetalle } from "@/lib/tipos";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";

const btnMes =
  "flex size-10 items-center justify-center rounded-full bg-white/10 text-lg text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/20";

type Turno = {
  rol: { nombre: string } | null;
  evento: { fecha: string; titulo: string | null; estado: string; actividad: { nombre: string; color: string } | null } | null;
};

function cuantoFalta(f: string, hoy: string) {
  const d = Math.round((Date.parse(f) - Date.parse(hoy)) / 86400000);
  return d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`;
}

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

  // Tu próximo turno (si tu cuenta está ligada a una ficha)
  let proximo: Turno | null = null;
  if (yo) {
    const { data: turnos } = await supabase
      .from("asignaciones")
      .select("rol:roles(nombre), evento:eventos!inner(fecha, titulo, estado, actividad:actividades(nombre, color))")
      .eq("miembro_id", yo.id)
      .gte("evento.fecha", hoy)
      .returns<Turno[]>();
    proximo =
      (turnos ?? [])
        .filter((t) => t.evento && t.evento.estado !== "cancelado")
        .sort((a, b) => a.evento!.fecha.localeCompare(b.evento!.fecha))[0] ?? null;
  }

  const eventos = persona
    ? (data ?? []).filter((e) => e.asignaciones.some((a) => a.miembro?.id === persona))
    : data ?? [];

  const porDia = new Map<string, EventoConDetalle[]>();
  for (const e of eventos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);

  const mesStr = `-${String(mes).padStart(2, "0")}-`;
  const delMes = eventos.filter((e) => e.fecha.includes(mesStr) && e.estado !== "cancelado");
  const especiales = delMes.filter((e) => e.actividad?.es_especial).length;
  const q = (m: string) => `/?mes=${m}${persona ? `&persona=${persona}` : ""}`;
  const hrefEvento = (e: EventoConDetalle) => (editor ? `/admin/eventos/${e.id}` : undefined);
  const nombrePersona = persona ? miembros?.find((m) => m.id === persona)?.nombre : null;
  const diaSemana = (f: string) => (new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7;

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Encabezado */}
        <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-marca-medio via-marca to-marca-oscuro text-white shadow-xl shadow-marca/25">
          <div className="rayos pointer-events-none absolute inset-0" />
          <div className="relative space-y-5 p-6 sm:p-8">
            {/* La navegación va en la primera línea, a la derecha: no se mueve sin importar el mes */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.3em] text-oro-claro">
                  {nombrePersona ? `Actividades de ${nombrePersona}` : "Calendario de actividades"}
                </p>
                <div className="no-print flex shrink-0 items-center gap-2">
                  <Link href={q(mesClave(anio, mes - 1))} className={btnMes} aria-label="Mes anterior">‹</Link>
                  <Link href={persona ? `/?persona=${persona}` : "/"}
                    className="flex h-10 items-center rounded-full bg-white/10 px-4 text-sm font-medium ring-1 ring-inset ring-white/15 transition hover:bg-white/20">
                    Hoy
                  </Link>
                  <Link href={q(mesClave(anio, mes + 1))} className={btnMes} aria-label="Mes siguiente">›</Link>
                </div>
              </div>
              <h1 className="titulo mt-1 text-4xl font-semibold sm:text-5xl">
                {MESES[mes - 1]} <span className="text-oro-claro">{anio}</span>
              </h1>
              <p className="mt-2 text-sm text-white/65">
                {delMes.length} {delMes.length === 1 ? "actividad" : "actividades"}
                {especiales > 0 && <> · <span className="text-oro-claro">✦ {especiales} {especiales === 1 ? "especial" : "especiales"}</span></>}
              </p>
            </div>

            {proximo?.evento && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-inset ring-oro-claro/25 backdrop-blur-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro-claro">Tu próximo turno</span>
                <span className="font-semibold">{proximo.evento.titulo ?? proximo.evento.actividad?.nombre}</span>
                <span className="text-sm text-white/65">{fechaLarga(proximo.evento.fecha)} · {proximo.rol?.nombre}</span>
                <span className="ml-auto rounded-full bg-oro-vivo px-2.5 py-0.5 text-xs font-bold text-marca-oscuro">
                  {cuantoFalta(proximo.evento.fecha, hoy)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Herramientas */}
        <div className="no-print mb-4 flex flex-wrap items-center gap-3">
          <Suspense>
            <FiltroPersona miembros={miembros ?? []} miId={yo?.id ?? null} />
          </Suspense>
          {editor && (
            <Link href="/admin/eventos/nuevo" className={`${ui.btnOro} ml-auto`}>+ Nuevo evento</Link>
          )}
        </div>

        {/* Escritorio: cuadrícula */}
        <div className="hidden overflow-hidden rounded-3xl border border-stone-200/70 bg-superficie shadow-[0_8px_30px_-12px_rgb(23_32_44/0.12)] md:block">
          <div className="grid grid-cols-7 border-b border-stone-200/70 text-[11px] font-bold uppercase tracking-[0.18em]">
            {DIAS.map((d, i) => (
              <div key={d} className={`px-3 py-3 ${i === 6 ? "bg-oro-suave/70 text-oro" : "text-stone-400"}`}>{d}</div>
            ))}
          </div>
          {semanas.map((semana) => (
            <div key={semana[0]} className="grid grid-cols-7 border-b border-stone-100 last:border-0">
              {semana.map((f, i) => {
                const enMes = f.includes(mesStr);
                const esHoy = f === hoy;
                return (
                  <div key={f}
                    className={`group relative min-h-32 border-r border-stone-100 p-2 last:border-0 ${
                      !enMes ? "bg-stone-50/60" : i === 6 ? "bg-oro-suave/35" : ""
                    } ${esHoy ? "z-10 ring-2 ring-inset ring-oro-vivo" : ""}`}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className={`flex size-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                        esHoy ? "bg-gradient-to-b from-oro-vivo to-oro text-marca-oscuro shadow-md shadow-oro/40"
                          : enMes ? (i === 6 ? "text-oro" : "text-titulo") : "text-stone-300"
                      }`}>
                        {+f.slice(8)}
                      </span>
                      {esHoy && <span className="text-[10px] font-bold uppercase tracking-widest text-oro">Hoy</span>}
                      {editor && enMes && (
                        <Link href={`/admin/eventos/nuevo?fecha=${f}`}
                          className="no-print ml-auto flex size-6 items-center justify-center rounded-full text-base leading-none text-stone-300 opacity-0 transition hover:bg-marca hover:text-white group-hover:opacity-100"
                          title="Agregar evento este día">
                          +
                        </Link>
                      )}
                    </div>
                    {enMes && (
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
          {semanas.flat().filter((f) => f.includes(mesStr) && porDia.has(f)).map((f) => {
            const esHoy = f === hoy;
            const domingo = diaSemana(f) === 6;
            return (
              <section key={f}
                className={`flex gap-3 rounded-3xl border bg-superficie p-3 shadow-sm ${esHoy ? "border-oro-vivo ring-2 ring-oro-vivo/30" : "border-stone-200/70"}`}>
                <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl py-2 ${
                  esHoy ? "bg-gradient-to-b from-oro-vivo to-oro text-marca-oscuro" : domingo ? "bg-oro-suave text-oro" : "bg-marca-claro text-titulo"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{esHoy ? "Hoy" : DIAS[diaSemana(f)]}</span>
                  <span className="titulo text-2xl font-semibold leading-none">{+f.slice(8)}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                  {porDia.get(f)!.map((e) => <EventoChip key={e.id} e={e} href={hrefEvento(e)} resaltar={persona} grande />)}
                </div>
                {editor && (
                  <Link href={`/admin/eventos/nuevo?fecha=${f}`} className="self-start px-1 text-xl leading-none text-stone-300" aria-label="Agregar">+</Link>
                )}
              </section>
            );
          })}
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
