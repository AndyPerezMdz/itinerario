"use client";

import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { iniciarSesion } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pendiente] = useActionState(iniciarSesion, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className={ui.label}>
        Correo
        <input name="email" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" className={ui.input} />
      </label>
      <label className={ui.label}>
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={ui.input} />
      </label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={pendiente} className={`${ui.btn} w-full`}>
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
