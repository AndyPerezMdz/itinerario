"use client";

import { useActionState } from "react";
import { generarMes } from "./actions";

export function GenerarForm({ mesSugerido }: { mesSugerido: string }) {
  const [estado, action, pendiente] = useActionState(generarMes, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="font-medium">Mes</span>
        <input type="month" name="mes" defaultValue={mesSugerido} required
          className="mt-1 block rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <button disabled={pendiente}
        className="rounded-lg bg-marca px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-marca-oscuro disabled:opacity-60">
        {pendiente ? "Generando…" : "Generar mes"}
      </button>
      {estado && (
        <p className={`w-full text-sm ${estado.ok ? "text-green-700" : "text-red-600"}`}>{estado.mensaje}</p>
      )}
    </form>
  );
}
