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
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr] lg:gap-8">
        <AdminTabs />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
