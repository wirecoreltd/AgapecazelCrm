import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sans" });

const title = "Pompe à chaleur à 1 € symbolique : vérifiez votre éligibilité | EclaFoyer";
const description = `Répondez à quelques questions en 2 minutes et découvrez si vous êtes éligible à la pompe à chaleur à 1 € symbolique. Vérification gratuite et sans engagement${SITE.installateurs ? `, avec ${SITE.installateurs} installateurs partenaires partout en France` : ""}.`;

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title, description,
  openGraph: { title, description, type: "website", locale: "fr_FR", siteName: "EclaFoyer" },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#0F6B6B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
