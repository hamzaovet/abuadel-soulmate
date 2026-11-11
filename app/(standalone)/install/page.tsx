"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  Coffee,
  Download,
  Home,
  Lock,
  Phone,
  Share,
  ShoppingBag,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { PushOptInButton } from "@/components/PwaBootAndPushButton";
import { ThemeToggle } from "@/components/ThemeProviderAndToggle";

export default function InstallAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installNote, setInstallNote] = useState<string | null>(null);

  const [roleType, setRoleType] = useState<"CUSTOMER" | "ADMIN" | "POS">("CUSTOMER");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedPhone = localStorage.getItem("vip_customer_phone") || "";
    if (savedPhone) setCustomerPhone(savedPhone);

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(ios);

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(Boolean(standalone));

    if (window.__abuadelInstallPrompt) {
      setDeferredPrompt(window.__abuadelInstallPrompt);
    }

    const onReady = () => {
      if (window.__abuadelInstallPrompt) {
        setDeferredPrompt(window.__abuadelInstallPrompt);
      }
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallNote("🎉 تم تثبيت التطبيق على جهازك بنجاح! يمكنك فتحه الآن من الشاشة الرئيسية.");
    };

    window.addEventListener("abuadel:install-ready", onReady);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("abuadel:install-ready", onReady);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.__abuadelInstallPrompt;
    if (!promptEvent) {
      setInstallNote(
        isIos
          ? "في سفاري (iPhone): اضغط زر المشاركة ⬆️ بالأسفل ثم 'إضافة إلى الشاشة الرئيسية'."
          : "من قائمة المتصفح (⋮) بالأعلى اختر 'تثبيت التطبيق' أو 'إضافة للشاشة الرئيسية'."
      );
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        setIsInstalled(true);
        setInstallNote("🎉 جاري إضافة أيقونة التطبيق لشاشتك الرئيسية...");
      }
      window.__abuadelInstallPrompt = null;
      setDeferredPrompt(null);
    } catch {
      setInstallNote("استخدم قائمة المتصفح (⋮) ➔ تثبيت التطبيق / إضافة إلى الشاشة الرئيسية.");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#060a14] text-slate-100 flex flex-col items-center justify-center px-4 py-8"
      dir="rtl"
    >
      <div className="w-full max-w-xl space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </Link>
          <ThemeToggle compact />
        </div>
        {/* Luxury App Icon & Brand Header */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#060913] p-6 text-center shadow-2xl">
          <div className="mx-auto w-28 h-28 rounded-3xl overflow-hidden border-2 border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.25)] mb-4">
            <img
              src="/icons/icon-512.png"
              alt="أيقونة حلواني أبو عادل وسول ميت VIP"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>التطبيق الرسمي السريع PWA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            حلواني أبو عادل &amp; سول ميت VIP
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            ثبّت التطبيق على موبايلك بضغطة واحدة بدون الحاجة للمتجر، واستقبل إشعارات الطلبات والدليفري والعروض حتى لو التطبيق مقفول 🔔
          </p>
        </div>

        {/* Step 1: Install PWA Card */}
        <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-base text-white">1. تثبيت أيقونة التطبيق على موبايلك</h2>
                <p className="text-xs text-slate-400">يعمل كأبليكيشن كامل على Android و iPhone والكمبيوتر</p>
              </div>
            </div>
            {isInstalled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black">
                <CheckCircle2 className="w-3.5 h-3.5" /> مثبّت
              </span>
            )}
          </div>

          {isInstalled ? (
            <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 font-bold text-center">
              ✅ أنت تستخدم التطبيق المثبت الآن! تأكد من خطوة الإشعارات بالأسفل ليصلك التنبيه بالصوت.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
              >
                <Download className="w-5 h-5" />
                <span>
                  {deferredPrompt
                    ? "تثبيت التطبيق على جهازك الآن 📲"
                    : "إظهار خطوات تثبيت التطبيق على جهازك 📲"}
                </span>
              </button>

              {isIos ? (
                <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-3.5 text-xs text-slate-300 space-y-1.5">
                  <p className="font-black text-amber-300 flex items-center gap-1.5">
                    <Share className="w-4 h-4" /> خطوات الآيفون (Safari):
                  </p>
                  <p>1️⃣ اضغط على أيقونة المشاركة ⬆️ أسفل شاشة سفاري.</p>
                  <p>2️⃣ اختر &quot;إضافة إلى الصفحة الرئيسية&quot; (Add to Home Screen).</p>
                  <p>3️⃣ افتح التطبيق من الأيقونة على شاشتك وفعل الإشعارات!</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-3 text-[11px] text-slate-400">
                  💡 لو فتحت الرابط من برنامج QR، اضغط <strong>&quot;فتح في Chrome&quot;</strong> أولاً ليظهر لك زر التثبيت التلقائي فوراً.
                </div>
              )}
            </>
          )}

          {installNote && (
            <p className="text-xs font-bold text-amber-300 text-center">{installNote}</p>
          )}
        </div>

        {/* Step 2: Background Web Push Setup Card */}
        <div className="rounded-3xl border border-purple-500/35 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-white">2. إشعارات الخلفية حتى والتطبيق مقفول 🔔</h2>
              <p className="text-xs text-slate-400">تنبيه صوتي فوري على شاشة القفل للطلبات والردود والعروض</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "CUSTOMER", label: "عميل 🛍️" },
              { id: "POS", label: "كاشير / بار 💵" },
              { id: "ADMIN", label: "الإدارة 👑" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRoleType(opt.id as any)}
                className={`py-2 px-2 rounded-xl text-xs font-black border transition ${
                  roleType === opt.id
                    ? "bg-purple-600/25 border-purple-400 text-purple-200"
                    : "bg-slate-950/70 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {roleType === "CUSTOMER" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>رقم موبايلك لربطه بإشعارات طلباتك ورسائل الشات:</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("vip_customer_phone", e.target.value);
                  }
                }}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white text-center font-bold tracking-wider focus:border-purple-400 outline-none"
              />
            </div>
          )}

          <PushOptInButton
            role={roleType}
            customerPhone={roleType === "CUSTOMER" ? customerPhone.trim() || null : null}
          />
        </div>

        {/* Step 3: Quick Navigation Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/order?brand=soulmate"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-black transition"
          >
            <Coffee className="w-4 h-4" />
            <span>طلب سول ميت VIP</span>
          </Link>
          <Link
            href="/order?brand=abuadel&mode=delivery"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-black transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>دليفري حلواني أبو عادل</span>
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-bold transition"
          >
            <Home className="w-4 h-4" />
            <span>الصفحة الرئيسية</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold transition"
          >
            <Lock className="w-4 h-4" />
            <span>بوابة الإدارة والكاشير</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
