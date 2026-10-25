"use client";

import { useActionState } from "react";
import { cambiarContrasena } from "./actions";

export function ContrasenaForm() {
  const [estado, action, pendiente] = useActionState(cambiarContrasena, null);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <label className="block text-sm">
        <span className="font-medium">Nueva contraseña</span>
        <input name="password" type="password" minLength={8} required autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-marca focus:ring-2 focus:ring-oro/30" />
      </label>
      {estado && (
        <p className={`text-sm ${estado.ok ? "text-green-700" : "text-red-600"}`}>{estado.mensaje}</p>
      )}
      <button disabled={pendiente}
        className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-marca-oscuro disabled:opacity-60">
        {pendiente ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
