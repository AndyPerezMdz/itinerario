import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { ui } from "@/lib/ui";
import { ContrasenaForm } from "./ContrasenaForm";
import { NombreForm } from "./NombreForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tu cuenta" };

export default async function Cuenta() {
  const { user, perfil } = await requerirMiembro();

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-oro">
            {perfil.rol === "admin" ? "Administrador" : "Miembro"}
          </p>
          <h1 className={`${ui.h1} mt-1`}>Tu cuenta</h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>
        </div>
        <NombreForm nombre={perfil.nombre} />
        <ContrasenaForm />
      </main>
    </>
  );
}
