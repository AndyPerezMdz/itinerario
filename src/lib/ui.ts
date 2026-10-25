// Clases compartidas para que todos los formularios se vean igual.
export const ui = {
  input:
    "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-oro/30",
  label: "block text-sm font-medium text-stone-700",
  btn: "inline-flex items-center justify-center gap-1.5 rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-marca-oscuro disabled:opacity-60",
  btnSec:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:border-oro hover:bg-oro-suave disabled:opacity-60",
  btnPeligro:
    "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50",
  btnMini: "rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800",
  card: "rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-900/[0.03]",
  h2: "font-semibold text-marca",
  ayuda: "mt-1 text-sm text-stone-500",
  h1: "titulo text-2xl font-semibold text-marca",
};

export const DIAS_SEMANA = [
  { v: 1, n: "Lunes" }, { v: 2, n: "Martes" }, { v: 3, n: "Miércoles" }, { v: 4, n: "Jueves" },
  { v: 5, n: "Viernes" }, { v: 6, n: "Sábado" }, { v: 7, n: "Domingo" },
];
