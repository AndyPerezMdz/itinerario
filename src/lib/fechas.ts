// Todo se maneja como "YYYY-MM-DD" para no pelearse con zonas horarias.

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** "2026-11" → { anio, mes (1-12) }; inválido o vacío → mes actual en Mérida */
export function parseMes(valor?: string) {
  const m = valor?.match(/^(\d{4})-(\d{2})$/);
  if (m) return { anio: +m[1], mes: +m[2] };
  const hoy = hoyISO();
  return { anio: +hoy.slice(0, 4), mes: +hoy.slice(5, 7) };
}

export function hoyISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida" }).format(new Date());
}

export function mesClave(anio: number, mes: number) {
  const d = new Date(Date.UTC(anio, mes - 1, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Semanas (lunes a domingo) que cubren el mes. */
export function cuadricula(anio: number, mes: number) {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const offset = (primero.getUTCDay() + 6) % 7; // lunes = 0
  const inicio = new Date(primero);
  inicio.setUTCDate(1 - offset);

  const ultimo = new Date(Date.UTC(anio, mes, 0));
  const totalSemanas = Math.ceil((offset + ultimo.getUTCDate()) / 7);
  const semanas: string[][] = [];
  const d = new Date(inicio);
  for (let s = 0; s < totalSemanas; s++) {
    const semana: string[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(iso(d));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    semanas.push(semana);
  }
  return {
    semanas,
    desde: semanas[0][0],
    hasta: semanas[semanas.length - 1][6],
    primerDia: iso(primero),
    ultimoDia: iso(ultimo),
  };
}

/** "Domingo, 1 de noviembre" (solo la primera letra en mayúscula, como debe ser). */
export function fechaLarga(f: string) {
  const d = new Date(f + "T12:00:00Z");
  const t = new Intl.DateTimeFormat("es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "1 oct 2027" */
export function fechaCorta(f: string) {
  const d = new Date(f + "T12:00:00Z");
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(d).replace(".", "");
}
