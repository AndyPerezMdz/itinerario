import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { hoyISO, MESES } from "@/lib/fechas";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis turnos" };

type Turno = {
  rol: { nombre: string } | null;
  evento: {
    fecha: string; hora: string | null; titulo: string | null; estado: string;
    actividad: { nombre: string; color: string } | null;
  } | null;
};

const DIA_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function cuantoFalta(f: string, hoy: string) {
  const d = Math.round((Date.parse(f) - Date.parse(hoy)) / 86400000);
  return d === 0 ? "Hoy" : d === 1 ? "Mañana" : d < 7 ? `En ${d} días` : d < 14 ? "La otra semana" : `En ${Math.round(d / 7)} semanas`;
}

export default async function MisTurnos() {
  const { supabase, user, perfil } = await requerirMiembro();
  const hoy = hoyISO();

  const { data: miembro } = await supabase
    .from("miembros").select("id, nombre").eq("perfil_id", user.id).maybeSingle();

  let turnos: Turno[] = [];
  if (miembro) {
    const { data } = await supabase
      .from("asignaciones")
      .select("rol:roles(nombre), evento:eventos!inner(fecha, hora, titulo, estado, actividad:actividades(nombre, color))")
      .eq("miembro_id", miembro.id)
      .gte("evento.fecha", hoy)
      .returns<Turno[]>();
    turnos = (data ?? [])
      .filter((t) => t.evento && t.evento.estado !== "cancelado")
      .sort((a, b) => a.evento!.fecha.localeCompare(b.evento!.fecha));
  }

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-oro">Hola, {perfil.nombre}</p>
        <h1 className={`${ui.h1} mb-6 mt-1`}>Mis turnos</h1>

        {!miembro && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Tu cuenta todavía no está ligada a tu ficha de miembro. Pídele al encargado que ponga tu correo en tu ficha.
          </p>
        )}
        {miembro && !turnos.length && (
          <div className={`${ui.card} py-12 text-center`}>
            <div className="text-3xl">🕊️</div>
            <p className="mt-2 text-stone-500">No tienes turnos próximos. Disfrútalo mientras dure.</p>
          </div>
        )}

        <ul className="space-y-3">
          {turnos.map((t, i) => {
            const e = t.evento!;
            const d = new Date(e.fecha + "T12:00:00Z");
            const color = e.actividad?.color ?? "#64748b";
            const primero = i === 0;
            return (
              <li key={i}
                className={`flex items-center gap-4 rounded-3xl border bg-superficie p-3 pr-4 shadow-sm ${primero ? "border-oro-vivo ring-2 ring-oro-vivo/25" : "border-stone-200/70"}`}>
                <div className={`flex w-16 shrink-0 flex-col items-center rounded-2xl py-2 ${primero ? "bg-gradient-to-b from-oro-vivo to-oro text-marca-oscuro" : "bg-marca-claro text-titulo"}`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{MESES[d.getUTCMonth()].slice(0, 3)}</span>
                  <span className="titulo text-3xl font-semibold leading-none">{d.getUTCDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: color }} />
                    <span className="truncate font-semibold text-titulo">{e.titulo ?? e.actividad?.nombre}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-stone-500">
                    {DIA_LARGO[d.getUTCDay()]}{e.hora && ` · ${e.hora.slice(0, 5)}`} · {t.rol?.nombre}
                  </div>
                  <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold sm:hidden ${primero ? "bg-marca text-white" : "bg-oro-suave text-oro"}`}>
                    {cuantoFalta(e.fecha, hoy)}
                  </span>
                </div>
                <span className={`hidden shrink-0 rounded-full px-3 py-1 text-xs font-semibold sm:inline-block ${primero ? "bg-marca text-white" : "bg-oro-suave text-oro"}`}>
                  {cuantoFalta(e.fecha, hoy)}
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
