"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ui } from "@/lib/ui";
import { ModalConfirmar } from "./Modal";
import { useEnviando } from "./Formulario";

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
  const { pending: pendienteNativo } = useFormStatus();
  const enviando = useEnviando();
  const pending = pendienteNativo || enviando;
  const boton = useRef<HTMLButtonElement>(null);
  const [preguntando, setPreguntando] = useState(false);

  // "¿Borrar X? Texto de ayuda" → título + detalle
  const [titulo, ...resto] = (confirmar ?? "").split(/(?<=\?)\s+/);
  const peligro = variante === "btnPeligro" || /borrar|quitar|eliminar/i.test(confirmar ?? "");

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

      {preguntando && confirmar && (
        <ModalConfirmar
          titulo={titulo}
          detalle={resto.join(" ") || undefined}
          opciones={[{ valor: "si", texto: peligro ? "Sí, borrar" : "Sí, continuar", peligro }]}
          onCancelar={() => setPreguntando(false)}
          onElegir={() => {
            setPreguntando(false);
            const b = boton.current;
            // requestSubmit con el botón conserva su name/value; no vuelve a disparar onClick
            b?.form?.requestSubmit(b);
          }}
        />
      )}
    </>
  );
}
