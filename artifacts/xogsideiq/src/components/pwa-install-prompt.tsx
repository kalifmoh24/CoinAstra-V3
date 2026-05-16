import React, { useCallback, useEffect, useState } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ActionButton } from "@/components/action-button";

const DISMISS_KEY = "coinastra-pwa-install-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw && Date.now() - Number(raw) < DISMISS_MS) return;
    } catch { /* ignore */ }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (isIos() && !deferred) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [deferred]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setIosHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
  }, []);

  const install = useCallback(async () => {
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setVisible(false);
      } finally {
        setInstalling(false);
      }
      return;
    }
    if (isIos()) {
      setIosHint(true);
      return;
    }
    dismiss();
  }, [deferred, dismiss]);

  if (isStandalone()) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed z-[100] inset-x-0 bottom-0 md:bottom-6 md:left-auto md:right-6 md:inset-x-auto md:max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-0 pointer-events-none"
        >
          <div
            role="dialog"
            aria-labelledby="pwa-install-title"
            aria-describedby="pwa-install-desc"
            className="pointer-events-auto rounded-2xl p-4 shadow-2xl"
            style={{
              background: "rgba(10,14,22,0.98)",
              border: "1px solid rgba(41,98,255,0.35)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(41,98,255,0.1)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(41,98,255,0.2)", border: "1px solid rgba(41,98,255,0.3)" }}
              >
                <Download className="h-5 w-5" style={{ color: "#4d7fff" }} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p id="pwa-install-title" className="text-[14px] font-bold text-white leading-tight">
                  Install CoinAstra
                </p>
                <p id="pwa-install-desc" className="text-[11px] mt-1 leading-relaxed" style={{ color: "#8a90a8" }}>
                  Add to your home screen for fast markets, research, and alerts — works on mobile and desktop.
                </p>
                {iosHint && (
                  <p className="text-[10px] mt-2 flex items-start gap-1.5" style={{ color: "#4d7fff" }}>
                    <Share className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    Tap Share, then &quot;Add to Home Screen&quot; in Safari.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 p-2 rounded-lg touch-manipulation min-h-11 min-w-11 flex items-center justify-center hover:bg-white/5 active:scale-95 transition-transform"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" style={{ color: "#5a6072" }} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <ActionButton
                variant="primary"
                fullWidth
                loading={installing}
                onClick={install}
                icon={<Smartphone className="h-4 w-4" aria-hidden />}
                className="sm:flex-1"
              >
                {deferred ? "Install app" : isIos() ? "How to install" : "Got it"}
              </ActionButton>
              <ActionButton variant="ghost" fullWidth onClick={dismiss} className="sm:flex-1">
                Not now
              </ActionButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
