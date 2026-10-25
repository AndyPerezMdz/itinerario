import { ui } from "@/lib/ui";

type M = { nombre: string; email: string | null; telefono: string | null; notas: string | null };

export function MiembroCampos({
  roles,
  m,
  rolesActuales = [],
}: {
  roles: { id: string; nombre: string }[];
  m?: M;
  rolesActuales?: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ui.label}>
          Nombre
          <input name="nombre" required defaultValue={m?.nombre} className={ui.input} />
        </label>
        <label className={ui.label}>
          Teléfono <span className="font-normal text-stone-400">(opcional)</span>
          <input name="telefono" type="tel" defaultValue={m?.telefono ?? ""} className={ui.input} />
        </label>
        <label className={`${ui.label} sm:col-span-2`}>
          Correo <span className="font-normal text-stone-400">(el mismo con el que se registra; así se liga su cuenta sola)</span>
          <input name="email" type="email" defaultValue={m?.email ?? ""} className={ui.input} />
        </label>
      </div>

      <fieldset>
        <legend className={ui.label}>Roles que desempeña</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((r) => (
            <label key={r.id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-sm has-[:checked]:border-marca has-[:checked]:bg-marca/5 has-[:checked]:text-marca">
              <input type="checkbox" name="roles" value={r.id} defaultChecked={rolesActuales.includes(r.id)} className="size-3.5" />
              {r.nombre}
            </label>
          ))}
          {!roles.length && <p className="text-sm text-stone-400">Primero crea roles en “Actividades y roles”.</p>}
        </div>
      </fieldset>

      <label className={ui.label}>
        Notas
        <textarea name="notas" rows={2} defaultValue={m?.notas ?? ""} className={ui.input} />
      </label>
    </div>
  );
}
