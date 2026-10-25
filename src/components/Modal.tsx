"use client";

import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";

export type OpcionModal = { valor: string; texto: string; peligro?: boolean };

/** Modal de confirmación con el diseño de la app. Se monta en <body> para que nada lo tape. */
export function ModalConfirmar({
  titulo,
  detalle,
  opciones,
  onElegir,
  onCancelar,
}: {
  titulo: string;
  detalle?: string;
  opciones: OpcionModal[];
  onElegir: (valor: string) => void;
  onCancelar: () => void;
}) {
  const peligro = opciones.some((o) => o.peligro);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-marca-oscuro/50 p-4 backdrop-blur-sm sm:items-center [animation:aparecer_.15s_ease-out]"
      onClick={onCancelar}
      onKeyDown={(e) => e.key === "Escape" && onCancelar()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-superficie p-6 text-left shadow-2xl ring-1 ring-stone-200 [animation:entrar_.2s_ease-out]"
      >
        <div className={`absolute inset-x-0 top-0 h-1 ${peligro ? "bg-gradient-to-r from-red-400/0 via-[#e5484d] to-red-400/0" : "bg-gradient-to-r from-oro/0 via-oro-vivo to-oro/0"}`} />
        <div className={`mb-4 flex size-11 items-center justify-center rounded-2xl ${peligro ? "bg-red-50 text-[#e5484d]" : "bg-oro-suave text-oro"}`}>
          {peligro ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          ) : (
            <span className="text-lg font-bold">?</span>
          )}
        </div>
        <h2 id="modal-titulo" className="text-lg font-semibold leading-snug text-titulo">{titulo}</h2>
        {detalle && <p className="mt-1.5 whitespace-pre-line text-sm text-stone-500">{detalle}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" autoFocus onClick={onCancelar} className={ui.btnSec}>Cancelar</button>
          {opciones.map((o) => (
            <button key={o.valor} type="button" onClick={() => onElegir(o.valor)}
              className={o.peligro ? ui.btnRojo : opciones.length > 1 && !o.peligro ? ui.btnSec : ui.btn}>
              {o.texto}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
