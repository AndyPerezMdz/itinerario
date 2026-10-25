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
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 text-sm">
      {TABS.map((t) => {
        const activo = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${
              activo ? "bg-marca text-white shadow-sm" : "text-stone-600 hover:bg-oro-suave hover:text-marca"
            }`}
          >
            {t.n}
          </Link>
        );
      })}
    </nav>
  );
}
