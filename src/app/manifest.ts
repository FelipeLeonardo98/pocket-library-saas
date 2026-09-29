import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocket Library",
    short_name: "Pocket Library",
    description: "Sua biblioteca de PDFs para estudar em qualquer lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#3b2d20",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
