import { ui } from "@/lib/ui";

type Actividad = { id: string; nombre: string; es_especial: boolean };

export function EventoCampos({
  actividades,
  e,
}: {
  actividades: Actividad[];
  e?: { actividad_id: string; fecha: string; hora: string | null; titulo: string | null; notas: string | null };
}) {
  const frecuentes = actividades.filter((a) => !a.es_especial);
  const especiales = actividades.filter((a) => a.es_especial);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${ui.label} sm:col-span-2`}>
        Actividad
        <select name="actividad_id" required defaultValue={e?.actividad_id ?? ""} className={ui.input}>
          <option value="" disabled>Elige…</option>
          <optgroup label="Frecuentes">
            {frecuentes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </optgroup>
          {especiales.length > 0 && (
            <optgroup label="Especiales">
              {especiales.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </optgroup>
          )}
        </select>
      </label>
      <label className={ui.label}>
        Fecha
        <input type="date" name="fecha" required defaultValue={e?.fecha} className={ui.input} />
      </label>
      <label className={ui.label}>
        Hora <span className="font-normal text-stone-400">(opcional)</span>
        <input type="time" name="hora" defaultValue={e?.hora?.slice(0, 5) ?? ""} className={ui.input} />
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        Título personalizado <span className="font-normal text-stone-400">(opcional, p. ej. “Dominical de visitas”)</span>
        <input name="titulo" defaultValue={e?.titulo ?? ""} className={ui.input} />
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        Notas
        <textarea name="notas" rows={2} defaultValue={e?.notas ?? ""} className={ui.input} />
      </label>
    </div>
  );
}
