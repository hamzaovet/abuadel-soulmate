"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, KeyRound, Sparkles, ArrowRight, Coffee, Cake, ShieldCheck } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("برجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        localStorage.setItem("abuadel_soulmate_user", JSON.stringify(data.user));

        // Route by role
        if (
          data.user.role === "owner" ||
          data.user.role === "general_manager" ||
          data.user.role === "branch_manager"
        ) {
          router.push("/admin");
        } else if (data.user.role === "cashier") {
          router.push("/pos");
        } else if (data.user.role === "barista" || data.user.role === "chef") {
          router.push("/kds");
        } else {
          router.push("/admin");
        }
      } else {
        setError(data.error || "بيانات الدخول غير صحيحة");
      }
    } catch {
      setError("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-amber-500 selection:text-black"
      dir="rtl"
    >
      {/* Background Ambient Glows */}
      <div className="absolute w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -top-10 -right-10" />
      <div className="absolute w-96 h-96 bg-rose-500/10 blur-[130px] rounded-full pointer-events-none -bottom-10 -left-10" />

      <div className="relative w-full max-w-md bg-[#120d14]/95 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Dual Logos and Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shadow-lg shadow-amber-500/20 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/soulmate-logo.svg" alt="Soulmate Cafe" className="w-full h-full object-contain" />
            </div>
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-rose-400 bg-black shadow-lg shadow-rose-500/20 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/abuadel-logo.svg" alt="Abu Adel Patisserie" className="w-full h-full object-contain" />
            </div>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-1.5">
              <span>بوابة دخول الإدارة وطاقم التشغيل</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-slate-400 pt-1">
              حلواني أبو عادل &amp; سول ميت كافيه VIP
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold animate-fade-in flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-bold">
          <div>
            <label className="text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>اسم المستخدم:</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: maestro, cashier-soulmate, barista-soulmate..."
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs transition"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>كلمة المرور:</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••••"
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs transition"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>رمز PIN السريع (اختياري للكاشير / 159920):</span>
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="159920"
              className="w-full py-2 px-3.5 rounded-xl bg-black/40 border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono text-xs transition tracking-widest text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>جارٍ التحقق والدخول...</span>
            ) : (
              <>
                <span>تسجيل الدخول للمنظومة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Help */}
        <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 space-y-1 text-center font-mono">
          <p className="font-bold text-amber-300">🔑 حسابات الدخول التجريبية (الباسوورد: 123456789):</p>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 pt-1">
            <span className="p-1 rounded bg-white/5">المالك: maestro</span>
            <span className="p-1 rounded bg-white/5">المدير العام: gm</span>
            <span className="p-1 rounded bg-white/5">كاشير سول ميت: cashier-soulmate</span>
            <span className="p-1 rounded bg-white/5">كاشير أبو عادل: cashier-abuadel</span>
            <span className="p-1 rounded bg-white/5 col-span-2">شاشة الباريستا KDS: barista-soulmate</span>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-amber-300 font-bold transition flex items-center justify-center gap-1"
          >
            <span>العودة إلى الصفحة الرئيسية والمنيو</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
