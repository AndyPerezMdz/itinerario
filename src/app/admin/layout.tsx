import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";
import { puedeEditar } from "@/lib/tipos";
import { AdminTabs } from "./AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requerirMiembro();
  if (!puedeEditar(perfil.rol)) redirect("/");

  return (
    <>
      <Nav nombre={perfil.nombre} rol={perfil.rol} />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <AdminTabs />
        <div className="mt-6">{children}</div>
      </div>
    </>
  );
}
