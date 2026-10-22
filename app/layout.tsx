import type { Metadata } from "next";
import { orbitron, syne, jetBrainsMono } from "@/shared/fonts";
import "./globals.css";
import "@/features/skills/skills-premium.css";
import { TopBar } from "@/features/layout/TopBar";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "VMIND — Plateforme Intelligence Entreprise",
  description: "Plateforme d'intelligence d'entreprise synchronisée avec TraLIS ERP",
};

import { ModeProvider } from "@/shared/contexts/ModeContext";
import { SessionTimeoutProvider } from "@/components/vmind/SessionTimeoutProvider";
import { ConnectionsProvider } from "@/shared/contexts/ConnectionsContext";
import { SkillsProvider } from "@/shared/contexts/SkillsContext";
import { KpiCacheProvider } from "@/shared/contexts/KpiCacheContext";
import { ToastProvider } from "@/shared/contexts/ToastContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${syne.variable} ${jetBrainsMono.variable}`}>
      <body className={syne.className}>
        <ToastProvider>
          <ModeProvider>
            <SessionTimeoutProvider>
              <ConnectionsProvider>
                <SkillsProvider>
                  <KpiCacheProvider>
                    <TopBar />
                    {children}
                  </KpiCacheProvider>
                </SkillsProvider>
              </ConnectionsProvider>
            </SessionTimeoutProvider>
          </ModeProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
