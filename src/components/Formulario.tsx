"use client";

import { useActionState, useEffect, useState } from "react";
import type { Resultado } from "@/lib/forms";

type Accion = (prev: Resultado, fd: FormData) => Promise<Resultado>;
type Detalle = { resultado: NonNullable<Resultado>; silencioso: boolean };

/**
 * <form> para acciones del admin. El resultado (éxito o error) se manda a <Avisos />,
 * que vive en el layout: así el aviso sale aunque este formulario desaparezca
 * (p. ej. al borrar la fila donde estaba).
 */
export function Formulario({
  action,
  className,
  children,
  silencioso = false,
}: {
  action: Accion;
  className?: string;
  children: React.ReactNode;
  /** true = no avisar cuando sale bien (acciones chiquitas tipo "subir turno") */
  silencioso?: boolean;
}) {
  const [, formAction] = useActionState(async (prev: Resultado, fd: FormData) => {
    const r = await action(prev, fd);
    if (r) window.dispatchEvent(new CustomEvent<Detalle>("aviso", { detail: { resultado: r, silencioso } }));
    return r;
  }, null);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

/** Un solo aviso flotante para toda la app. Va una vez en el layout raíz. */
export function Avisos() {
  const [aviso, setAviso] = useState<NonNullable<Resultado> | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const mostrar = (e: Event) => {
      const { resultado, silencioso } = (e as CustomEvent<Detalle>).detail;
      if (resultado.ok && silencioso) return;
      clearTimeout(t);
      setAviso(resultado);
      t = setTimeout(() => setAviso(null), resultado.ok ? 2500 : 6000);
    };
    window.addEventListener("aviso", mostrar);
    return () => {
      window.removeEventListener("aviso", mostrar);
      clearTimeout(t);
    };
  }, []);

  if (!aviso) return null;

  return (
    <div role="status" aria-live="polite" key={aviso.t}
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 [animation:entrar_.25s_ease-out]">
      <div className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl ring-1 backdrop-blur ${
        aviso.ok ? "bg-marca/95 text-white ring-white/10" : "bg-superficie/95 text-tinta ring-red-300"
      }`}>
        <span className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          aviso.ok ? "bg-oro-vivo text-marca-oscuro" : "bg-[#e5484d] text-white"
        }`}>
          {aviso.ok ? "✓" : "!"}
        </span>
        <span className="leading-snug">{aviso.mensaje}</span>
        <button type="button" onClick={() => setAviso(null)} className="-mr-1 ml-1 opacity-50 hover:opacity-100" aria-label="Cerrar">✕</button>
      </div>
    </div>
  );
}
