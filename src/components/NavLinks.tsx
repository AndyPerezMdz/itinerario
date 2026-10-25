"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; n: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm">
      {links.map((l) => {
        const activo = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative whitespace-nowrap px-3 py-2 transition-colors ${
              activo ? "font-semibold text-white" : "text-white/65 hover:text-white"
            }`}
          >
            {l.n}
            {activo && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-oro-claro" />}
          </Link>
        );
      })}
    </nav>
  );
}
