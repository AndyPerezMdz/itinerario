"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; n: string }[] }) {
  const path = usePathname();
  return (
    <nav className="sin-scroll flex gap-1 overflow-x-auto text-sm">
      {links.map((l) => {
        const activo = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 transition ${
              activo
                ? "bg-white/12 font-semibold text-white ring-1 ring-inset ring-oro-claro/40"
                : "text-white/65 hover:bg-white/8 hover:text-white"
            }`}
          >
            {l.n}
          </Link>
        );
      })}
    </nav>
  );
}
