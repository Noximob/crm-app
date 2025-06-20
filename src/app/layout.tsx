import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "CRM Imobiliário - Você já vendeu hoje?",
  description: "Sistema de CRM completo para corretores imobiliários. Gerencie seus leads, imóveis e automações em um só lugar.",
  keywords: "CRM, imobiliária, corretores, leads, automação, vendas",
  authors: [{ name: "CRM Imobiliário" }],
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
