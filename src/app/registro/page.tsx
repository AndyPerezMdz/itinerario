import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { RegistroForm } from "./RegistroForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crear cuenta" };

export default function Registro() {
  return (
    <AuthShell titulo="Crear cuenta" subtitulo="Para ver el calendario y tus turnos">
      <RegistroForm />
      <p className="mt-5 text-center text-sm text-stone-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-marca hover:text-oro">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}
