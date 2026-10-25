import Image from "next/image";
import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { puedeEditar, type RolApp } from "@/lib/tipos";
import antorcha from "../../public/antorcha-clara.png";
import { BotonTema } from "./BotonTema";
import { NavLinks } from "./NavLinks";

export function Nav({ nombre, rol }: { nombre: string; rol: RolApp }) {
  const links = [
    { href: "/", n: "Calendario" },
    { href: "/mis-turnos", n: "Mis turnos" },
    ...(puedeEditar(rol) ? [{ href: "/admin", n: "Administrar" }] : []),
  ];
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="no-print sticky top-0 z-20 border-b border-oro/30 bg-marca/95 text-white shadow-lg shadow-marca/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src={antorcha} alt="" className="h-9 w-auto" priority />
          <span className="leading-none">
            <span className="titulo block text-lg font-semibold">Itinerario</span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-oro-claro">La Luz del Mundo</span>
          </span>
        </Link>

        <div className="hidden md:block">
          <NavLinks links={links} />
        </div>

        <div className="ml-auto flex items-center gap-1 text-sm">
          <BotonTema />
          <Link href="/cuenta" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-white/10" title="Tu cuenta">
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-oro-claro to-oro text-sm font-bold text-marca-oscuro ring-2 ring-white/20">
              {inicial}
            </span>
            <span className="hidden max-w-32 truncate text-white/85 sm:inline">{nombre}</span>
          </Link>
          <form action={cerrarSesion}>
            <button className="rounded-full px-3 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">Salir</button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10 px-3 py-1.5 md:hidden">
        <NavLinks links={links} />
      </div>
    </header>
  );
}
