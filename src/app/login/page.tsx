import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-marca">Itinerario</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          Calendario de actividades. Solo para miembros.
        </p>
        {error === "link" && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Ese enlace ya expiró o ya se usó. Inicia sesión normalmente.
          </p>
        )}
        <LoginForm next={next ?? "/"} />
        <p className="mt-5 text-center text-sm text-stone-500">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-marca hover:underline">Regístrate</Link>
        </p>
      </div>
    </main>
  );
}
