import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { fechaLarga, hoyISO } from "@/lib/fechas";

export const dynamic = "force-dynamic";

type Turno = {
  rol: { nombre: string } | null;
  evento: {
    fecha: string; hora: string | null; titulo: string | null; estado: string;
    actividad: { nombre: string; color: string } | null;
  } | null;
};

export default async function MisTurnos() {
  const { supabase, user, perfil } = await requerirMiembro();

  const { data: miembro } = await supabase
    .from("miembros").select("id, nombre").eq("perfil_id", user.id).maybeSingle();

  let turnos: Turno[] = [];
  if (miembro) {
    const { data } = await supabase
      .from("asignaciones")
      .select("rol:roles(nombre), evento:eventos!inner(fecha, hora, titulo, estado, actividad:actividades(nombre, color))")
      .eq("miembro_id", miembro.id)
      .gte("evento.fecha", hoyISO())
      .returns<Turno[]>();
    turnos = (data ?? [])
      .filter((t) => t.evento && t.evento.estado !== "cancelado")
      .sort((a, b) => a.evento!.fecha.localeCompare(b.evento!.fecha));
  }

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Mis turnos</h1>

        {!miembro && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Tu cuenta todavía no está ligada a tu ficha de miembro. Pídele al encargado que ponga tu correo en tu ficha.
          </p>
        )}
        {miembro && !turnos.length && (
          <p className="py-12 text-center text-stone-500">No tienes turnos próximos. Disfrútalo mientras dure.</p>
        )}

        <ul className="space-y-2">
          {turnos.map((t, i) => {
            const e = t.evento!;
            return (
              <li key={i} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4">
                <span className="h-10 w-1 rounded-full" style={{ background: e.actividad?.color ?? "#64748b" }} />
                <div>
                  <div className="font-semibold">{e.titulo ?? e.actividad?.nombre}</div>
                  <div className="text-sm capitalize text-stone-500">
                    {fechaLarga(e.fecha)}{e.hora && ` · ${e.hora.slice(0, 5)}`}
                  </div>
                </div>
                <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{t.rol?.nombre}</span>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
