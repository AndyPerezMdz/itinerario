"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Íconos simples en línea (sin librerías)
const I = {
  resumen: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  miembros: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8",
  catalogo: "M4 6h16M4 12h16M4 18h10",
  reglas: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  rotaciones: "M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8M21 4v5h-5M3 20v-5h5",
  cuentas: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
};

const TABS = [
  { href: "/admin", n: "Resumen", i: I.resumen },
  { href: "/admin/miembros", n: "Miembros", i: I.miembros },
  { href: "/admin/catalogo", n: "Actividades y roles", i: I.catalogo },
  { href: "/admin/reglas", n: "Reglas", i: I.reglas },
  { href: "/admin/rotaciones", n: "Rotaciones", i: I.rotaciones },
  { href: "/admin/usuarios", n: "Cuentas", i: I.cuentas },
];

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** Menú del admin: lateral y fijo en escritorio, píldoras deslizables en celular. */
export function AdminTabs() {
  const path = usePathname();
  const activo = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-24 hidden self-start lg:block">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-oro">Administrar</p>
        <nav className="space-y-1">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activo(t.href)
                  ? "bg-marca text-white shadow-lg shadow-marca/25"
                  : "text-stone-600 hover:bg-superficie hover:text-titulo hover:shadow-sm"
              }`}>
              <Icono d={t.i} />
              {t.n}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Celular / tablet */}
      <div className="sin-scroll -mx-4 overflow-x-auto px-4 lg:hidden">
        <nav className="inline-flex gap-1 rounded-full border border-stone-200/80 bg-superficie p-1 text-sm shadow-sm">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium transition ${
                activo(t.href) ? "bg-marca text-white shadow-md shadow-marca/25" : "text-stone-600 hover:bg-oro-suave hover:text-titulo"
              }`}>
              <Icono d={t.i} />
              {t.n}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
