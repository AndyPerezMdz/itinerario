import Link from "next/link";
import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { fechaLarga, hoyISO } from "@/lib/fechas";
import { ui } from "@/lib/ui";
import { Ajustes } from "./Ajustes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu cuenta" };

type Ficha = { id: string; miembro_roles: { rol: { nombre: string } | null }[] };
type Turno = {
  rol: { nombre: string } | null;
  evento: { fecha: string; titulo: string | null; estado: string; actividad: { nombre: string; color: string } | null } | null;
};

function cuantoFalta(f: string, hoy: string) {
  const d = Math.round((Date.parse(f) - Date.parse(hoy)) / 86400000);
  return d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días`;
}

export default async function Cuenta({ searchParams }: { searchParams: Promise<{ tab?: string; correo?: string }> }) {
  const { supabase, user, perfil } = await requerirMiembro();
  const { tab, correo } = await searchParams;
  const hoy = hoyISO();

  const { data: ficha } = await supabase
    .from("miembros")
    .select("id, miembro_roles(rol:roles(nombre))")
    .eq("perfil_id", user.id)
    .maybeSingle<Ficha>();

  let turnos: Turno[] = [];
  if (ficha) {
    const { data } = await supabase
      .from("asignaciones")
      .select("rol:roles(nombre), evento:eventos!inner(fecha, titulo, estado, actividad:actividades(nombre, color))")
      .eq("miembro_id", ficha.id)
      .gte("evento.fecha", hoy)
      .returns<Turno[]>();
    turnos = (data ?? [])
      .filter((t) => t.evento && t.evento.estado !== "cancelado")
      .sort((a, b) => a.evento!.fecha.localeCompare(b.evento!.fecha));
  }

  const roles = (ficha?.miembro_roles ?? []).map((r) => r.rol?.nombre).filter(Boolean) as string[];
  const proximo = turnos[0];
  const esAdmin = perfil.rol === "admin";

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
        {correo === "ok" && (
          <p className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">
            ¡Listo! Tu correo ya es <b>{user.email}</b>. Desde ahora entras con ese.
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* Perfil */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marca-medio via-marca to-marca-oscuro p-6 text-white shadow-xl shadow-marca/20">
            <div className="rayos pointer-events-none absolute inset-0" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-oro-claro to-oro text-3xl font-bold text-marca-oscuro shadow-lg ring-4 ring-white/15">
                  {perfil.nombre.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <h1 className="titulo truncate text-2xl font-semibold">{perfil.nombre}</h1>
                  <p className="truncate text-sm text-white/65">{user.email}</p>
                  <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    esAdmin ? "bg-oro-vivo text-marca-oscuro" : "bg-white/15 text-white"
                  }`}>
                    {esAdmin ? "Administrador" : "Miembro"}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-oro-claro">Tus roles</p>
                {roles.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {roles.map((r) => (
                      <span key={r} className="rounded-full bg-white/12 px-3 py-1 text-sm font-medium ring-1 ring-inset ring-white/15">{r}</span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/60">
                    {ficha ? "Todavía no tienes roles asignados." : "Tu cuenta aún no está ligada a tu ficha. Pídeselo al encargado."}
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-inset ring-oro-claro/25">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro-claro">Próximo turno</span>
                  {proximo?.evento && (
                    <span className="rounded-full bg-oro-vivo px-2.5 py-0.5 text-xs font-bold text-marca-oscuro">
                      {cuantoFalta(proximo.evento.fecha, hoy)}
                    </span>
                  )}
                </div>
                {proximo?.evento ? (
                  <>
                    <div className="mt-2 font-semibold">{proximo.evento.titulo ?? proximo.evento.actividad?.nombre}</div>
                    <div className="text-sm text-white/65">{fechaLarga(proximo.evento.fecha)} · {proximo.rol?.nombre}</div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-white/60">Sin turnos próximos.</div>
                )}
                <Link href="/mis-turnos" className="mt-3 inline-block text-sm font-medium text-oro-claro hover:text-white">
                  {turnos.length > 1 ? `Ver tus ${turnos.length} turnos →` : "Ver mis turnos →"}
                </Link>
              </div>
            </div>
          </section>

          {/* Ajustes */}
          <Ajustes nombre={perfil.nombre} email={user.email ?? ""} tabInicial={tab} />
        </div>
      </main>
    </>
  );
}
