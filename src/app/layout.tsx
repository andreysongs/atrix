import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./forge-theme.css";

export const metadata: Metadata = {
  title: "FORGE — Build Your Best",
  description: "Treinos, recuperação e evolução em uma única experiência.",
  applicationName: "FORGE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FORGE",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#f8fafc",
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
