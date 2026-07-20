import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./forge-theme.css";

export const metadata: Metadata = {
  title: "OLYMPUS AI — Treine com inteligência",
  description: "Treine com inteligência. Evolua sem limites.",
  applicationName: "OLYMPUS AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OLYMPUS AI",
  },
  icons: {
    icon: "/icons/icon-192.webp",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#030303",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
