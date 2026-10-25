"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { ui } from "@/lib/ui";

/**
 * Botón de envío. Con `confirmar`, antes de enviar abre un modal propio
 * (nada de window.confirm, que se ve horrible).
 */
export function Submit({
  children,
  variante = "btn",
  confirmar,
  name,
  value,
}: {
  children: React.ReactNode;
  variante?: keyof typeof ui;
  confirmar?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const boton = useRef<HTMLButtonElement>(null);
  const [preguntando, setPreguntando] = useState(false);

  return (
    <>
      <button
        ref={boton}
        type="submit"
        name={name}
        value={value}
        disabled={pending}
        className={ui[variante]}
        onClick={(e) => {
          if (confirmar) {
            e.preventDefault();
            setPreguntando(true);
          }
        }}
      >
        {pending ? "…" : children}
      </button>

      {preguntando && confirmar && createPortal(
        <Confirmar
          mensaje={confirmar}
          peligro={variante === "btnPeligro" || /borrar|quitar|eliminar/i.test(confirmar)}
          onCancelar={() => setPreguntando(false)}
          onAceptar={() => {
            setPreguntando(false);
            const b = boton.current;
            // requestSubmit con el botón conserva su name/value; no vuelve a disparar onClick
            b?.form?.requestSubmit(b);
          }}
        />,
        document.body,
      )}
    </>
  );
}

function Confirmar({
  mensaje,
  peligro,
  onAceptar,
  onCancelar,
}: {
  mensaje: string;
  peligro: boolean;
  onAceptar: () => void;
  onCancelar: () => void;
}) {
  // Separa "¿Borrar X?" del texto de ayuda que venga después
  const [pregunta, ...resto] = mensaje.split(/(?<=\?)\s+/);
  const detalle = resto.join(" ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-marca-oscuro/50 p-4 backdrop-blur-sm sm:items-center [animation:aparecer_.15s_ease-out]"
      onClick={onCancelar}
      onKeyDown={(e) => e.key === "Escape" && onCancelar()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-superficie p-6 text-left shadow-2xl ring-1 ring-stone-200 [animation:entrar_.2s_ease-out]"
      >
        <div className={`absolute inset-x-0 top-0 h-1 ${peligro ? "bg-gradient-to-r from-red-400/0 via-red-500 to-red-400/0" : "bg-gradient-to-r from-oro/0 via-oro-vivo to-oro/0"}`} />
        <div className={`mb-4 flex size-11 items-center justify-center rounded-2xl ${peligro ? "bg-red-50 text-red-600" : "bg-oro-suave text-oro"}`}>
          {peligro ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          ) : (
            <span className="text-lg font-bold">?</span>
          )}
        </div>
        <h2 id="confirmar-titulo" className="text-lg font-semibold text-titulo">{pregunta}</h2>
        {detalle && <p className="mt-1.5 text-sm text-stone-500">{detalle}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={onCancelar} className={ui.btnSec}>Cancelar</button>
          <button type="button" onClick={onAceptar}
            className={peligro ? ui.btnRojo : ui.btn}>
            {peligro ? "Sí, borrar" : "Sí, continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
