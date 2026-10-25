import Link from "next/link";
import { requerirMiembro } from "@/lib/supabase/server";
import { fechaLarga, hoyISO } from "@/lib/fechas";
import { ui } from "@/lib/ui";
import { GenerarForm } from "./GenerarForm";

export const dynamic = "force-dynamic";

export default async function AdminResumen() {
  const { supabase } = await requerirMiembro();
  const hoy = hoyISO();

  const [miembros, sinCuenta, reglas, proximos, ultimo] = await Promise.all([
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("miembros").select("*", { count: "exact", head: true }).eq("activo", true).is("perfil_id", null),
    supabase.from("reglas").select("*", { count: "exact", head: true }).eq("activa", true),
    supabase.from("eventos").select("*", { count: "exact", head: true }).gte("fecha", hoy).neq("estado", "cancelado"),
    supabase.from("eventos").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle(),
  ]);

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
