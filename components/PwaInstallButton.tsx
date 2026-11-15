"use client";

import React, { useEffect, useState } from "react";
import { Download, Monitor, CheckCircle, Sparkles, X, Info } from "lucide-react";

interface PwaInstallButtonProps {
  className?: string;
  variant?: "button" | "banner" | "compact";
  outletCode?: string;
}

export default function PwaInstallButton({
  className = "",
  variant = "button",
  outletCode = "ABU_ADEL_PATISSERIE",
}: PwaInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isWindows, setIsWindows] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  const isAbuAdel = outletCode === "ABU_ADEL_PATISSERIE" || outletCode?.includes("abuadel");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    setIsWindows(ua.includes("win"));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => setInstallSuccess(false), 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setInstallSuccess(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      setShowHelpModal(true);
    }
  };

  if (isInstalled && !installSuccess) {
    return null;
  }

  const installerFile = isAbuAdel
    ? "/abuadel-desktop-installer.bat"
    : "/soulmate-desktop-installer.bat";
  const brandTitle = isAbuAdel ? "حلواني أبو عادل" : "سول ميت كافيه VIP";

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${className}`}
          title={`تثبيت أيقونة ${brandTitle} على الويندوز`}
        >
          <Monitor size={14} className="text-amber-400" />
          <span className="hidden sm:inline">تثبيت للويندوز 💻</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer ${className}`}
        >
          <Monitor size={15} />
          <span>تثبيت أيقونة {brandTitle} على الديسك توب 💻</span>
        </button>
      )}

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500 text-white flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="text-emerald-400" size={20} />
          <div>
            <div className="text-xs font-black text-white">تم تثبيت التطبيق بنجاح! 🎉</div>
            <div className="text-[10px] text-white/70">
              أيقونة {brandTitle} أصبحت الآن على سطح المكتب وقائمة Start.
            </div>
          </div>
        </div>
      )}

      {/* Manual Guidance Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white relative space-y-4 animate-in fade-in zoom-in-95 duration-200 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    تثبيت برنامج {brandTitle} على الويندوز
                  </h3>
                  <p className="text-[10px] text-white/50">بضغطة واحدة من شريط المتصفح أو أداة التثبيت</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-white/80">
              {isWindows && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-black/40 to-black/60 border border-amber-500/30 space-y-2">
                  <div className="font-black text-amber-300 text-xs flex items-center gap-2">
                    <Sparkles size={15} />
                    <span>تثبيت فوري على سطح المكتب (ضغطة واحدة):</span>
                  </div>
                  <p className="text-[11px] text-white/70">
                    يمكنك تحميل أداة التثبيت الفورية، وبمجرد تشغيلها ستنشئ أيقونة {brandTitle} الملكية فوراً على الديسك توب وقائمة ابدأ!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                      href={installerFile}
                      download
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg text-center"
                    >
                      <Download size={14} />
                      <span>تثبيت {isAbuAdel ? "أبو عادل" : "سول ميت"} (.bat)</span>
                    </a>
                    <a
                      href="/install-both-desktop.bat"
                      download
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 border border-amber-500/30 text-center"
                    >
                      <Download size={14} />
                      <span>تثبيت الاثنين معاً (.bat)</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Info size={14} />
                  <span>أو التثبيت المباشر من متصفح Chrome / Edge:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-white/70 pr-2">
                  <li>
                    انظر إلى <strong>شريط العنوان (URL Bar)</strong> أعلى المتصفح.
                  </li>
                  <li>
                    ستجد أيقونة تثبيت صغيرة (<strong>كمبيوتر مع سهم 💻</strong> أو علامة <strong>⊕</strong>).
                  </li>
                  <li>
                    اضغط عليها ثم اختر <strong>تثبيت (Install)</strong>.
                  </li>
                </ol>
              </div>

              <div className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center">
                ✓ سيتم فتح السيستم فوراً كنافذة تطبيق مستقلة بدون شريط متصفح لسرعة العمل!
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
}
