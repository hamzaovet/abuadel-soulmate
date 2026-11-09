"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X, Printer, Sparkles, Smartphone, Globe, Coffee, Cake } from "lucide-react";

interface CardQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTable?: string;
  hotline?: string;
  soulmatePhone?: string;
  abuAdelPhone?: string;
}

export default function CardQRModal({
  isOpen,
  onClose,
  activeTable,
  hotline = "15992",
  soulmatePhone = "01099887766",
  abuAdelPhone = "15992",
}: CardQRModalProps) {
  const [originUrl, setOriginUrl] = useState("");
  const [menuQrDataUrl, setMenuQrDataUrl] = useState("");
  const [appQrDataUrl, setAppQrDataUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setOriginUrl(origin);

      // QR 1: Online Digital Menu & Table Ordering
      const menuUrl = activeTable ? `${origin}/order?table=${encodeURIComponent(activeTable)}` : `${origin}/order`;
      QRCode.toDataURL(menuUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: "#1c0d02",
          light: "#ffffff",
        },
      })
        .then(setMenuQrDataUrl)
        .catch(console.error);

      // QR 2: Direct App / Digital Loyalty
      const appUrl = `${origin}`;
      QRCode.toDataURL(appUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: "#2a0815",
          light: "#ffffff",
        },
      })
        .then(setAppQrDataUrl)
        .catch(console.error);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-[#0e0a0d] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PRINTABLE CARD CONTAINER */}
        <div
          id="printable-2qr-card"
          className="bg-gradient-to-b from-[#1a0f14] via-[#12080e] to-[#0a0508] border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-xl relative overflow-hidden"
        >
          {/* Subtle Glow Accents */}
          <div className="absolute w-72 h-72 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none -top-10 -right-10" />
          <div className="absolute w-72 h-72 bg-rose-500/10 blur-[100px] rounded-full pointer-events-none -bottom-10 -left-10" />

          {/* DUAL LOGOS & HEADER */}
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shadow-lg shadow-amber-500/20 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/soulmate-logo.svg" alt="Soulmate" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black gold-gradient-text tracking-wide">
                حلواني أبو عادل &amp; سول ميت كافيه
              </h2>
              <p className="text-xs text-amber-200/80 font-bold">
                ABU ADEL PATISSERIE &amp; SOULMATE SPECIALTY CAFE
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-rose-400 bg-black shadow-lg shadow-rose-500/20 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/abuadel-logo.svg" alt="Abu Adel" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>كارت الضيافة الملكي والطلب بالـ 2 QR Code</span>
          </div>

          {/* DUAL QR CODES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* QR 1: Table Ordering & Digital Menu */}
            <div className="p-5 rounded-2xl bg-[#1c1218]/90 border border-amber-500/30 space-y-3 flex flex-col items-center shadow-md">
              <div className="flex items-center gap-1.5 text-amber-300 font-black text-sm">
                <Coffee className="w-4 h-4" />
                <span>الـ QR الأول: المنيو وطلب الترابيزة</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                امسح الكود لفتح منيو المشروبات والحلويات والطلب الفوري
              </p>

              <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-amber-400/80 w-44 h-44 flex items-center justify-center">
                {menuQrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={menuQrDataUrl} alt="Menu QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <QrCode className="w-4 h-4 animate-spin" />
                    <span>جارٍ التوليد...</span>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-amber-300/80 font-mono font-bold">
                طلب فوري من الترابيزة 📱💺
              </span>
            </div>

            {/* QR 2: Official Web App & Delivery */}
            <div className="p-5 rounded-2xl bg-[#1c1218]/90 border border-rose-500/30 space-y-3 flex flex-col items-center shadow-md">
              <div className="flex items-center gap-1.5 text-rose-300 font-black text-sm">
                <Cake className="w-4 h-4" />
                <span>الـ QR الثاني: الموقع الرسمي والدليفري</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                تصفح تورت وحلويات أبو عادل ونقاط الولاء والدليفري
              </p>

              <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-rose-400/80 w-44 h-44 flex items-center justify-center">
                {appQrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appQrDataUrl} alt="App QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <QrCode className="w-4 h-4 animate-spin" />
                    <span>جارٍ التوليد...</span>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-rose-300/80 font-mono font-bold">
                حلي يومك مع أبو عادل 🍰✨
              </span>
            </div>
          </div>

          {/* CONTACT & HOTLINE FOOTER */}
          <div className="pt-3 border-t border-amber-500/20 text-xs text-slate-300 space-y-1.5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 font-bold text-center">
              <span>📍 حلواني أبو عادل: ترعة الجبل، حدائق القبة</span>
              <span className="hidden sm:inline">•</span>
              <span>📍 سول ميت كافيه: كينج بارك، ترعة الجبل</span>
            </div>
            <p className="text-xs text-amber-400 font-mono font-black">
              الخط الساخن لأبو عادل: {abuAdelPhone} • واتساب الكافيه: {soulmatePhone}
            </p>
          </div>
        </div>

        {/* MODAL ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400 font-mono">
            النطاق النشط: <span className="text-amber-400 font-bold">{originUrl || "abuadel-soulmate.vercel.app"}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="py-2.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكارت الملكي 🖨️</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
