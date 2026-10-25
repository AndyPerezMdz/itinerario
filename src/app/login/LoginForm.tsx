"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pendiente] = useActionState(iniciarSesion, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        <span className="font-medium">Correo</span>
        <input name="email" type="email" required autoComplete="email"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-marca focus:ring-2 focus:ring-oro/30" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Contraseña</span>
        <input name="password" type="password" required autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-marca focus:ring-2 focus:ring-oro/30" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pendiente}
        className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-marca-oscuro disabled:opacity-60">
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
