"use client";

import React, { useEffect, useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Coins, RefreshCw, Save, Search } from "lucide-react";

interface Props {
  rawMaterials: any[];
  onRefresh: () => void;
  onToast: (type: "success" | "error" | "info", message: string) => void;
}

export default function AdminBulkRawPriceEditor({ rawMaterials, onRefresh, onToast }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [unitPriceDrafts, setUnitPriceDrafts] = useState<Record<string, string>>({});
  const [minAlertDrafts, setMinAlertDrafts] = useState<Record<string, string>>({});
  const [packPriceMap, setPackPriceMap] = useState<Record<string, string>>({});
  const [packSizeMap, setPackSizeMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextPrices: Record<string, string> = {};
    const nextAlerts: Record<string, string> = {};
    for (const r of rawMaterials) {
      nextPrices[r.id] = String(r.costPerUnit ?? 0);
      nextAlerts[r.id] = String(r.minStockAlert ?? 0);
    }
    setUnitPriceDrafts(nextPrices);
    setMinAlertDrafts(nextAlerts);
  }, [rawMaterials]);

  const dirtyIds = rawMaterials
    .filter((r) => {
      const p = Number(unitPriceDrafts[r.id]);
      const a = Number(minAlertDrafts[r.id]);
      return (
        (Number.isFinite(p) && Math.abs(p - Number(r.costPerUnit || 0)) > 0.00001) ||
        (Number.isFinite(a) && Math.abs(a - Number(r.minStockAlert || 0)) > 0.01)
      );
    })
    .map((r) => r.id);

  const handlePackChange = (raw: any, nextPackPrice: string, nextPackSize: string) => {
    setPackPriceMap((prev) => ({ ...prev, [raw.id]: nextPackPrice }));
    setPackSizeMap((prev) => ({ ...prev, [raw.id]: nextPackSize }));
    const price = Number(nextPackPrice);
    const size = Number(nextPackSize);
    if (price > 0 && size > 0) {
      const computedUnit = Number((price / size).toFixed(4));
      setUnitPriceDrafts((prev) => ({ ...prev, [raw.id]: String(computedUnit) }));
    }
  };

  const handleSaveAll = async () => {
    const targetIds = dirtyIds.length > 0 ? dirtyIds : rawMaterials.map((r) => r.id);
    if (targetIds.length === 0) return;

    setSaving(true);
    try {
      const updates = targetIds.map((id) => ({
        id,
        costPerUnit: Math.max(0, Number(unitPriceDrafts[id]) || 0),
        minStockAlert: Math.max(0, Number(minAlertDrafts[id]) || 0),
      }));

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BULK_UPDATE_RAW_PRICES", updates }),
      });
      const data = await res.json();
      if (data.success) {
        onToast("success", data.message || "تم تحديث أسعار الخامات وإعادة تسعير كل المنيو تلقائياً ✅");
        onRefresh();
      } else {
        onToast("error", data.error || "فشل حفظ أسعار الخامات");
      }
    } catch {
      onToast("error", "حدث خطأ أثناء الاتصال بخادم التسعير");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculateAll = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RECALCULATE_ALL_COSTS" }),
      });
      const data = await res.json();
      if (data.success) {
        onToast("success", data.message);
        onRefresh();
      } else {
        onToast("error", data.error || "فشل إعادة التسعير");
      }
    } catch {
      onToast("error", "تعذر إعادة تسعير المنيو");
    } finally {
      setSaving(false);
    }
  };

  const filtered = rawMaterials.filter(
    (r) => !search.trim() || r.nameAr?.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg">
      <div
        onClick={() => setExpanded((e) => !e)}
        className="px-5 py-3.5 bg-gradient-to-l from-amber-500/15 via-emerald-500/5 to-slate-900 flex items-center justify-between flex-wrap gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>جدول التسعير الديناميكي السريع للخامات بالجملة</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                تحديث تلقائي لتكلفة {rawMaterials.length} خامة وجميع المشروبات والبان كيك
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              عدّل سعر العبوة/الكيلو (مثال: 1 كجم = 1000 جم) أو سعر الوحدة مباشرة وسيُعاد حساب تكلفة وهامش ربح كل الأصناف فوراً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={saving}
            onClick={handleRecalculateAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
            title="إعادة احتساب تكلفة كافة أصناف الريسيبي"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} />
            <span>إعادة حساب التكاليف</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{expanded ? "إغلاق جدول التسعير" : "فتح جدول تعديل أسعار الخامات ⚡"}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن خامة (لبن، بن، بستاشيو، نوتيلا، أكواب...)"
                className="w-full bg-slate-900 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
              />
            </div>

            <button
              type="button"
              disabled={saving || dirtyIds.length === 0}
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-black shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? "جاري الحفظ وإعادة التسعير..."
                  : dirtyIds.length > 0
                  ? `حفظ (${dirtyIds.length}) تعديل وإعادة تسعير المنيو ✅`
                  : "عدّل أي سعر للحفظ الجماعي"}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">اسم الخامة</th>
                  <th className="py-2.5 px-3">الوحدة</th>
                  <th className="py-2.5 px-3">حاسبة العبوة/الكيلو (سعر شراء العبوة ÷ حجمها)</th>
                  <th className="py-2.5 px-3">سعر الوحدة النهائي (ج.م)</th>
                  <th className="py-2.5 px-3">حد التنبيه (أول المدة/أمان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((raw) => {
                  const defaultSize = raw.unit === "GRAM" || raw.unit === "ML" ? "1000" : "1";
                  const pSize = packSizeMap[raw.id] ?? defaultSize;
                  const pPrice = packPriceMap[raw.id] ?? "";
                  const unitLabel = raw.unit === "GRAM" ? "جرام" : raw.unit === "ML" ? "مل" : "قطعة";
                  const isChanged = dirtyIds.includes(raw.id);

                  return (
                    <tr key={raw.id} className={isChanged ? "bg-amber-500/10" : "hover:bg-slate-900/60"}>
                      <td className="py-2 px-3 font-bold text-white">{raw.nameAr}</td>
                      <td className="py-2 px-3 text-slate-400 font-mono">{unitLabel}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="سعر العبوة"
                            value={pPrice}
                            onChange={(e) => handlePackChange(raw, e.target.value, pSize)}
                            className="w-24 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono"
                          />
                          <span className="text-slate-500">÷</span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={pSize}
                            onChange={(e) => handlePackChange(raw, pPrice, e.target.value)}
                            className="w-20 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono"
                            title="حجم العبوة بالجرام أو المل أو القطعة (مثال: 1000 للكيلو)"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={unitPriceDrafts[raw.id] ?? ""}
                          onChange={(e) =>
                            setUnitPriceDrafts((prev) => ({ ...prev, [raw.id]: e.target.value }))
                          }
                          className={`w-28 bg-slate-900 border rounded-lg px-2.5 py-1 text-xs font-mono font-black ${
                            isChanged ? "border-amber-400 text-amber-300" : "border-white/15 text-emerald-300"
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={minAlertDrafts[raw.id] ?? ""}
                          onChange={(e) =>
                            setMinAlertDrafts((prev) => ({ ...prev, [raw.id]: e.target.value }))
                          }
                          className="w-24 bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
