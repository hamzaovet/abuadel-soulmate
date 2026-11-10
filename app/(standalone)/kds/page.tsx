"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Coffee,
  Flame,
  Cake,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  RefreshCw,
  LogOut,
  Sparkles,
  ArrowRight,
  BellRing,
  Crown,
  Home,
  Receipt,
  Printer,
  Truck,
  MapPin,
  Phone,
  User,
} from "lucide-react";

export default function KdsScreenPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [stationFilter, setStationFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [printingDeliveryTicket, setPrintingDeliveryTicket] = useState<any>(null);

  // Audio Context Ref
  const lastTicketIdRef = useRef<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("abuadel_soulmate_user");
    localStorage.removeItem("abuadel_auth_user");
    router.push("/login");
  };

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch {}
  };

  const fetchKdsTickets = async () => {
    try {
      const res = await fetch(`/api/kds?station=${stationFilter}`);
      const data = await res.json();
      if (data.success && data.tickets) {
        setTickets(data.tickets);

        // Check if new ticket arrived
        if (data.tickets.length > 0) {
          const newest = data.tickets[0];
          if (newest.id !== lastTicketIdRef.current) {
            lastTicketIdRef.current = newest.id;
            playChime();
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKdsTickets();
    const interval = setInterval(fetchKdsTickets, 3500);
    return () => clearInterval(interval);
  }, [stationFilter, soundEnabled]);

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch("/api/kds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchKdsTickets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper: Elapsed minutes calculation
  const getElapsedMinutes = (dateStr: string) => {
    const elapsed = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000 / 60);
    return elapsed >= 0 ? elapsed : 0;
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#07070b] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black" dir="rtl">
      {/* KDS TOP HEADER */}
      <header className="shrink-0 z-40 bg-[#120d14]/95 backdrop-blur-md border-b border-amber-500/25 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/soulmate-logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-amber-300">
                شاشة الباريستا والمطبخ الفورية (KDS Live)
              </h1>
              <span className="py-0.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black animate-pulse">
                مباشر 🟢
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              توجيه آلي للطلبات من الترابيزات والكاشير لمحطة التحضير
            </p>
          </div>
        </div>

        {/* Station Filters & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Station Filter Pills */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold">
            <button
              onClick={() => setStationFilter("ALL")}
              className={`py-1 px-3 rounded-lg transition ${
                stationFilter === "ALL" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              كل المحطات ⚡
            </button>
            <button
              onClick={() => setStationFilter("BARISTA")}
              className={`py-1 px-3 rounded-lg transition ${
                stationFilter === "BARISTA" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              ركن القهوة والبار ☕
            </button>
            <button
              onClick={() => setStationFilter("KITCHEN")}
              className={`py-1 px-3 rounded-lg transition ${
                stationFilter === "KITCHEN" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              المطبخ والوافل 🥞
            </button>
            <button
              onClick={() => setStationFilter("PASTRY_COUNTER")}
              className={`py-1 px-3 rounded-lg transition ${
                stationFilter === "PASTRY_COUNTER" ? "bg-rose-500 text-white font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              حلواني أبو عادل 🍰
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              soundEnabled ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-500"
            }`}
            title={soundEnabled ? "صوت الجرس مفعل" : "صوت الجرس مكتوم"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={fetchKdsTickets}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            title="تحديث فوري"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Direct Exit & Navigation Buttons */}
          <Link
            href="/admin"
            className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center gap-1.5"
            title="العودة للوحة الإدارة"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">لوحة الإدارة 👑</span>
          </Link>

          <Link
            href="/pos"
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-md flex items-center gap-1.5"
            title="الذهاب لشاشة كاشير POS"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>كاشير POS 🧾</span>
          </Link>

          <Link
            href="/"
            className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
            title="الصفحة الرئيسية للموقع"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">الرئيسية 🏠</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="py-1.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج 🚪</span>
          </button>
        </div>
      </header>

      {/* TICKETS BOARD: Smooth inner scroll */}
      <main className="flex-1 min-h-0 h-[calc(100vh-62px)] overflow-y-auto p-4 sm:p-6 space-y-4">
        {tickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-black text-slate-300">لا توجد طلبات معلقة حالياً في المطبخ أو البار!</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              أي طلب جديد يتم إرساله من ترابيزات الكافيه أو الكاشير سيظهر هنا فوراً مع صوت جرس تنبيه ☕🔔
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
            {tickets.map((t) => {
              const elapsed = getElapsedMinutes(t.createdAt);
              const isUrgent = elapsed >= 10;
              const isWarning = elapsed >= 6 && elapsed < 10;
              const isPreparing = t.status === "IN_PREPARATION";

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-3xl border-2 flex flex-col justify-between space-y-3 shadow-xl transition relative overflow-hidden ${
                    isUrgent
                      ? "bg-[#18080c] border-rose-500/80 shadow-rose-950/40 animate-pulse"
                      : isPreparing
                      ? "bg-[#161208] border-amber-500/80 shadow-amber-950/30"
                      : "bg-[#120e15] border-white/10"
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-white">
                          #{t.order?.orderNumber || "ORD"}
                        </span>
                        <span
                          className={`py-0.5 px-2 rounded-md text-[10px] font-black ${
                            t.station === "BARISTA"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : t.station === "KITCHEN"
                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {t.station === "BARISTA" ? "☕ باريستا" : t.station === "KITCHEN" ? "🥞 مطبخ" : "🍰 حلواني"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {t.order?.orderType === "DELIVERY" ? (
                          <span className="py-0.5 px-2 rounded-md text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            🛵 دليفري للمنزل
                          </span>
                        ) : t.order?.orderType === "TAKEAWAY" ? (
                          <span className="py-0.5 px-2 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            🛍️ تيك أواي سفري
                          </span>
                        ) : (
                          <span className="py-0.5 px-2 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🪑 صالة (ترابيزة {t.order?.tableNumber || "-"})
                          </span>
                        )}
                        {t.order?.customerName && (
                          <span className="text-[10px] text-slate-300">
                            • {t.order.customerName}
                          </span>
                        )}
                      </div>

                      {/* Delivery Address & Phone on Card */}
                      {t.order?.orderType === "DELIVERY" && (
                        <div className="mt-1.5 p-1.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-[10px] text-sky-200 space-y-0.5">
                          {t.order.deliveryAddress && (
                            <p className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>{t.order.deliveryAddress}</span>
                            </p>
                          )}
                          {t.order.deliveryPhone && (
                            <p className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>{t.order.deliveryPhone}</span>
                            </p>
                          )}
                          <p className="font-mono font-bold text-amber-300 pt-0.5 border-t border-sky-500/20">
                            مطلوب تحصيله: {t.order.finalAmount || t.order.subtotal || 0} ج.م (شامل التوصيل)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Timer Badge */}
                    <div
                      className={`py-1 px-2.5 rounded-xl text-xs font-mono font-black flex items-center gap-1 shrink-0 ${
                        isUrgent
                          ? "bg-rose-600 text-white animate-bounce"
                          : isWarning
                          ? "bg-amber-500 text-slate-950"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed} د</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-48 pr-1 text-xs">
                    {t.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-white/5">
                        <div className="flex-1">
                          <strong className="text-white block font-bold">
                            {it.nameAr} <span className="font-mono text-amber-400 font-black">×{it.qty || 1}</span>
                          </strong>
                          {it.notes && (
                            <p className="text-[10px] text-amber-300/90 italic pt-0.5">ملاحظة: {it.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {t.order?.notes && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200">
                        <strong>ملاحظات العميل:</strong> {t.order.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                    {/* Delivery Driver Slip Button */}
                    {t.order?.orderType === "DELIVERY" && (
                      <button
                        onClick={() => {
                          setPrintingDeliveryTicket(t);
                          setTimeout(() => window.print(), 300);
                        }}
                        className="py-2 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        title="طباعة بون الطيار 80 مم"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>بون الطيار 🛵</span>
                      </button>
                    )}

                    {t.status === "QUEUED" ? (
                      <button
                        onClick={() => handleUpdateStatus(t.id, "IN_PREPARATION")}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>بدء التحضير ⏳</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(t.id, "DONE")}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم التجهيز والجاهزية ✅</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          PRINTABLE DRIVER RECEIPT (بون الطيار 80MM)
         ───────────────────────────────────────────────────────────── */}
      {printingDeliveryTicket && (
        <div id="driver-dispatch-receipt" className="hidden print:block text-black font-sans p-2" dir="rtl">
          <div className="text-center space-y-1 border-b-2 border-black pb-2 mb-2">
            <h2 className="text-base font-black tracking-wider">سول ميت كافيه VIP</h2>
            <p className="text-[11px] font-bold">بون توصيل طلب دليفري (Driver Dispatch Slip 🛵)</p>
            <p className="text-[11px] font-mono font-black">رقم الشيك: #{printingDeliveryTicket.order?.orderNumber}</p>
            <p className="text-[10px] font-mono">
              التاريخ: {new Date(printingDeliveryTicket.createdAt).toLocaleString("ar-EG")}
            </p>
          </div>

          <div className="p-2 border border-black rounded-lg space-y-1 text-[11px] mb-2 font-bold bg-gray-50">
            <div className="flex items-center gap-1">
              <span>👤 العميل:</span>
              <strong className="text-sm">{printingDeliveryTicket.order?.customerName || "عميل راقٍ"}</strong>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span>📞 الهاتف:</span>
              <strong className="text-sm">{printingDeliveryTicket.order?.deliveryPhone || printingDeliveryTicket.order?.customerPhone || "-"}</strong>
            </div>
            <div className="flex items-start gap-1">
              <span>📍 العنوان:</span>
              <strong>{printingDeliveryTicket.order?.deliveryAddress || "العنوان غير محدد"}</strong>
            </div>
          </div>

          <div className="border-b border-black pb-2 mb-2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-black text-right font-black">
                  <th className="py-1">الصنف</th>
                  <th className="text-center">الكمية</th>
                </tr>
              </thead>
              <tbody>
                {printingDeliveryTicket.items.map((it: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-300">
                    <td className="py-1 font-bold">{it.nameAr}</td>
                    <td className="text-center font-mono font-black">×{it.qty || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] space-y-1 border-b-2 border-black pb-2 mb-2">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-mono">{printingDeliveryTicket.order?.subtotal || 0} ج.م</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>مصاريف التوصيل (دليفري):</span>
              <span className="font-mono">+{printingDeliveryTicket.order?.deliveryFee || 20} ج.م</span>
            </div>
            <div className="flex justify-between border-t border-black pt-1 text-sm font-black">
              <span>المطلوب تحصيله نقداً 💵:</span>
              <span className="font-mono text-base">{printingDeliveryTicket.order?.finalAmount || ((printingDeliveryTicket.order?.subtotal || 0) + (printingDeliveryTicket.order?.deliveryFee || 20))} ج.م</span>
            </div>
          </div>

          <div className="text-center text-[10px] space-y-0.5">
            <p className="font-bold">يرجى تسليم النقدية المحصلة لكاشير الوردية فور العودة</p>
            <p>شكراً لتعاملكم مع كافيه سول ميت VIP ☕✨</p>
          </div>
        </div>
      )}
    </div>
  );
}
