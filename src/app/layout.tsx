import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cinzel";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Itinerario · La Luz del Mundo", template: "%s · Itinerario" },
  description: "Calendario de actividades de la congregación",
};

export const viewport: Viewport = { themeColor: "#0a3156" };

// Se ejecuta antes de pintar para que no haya parpadeo blanco en modo oscuro.
// Prioridad: lo que eligió la persona → tema del sistema.
const temaInicial = `(function(){try{var t=localStorage.getItem("tema");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"oscuro":"claro"}if(t==="oscuro")document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
