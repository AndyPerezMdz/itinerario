"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", n: "Resumen" },
  { href: "/admin/miembros", n: "Miembros" },
  { href: "/admin/catalogo", n: "Actividades y roles" },
  { href: "/admin/reglas", n: "Reglas" },
  { href: "/admin/rotaciones", n: "Rotaciones" },
  { href: "/admin/usuarios", n: "Cuentas" },
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <div className="sin-scroll -mx-4 overflow-x-auto px-4">
      <nav className="inline-flex gap-1 rounded-full border border-stone-200/80 bg-white p-1 text-sm shadow-sm">
        {TABS.map((t) => {
          const activo = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 font-medium transition ${
                activo ? "bg-marca text-white shadow-md shadow-marca/25" : "text-stone-600 hover:bg-oro-suave hover:text-marca"
              }`}
            >
              {t.n}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
