"use client";

export default function ErrorAdmin({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <p className="font-semibold">No se pudo completar.</p>
      <p className="mt-1">{error.message || "Algo falló. Intenta de nuevo."}</p>
      <button onClick={reset} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 hover:bg-red-100">
        Volver
      </button>
    </div>
  );
}
