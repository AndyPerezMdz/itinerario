import Image from "next/image";
import templo from "../../public/templo.webp";
import logoClaro from "../../public/logo-claro.png";
import { BotonTema } from "./BotonTema";

/** Fondo del templo con blur + logo, para login y registro. */
export function AuthShell({ titulo, subtitulo, children }: {
  titulo: string; subtitulo?: string; children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Foto con blur (scale para que el blur no deje bordes) */}
      <Image
        src={templo}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="-z-20 scale-110 object-cover blur-[6px]"
      />
      {/* Velo azul para que se lea todo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-marca-oscuro/75 via-marca/55 to-marca-oscuro/95" />
      <div className="rayos absolute inset-0 -z-10 opacity-80" />

      <BotonTema className="absolute right-4 top-4 bg-white/10 ring-1 ring-white/20 backdrop-blur" />

      <Image src={logoClaro} alt="La Luz del Mundo" priority className="mb-8 h-auto w-56 drop-shadow-lg sm:w-64" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-superficie/95 p-7 shadow-2xl shadow-black/40 ring-1 ring-white/40 backdrop-blur sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-oro/0 via-oro-vivo to-oro/0" />
        <h1 className="titulo text-center text-3xl font-semibold text-titulo">{titulo}</h1>
        {subtitulo && <p className="mb-7 mt-1.5 text-center text-sm text-stone-500">{subtitulo}</p>}
        {children}
      </div>

      <p className="mt-8 text-center text-xs tracking-wide text-white/70">
        Colonia Sambulá · Mérida, Yucatán
      </p>
    </main>
  );
}
