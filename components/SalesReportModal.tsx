"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle,
  Clock,
  PieChart,
  Layers,
  ChevronDown,
  CreditCard,
  Building,
} from "lucide-react";

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOutletId?: string;
  outlets?: Array<{ id: string; name: string; code: string }>;
  isOwner?: boolean;
}

export default function SalesReportModal({
  isOpen,
  onClose,
  defaultOutletId,
  outlets = [],
  isOwner = false,
}: SalesReportModalProps) {
  const [timeframe, setTimeframe] = useState<"TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "ALL">("TODAY");
  const [selectedOutlet, setSelectedOutlet] = useState<string>(defaultOutletId || "ALL");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"revenue" | "quantity" | "profit">("revenue");
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "payments" | "trend">("items");

  useEffect(() => {
    if (defaultOutletId) setSelectedOutlet(defaultOutletId);
  }, [defaultOutletId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchReport();
  }, [isOpen, timeframe, selectedOutlet]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = `/api/reports/sales?timeframe=${timeframe}&outletId=${selectedOutlet}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      }
    } catch (e) {
      console.error("Failed to fetch sales report", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filtered Items
  const items = (report?.items?.all || []).filter((it: any) => {
    const matchesSearch =
      !itemSearch.trim() ||
      it.nameAr.toLowerCase().includes(itemSearch.trim().toLowerCase());
    const matchesCat =
      itemCategoryFilter === "ALL" || it.category === itemCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Sort
  const sortedItems = [...items].sort((a: any, b: any) => {
    if (sortBy === "quantity") return b.quantity - a.quantity;
    if (sortBy === "profit") return b.profit - a.profit;
    return b.revenue - a.revenue;
  });

  // Format Quantity
  const formatQty = (qty: number, unit?: string) => {
    const val = Math.round(qty * 1000) / 1000;
    if (unit === "KG") {
      if (val === 0.25) return "ربع كيلو";
      if (val === 0.5) return "نصف كيلو";
      if (val === 0.75) return "¾ كيلو";
      return `${val} كجم`;
    }
    return `${val} قطعة`;
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!report) return;
    let csv = "\uFEFF"; // UTF-8 BOM for Arabic Excel
    csv += "تقرير مبيعات الأصناف المفصل\n";
    csv += `الفترة,${timeframe === "TODAY" ? "اليوم" : timeframe === "YESTERDAY" ? "أمس" : timeframe === "WEEK" ? "آخر 7 أيام" : timeframe === "MONTH" ? "هذا الشهر" : "كافة الفترات"}\n`;
    csv += `إجمالي المبيعات,${report.summary.totalNetRevenue} ج.م\n`;
    csv += `عدد الفواتير,${report.summary.totalOrdersCount}\n\n`;
    csv += "م,اسم الصنف,القسم,الكمية المباعة,إجمالي الإيراد (ج.م),التكلفة التقديرية,صافي الربح,عدد الفواتير\n";

    sortedItems.forEach((it: any, idx: number) => {
      csv += `${idx + 1},"${it.nameAr}","${it.category}",${it.quantity},${it.revenue},${it.cost},${it.profit},${it.ordersCount}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Print Report (Thermal / A4)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 text-right">
      <div className="bg-[#100d14] border-2 border-amber-500/40 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>تقرير المبيعات وحركة الأصناف الشامل</span>
                <span className="text-[11px] py-0.5 px-2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  BI Report
                </span>
              </h2>
              <p className="text-xs text-white/50">
                تحليل تفصيلي لمبيعات الأصناف، الأقسام، طرق الدفع، وأوقات الذروة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={loading || !report}
              className="py-1.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تصدير ملف إكسل CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">تصدير إكسل</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !report}
              className="py-1.5 px-3 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="طباعة التقرير"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">طباعة 🖨️</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-white/5 bg-black/20 flex flex-wrap items-center justify-between gap-3">
          {/* Timeframe Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-white/60 ml-1">الفترة:</span>
            {[
              { key: "TODAY", label: "اليوم 📅" },
              { key: "YESTERDAY", label: "أمس" },
              { key: "WEEK", label: "آخر 7 أيام" },
              { key: "MONTH", label: "هذا الشهر" },
              { key: "ALL", label: "الكل" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeframe(t.key as any)}
                className={`py-1.5 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                  timeframe === t.key
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Outlet Switcher (if Owner or multiple outlets) */}
          {isOwner && outlets.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/60">الفرع:</span>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="ALL">كافة الفروع (المشترك)</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-black/30 border-b border-white/5">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold mb-1">
              <span>صافي الإيراد والمبيعات</span>
              <DollarSign size={15} />
            </div>
            <div className="text-base sm:text-xl font-black text-amber-300 font-mono">
              {loading ? "..." : `${report?.summary?.totalNetRevenue ?? 0} ج`}
            </div>
            <div className="text-[10px] text-white/50">بدون رسوم التوصيل</div>
          </div>

          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/25">
            <div className="flex items-center justify-between text-sky-400 text-xs font-bold mb-1">
              <span>عدد الفواتير المنفذة</span>
              <Package size={15} />
            </div>
            <div className="text-base sm:text-xl font-black text-sky-300 font-mono">
              {loading ? "..." : `${report?.summary?.totalOrdersCount ?? 0} فاتورة`}
            </div>
            <div className="text-[10px] text-white/50">
              متوسط الفاتورة: {report?.summary?.averageTicketSize ?? 0} ج
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25">
            <div className="flex items-center justify-between text-purple-400 text-xs font-bold mb-1">
              <span>الأصناف المباعة</span>
              <Layers size={15} />
            </div>
            <div className="text-base sm:text-xl font-black text-purple-300 font-mono">
              {loading ? "..." : `${report?.items?.totalUniqueItemsSold ?? 0} صنف`}
            </div>
            <div className="text-[10px] text-white/50">أصناف مختلفة طلبت</div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold mb-1">
              <span>صافي الربح التقديري</span>
              <TrendingUp size={15} />
            </div>
            <div className="text-base sm:text-xl font-black text-emerald-300 font-mono">
              {loading ? "..." : `${report?.summary?.netProfit ?? 0} ج`}
            </div>
            <div className="text-[10px] text-white/50">بعد تكاليف البضاعة والمصروفات</div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-white/5 bg-black/10">
          <button
            onClick={() => setActiveTab("items")}
            className={`py-2 px-4 rounded-t-xl text-xs font-black transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "items"
                ? "border-amber-400 text-amber-300 bg-white/5"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <Package size={14} />
            <span>مبيعات الأصناف بالتفصيل ({sortedItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`py-2 px-4 rounded-t-xl text-xs font-black transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "categories"
                ? "border-amber-400 text-amber-300 bg-white/5"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <PieChart size={14} />
            <span>مبيعات الأقسام</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`py-2 px-4 rounded-t-xl text-xs font-black transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "border-amber-400 text-amber-300 bg-white/5"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <CreditCard size={14} />
            <span>طرق الدفع وقنوات البيع</span>
          </button>

          <button
            onClick={() => setActiveTab("trend")}
            className={`py-2 px-4 rounded-t-xl text-xs font-black transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "trend"
                ? "border-amber-400 text-amber-300 bg-white/5"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <Clock size={14} />
            <span>أوقات الذروة والتسلسل</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-white/50 text-sm animate-pulse">
              جاري تجهيز وتحليل تقرير المبيعات...
            </div>
          ) : activeTab === "items" ? (
            <div className="space-y-3">
              {/* Items Search and Sort Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 text-white/40 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="ابحث باسم الصنف..."
                    className="w-full py-2 pr-9 pl-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-amber-400 font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 font-bold">الترتيب:</span>
                  <button
                    onClick={() => setSortBy("revenue")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      sortBy === "revenue"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    الأعلى دخلاً 💰
                  </button>
                  <button
                    onClick={() => setSortBy("quantity")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      sortBy === "quantity"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    الأكثر طلباً 📦
                  </button>
                  <button
                    onClick={() => setSortBy("profit")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      sortBy === "profit"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    الأعلى ربحاً 📈
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/90 text-white/70 border-b border-white/10 font-black">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3">القسم</th>
                      <th className="p-3 text-center">الكمية المباعة</th>
                      <th className="p-3 text-center">إجمالي الإيراد</th>
                      <th className="p-3 text-center">التكلفة</th>
                      <th className="p-3 text-center">صافي الربح</th>
                      <th className="p-3 text-center">الفواتير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-white/40">
                          لا توجد مبيعات مسجلة في هذه الفترة المحددة
                        </td>
                      </tr>
                    ) : (
                      sortedItems.map((it: any, idx: number) => (
                        <tr key={it.id || idx} className="hover:bg-white/5 transition">
                          <td className="p-3 text-center text-white/40 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-white flex items-center gap-1.5">
                            {it.nameAr}
                          </td>
                          <td className="p-3 text-white/60 text-[11px]">{it.category}</td>
                          <td className="p-3 text-center font-mono font-bold text-amber-300">
                            {formatQty(it.quantity, it.unitType)}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-emerald-400">
                            {it.revenue} ج
                          </td>
                          <td className="p-3 text-center font-mono text-white/50">
                            {Math.round(it.cost)} ج
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-purple-300">
                            +{Math.round(it.profit)} ج
                          </td>
                          <td className="p-3 text-center font-mono text-white/60">
                            {it.ordersCount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "categories" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(report?.categories || []).map((cat: any) => {
                const totalRev = report?.summary?.totalNetRevenue || 1;
                const pct = Math.round((cat.revenue / totalRev) * 100);
                return (
                  <div key={cat.name} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="text-white">{cat.name}</span>
                      <span className="font-mono text-amber-300">{cat.revenue} ج</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-white/50">
                      <span>الكمية: {cat.quantity}</span>
                      <span>النسبة: {pct}% من إجمالي المبيعات</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === "payments" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h3 className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <CreditCard size={15} />
                  <span>توزيع طرق الدفع</span>
                </h3>
                <div className="space-y-2">
                  {(report?.paymentMethods || []).map((pm: any) => (
                    <div
                      key={pm.label}
                      className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-white">{pm.label}</span>
                      <div className="text-left">
                        <div className="font-mono font-black text-amber-300">{pm.total} ج</div>
                        <div className="text-[10px] text-white/50 font-mono">{pm.count} عملية</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h3 className="text-xs font-black text-sky-400 flex items-center gap-2">
                  <Building size={15} />
                  <span>قنوات البيع (صالة / استلام / دليفري)</span>
                </h3>
                <div className="space-y-2">
                  {(report?.orderTypes || []).map((ot: any) => (
                    <div
                      key={ot.label}
                      className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-white">{ot.label}</span>
                      <div className="text-left">
                        <div className="font-mono font-black text-sky-300">{ot.total} ج</div>
                        <div className="text-[10px] text-white/50 font-mono">{ot.count} طلب</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-amber-400 flex items-center gap-2">
                <Clock size={15} />
                <span>حركة المبيعات خلال الفترة ({timeframe === "TODAY" ? "ساعات اليوم" : "الأيام"})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {(report?.timeTrend || []).map((t: any) => (
                  <div key={t.period} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white font-mono">{t.period}</div>
                      <div className="text-[10px] text-white/50">{t.ordersCount} طلب</div>
                    </div>
                    <div className="font-mono font-black text-emerald-400 text-sm">
                      {t.revenue} ج
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
