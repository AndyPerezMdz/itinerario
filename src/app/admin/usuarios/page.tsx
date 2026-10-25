import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { cambiarRol, ligarFicha } from "./actions";
import { Formulario } from "@/components/Formulario";

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const { supabase, user } = await requerirMiembro();
  const [{ data: perfiles }, { data: fichas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, email, rol, created_at").order("created_at", { ascending: false }),
    supabase.from("miembros").select("id, nombre, perfil_id").order("nombre"),
  ]);

  const fichaDe = new Map((fichas ?? []).filter((f) => f.perfil_id).map((f) => [f.perfil_id, f.nombre]));
  const libres = (fichas ?? []).filter((f) => !f.perfil_id);

  return (
    <section className={ui.card}>
      <h1 className={ui.h2}>Cuentas</h1>
      <p className={ui.ayuda}>
        Quien se registra entra como miembro. Aquí lo haces admin o lo ligas a su ficha para que vea sus turnos.
      </p>

      <ul className="mt-4 divide-y divide-stone-100">
        {(perfiles ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <div className="min-w-48 flex-1">
              <div className="font-medium">
                {p.nombre} {p.id === user.id && <span className="text-xs font-normal text-stone-400">(tú)</span>}
              </div>
              <div className="text-xs text-stone-500">{p.email}</div>
            </div>

            {fichaDe.has(p.id) ? (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Ficha: {fichaDe.get(p.id)}</span>
            ) : (
              <Formulario action={ligarFicha} className="flex items-center gap-1">
                <input type="hidden" name="perfil_id" value={p.id} />
                <select name="miembro_id" required defaultValue="" className="rounded-lg border border-stone-300 px-2 py-1 text-xs">
                  <option value="" disabled>Ligar a ficha…</option>
                  <option value="nueva">+ Crear ficha nueva</option>
                  {libres.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
                <Submit variante="btnMini">Ligar</Submit>
              </Formulario>
            )}

            <Formulario action={cambiarRol} className="flex items-center gap-1">
              <input type="hidden" name="id" value={p.id} />
              <select name="rol" defaultValue={p.rol === "admin" ? "admin" : "miembro"} className="rounded-lg border border-stone-300 px-2 py-1 text-xs">
                <option value="miembro">Miembro</option>
                <option value="admin">Admin</option>
              </select>
              <Submit variante="btnMini">Cambiar</Submit>
            </Formulario>
          </li>
        ))}
      </ul>
    </section>
  );
}
