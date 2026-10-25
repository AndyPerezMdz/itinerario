import Link from "next/link";
import { requerirMiembro } from "@/lib/supabase/server";
import { fechaLarga, hoyISO } from "@/lib/fechas";
import { ui } from "@/lib/ui";
import { GenerarForm } from "./GenerarForm";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { quitarTodosSinRol } from "./limpieza";

export const dynamic = "force-dynamic";

export default async function AdminResumen() {
  const { supabase } = await requerirMiembro();
  const hoy = hoyISO();

  const [miembros, sinCuenta, reglas, proximos, ultimo, asigFuturas, rolesDe] = await Promise.all([
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("activo", true).is("perfil_id", null),
    supabase.from("reglas").select("*", { count: "exact", head: true }).eq("activa", true),
    supabase.from("eventos").select("*", { count: "exact", head: true }).gte("fecha", hoy).neq("estado", "cancelado"),
    supabase.from("eventos").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("asignaciones")
      .select("miembro_id, rol_id, miembro:miembros(id, nombre), rol:roles(nombre), evento:eventos!inner(fecha)")
      .gte("evento.fecha", hoy)
      .returns<{ miembro_id: string; rol_id: string; miembro: { id: string; nombre: string } | null; rol: { nombre: string } | null }[]>(),
    supabase.from("miembro_roles").select("miembro_id, rol_id"),
  ]);

  // Turnos próximos de gente que ya no tiene ese rol en su ficha
  const tiene = new Set((rolesDe.data ?? []).map((r) => `${r.miembro_id}:${r.rol_id}`));
  const colgados = new Map<string, { id: string; nombre: string; n: number; roles: Set<string> }>();
  for (const a of asigFuturas.data ?? []) {
    if (tiene.has(`${a.miembro_id}:${a.rol_id}`) || !a.miembro) continue;
    const c = colgados.get(a.miembro.id) ?? { id: a.miembro.id, nombre: a.miembro.nombre, n: 0, roles: new Set<string>() };
    c.n++;
    if (a.rol) c.roles.add(a.rol.nombre);
    colgados.set(a.miembro.id, c);
  }
  const totalColgados = [...colgados.values()].reduce((s, c) => s + c.n, 0);

  const base = ultimo.data?.fecha ?? hoy;
  const d = new Date(base + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  const mesSugerido = d.toISOString().slice(0, 7);

  const stats = [
    { n: "Miembros activos", v: miembros.count ?? 0, href: "/admin/miembros" },
    { n: "Sin cuenta ligada", v: sinCuenta.count ?? 0, href: "/admin/miembros" },
    { n: "Reglas activas", v: reglas.count ?? 0, href: "/admin/reglas" },
    { n: "Eventos próximos", v: proximos.count ?? 0, href: "/" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.n} href={s.href} className="rounded-2xl border border-stone-200/80 bg-superficie p-4 shadow-sm hover:border-oro">
            <div className="titulo text-3xl font-semibold tabular-nums text-titulo">{s.v}</div>
            <div className="text-xs text-stone-500">{s.n}</div>
          </Link>
        ))}
      </div>

      {totalColgados > 0 && (
        <Formulario action={quitarTodosSinRol} className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">
            {totalColgados} {totalColgados === 1 ? "turno próximo" : "turnos próximos"} de gente sin ese rol
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Les quitaron el rol en su ficha, pero siguen apareciendo en el calendario:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...colgados.values()].map((c) => (
              <li key={c.id}>
                <Link href={`/admin/miembros/${c.id}`}
                  className="inline-block rounded-full bg-superficie px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200 hover:ring-amber-400">
                  <b>{c.nombre}</b> · {c.n} como {[...c.roles].join(", ")}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Submit variante="btnPeligro"
              confirmar={`¿Quitar esos ${totalColgados} turnos del calendario? Los que ya pasaron se quedan como historial.`}>
              Quitarlos todos
            </Submit>
          </div>
        </Formulario>
      )}

      <section className={ui.card}>
        <h2 className={ui.h2}>Generar calendario</h2>
        <p className={`${ui.ayuda} mb-4`}>
          Crea los eventos del mes con las reglas y asigna responsables según la rotación. Lo que ya
          existe no se toca, así que picarle dos veces no rompe nada.
        </p>
        <GenerarForm mesSugerido={mesSugerido} />
        <p className="mt-3 text-xs text-stone-400">El último evento cargado es del {fechaLarga(base)}.</p>
      </section>

      <section className={ui.card}>
        <h2 className={ui.h2}>Evento especial</h2>
        <p className={`${ui.ayuda} mb-4`}>
          Aniversarios, visitas, cambios de última hora. También puedes picarle al <b>+</b> de cualquier día en el calendario.
        </p>
        <Link href="/admin/eventos/nuevo" className={ui.btn}>+ Nuevo evento</Link>
      </section>
    </div>
  );
}
