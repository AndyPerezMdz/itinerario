"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FiltroPersona({
  miembros,
  miId,
}: {
  miembros: { id: string; nombre: string }[];
  miId: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const actual = params.get("persona") ?? "";
  const otra = actual && actual !== miId;

  function cambiar(valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set("persona", valor);
    else p.delete("persona");
    router.push(`/?${p.toString()}`);
  }

  const pill = (activo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      activo ? "bg-marca text-white shadow-md shadow-marca/25" : "text-stone-600 hover:bg-oro-suave hover:text-marca"
    }`;

  return (
    <div className="flex items-center gap-1 rounded-full border border-stone-200/80 bg-white p-1 shadow-sm">
      <button onClick={() => cambiar("")} className={pill(!actual)}>Todos</button>
      {miId && <button onClick={() => cambiar(miId)} className={pill(actual === miId)}>Solo yo</button>}
      <select
        value={otra ? actual : ""}
        onChange={(e) => cambiar(e.target.value)}
        className={`${pill(!!otra)} cursor-pointer outline-none`}
        aria-label="Ver a otra persona"
      >
        <option value="">Persona…</option>
        {miembros.map((m) => <option key={m.id} value={m.id} className="text-stone-900">{m.nombre}</option>)}
      </select>
    </div>
  );
}
