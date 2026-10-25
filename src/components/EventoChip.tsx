import Link from "next/link";
import type { EventoConDetalle } from "@/lib/tipos";

export function EventoChip({
  e,
  href,
  resaltar,
  grande = false,
}: {
  e: EventoConDetalle;
  href?: string;
  resaltar?: string | null;
  grande?: boolean;
}) {
  const color = e.actividad?.color ?? "#64748b";
  const nombre = e.titulo ?? e.actividad?.nombre ?? "Evento";
  const gente = e.asignaciones.map((a) => a.miembro).filter(Boolean) as { id: string; nombre: string }[];
  const cancelado = e.estado === "cancelado";
  const especial = e.actividad?.es_especial;

  const contenido = (
    <>
      <div className="flex items-start gap-1.5">
        <span className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className={`chip-texto font-semibold leading-snug ${cancelado ? "line-through" : ""}`}>
          {especial && <span className="mr-0.5">✦</span>}
          {nombre}
        </span>
        {e.hora && (
          <span className="ml-auto shrink-0 pl-1 tabular-nums text-stone-400">{e.hora.slice(0, 5)}</span>
        )}
      </div>
      {gente.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 pl-3">
          {gente.map((g, i) => (
            <span
              key={g.id + i}
              className={`rounded-full px-1.5 py-px ${
                g.id === resaltar
                  ? "bg-marca font-semibold text-white"
                  : "bg-superficie/80 text-stone-600 ring-1 ring-inset ring-stone-900/5"
              }`}
            >
              {g.nombre}
            </span>
          ))}
        </div>
      )}
      {cancelado && <div className="mt-0.5 pl-3 text-[10px] font-semibold uppercase tracking-wide text-red-500">Cancelado</div>}
    </>
  );

  const clase = `chip block rounded-xl px-2 py-1.5 ${grande ? "text-[13px]" : "text-[11px]"} transition ${
    cancelado ? "opacity-60" : ""
  } ${href ? "hover:-translate-y-px hover:shadow-md" : ""}`;
  const estilo = { "--c": color } as React.CSSProperties;

  return href ? (
    <Link href={href} className={clase} style={estilo} title={e.notas ?? "Editar"}>{contenido}</Link>
  ) : (
    <div className={clase} style={estilo} title={e.notas ?? undefined}>{contenido}</div>
  );
}
