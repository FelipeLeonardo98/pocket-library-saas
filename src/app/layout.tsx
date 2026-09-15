import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-ui", subsets: ["latin"] });
const lora = Lora({ variable: "--font-reading", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EstudoPDF",
  description: "Leitor local de PDFs para estudo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR" className={`${geist.variable} ${lora.variable}`}><body>{children}</body></html>;
}
