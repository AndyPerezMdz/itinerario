"use client";

import { useState } from "react";
import { DIAS_SEMANA, ui } from "@/lib/ui";
import { Submit } from "@/components/Submit";
import { crearRegla } from "./actions";

type Op = { id: string; nombre: string };

export function ReglaForm({ actividades, rotaciones, hoy }: { actividades: Op[]; rotaciones: Op[]; hoy: string }) {
  const [tipo, setTipo] = useState("semanal");

  return (
    <form action={crearRegla} className="grid gap-4 sm:grid-cols-2">
      <label className={ui.label}>
        Actividad
        <select name="actividad_id" required defaultValue="" className={ui.input}>
          <option value="" disabled>Elige…</option>
          {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>

      <label className={ui.label}>
        ¿Cada cuándo?
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={ui.input}>
          <option value="semanal">Cada semana / cada N semanas</option>
          <option value="mensual_dia">Un día fijo del mes (ej. el 14)</option>
          <option value="mensual_ordinal">Ej. “el último jueves del mes”</option>
        </select>
      </label>

      {tipo !== "mensual_dia" && (
        <label className={ui.label}>
          Día de la semana
          <select name="dia_semana" required defaultValue="7" className={ui.input}>
            {DIAS_SEMANA.map((d) => <option key={d.v} value={d.v}>{d.n}</option>)}
          </select>
        </label>
      )}
      {tipo === "semanal" && (
        <label className={ui.label}>
          Cada cuántas semanas
          <input type="number" name="intervalo_semanas" min={1} max={8} defaultValue={1} className={ui.input} />
        </label>
      )}
      {tipo === "mensual_dia" && (
        <label className={ui.label}>
          Día del mes
          <input type="number" name="dia_mes" min={1} max={31} required defaultValue={1} className={ui.input} />
        </label>
      )}
      {tipo === "mensual_ordinal" && (
        <label className={ui.label}>
          ¿Cuál?
          <select name="ordinal" defaultValue="-1" className={ui.input}>
            <option value="1">Primero</option>
            <option value="2">Segundo</option>
            <option value="3">Tercero</option>
            <option value="4">Cuarto</option>
            <option value="-1">Último</option>
          </select>
        </label>
      )}

      <label className={ui.label}>
        Hora <span className="font-normal text-stone-400">(opcional)</span>
        <input type="time" name="hora" className={ui.input} />
      </label>
      <label className={ui.label}>
        Desde
        <input type="date" name="vigente_desde" required defaultValue={hoy} className={ui.input} />
      </label>
      <label className={ui.label}>
        Hasta <span className="font-normal text-stone-400">(vacío = sin fin)</span>
        <input type="date" name="vigente_hasta" className={ui.input} />
      </label>

      <label className={ui.label}>
        Responsables por rotación <span className="font-normal text-stone-400">(opcional)</span>
        <select name="rotacion_id" defaultValue="" className={ui.input}>
          <option value="">Sin rotación</option>
          {rotaciones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </label>
      <label className={ui.label}>
        Ese día reemplaza a… <span className="font-normal text-stone-400">(opcional)</span>
        <select name="reemplaza_actividad_id" defaultValue="" className={ui.input}>
          <option value="">Nada</option>
          {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>

      <div className="sm:col-span-2">
        <Submit>Crear regla</Submit>
      </div>
    </form>
  );
}
