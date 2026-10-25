import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { ContrasenaForm } from "./ContrasenaForm";

export const dynamic = "force-dynamic";

export default async function Cuenta() {
  const { user, perfil } = await requerirMiembro();

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="titulo text-2xl font-semibold text-marca">Tu cuenta</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">{user.email}</p>
        <ContrasenaForm />
      </main>
    </>
  );
}
