"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, Sparkles, ArrowRight, ShieldCheck, KeyRound, Crown, Coffee, Cake } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !pin.trim()) {
      setError("يرجى إدخال كافة البيانات: اسم المستخدم، كلمة المرور، ورمز PIN السري");
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
        // Save to BOTH local storage keys for universal compatibility
        localStorage.setItem("abuadel_soulmate_user", JSON.stringify(data.user));
        localStorage.setItem("abuadel_auth_user", JSON.stringify(data.user));

        // Route automatically by role
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
        setError(data.error || "اسم المستخدم أو كلمة المرور أو رمز PIN غير صحيح");
      }
    } catch {
      setError("تعذر الاتصال بالخادم السحابي، يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string, pinCode: string) => {
    setUsername(u);
    setPassword(p);
    setPin(pinCode);
    setError("");
  };

  return (
    <div
      className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-amber-500 selection:text-black relative overflow-hidden"
      dir="rtl"
    >
      {/* Background Ambient Glows */}
      <div className="absolute w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -top-10 -right-10" />
      <div className="absolute w-96 h-96 bg-rose-500/10 blur-[130px] rounded-full pointer-events-none -bottom-10 -left-10" />

      <div className="relative w-full max-w-lg bg-[#120d14]/95 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        {/* Dual Logos and Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-13 h-13 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shadow-lg shadow-amber-500/20 p-1 flex items-center justify-center font-black text-amber-400 text-2xl">
              S
            </div>
            <div className="w-13 h-13 rounded-2xl overflow-hidden border-2 border-rose-400 bg-black shadow-lg shadow-rose-500/20 p-1 flex items-center justify-center font-black text-rose-400 text-2xl">
              ع
            </div>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-1.5">
              <span>بوابة دخول الإدارة وطاقم التشغيل</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-slate-400 pt-0.5">
              حلواني أبو عادل المستقل &amp; سول ميت كافيه VIP
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

        {/* Clean Login Form (Username + Password + Mandatory PIN) */}
        <form onSubmit={handleLogin} className="space-y-3.5 text-xs font-bold">
          <div>
            <label className="text-slate-300 block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>اسم المستخدم المصرح به:</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم (مثال: maestro أو manager-soulmate)..."
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs transition"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1 flex items-center gap-1.5">
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
            <label className="text-slate-300 block mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>رمز PIN السري (مكون من 6 أرقام):</span>
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="157230"
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/10 text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-sm tracking-widest text-center transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span>جاري التحقق والدخول...</span>
            ) : (
              <>
                <span>تسجيل الدخول للمنظومة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Fast Credential Selectors / Testing Guide */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-amber-400">
              <KeyRound className="w-3 h-3" />
              <span>حسابات المنظومة التجريبية (اضغط للتعبئة الفورية):</span>
            </span>
          </div>

          {/* Maestro */}
          <button
            type="button"
            onClick={() => fillCredentials("maestro", "123456789", "157230")}
            className="w-full text-right p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-xs flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-black text-white group-hover:text-amber-300">المايسترو (المالك العام):</span>{" "}
                <span className="font-mono text-amber-300">maestro</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400">PIN: 157230</span>
          </button>

          {/* Soulmate Manager & Cashier & Barista */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => fillCredentials("manager-soulmate", "soulmate@2026", "782015")}
              className="text-right p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/20 transition text-[11px] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Coffee className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="font-bold text-slate-200 group-hover:text-amber-300 truncate">مدير سول ميت</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400/80">782015</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("manager-abuadel", "abuadel@2026", "468211")}
              className="text-right p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/20 transition text-[11px] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Cake className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span className="font-bold text-slate-200 group-hover:text-rose-300 truncate">مدير أبو عادل</span>
              </div>
              <span className="text-[10px] font-mono text-rose-400/80">468211</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("cashier-soulmate", "cashier@soulmate", "103025")}
              className="text-right p-1.5 px-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 transition text-[10px] flex items-center justify-between group cursor-pointer"
            >
              <span className="text-slate-300 group-hover:text-amber-300">كاشير سول ميت POS</span>
              <span className="font-mono text-slate-400">103025</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("cashier-abuadel", "cashier@abuadel", "159920")}
              className="text-right p-1.5 px-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 transition text-[10px] flex items-center justify-between group cursor-pointer"
            >
              <span className="text-slate-300 group-hover:text-rose-300">كاشير أبو عادل POS</span>
              <span className="font-mono text-slate-400">159920</span>
            </button>
          </div>
        </div>

        {/* Security badge and Return home */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام سحابي مشفر وآمن 100%</span>
          </div>

          <Link
            href="/"
            className="text-xs text-amber-400 hover:underline font-bold transition flex items-center gap-1"
          >
            <span>الصفحة الرئيسية</span>
            <ArrowRight className="w-3 h-3 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
