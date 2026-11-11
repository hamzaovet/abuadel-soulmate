"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, CheckCircle2, Loader2, Send, Smartphone } from "lucide-react";

declare global {
  interface Window {
    __abuadelInstallPrompt?: any;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error("SW registration error:", err);
    return null;
  }
}

export function PwaRegistrar() {
  useEffect(() => {
    registerAppServiceWorker();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__abuadelInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("abuadel:install-ready"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  return null;
}

export interface PushOptInButtonProps {
  role?: "OWNER" | "ADMIN" | "POS" | "KDS" | "CUSTOMER";
  outletId?: string | null;
  userId?: string | null;
  userName?: string | null;
  customerPhone?: string | null;
  compact?: boolean;
  className?: string;
}

export function PushOptInButton({
  role = "CUSTOMER",
  outletId = null,
  userId = null,
  userName = null,
  customerPhone = null,
  compact = false,
  className = "",
}: PushOptInButtonProps) {
  const [supported, setSupported] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const syncSubscriptionToServer = useCallback(
    async (sub: PushSubscription) => {
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: json,
          role,
          outletId,
          userId,
          userName,
          customerPhone,
        }),
      });
    },
    [role, outletId, userId, userName, customerPhone]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;

    setIsIos(ios);
    setIsStandalone(Boolean(standalone));

    const canPush =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(canPush);

    if (!canPush) return;
    setPermission(Notification.permission);

    (async () => {
      const reg = await registerAppServiceWorker();
      if (!reg) return;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setActiveEndpoint(existing.endpoint);
        syncSubscriptionToServer(existing).catch(() => {});
      }
    })();
  }, [syncSubscriptionToServer]);

  const handleEnablePush = async () => {
    if (!supported) {
      if (isIos && !isStandalone) {
        setStatusMsg("على الآيفون: اضغط مشاركة ثم 'إضافة للشاشة الرئيسية' أولاً لتعمل الإشعارات.");
      } else {
        setStatusMsg("المتصفح الحالي لا يدعم إشعارات الخلفية؛ افتح الموقع في Chrome أو Safari.");
      }
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setStatusMsg("تم رفض إذن الإشعارات؛ فعّله من إعدادات الموقع في المتصفح.");
        return;
      }

      const reg = await registerAppServiceWorker();
      if (!reg) {
        setStatusMsg("تعذر تسجيل مشغل الإشعارات بالمتصفح.");
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyRes = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
        const keyData = await keyRes.json();
        if (!keyData?.publicKey) {
          throw new Error(keyData?.error || "تعذر جلب مفتاح الإشعارات");
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as any,
        });
      }

      await syncSubscriptionToServer(sub);
      setActiveEndpoint(sub.endpoint);

      // Fire an instant welcome verification notification
      await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          title: "✅ تم تفعيل إشعارات الخلفية بنجاح!",
          body: "ستصلك التنبيهات الصوتية فوراً حتى عند إغلاق التطبيق أو المتصفح 🔔✨",
          url: role === "OWNER" || role === "ADMIN" ? "/admin" : role === "POS" ? "/pos" : "/order",
        }),
      });
      setStatusMsg("مفعّل! ستصلك الإشعارات حتى والتطبيق مقفول ✅");
    } catch (err: any) {
      setStatusMsg(err?.message || "تعذر تفعيل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    if (!activeEndpoint) return;
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: activeEndpoint }),
      });
      const data = await res.json();
      if (data.sent > 0) {
        setStatusMsg("تم إرسال إشعار تجربة لجهازك 🔔");
      } else {
        setStatusMsg("أعد التفعيل لتحديث ربط الجهاز بالإشعارات.");
      }
    } catch {
      setStatusMsg("تعذر إرسال التجربة");
    } finally {
      setTesting(false);
    }
  };

  if (!supported) {
    if (isIos && !isStandalone && !compact) {
      return (
        <div className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2 ${className}`}>
          <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
          <span>على الآيفون: أضف التطبيق للشاشة الرئيسية (Share ➔ Add to Home Screen) لتفعيل الإشعارات.</span>
        </div>
      );
    }
    return null;
  }

  if (permission === "denied") {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold ${className}`}
        title="يرجى السماح بالإشعارات من أيقونة القفل بجانب رابط الموقع"
      >
        <BellOff className="w-3.5 h-3.5 shrink-0" />
        <span>{compact ? "الإشعارات محظورة" : "الإشعارات محظورة من المتصفح"}</span>
      </div>
    );
  }

  if (permission === "granted" && activeEndpoint) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-black"
          title="إشعارات الخلفية مفعّلة وتعمل حتى عند إغلاق المتصفح"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{compact ? "إشعارات الخلفية ✓" : "إشعارات الخلفية مفعّلة ✓"}</span>
        </div>
        <button
          type="button"
          onClick={handleTestPush}
          disabled={testing}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-amber-300 text-[11px] font-bold transition disabled:opacity-60"
          title="إرسال إشعار تجربة فوري للتأكد من الصوت والتنبيه في الخلفية"
        >
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          <span>تجربة 🔔</span>
        </button>
        {!compact && statusMsg && (
          <span className="text-[11px] text-emerald-300 font-bold">{statusMsg}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleEnablePush}
        disabled={loading}
        className={`flex items-center justify-center gap-1.5 font-black transition shadow-lg disabled:opacity-60 ${
          compact
            ? "px-3 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-[11px]"
            : "px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs"
        }`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <BellRing className="w-3.5 h-3.5 animate-pulse" />
        )}
        <span>{compact ? "تفعيل إشعارات الخلفية 🔔" : "تفعيل الإشعارات حتى لو التطبيق مقفول 🔔"}</span>
      </button>
      {!compact && statusMsg && (
        <span className="text-[11px] text-amber-300 font-bold text-center">{statusMsg}</span>
      )}
    </div>
  );
}

export function BellStatusHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
      <Bell className="w-3 h-3 text-purple-400" />
      <span>تنبيهات صوتية فورية للطلبات، الرسائل، وتنبيهات الإدارة</span>
    </span>
  );
}
