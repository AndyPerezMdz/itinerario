import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { puedeEditar, type RolApp } from "@/lib/tipos";

export function Nav({ nombre, rol }: { nombre: string; rol: RolApp }) {
  return (
    <header className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-marca">
          Itinerario
        </Link>
        <nav className="flex gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-stone-100">Calendario</Link>
          <Link href="/mis-turnos" className="rounded-md px-3 py-1.5 hover:bg-stone-100">Mis turnos</Link>
          {puedeEditar(rol) && (
            <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-stone-100">Administrar</Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-stone-500 sm:inline">{nombre}</span>
          <form action={cerrarSesion}>
            <button className="rounded-md border border-stone-200 px-3 py-1.5 hover:bg-stone-50">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
