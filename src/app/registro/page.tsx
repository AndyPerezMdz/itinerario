import Link from "next/link";
import { RegistroForm } from "./RegistroForm";

export const dynamic = "force-dynamic";

export default function Registro() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-marca">Crear cuenta</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          Regístrate para ver el calendario y tus turnos.
        </p>
        <RegistroForm />
        <p className="mt-5 text-center text-sm text-stone-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-marca hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
