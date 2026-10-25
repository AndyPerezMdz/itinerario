import Link from "next/link";
import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { MiembroCampos } from "./MiembroCampos";
import { crearMiembro } from "./actions";

export const dynamic = "force-dynamic";

type Fila = {
  id: string; nombre: string; email: string | null; activo: boolean; perfil_id: string | null;
  miembro_roles: { rol: { nombre: string } | null }[];
};

export default async function Miembros({ searchParams }: { searchParams: Promise<{ q?: string; nuevo?: string }> }) {
  const { supabase } = await requerirMiembro();
  const { q, nuevo } = await searchParams;

  let query = supabase
    .from("miembros")
    .select("id, nombre, email, activo, perfil_id, miembro_roles(rol:roles(nombre))")
    .order("activo", { ascending: false })
    .order("nombre");
  if (q) query = query.ilike("nombre", `%${q}%`);

  const [{ data: miembros }, { data: roles }] = await Promise.all([
    query.returns<Fila[]>(),
    supabase.from("roles").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo text-2xl font-semibold text-titulo">Miembros</h1>
        <form className="ml-auto flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar…" className={`${ui.input} mt-0 w-48`} />
        </form>
        <Link href="?nuevo=1" className={ui.btn}>+ Agregar</Link>
      </div>

      {nuevo && (
        <form action={crearMiembro} className={`${ui.card} space-y-4`}>
          <h2 className={ui.h2}>Nuevo miembro</h2>
          <MiembroCampos roles={roles ?? []} />
          <div className="flex gap-2">
            <Submit>Guardar</Submit>
            <Link href="/admin/miembros" className={ui.btnSec}>Cancelar</Link>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-superficie shadow-sm">
        <ul className="divide-y divide-stone-100">
          {(miembros ?? []).map((m) => (
            <li key={m.id}>
              <Link href={`/admin/miembros/${m.id}`}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-stone-50 ${m.activo ? "" : "opacity-50"}`}>
                <span className="font-medium">{m.nombre}</span>
                {m.perfil_id ? (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Con cuenta</span>
                ) : m.email ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Esperando registro</span>
                ) : (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">Sin correo</span>
                )}
                {!m.activo && <span className="text-xs text-stone-500">Inactivo</span>}
                <span className="ml-auto flex flex-wrap gap-1">
                  {m.miembro_roles.map((r, i) => (
                    <span key={i} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{r.rol?.nombre}</span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
          {!miembros?.length && <li className="px-4 py-8 text-center text-sm text-stone-400">Nadie por aquí.</li>}
        </ul>
      </div>
    </div>
  );
}
