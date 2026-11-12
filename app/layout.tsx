import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adspilot AI — Google Ads Management",
  description: "Pilotez et optimisez toutes vos campagnes Google Ads depuis une seule plateforme.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}