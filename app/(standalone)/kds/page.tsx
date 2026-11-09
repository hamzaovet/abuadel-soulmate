"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

export default function KdsScreenPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stationFilter, setStationFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio Context Ref
  const lastTicketIdRef = useRef<string | null>(null);

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
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black" dir="rtl">
      {/* KDS TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#120d14]/95 backdrop-blur-md border-b border-amber-500/25 px-4 sm:px-8 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/soulmate-logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-amber-300">
                شاشة الباريستا والمطبخ الفورية (KDS Live)
              </h1>
              <span className="py-0.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black animate-pulse">
                مباشر 🟢
              </span>
            </div>
            <p className="text-xs text-slate-400">
              توجيه آلي للطلبات من الترابيزات والكاشير لمحطة التحضير
            </p>
          </div>
        </div>

        {/* Station Filters & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Station Filter Pills */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold">
            <button
              onClick={() => setStationFilter("ALL")}
              className={`py-1 px-3 rounded-lg transition ${
                stationFilter === "ALL" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              كل المحطات 🛎️
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
            title={soundEnabled ? "صوت الجرس مفعّل" : "صوت الجرس مكتوم"}
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

          <Link
            href="/pos"
            className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md hidden sm:inline"
          >
            شاشة الكاشير POS 💰
          </Link>
        </div>
      </header>

      {/* TICKETS BOARD */}
      <main className="flex-1 p-4 sm:p-6 space-y-4">
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
                      <p className="text-xs text-amber-300 font-black pt-1">
                        {t.order?.tableNumber ? `💺 ترابيزة: ${t.order.tableNumber}` : "🛍️ تيك أواي / سفري"}
                      </p>
                    </div>

                    {/* Timer Badge */}
                    <div
                      className={`py-1 px-2.5 rounded-xl text-xs font-mono font-black flex items-center gap-1 ${
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
    </div>
  );
}
