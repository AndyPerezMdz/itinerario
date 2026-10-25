import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cinzel";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Itinerario · La Luz del Mundo", template: "%s · Itinerario" },
  description: "Calendario de actividades de la congregación",
};

export const viewport: Viewport = { themeColor: "#0a3156" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
