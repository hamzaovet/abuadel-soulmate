"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Edit3,
  History,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { paymentMethodAr } from "./OrderRevisionModals";

interface Props {
  outletId?: string;
  actorName?: string;
  onToast: (type: "success" | "error" | "info", message: string) => void;
}

export default function AdminAuditAlertsDrawer({
  outletId = "ALL",
  actorName = "المدير العام",
  onToast,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"alerts" | "logs">("alerts");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const q = outletId && outletId !== "ALL" ? `?outletId=${encodeURIComponent(outletId)}` : "";
      const res = await fetch(`/api/admin-alerts${q}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setAuditLogs(data.auditLogs || []);
        setUnreadCount(Number(data.unreadCount) || 0);
      }
    } catch {
      // silent background polling
    }
  }, [outletId]);

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 12000);
    return () => clearInterval(timer);
  }, [fetchAlerts]);

  const markSingleRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_READ", id, readBy: actorName }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true, readBy: actorName, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      onToast("error", "تعذر تحديث حالة التنبيه");
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_READ", outletId, readBy: actorName }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readBy: actorName })));
        setUnreadCount(0);
        onToast("success", data.message || "تمت مراجعة كافة تنبيهات التعديل ✅");
      }
    } catch {
      onToast("error", "تعذر تحديث التنبيهات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header Security Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          fetchAlerts();
        }}
        className={`relative flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl text-xs border transition cursor-pointer ${
          unreadCount > 0
            ? "bg-rose-600/25 hover:bg-rose-600/35 text-rose-200 border-rose-500/60 shadow-lg shadow-rose-500/20 animate-pulse"
            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
        }`}
        title="سجل الرقابة وتنبيهات الفواتير المعدلة وتعديل الدفع"
      >
        <ShieldAlert className={`w-4 h-4 ${unreadCount > 0 ? "text-rose-400" : "text-sky-400"}`} />
        <span className="hidden md:inline">تنبيهات الرقابة والتعديل</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white font-mono">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Alerts & Audit Drawer Modal — Portaled to document.body to escape sticky backdrop-filter header */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
            dir="rtl"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="my-auto bg-slate-900 border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 px-6 py-4 bg-gradient-to-l from-rose-500/20 via-amber-500/10 to-slate-900 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>مركز الرقابة وتنبيهات الإدارة الفورية</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                        {unreadCount} جديد
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يرصد كل عملية [فاتورة معدلة] أو [تعديل وسيلة دفع] لحظياً لحماية الخزينة والمخزون
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAlerts}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="تحديث التنبيهات"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={markAllRead}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>اعتماد مراجعة الكل</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="shrink-0 px-6 pt-3 pb-2 border-b border-white/10 flex items-center gap-2 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setTab("alerts")}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                  tab === "alerts"
                    ? "bg-rose-500 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                🚨 التنبيهات ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("logs")}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  tab === "logs"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل فروقات الفواتير التفصيلي ({auditLogs.length})</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {tab === "alerts" ? (
                notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    لا توجد تنبيهات تعديل فواتير أو تعديل دفع حتى الآن — الموقف الرقابي سليم ✅
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isPayment = n.category === "PAYMENT_EDITED";
                    return (
                      <div
                        key={n.id}
                        className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          !n.isRead
                            ? isPayment
                              ? "bg-sky-950/30 border-sky-500/50"
                              : "bg-rose-950/30 border-rose-500/50"
                            : "bg-slate-950/60 border-white/10 opacity-75"
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isPayment ? (
                              <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                تعديل دفع
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1">
                                <Edit3 className="w-3 h-3" />
                                فاتورة معدلة
                              </span>
                            )}
                            <span className="text-sm font-black text-white">{n.title}</span>
                            {!n.isRead && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                                غير مقروء
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">{n.message}</p>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-3 flex-wrap">
                            <span>🕒 {new Date(n.createdAt).toLocaleString("ar-EG")}</span>
                            {n.actorName && <span>👤 بواسطة: {n.actorName}</span>}
                            {n.readBy && <span className="text-emerald-400">✓ تمت المراجعة ({n.readBy})</span>}
                          </div>
                        </div>

                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => markSingleRead(n.id)}
                            className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1 shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تمت المراجعة</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  لا توجد سجلات تعديل مسجلة حتى الآن
                </div>
              ) : (
                auditLogs.map((log) => {
                  let oldItems: any[] = [];
                  let newItems: any[] = [];
                  try {
                    if (log.oldItemsJson) oldItems = JSON.parse(log.oldItemsJson);
                    if (log.newItemsJson) newItems = JSON.parse(log.newItemsJson);
                  } catch {}
                  return (
                    <div key={log.id} className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-amber-400 text-sm">#{log.orderNumber}</span>
                          <span className="text-xs font-bold text-slate-300">({log.outletName})</span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                              log.actionType === "PAYMENT_EDIT"
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {log.actionType === "PAYMENT_EDIT" ? "💳 تعديل دفع" : "✏️ فاتورة معدلة"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString("ar-EG")}
                        </span>
                      </div>

                      <div className="text-xs text-slate-200">
                        <strong className="text-rose-300">السبب:</strong> {log.reason} •{" "}
                        <span className="text-slate-400">القائم بالتعديل: {log.performedBy}</span>
                      </div>

                      {log.actionType === "PAYMENT_EDIT" ? (
                        <div className="text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
                          <span className="text-slate-400">وسيلة السداد:</span>
                          <span className="line-through text-rose-300">{paymentMethodAr(log.oldPaymentMethod)}</span>
                          <span>⬅️</span>
                          <span className="text-emerald-400 font-black">{paymentMethodAr(log.newPaymentMethod)}</span>
                          <span className="text-slate-400 mr-auto font-mono">({log.newFinalAmount} ج.م)</span>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-3 flex-wrap bg-slate-900 border border-white/5 rounded-xl px-3 py-2">
                            <span className="text-slate-400">الإجمالي:</span>
                            <span className="line-through text-rose-300 font-mono">{log.oldFinalAmount} ج.م</span>
                            <span>⬅️</span>
                            <span className="text-emerald-400 font-black font-mono">{log.newFinalAmount} ج.م</span>
                            <span
                              className={`font-mono font-black mr-auto ${
                                log.amountDiff > 0 ? "text-emerald-400" : log.amountDiff < 0 ? "text-rose-400" : "text-slate-400"
                              }`}
                            >
                              (الفرق: {log.amountDiff > 0 ? `+${log.amountDiff}` : log.amountDiff} ج.م)
                            </span>
                          </div>
                          {(oldItems.length > 0 || newItems.length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-2">
                                <p className="font-bold text-rose-300 mb-1">قبل التعديل:</p>
                                {oldItems.map((it: any, i: number) => (
                                  <div key={i} className="text-slate-300">
                                    • {it.qty} × {it.nameAr}
                                  </div>
                                ))}
                              </div>
                              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-2">
                                <p className="font-bold text-emerald-300 mb-1">بعد التعديل:</p>
                                {newItems.map((it: any, i: number) => (
                                  <div key={i} className="text-slate-200 font-bold">
                                    • {it.qty} × {it.nameAr}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
