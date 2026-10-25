import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthShell titulo="Itinerario" subtitulo="Calendario de actividades de la congregación">
      {error === "link" && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Ese enlace ya expiró o ya se usó. Inicia sesión normalmente.
        </p>
      )}
      <LoginForm next={next ?? "/"} />
      <p className="mt-5 text-center text-sm text-stone-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-titulo hover:text-oro">Regístrate</Link>
      </p>
    </AuthShell>
  );
}
