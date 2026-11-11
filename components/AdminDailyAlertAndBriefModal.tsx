"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Factory,
  Coffee,
  Cake,
  DollarSign,
  Send,
} from "lucide-react";

interface AdminDailyAlertAndBriefModalProps {
  currentUser: any;
  settings: any;
  onSettingsUpdated?: (newSettings: any) => void;
  onRefreshDashboard?: () => void;
  externalOpenSignal?: number;
  onStatusChange?: (status: {
    hasAlertPending: boolean;
    isRinging: boolean;
    urgentRawCount: number;
    factoryNeedsCount: number;
  }) => void;
}

function getCairoNowParts() {
  const now = new Date();
  const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const y = cairo.getUTCFullYear();
  const m = String(cairo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(cairo.getUTCDate()).padStart(2, "0");
  const hh = cairo.getUTCHours();
  const mm = cairo.getUTCMinutes();
  return {
    dateStr: `${y}-${m}-${d}`,
    hhmm: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    minutesOfDay: hh * 60 + mm,
  };
}

function parseTimeToMinutes(hhmm?: string | null): number {
  const parts = String(hhmm || "20:00").split(":");
  const h = Math.min(23, Math.max(0, Number(parts[0]) || 20));
  const m = Math.min(59, Math.max(0, Number(parts[1]) || 0));
  return h * 60 + m;
}

export default function AdminDailyAlertAndBriefModal({
  currentUser,
  settings,
  onSettingsUpdated,
  onRefreshDashboard,
  externalOpenSignal = 0,
  onStatusChange,
}: AdminDailyAlertAndBriefModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(() => getCairoNowParts().dateStr);
  const [alertTimeEdit, setAlertTimeEdit] = useState<string>(settings?.dailyReportAlertTime || "20:00");
  const [alertEnabledEdit, setAlertEnabledEdit] = useState<boolean>(settings?.dailyReportAlertEnabled ?? true);
  const [alertSoundEdit, setAlertSoundEdit] = useState<boolean>(settings?.dailyReportAlertSound ?? true);
  const [repeatSecondsEdit, setRepeatSecondsEdit] = useState<number>(settings?.dailyReportRepeatSeconds || 4);
  const [savingAlertCfg, setSavingAlertCfg] = useState(false);

  // Editable Abu Adel factory replenishment quantities inside brief modal
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});
  const [sendingFactory, setSendingFactory] = useState(false);
  const [onlyShortagesFilter, setOnlyShortagesFilter] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Sync local config inputs when settings arrive
  useEffect(() => {
    if (settings) {
      if (settings.dailyReportAlertTime) setAlertTimeEdit(settings.dailyReportAlertTime);
      if (typeof settings.dailyReportAlertEnabled === "boolean") setAlertEnabledEdit(settings.dailyReportAlertEnabled);
      if (typeof settings.dailyReportAlertSound === "boolean") setAlertSoundEdit(settings.dailyReportAlertSound);
      if (settings.dailyReportRepeatSeconds) setRepeatSecondsEdit(settings.dailyReportRepeatSeconds);
    }
  }, [settings]);

  // Self-hosted WAV file + Web Audio API fallback (NEVER depends on external Google/CDN sounds!)
  const playOneChime = () => {
    if (typeof window === "undefined") return;
    let wavPlayed = false;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/daily-alert.wav");
        audioRef.current.volume = 0.95;
      }
      audioRef.current.currentTime = 0;
      const p = audioRef.current.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          playWebAudioFallback();
        });
      }
      wavPlayed = true;
    } catch {
      wavPlayed = false;
    }
    if (!wavPlayed) {
      playWebAudioFallback();
    }
  };

  const playWebAudioFallback = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [784, 988, 1175].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.22);
        gain.gain.setValueAtTime(0.2, now + idx * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.22);
        osc.stop(now + idx * 0.22 + 0.38);
      });
    } catch {
      // Browser audio blocked until interaction
    }
  };

  const fetchBrief = async (dateVal = selectedDate) => {
    try {
      setBriefLoading(true);
      const res = await fetch(`/api/reports/daily-brief?date=${encodeURIComponent(dateVal)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setBrief(data);
        const initialEdits: Record<string, string> = {};
        for (const r of data.abuAdelReplenishment || []) {
          initialEdits[r.menuItemId] = String(r.totalFactoryOrderSuggested ?? 0);
        }
        setQtyEdits(initialEdits);
        onStatusChange?.({
          hasAlertPending: isRinging,
          isRinging,
          urgentRawCount: data.urgentRawCount || 0,
          factoryNeedsCount: data.factoryNeedsCount || 0,
        });
      }
    } catch (e) {
      console.error("Failed to fetch daily brief:", e);
    } finally {
      setBriefLoading(false);
    }
  };

  // Manual trigger from header button
  useEffect(() => {
    if (externalOpenSignal > 0) {
      setIsOpen(true);
      fetchBrief(selectedDate);
    }
  }, [externalOpenSignal]);

  // Scheduled check every 15s for configured time (e.g. 20:00 = 8:00 PM)
  useEffect(() => {
    if (!currentUser) return;

    const checkSchedule = () => {
      const enabled = settings?.dailyReportAlertEnabled ?? true;
      if (!enabled) return;

      const { dateStr, minutesOfDay } = getCairoNowParts();
      const targetMins = parseTimeToMinutes(settings?.dailyReportAlertTime || "20:00");
      const dismissKey = `daily_brief_dismissed_${dateStr}`;
      const dismissed = typeof window !== "undefined" ? localStorage.getItem(dismissKey) : null;

      if (minutesOfDay >= targetMins && !dismissed) {
        setIsOpen(true);
        if (settings?.dailyReportAlertSound ?? true) {
          setIsRinging(true);
        }
        if (!brief) {
          fetchBrief(dateStr);
        }
      }
    };

    checkSchedule();
    const timer = setInterval(checkSchedule, 15000);
    return () => clearInterval(timer);
  }, [currentUser, settings?.dailyReportAlertEnabled, settings?.dailyReportAlertTime, settings?.dailyReportAlertSound]);

  // Background continuous repeating sound loop UNTIL manager explicitly turns it off!
  useEffect(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }

    if (isRinging) {
      playOneChime();
      const sec = Math.max(2, Number(settings?.dailyReportRepeatSeconds || repeatSecondsEdit || 4));
      ringIntervalRef.current = setInterval(() => {
        playOneChime();
      }, sec * 1000);
    }

    onStatusChange?.({
      hasAlertPending: isRinging,
      isRinging,
      urgentRawCount: brief?.urgentRawCount || 0,
      factoryNeedsCount: brief?.factoryNeedsCount || 0,
    });

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [isRinging, settings?.dailyReportRepeatSeconds]);

  // Unlock browser autoplay on first click while ringing is active
  useEffect(() => {
    if (!isRinging) return;
    const unlock = () => {
      playOneChime();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [isRinging]);

  const handleDismissAndStopAlarm = () => {
    const { dateStr } = getCairoNowParts();
    if (typeof window !== "undefined") {
      localStorage.setItem(`daily_brief_dismissed_${dateStr}`, new Date().toISOString());
    }
    setIsRinging(false);
    setIsOpen(false);
  };

  const handleStopAlarmOnly = () => {
    const { dateStr } = getCairoNowParts();
    if (typeof window !== "undefined") {
      localStorage.setItem(`daily_brief_dismissed_${dateStr}`, new Date().toISOString());
    }
    setIsRinging(false);
  };

  const handleSaveAlertSettings = async () => {
    try {
      setSavingAlertCfg(true);
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyReportAlertEnabled: alertEnabledEdit,
          dailyReportAlertTime: alertTimeEdit,
          dailyReportAlertSound: alertSoundEdit,
          dailyReportRepeatSeconds: Number(repeatSecondsEdit) || 4,
        }),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        onSettingsUpdated?.(data.settings);
        // Clear today's dismiss if manager rescheduled alert for a future minute today!
        const { dateStr, minutesOfDay } = getCairoNowParts();
        if (parseTimeToMinutes(alertTimeEdit) > minutesOfDay && typeof window !== "undefined") {
          localStorage.removeItem(`daily_brief_dismissed_${dateStr}`);
        }
        setToastMsg(`تم حفظ إعدادات التقرير والجرس اليومي (${alertTimeEdit}) ✅`);
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch {
      setToastMsg("تعذر حفظ إعدادات التقرير");
    } finally {
      setSavingAlertCfg(false);
    }
  };

  const handleSendTomorrowFactoryOrder = async () => {
    if (!brief?.abuAdelReplenishment) return;
    try {
      setSendingFactory(true);
      const rows = brief.abuAdelReplenishment.map((r: any) => ({
        menuItemId: r.menuItemId,
        nameAr: r.nameAr,
        unitType: r.unitType,
        currentStock: r.currentStock,
        minStockLevel: r.dailyLimit,
        shortageQty: r.shortageToDailyLimit,
        confirmedPreOrderQty: r.confirmedPreOrderTomorrow,
        suggestedQty: r.totalFactoryOrderSuggested,
        approvedQty: Math.max(0, parseFloat(qtyEdits[r.menuItemId] ?? String(r.totalFactoryOrderSuggested)) || 0),
        notes: "",
      }));

      const res = await fetch("/api/factory-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_SHEET",
          targetDate: brief.tomorrowDate,
          status: "SENT_TO_FACTORY",
          createdBy: currentUser?.name || "المايسترو",
          notes: `اعتماد من التقرير اليومي للمدير (${brief.date})`,
          rows,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(data.message || `تم اعتماد طلبية المصنع ليوم ${brief.tomorrowDate} 🏭✅`);
        onRefreshDashboard?.();
      } else {
        setToastMsg(data.error || "تعذر إرسال طلبية المصنع");
      }
    } catch {
      setToastMsg("تعذر الاتصال بالخادم لإرسال الطلبية");
    } finally {
      setSendingFactory(false);
    }
  };

  if (!isOpen) return null;

  const visibleProducts = (brief?.abuAdelReplenishment || []).filter((r: any) => {
    if (!onlyShortagesFilter) return true;
    return r.totalFactoryOrderSuggested > 0 || r.soldToday > 0 || r.currentStock <= r.dailyLimit;
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-950 border-2 border-amber-500/50 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* TOP RINGING / HEADER BAR */}
        <div
          className={`p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
            isRinging ? "bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-rose-950/90 animate-pulse" : "bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isRinging ? "bg-rose-500 text-white animate-bounce" : "bg-amber-500/20 text-amber-400"
              }`}
            >
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>📋 التقرير اليومي الشامل للمدير ومراجعة الكاشير وطلبية المصنع</span>
                {isRinging && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black">
                    🔊 جرس التنبيه مستمر حتى الإغلاق!
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300">
                يراجع مبيعات وخزنة اليوم وأرصدة الكاشير، حد الطلب اليومي لأبو عادل، وتحذيرات خامات سول ميت (مهلة 3 أسابيع)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isRinging ? (
              <button
                type="button"
                onClick={handleStopAlarmOnly}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <VolumeX className="w-4 h-4" />
                <span>كتم الجرس المتكرر الآن 🔕</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRinging(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="تشغيل الجرس المدمج المستمر للتجربة"
              >
                <Volume2 className="w-4 h-4" />
                <span>تجربة الجرس المتكرر 🔊</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>

            <button
              type="button"
              onClick={handleDismissAndStopAlarm}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تمت المراجعة وإغلاق التنبيه</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRinging(false);
                setIsOpen(false);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOAST */}
        {toastMsg && (
          <div className="px-4 py-2 bg-emerald-600/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
            {toastMsg}
          </div>
        )}

        {/* SCHEDULE & SETTINGS BAR */}
        <div className="p-3 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-slate-400 font-bold">تاريخ التقرير:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchBrief(e.target.value);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-amber-300 font-mono"
            />
            <button
              type="button"
              onClick={() => fetchBrief(selectedDate)}
              disabled={briefLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${briefLoading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-bold">موعد الجرس التلقائي:</span>
            <input
              type="time"
              value={alertTimeEdit}
              onChange={(e) => setAlertTimeEdit(e.target.value)}
              className="bg-slate-900 border border-amber-500/40 rounded px-2 py-0.5 text-amber-300 font-mono text-xs"
            />
            <span className="text-slate-400">تكرار كل</span>
            <input
              type="number"
              min={2}
              max={60}
              value={repeatSecondsEdit}
              onChange={(e) => setRepeatSecondsEdit(Number(e.target.value))}
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white font-mono"
            />
            <span className="text-slate-400">ث</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={alertEnabledEdit}
                onChange={(e) => setAlertEnabledEdit(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-slate-200">تفعيل يومياً</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={alertSoundEdit}
                onChange={(e) => setAlertSoundEdit(e.target.checked)}
                className="accent-emerald-500"
              />
              <span className="text-slate-200">بصوت</span>
            </label>
            <button
              type="button"
              onClick={handleSaveAlertSettings}
              disabled={savingAlertCfg}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
            >
              {savingAlertCfg ? "..." : "حفظ الموعد 💾"}
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {briefLoading && !brief ? (
            <div className="py-16 text-center text-slate-400 text-sm">جاري تجميع مبيعات اليوم وأرصدة الكاشير والمخازن...</div>
          ) : (
            <>
              {/* SECTION 1: CASHIER & TREASURY REVIEW PER BRANCH */}
              <div className="space-y-2.5">
                <h3 className="font-black text-sm text-amber-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>1. مراجعة خزنة الكاشير ومبيعات اليوم ({brief?.date})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(brief?.branchAudit || []).map((b: any) => (
                    <div
                      key={b.outletId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-black text-sm text-white">{b.outletName}</div>
                          <div className="text-[11px] text-slate-400">
                            الكاشير الحالي: <strong className="text-slate-200">{b.activeCashier}</strong> • {b.paidCount} طلب مسدد ({b.unpaidCount} مفتوح)
                          </div>
                        </div>
                        <div className="text-left font-mono">
                          <div className="text-[10px] text-slate-400">صافي مبيعات اليوم</div>
                          <div className="text-lg font-black text-amber-400">{b.storeRevenue.toLocaleString()} ج.م</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono">
                        <div className="bg-slate-950 rounded-xl p-2 border border-slate-800">
                          <div className="text-slate-400 font-sans text-[10px]">كاش</div>
                          <div className="font-bold text-emerald-400">{b.cashSales.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-2 border border-slate-800">
                          <div className="text-slate-400 font-sans text-[10px]">فيزا</div>
                          <div className="font-bold text-sky-400">{b.visaSales.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-2 border border-slate-800">
                          <div className="text-slate-400 font-sans text-[10px]">إنستاباي</div>
                          <div className="font-bold text-purple-400">{b.instapaySales.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-2 border border-slate-800">
                          <div className="text-slate-400 font-sans text-[10px]">فودافون</div>
                          <div className="font-bold text-rose-400">{b.vodafoneSales.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-mono">
                        <span className="font-sans text-slate-400">
                          عهدة بداية: <strong>{b.openingFloat}</strong> • مصروفات/مورد من الدرج:{" "}
                          <strong className="text-rose-400">-{b.expensesTotal}</strong> • دليفري طيارين:{" "}
                          <strong className="text-sky-300">{b.deliveryFeesTotal}</strong>
                        </span>
                        <span className="font-black text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                          الدرج المتوقع: {b.expectedCashInDrawer.toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: SOULMATE RAW MATERIALS 21-DAY (3 WEEKS) LEAD TIME ALERTS */}
              <div className="space-y-2.5">
                <h3 className="font-black text-sm text-rose-300 flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  <span>2. إنذار خامات سول ميت ومهلة التوريد (خاصة الأكواب الكرتون قبلها بـ 3 أسابيع = 21 يوم)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(brief?.rawMaterialAlerts || []).slice(0, 9).map((raw: any) => (
                    <div
                      key={raw.id}
                      className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-2 ${
                        raw.reorderUrgent
                          ? "bg-rose-950/35 border-rose-500/50"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-white">{raw.nameAr}</div>
                          <div className="text-[10px] text-slate-400">
                            مهلة تنفيذ المصنع: <strong className="text-amber-300">{raw.leadTimeDays} يوم</strong>
                            {raw.isThreeWeekCup ? " (⚠️ 3 أسابيع)" : ""}
                          </div>
                        </div>
                        {raw.reorderUrgent && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shrink-0 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>اطلب فوراً</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] bg-slate-950/70 rounded-xl px-2.5 py-1.5">
                        <span>
                          الرصيد: <strong className="text-white">{raw.currentStock}</strong> {raw.unit}
                        </span>
                        <span>
                          يكفي:{" "}
                          <strong className={raw.daysRemaining <= raw.leadTimeDays ? "text-rose-400" : "text-emerald-400"}>
                            {raw.daysRemaining >= 999 ? "مستقر" : `${raw.daysRemaining} يوم`}
                          </strong>
                        </span>
                      </div>
                      {raw.reorderUrgent && raw.recommendedOrderQty > 0 && (
                        <div className="text-[11px] text-amber-300 font-bold">
                          📌 يوصى بطلب: <span className="font-mono">{raw.recommendedOrderQty}</span> {raw.unit} لتغطية مهلة {raw.leadTimeDays} يوم
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: ABU ADEL DAILY PAR LIMIT & TOMORROW FACTORY PROCUREMENT */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-sm text-emerald-300 flex items-center gap-2">
                    <Cake className="w-4 h-4" />
                    <span>3. كشف مبيعات وأرصدة أبو عادل وطريحة المصنع المطلوبة (حد الطلب اليومي - الرصيد + الحجوزات)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                      <input
                        type="checkbox"
                        checked={onlyShortagesFilter}
                        onChange={(e) => setOnlyShortagesFilter(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>عرض الأصناف المتحركة أو المطلوبة فقط</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSendTomorrowFactoryOrder}
                      disabled={sendingFactory}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Factory className="w-4 h-4" />
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingFactory ? "جاري الإرسال..." : `اعتماد وإرسال طريحة المصنع ليوم ${brief?.tomorrowDate}`}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[340px]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-300 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">الصنف</th>
                          <th className="py-2.5 px-2 text-center">حد الطلب اليومي</th>
                          <th className="py-2.5 px-2 text-center text-sky-300">مباع اليوم</th>
                          <th className="py-2.5 px-2 text-center">الرصيد المتبقي</th>
                          <th className="py-2.5 px-2 text-center text-rose-400">النقص عن الحد</th>
                          <th className="py-2.5 px-2 text-center text-amber-400">حجوزات غداً</th>
                          <th className="py-2.5 px-3 text-center bg-amber-500/10 text-amber-300">المطلوب من المصنع ✏️</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {visibleProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                              لا توجد أصناف بها نواقص حالياً — ألغِ التصفية لعرض جميع الأصناف.
                            </td>
                          </tr>
                        ) : (
                          visibleProducts.slice(0, 120).map((r: any) => (
                            <tr key={r.menuItemId} className="hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-sans font-bold text-white">
                                {r.nameAr}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">({r.unitType})</span>
                              </td>
                              <td className="py-2 px-2 text-center text-slate-300">{r.dailyLimit}</td>
                              <td className="py-2 px-2 text-center font-bold text-sky-300">{r.soldToday}</td>
                              <td className="py-2 px-2 text-center font-bold text-white">{r.currentStock}</td>
                              <td className="py-2 px-2 text-center font-bold text-rose-400">
                                {r.shortageToDailyLimit > 0 ? `+${r.shortageToDailyLimit}` : "0"}
                              </td>
                              <td className="py-2 px-2 text-center text-amber-400">
                                {r.confirmedPreOrderTomorrow > 0 ? `+${r.confirmedPreOrderTomorrow}` : "0"}
                              </td>
                              <td className="py-1.5 px-3 text-center bg-amber-500/5">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={qtyEdits[r.menuItemId] ?? String(r.totalFactoryOrderSuggested ?? 0)}
                                  onChange={(e) =>
                                    setQtyEdits((prev) => ({
                                      ...prev,
                                      [r.menuItemId]: e.target.value,
                                    }))
                                  }
                                  className="w-20 bg-black/70 border border-amber-500/40 rounded-lg px-2 py-1 text-center font-black text-amber-300 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
