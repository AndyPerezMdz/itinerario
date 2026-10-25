import Link from "next/link";
import { requerirMiembro } from "@/lib/supabase/server";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { hoyISO } from "@/lib/fechas";
import { EventoCampos } from "../EventoCampos";
import { crearEvento } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevoEvento({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { supabase } = await requerirMiembro();
  const { fecha } = await searchParams;
  const { data: actividades } = await supabase
    .from("actividades").select("id, nombre, es_especial").order("nombre");

  const f = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoyISO();

  return (
    <form action={crearEvento} className={`${ui.card} max-w-2xl space-y-5`}>
      <div>
        <h1 className="titulo text-2xl font-semibold text-titulo">Nuevo evento</h1>
        <p className={ui.ayuda}>Después de guardarlo puedes asignarle responsables.</p>
      </div>
      <EventoCampos actividades={actividades ?? []} e={{ actividad_id: "", fecha: f, hora: null, titulo: null, notas: null }} />
      <div className="flex gap-2">
        <Submit>Crear evento</Submit>
        <Link href={`/?mes=${f.slice(0, 7)}`} className={ui.btnSec}>Cancelar</Link>
      </div>
      <p className="text-xs text-stone-400">
        ¿No está la actividad? Agrégala en <Link href="/admin/catalogo" className="underline">Actividades y roles</Link>.
      </p>
    </form>
  );
}
