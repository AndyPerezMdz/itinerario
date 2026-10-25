"use client";

import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { registrarse } from "./actions";

export function RegistroForm() {
  const [estado, action, pendiente] = useActionState(registrarse, null);

  if (estado?.ok) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-900">
        <div className="mb-1 text-2xl">✉️</div>
        {estado.mensaje}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className={ui.label}>
        Nombre
        <input name="nombre" required autoComplete="name" placeholder="Como te conocen en la iglesia" className={ui.input} />
      </label>
      <label className={ui.label}>
        Correo
        <input name="email" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" className={ui.input} />
      </label>
      <label className={ui.label}>
        Contraseña
        <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={ui.input} />
      </label>
      {estado && !estado.ok && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{estado.mensaje}</p>}
      <button disabled={pendiente} className={`${ui.btn} w-full`}>
        {pendiente ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
