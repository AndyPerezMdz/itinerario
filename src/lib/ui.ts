// Clases compartidas para que todos los formularios se vean igual.
const base = "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-60";

export const ui = {
  input:
    "mt-1.5 block w-full rounded-xl border font-normal border-stone-200 bg-stone-50/80 px-3.5 py-2.5 text-[15px] text-tinta outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-oro focus:bg-superficie focus:ring-4 focus:ring-oro/15",
  label: "block text-[13px] font-semibold text-titulo/80",
  btn: `${base} h-11 bg-gradient-to-b from-marca-medio to-marca px-5 text-white shadow-lg shadow-marca/25 ring-1 ring-inset ring-white/10 hover:-translate-y-px hover:shadow-xl hover:shadow-marca/30`,
  btnOro: `${base} h-11 bg-gradient-to-b from-oro-vivo to-oro px-5 text-marca-oscuro shadow-lg shadow-oro/30 ring-1 ring-inset ring-white/30 hover:-translate-y-px hover:shadow-xl`,
  btnSec: `${base} h-11 border border-stone-200 bg-superficie px-4 font-medium text-titulo shadow-sm hover:border-oro/60 hover:bg-oro-suave`,
  btnPeligro: `${base} h-11 border border-red-200 bg-superficie px-4 font-medium text-red-700 hover:bg-red-50`,
  btnMini: "rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-oro-suave hover:text-titulo",
  card: "rounded-3xl border border-stone-200/70 bg-superficie p-6 shadow-[0_1px_2px_rgb(23_32_44/0.04),0_8px_24px_-12px_rgb(23_32_44/0.08)]",
  h1: "titulo text-3xl font-semibold text-titulo",
  h2: "text-base font-semibold text-titulo",
  ayuda: "mt-1 text-sm text-stone-500",
};

export const DIAS_SEMANA = [
  { v: 1, n: "Lunes" }, { v: 2, n: "Martes" }, { v: 3, n: "Miércoles" }, { v: 4, n: "Jueves" },
  { v: 5, n: "Viernes" }, { v: 6, n: "Sábado" }, { v: 7, n: "Domingo" },
];
