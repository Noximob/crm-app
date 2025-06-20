import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Imobiliário - Você já vendeu hoje?",
  description: "Sistema de CRM completo para corretores imobiliários. Gerencie seus leads, imóveis e automações em um só lugar.",
  keywords: "CRM, imobiliária, corretores, leads, automação, vendas",
  authors: [{ name: "CRM Imobiliário" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
