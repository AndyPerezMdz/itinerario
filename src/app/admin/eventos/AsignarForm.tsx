"use client";

import Link from "next/link";
import { useState } from "react";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { asignar } from "./actions";

type Miembro = { id: string; nombre: string; roles: string[] };

/** Primero el rol; luego solo aparecen las personas que tienen ese rol en su ficha. */
export function AsignarForm({
  eventoId,
  roles,
  miembros,
  yaAsignados,
}: {
  eventoId: string;
  roles: { id: string; nombre: string }[];
  miembros: Miembro[];
  /** "miembro:rol" ya puestos en este evento, para no ofrecerlos otra vez */
  yaAsignados: string[];
}) {
  const [rol, setRol] = useState("");
  const candidatos = rol
    ? miembros.filter((m) => m.roles.includes(rol) && !yaAsignados.includes(`${m.id}:${rol}`))
    : [];

  return (
    <Formulario action={asignar} silencioso className="mt-4 space-y-2 border-t border-stone-100 pt-4">
      <input type="hidden" name="evento_id" value={eventoId} />
      <select name="rol_id" required value={rol} onChange={(e) => setRol(e.target.value)} className={ui.input}>
        <option value="" disabled>Primero el rol…</option>
        {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>

      <select name="miembro_id" required defaultValue="" key={rol} disabled={!rol || !candidatos.length} className={`${ui.input} disabled:opacity-50`}>
        <option value="" disabled>
          {!rol ? "Persona…" : candidatos.length ? "Persona…" : "Nadie disponible con este rol"}
        </option>
        {candidatos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>

      {rol && !candidatos.length && (
        <p className="text-xs text-stone-500">
          Para que alguien salga aquí, márcale este rol en su ficha de{" "}
          <Link href="/admin/miembros" className="font-medium text-titulo underline">Miembros</Link>.
        </p>
      )}

      <Submit variante="btnSec">+ Asignar</Submit>
    </Formulario>
  );
}
