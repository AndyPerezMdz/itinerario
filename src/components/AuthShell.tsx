import Image from "next/image";
import templo from "../../public/templo.webp";
import logoClaro from "../../public/logo-claro.png";

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
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-marca-oscuro/70 via-marca/60 to-marca-oscuro/90" />

      <Image src={logoClaro} alt="La Luz del Mundo" priority className="mb-8 h-auto w-56 drop-shadow-lg sm:w-64" />

      <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-2xl shadow-black/30 ring-1 ring-white/40 backdrop-blur sm:p-7">
        <h1 className="titulo text-center text-2xl font-semibold text-marca">{titulo}</h1>
        {subtitulo && <p className="mb-6 mt-1 text-center text-sm text-stone-500">{subtitulo}</p>}
        {children}
      </div>

      <p className="mt-8 text-center text-xs tracking-wide text-white/70">
        Colonia Sambulá · Mérida, Yucatán
      </p>
    </main>
  );
}
