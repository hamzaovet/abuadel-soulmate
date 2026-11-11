"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X, Printer, Sparkles, Smartphone, Globe, Coffee, Cake, Download } from "lucide-react";

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
  abuAdelPhone = "01146862114",
}: CardQRModalProps) {
  const [originUrl, setOriginUrl] = useState("");
  const [tableQrDataUrl, setTableQrDataUrl] = useState("");
  const [webQrDataUrl, setWebQrDataUrl] = useState("");
  const [appQrDataUrl, setAppQrDataUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setOriginUrl(origin);

      // QR 1: Online Digital Menu & Table Ordering
      const tableUrl = activeTable
        ? `${origin}/order?table=${encodeURIComponent(activeTable)}`
        : `${origin}/order`;
      QRCode.toDataURL(tableUrl, {
        width: 350,
        margin: 1,
        color: {
          dark: "#1c0d02",
          light: "#ffffff",
        },
      })
        .then(setTableQrDataUrl)
        .catch(console.error);

      // QR 2: Web Portal & Online Delivery Store
      const webUrl = `${origin}`;
      QRCode.toDataURL(webUrl, {
        width: 350,
        margin: 1,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      })
        .then(setWebQrDataUrl)
        .catch(console.error);

      // QR 3: Direct Mobile App / PWA Install Page
      const appUrl = `${origin}/install`;
      QRCode.toDataURL(appUrl, {
        width: 350,
        margin: 1,
        color: {
          dark: "#3b0764",
          light: "#ffffff",
        },
      })
        .then(setAppQrDataUrl)
        .catch(console.error);
    }
  }, [activeTable]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Dialog Box */}
      <div className="bg-[#0f0e13] border-2 border-amber-500/40 rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative space-y-6">
        {/* Modal Actions Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-black flex items-center justify-center font-black text-lg shadow-lg shadow-amber-500/20">
              3QR
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>كارت الكيو آر كود الثلاثي المعتمد (VIP 3-QR Card)</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                جاهز للطباعة على الترابيزات والريسبشن والستاندات الخارجية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/vip-3qr-card-print.png"
              download="abuadel-soulmate-3qr-card.png"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-black text-emerald-300 transition"
              title="تحميل صورة الكارت عالية الدقة للطباعة (300 DPI)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تحميل صورة الكارت (PNG)</span>
            </a>

            <a
              href="/printable-card-3qr.html"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              title="فتح النسخة المحفوظة في فولدر المشروع"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>نسخة HTML</span>
            </a>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكارت الآن</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CARD AREA (3-QR CODES) */}
        <div
          id="printable-card-container"
          data-force-dark="true"
          className="print-section bg-gradient-to-b from-[#1a1209] via-[#0d0905] to-[#12080a] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-center text-white relative shadow-2xl overflow-hidden font-sans"
          dir="rtl"
        >
          {/* Decorative Corner Ornaments */}
          <div className="absolute top-3 right-3 text-amber-400/40 text-xl font-serif">✤</div>
          <div className="absolute top-3 left-3 text-amber-400/40 text-xl font-serif">✤</div>
          <div className="absolute bottom-3 right-3 text-amber-400/40 text-xl font-serif">✤</div>
          <div className="absolute bottom-3 left-3 text-amber-400/40 text-xl font-serif">✤</div>

          {/* Dual Brand Logos & Main Header */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/30 border-2 border-amber-300">
                S
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-600/30 border-2 border-emerald-400">
                ع
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide mt-2">
              سول ميت كافيه VIP & حلواني أبو عادل
            </h2>
            <p className="text-xs text-amber-200/80 font-medium">
              القهوة المختصة والضيافة الراقية • أشهى الحلويات الشرقية والتورت بالسمن البلدي
            </p>
          </div>

          {/* 3 QR CODES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
            {/* QR 1: Table Ordering */}
            <div className="bg-black/80 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-between group">
              <div className="w-full text-center pb-2 border-b border-amber-500/20">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-400">
                  <Coffee className="w-4 h-4" />
                  <span>1. طلب الصالة والترابيزة</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  امسح واطلب فوراً وأنت على ترابيزتك 📱
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl shadow-lg my-3">
                {tableQrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={tableQrDataUrl}
                    alt="Table Order QR"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-black text-xs">
                    جاري التوليد...
                  </div>
                )}
              </div>

              <div className="text-[11px] font-bold text-amber-300 font-mono">
                {activeTable ? `ترابيزة: ${activeTable}` : "/order"}
              </div>
            </div>

            {/* QR 2: Web Portal & Delivery */}
            <div className="bg-black/80 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-between group">
              <div className="w-full text-center pb-2 border-b border-emerald-500/20">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-400">
                  <Globe className="w-4 h-4" />
                  <span>2. البوابة الرقمية والدليفري</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  منيو حلويات أبو عادل وتوصيل المنازل 🛵
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl shadow-lg my-3">
                {webQrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={webQrDataUrl}
                    alt="Web Portal QR"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-black text-xs">
                    جاري التوليد...
                  </div>
                )}
              </div>

              <div className="text-[11px] font-bold text-emerald-300 font-mono">
                منيو وطلبات الأونلاين
              </div>
            </div>

            {/* QR 3: Mobile PWA App */}
            <div className="bg-black/80 border-2 border-purple-500/50 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-between group">
              <div className="w-full text-center pb-2 border-b border-purple-500/20">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-purple-400">
                  <Smartphone className="w-4 h-4" />
                  <span>3. تطبيق الموبايل السحابي</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  تثبيت تطبيق PWA ونقاط الولاء ⭐
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl shadow-lg my-3">
                {appQrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={appQrDataUrl}
                    alt="Mobile App QR"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-black text-xs">
                    جاري التوليد...
                  </div>
                )}
              </div>

              <div className="text-[11px] font-bold text-purple-300 font-mono">
                تطبيق أندرويد وآيفون PWA
              </div>
            </div>
          </div>

          {/* Card Footer Details */}
          <div className="border-t border-amber-500/20 pt-4 space-y-2">
            <div className="flex items-center justify-center gap-6 text-xs font-bold text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span>📞 الخط الساخن الموحد لأبو عادل:</span>
                <strong className="text-amber-400 font-mono">{hotline}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span>☕ هاتف سول ميت كافيه VIP:</span>
                <strong className="text-amber-400 font-mono">{soulmatePhone}</strong>
              </span>
            </div>

            {/* Signature Orca Developer */}
            <div className="text-[10px] text-slate-500 pt-1">
              تصميم وتطوير المنظومة الذكية:{" "}
              <span className="text-amber-300 font-bold">م / حمزة عباس</span> — شركة{" "}
              <span className="text-amber-400 font-black">أوركا تك للحلول البرمجية (Orca Tech) 🐬</span> • 01018671000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
