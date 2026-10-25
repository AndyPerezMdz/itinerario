"use client";

import { useActionState } from "react";
import { registrarse } from "./actions";

const input =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-marca focus:ring-2 focus:ring-marca/20";

export function RegistroForm() {
  const [estado, action, pendiente] = useActionState(registrarse, null);

  if (estado?.ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        {estado.mensaje}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium">Nombre</span>
        <input name="nombre" required autoComplete="name" className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Correo</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Contraseña</span>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
      </label>
      {estado && !estado.ok && <p className="text-sm text-red-600">{estado.mensaje}</p>}
      <button disabled={pendiente}
        className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendiente ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
