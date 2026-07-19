import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";

declare global {
  interface WindowEventMap {
    "pwa-install-ready": CustomEvent<BeforeInstallPromptEvent>;
    "pwa-installed": CustomEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else if (/android/i.test(ua)) setPlatform("android");

    // Check if already installed (display-mode: standalone)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as unknown as Record<string, unknown>).standalone)
    ) {
      setIsInstalled(true);
    }

    // Listen for install ready event from index.html
    const handleReady = (e: CustomEvent<BeforeInstallPromptEvent>) => {
      setDeferredPrompt(e.detail);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("pwa-install-ready", handleReady as EventListener);
    window.addEventListener("pwa-installed", handleInstalled as EventListener);

    // Also try direct beforeinstallprompt (in case index.html didn't catch it)
    const handleDirect = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleDirect);

    return () => {
      window.removeEventListener("pwa-install-ready", handleReady as EventListener);
      window.removeEventListener("pwa-installed", handleInstalled as EventListener);
      window.removeEventListener("beforeinstallprompt", handleDirect);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => setDismissed(true);

  // iOS instructions
  if (platform === "ios" && !isInstalled && !dismissed) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-slate-700/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
              <Smartphone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">تثبيت Life OS</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                افتح قائمة المشاركة <span className="inline-block rounded bg-slate-700 px-1 text-[10px] text-white">⎙</span> ثم اختر "إضافة إلى الشاشة الرئيسية"
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Android / Desktop install prompt
  if (deferredPrompt && !isInstalled && !dismissed) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-slate-700/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
              <Download className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">تثبيت Life OS</p>
              <p className="mt-1 text-xs text-slate-400">
                حمل التطبيق واستمتع بتجربة كاملة بدون متصفح
              </p>
              <button
                onClick={handleInstall}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-3.5 w-3.5" />
                تثبيت
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Desktop prompt for Chrome (alternative UI)
  if (platform === "desktop" && !isInstalled && !dismissed) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-slate-700/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:w-80">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
              <Monitor className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">استخدم Life OS كتطبيق</p>
              <p className="mt-1 text-xs text-slate-400">
                ثبته على جهازك لاستخدامه كتطبيق مستقل
              </p>
              <button
                onClick={handleInstall}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-3.5 w-3.5" />
                تثبيت
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
