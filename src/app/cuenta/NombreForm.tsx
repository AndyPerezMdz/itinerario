"use client";

import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { cambiarNombre } from "./actions";

export function NombreForm({ nombre }: { nombre: string }) {
  const [estado, action, pendiente] = useActionState(cambiarNombre, null);

  return (
    <form action={action} className={`${ui.card} space-y-4`}>
      <div>
        <h2 className={ui.h2}>Tu nombre</h2>
        <p className={ui.ayuda}>Así te ven los demás en el calendario y en los turnos.</p>
      </div>
      <label className={ui.label}>
        Nombre
        <input name="nombre" defaultValue={nombre} required minLength={2} maxLength={60} autoComplete="name" className={ui.input} />
      </label>
      {estado && (
        <p className={`rounded-xl px-3 py-2 text-sm ${estado.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{estado.mensaje}</p>
      )}
      <button disabled={pendiente} className={ui.btn}>
        {pendiente ? "Guardando…" : "Guardar nombre"}
      </button>
    </form>
  );
}
