import Link from "next/link";
import type { EventoConDetalle } from "@/lib/tipos";

export function EventoChip({ e, href, resaltar }: { e: EventoConDetalle; href?: string; resaltar?: string | null }) {
  const color = e.actividad?.color ?? "#64748b";
  const nombre = e.titulo ?? e.actividad?.nombre ?? "Evento";
  const gente = e.asignaciones.map((a) => a.miembro).filter(Boolean) as { id: string; nombre: string }[];
  const cancelado = e.estado === "cancelado";

  const contenido = (
    <>
      <div className="font-semibold" style={{ color }}>
        {e.hora && <span className="mr-1 font-normal tabular-nums">{e.hora.slice(0, 5)}</span>}
        {nombre}
      </div>
      {gente.length > 0 && (
        <div className="text-stone-600">
          {gente.map((g, i) => (
            <span key={g.id + i}>
              {i > 0 && " y "}
              <span className={g.id === resaltar ? "font-semibold text-stone-900 underline decoration-2" : ""}>{g.nombre}</span>
            </span>
          ))}
        </div>
      )}
    </>
  );

  const clase = `block rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight ${cancelado ? "opacity-50 line-through" : ""} ${href ? "hover:brightness-95" : ""}`;
  const estilo = { borderColor: color, background: `${color}14` };

  return href ? (
    <Link href={href} className={clase} style={estilo} title={e.notas ?? "Editar"}>{contenido}</Link>
  ) : (
    <div className={clase} style={estilo} title={e.notas ?? undefined}>{contenido}</div>
  );
}
