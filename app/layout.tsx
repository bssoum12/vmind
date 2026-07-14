import type { Metadata } from "next";
import { orbitron, syne, jetBrainsMono } from "@/shared/fonts";
import "./globals.css";
import { TopBar } from "@/features/layout/TopBar";

export const metadata: Metadata = {
  title: "VMIND — Plateforme Intelligence Entreprise",
  description: "Plateforme d'intelligence d'entreprise synchronisée avec TraLIS ERP",
};

import { ModeProvider } from "@/shared/contexts/ModeContext";
import { SessionTimeoutProvider } from "@/components/vmind/SessionTimeoutProvider";
import { KpiCacheProvider } from "@/shared/contexts/KpiCacheContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${syne.variable} ${jetBrainsMono.variable}`}>
      <body className={syne.className}>
        <ModeProvider>
          <SessionTimeoutProvider>
            <KpiCacheProvider>
              <TopBar />
              {children}
            </KpiCacheProvider>
          </SessionTimeoutProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
