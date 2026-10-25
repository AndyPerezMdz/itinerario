"use client";

import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { cambiarContrasena } from "./actions";

export function ContrasenaForm() {
  const [estado, action, pendiente] = useActionState(cambiarContrasena, null);

  return (
    <form action={action} className={`${ui.card} space-y-4`}>
      <h2 className={ui.h2}>Cambiar contraseña</h2>
      <label className={ui.label}>
        Nueva contraseña
        <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={ui.input} />
      </label>
      {estado && (
        <p className={`rounded-xl px-3 py-2 text-sm ${estado.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{estado.mensaje}</p>
      )}
      <button disabled={pendiente} className={ui.btn}>
        {pendiente ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
