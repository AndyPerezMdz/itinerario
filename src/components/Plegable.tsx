/** Sección que se abre y se cierra (sin JavaScript, con <details>). */
export function Plegable({
  titulo,
  detalle,
  abierto = false,
  children,
  acento = false,
}: {
  titulo: React.ReactNode;
  detalle?: React.ReactNode;
  abierto?: boolean;
  children: React.ReactNode;
  acento?: boolean;
}) {
  return (
    <details
      open={abierto}
      className={`group rounded-3xl border bg-superficie shadow-[0_1px_2px_rgb(23_32_44/0.04),0_8px_24px_-12px_rgb(23_32_44/0.08)] open:shadow-[0_12px_32px_-12px_rgb(23_32_44/0.18)] ${
        acento ? "border-oro/40" : "border-stone-200/70"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-titulo">{titulo}</div>
          {detalle && <div className="mt-0.5 text-sm text-stone-500">{detalle}</div>}
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-oro-suave text-oro transition group-open:rotate-45">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </summary>
      <div className="border-t border-stone-100 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}
