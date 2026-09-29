import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import "./globals.css";
import PwaInstallButton from "@/components/pwa-install-button";

const geist = Geist({ variable: "--font-ui", subsets: ["latin"] });
const lora = Lora({ variable: "--font-reading", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pocket Library",
  description: "Leitor local de PDFs para estudo",
  applicationName: "Pocket Library",
  appleWebApp: { capable: true, title: "Pocket Library", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR" className={`${geist.variable} ${lora.variable}`}><body><PwaInstallButton />{children}</body></html>;
}
