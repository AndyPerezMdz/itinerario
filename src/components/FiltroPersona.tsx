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

  function cambiar(valor: string) {
    const p = new URLSearchParams(params);
    if (valor) p.set("persona", valor);
    else p.delete("persona");
    router.push(`/?${p.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5 text-sm shadow-sm">
      <button onClick={() => cambiar("")}
        className={`rounded-md px-3 py-1 ${!actual ? "bg-marca text-white" : "hover:bg-stone-100"}`}>
        Todos
      </button>
      {miId && (
        <button onClick={() => cambiar(miId)}
          className={`rounded-md px-3 py-1 ${actual === miId ? "bg-marca text-white" : "hover:bg-stone-100"}`}>
          Solo yo
        </button>
      )}
      <select
        value={actual && actual !== miId ? actual : ""}
        onChange={(e) => cambiar(e.target.value)}
        className={`rounded-md bg-transparent px-2 py-1 outline-none ${actual && actual !== miId ? "bg-marca text-white" : ""}`}
        aria-label="Ver a otra persona"
      >
        <option value="">Persona…</option>
        {miembros.map((m) => <option key={m.id} value={m.id} className="text-stone-900">{m.nombre}</option>)}
      </select>
    </div>
  );
}
