"use client";

import { useActionState, useState } from "react";
import { MESES } from "@/lib/fechas";
import { ui } from "@/lib/ui";
import { generarMes } from "./actions";

export function GenerarForm({ mesSugerido }: { mesSugerido: string }) {
  const [estado, action, pendiente] = useActionState(generarMes, null);
  const [anio, setAnio] = useState(mesSugerido.slice(0, 4));
  const [mes, setMes] = useState(mesSugerido.slice(5, 7));
  const base = Number(mesSugerido.slice(0, 4));
  const anios = [base - 1, base, base + 1, base + 2];

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="mes" value={`${anio}-${mes}`} />
      <label className={ui.label}>
        Mes
        <select value={mes} onChange={(e) => setMes(e.target.value)} className={`${ui.input} w-44`}>
          {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
        </select>
      </label>
      <label className={ui.label}>
        Año
        <select value={anio} onChange={(e) => setAnio(e.target.value)} className={`${ui.input} w-28`}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <button disabled={pendiente} className={ui.btnOro}>
        {pendiente ? "Generando…" : "✦ Generar mes"}
      </button>
      {estado && (
        <p className={`w-full rounded-xl px-3 py-2 text-sm ${estado.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{estado.mensaje}</p>
      )}
    </form>
  );
}
