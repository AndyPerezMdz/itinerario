"use client";

import { useActionState, useState } from "react";
import { ui } from "@/lib/ui";
import { BotonTema } from "@/components/BotonTema";
import { cambiarContrasena, cambiarCorreo, cambiarNombre } from "./actions";

type Estado = { ok: boolean; mensaje: string } | null;
type Tab = "nombre" | "correo" | "contrasena";

const TABS: { id: Tab; n: string }[] = [
  { id: "nombre", n: "Nombre" },
  { id: "correo", n: "Correo" },
  { id: "contrasena", n: "Contraseña" },
];

function Mensaje({ estado }: { estado: Estado }) {
  if (!estado) return null;
  return (
    <p className={`rounded-xl px-3 py-2 text-sm ${estado.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
      {estado.mensaje}
    </p>
  );
}

/** Los ajustes en pestañas: una cosa a la vez, sin scroll. */
export function Ajustes({ nombre, email, tabInicial }: { nombre: string; email: string; tabInicial?: string }) {
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === tabInicial) ? (tabInicial as Tab) : "nombre");
  const [eNombre, aNombre, pNombre] = useActionState(cambiarNombre, null);
  const [eCorreo, aCorreo, pCorreo] = useActionState(cambiarCorreo, null);
  const [eClave, aClave, pClave] = useActionState(cambiarContrasena, null);

  return (
    <section className={`${ui.card} flex flex-col`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={ui.h2}>Ajustes</h2>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          Tema
          <BotonTema className="bg-marca text-white shadow-sm hover:bg-marca-medio" />
        </div>
      </div>

      <div role="tablist" className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 text-sm">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 font-medium transition ${
              tab === t.id ? "bg-superficie text-titulo shadow-sm" : "text-stone-500 hover:text-titulo"
            }`}>
            {t.n}
          </button>
        ))}
      </div>

      {/* Altura fija: las pestañas no hacen brincar la página */}
      <div className="mt-5 lg:min-h-60">
        {tab === "nombre" && (
          <form action={aNombre} className="space-y-4">
            <p className="text-sm text-stone-500">Así te ven los demás en el calendario y en los turnos.</p>
            <label className={ui.label}>
              Tu nombre
              <input name="nombre" defaultValue={nombre} required minLength={2} maxLength={60} autoComplete="name" className={ui.input} />
            </label>
            <Mensaje estado={eNombre} />
            <button disabled={pNombre} className={ui.btn}>{pNombre ? "Guardando…" : "Guardar nombre"}</button>
          </form>
        )}

        {tab === "correo" && (
          <form action={aCorreo} className="space-y-4">
            <p className="text-sm text-stone-500">
              Ahora entras con <b className="text-tinta">{email}</b>. Te mandamos un enlace al correo nuevo para confirmar que es tuyo.
            </p>
            <label className={ui.label}>
              Correo nuevo
              <input name="email" type="email" required autoComplete="email" placeholder="nuevo@correo.com" className={ui.input} />
            </label>
            <Mensaje estado={eCorreo} />
            <button disabled={pCorreo} className={ui.btn}>{pCorreo ? "Enviando…" : "Cambiar correo"}</button>
          </form>
        )}

        {tab === "contrasena" && (
          <form action={aClave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={ui.label}>
                Nueva contraseña
                <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={ui.input} />
              </label>
              <label className={ui.label}>
                Repítela
                <input name="repetir" type="password" minLength={8} required autoComplete="new-password" placeholder="La misma otra vez" className={ui.input} />
              </label>
            </div>
            <Mensaje estado={eClave} />
            <button disabled={pClave} className={ui.btn}>{pClave ? "Guardando…" : "Guardar contraseña"}</button>
          </form>
        )}
      </div>
    </section>
  );
}
