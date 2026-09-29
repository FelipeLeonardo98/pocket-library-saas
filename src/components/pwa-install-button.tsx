"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installPrompt) return null;
  return <button className="install-app-button" onClick={() => void (async () => {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  })}><Download size={17} /> Instalar app</button>;
}
