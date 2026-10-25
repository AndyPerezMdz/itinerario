import type { EventoConDetalle } from "@/lib/tipos";

export function EventoChip({ e }: { e: EventoConDetalle }) {
  const color = e.actividad?.color ?? "#64748b";
  const nombre = e.titulo ?? e.actividad?.nombre ?? "Evento";
  const gente = e.asignaciones
    .map((a) => a.miembro?.nombre)
    .filter(Boolean)
    .join(" y ");
  const cancelado = e.estado === "cancelado";

  return (
    <div
      className={`rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight ${cancelado ? "opacity-50 line-through" : ""}`}
      style={{ borderColor: color, background: `${color}14` }}
      title={e.notas ?? undefined}
    >
      <div className="font-semibold" style={{ color }}>
        {e.hora && <span className="mr-1 font-normal tabular-nums">{e.hora.slice(0, 5)}</span>}
        {nombre}
      </div>
      {gente && <div className="text-stone-600">{gente}</div>}
    </div>
  );
}
