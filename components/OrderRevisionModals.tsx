"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Edit3,
  Minus,
  Plus,
  Printer,
  Search,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

export type RevisionModalMode = "EDIT_INVOICE" | "CHANGE_PAYMENT" | null;

interface Props {
  mode: RevisionModalMode;
  order: any | null;
  menuItems?: any[];
  defaultActorName?: string;
  onClose: () => void;
  onSuccess: (updatedOrder: any, message: string, shouldPrint?: boolean) => void;
}

const PAYMENT_OPTIONS = [
  { id: "CASH", label: "كاش (نقدي للدرج)", icon: Banknote, activeClass: "border-emerald-500 bg-emerald-500/20 text-emerald-300" },
  { id: "CARD", label: "فيزا / بطاقة بنكية", icon: CreditCard, activeClass: "border-sky-500 bg-sky-500/20 text-sky-300" },
  { id: "INSTAPAY", label: "إنستاباي (InstaPay)", icon: Smartphone, activeClass: "border-violet-500 bg-violet-500/20 text-violet-300" },
  { id: "VODAFONE_CASH", label: "فودافون كاش", icon: Wallet, activeClass: "border-rose-500 bg-rose-500/20 text-rose-300" },
  { id: "TALABAT", label: "طلبات (Talabat - عمولة 25%)", icon: Smartphone, activeClass: "border-orange-500 bg-orange-500/20 text-orange-300" },
];

export function paymentMethodAr(method?: string | null) {
  switch (method) {
    case "CASH":
      return "كاش (نقدي)";
    case "CARD":
      return "فيزا / بطاقة";
    case "INSTAPAY":
      return "إنستاباي";
    case "VODAFONE_CASH":
      return "فودافون كاش";
    case "TALABAT":
      return "طلبات (Talabat)";
    default:
      return method || "كاش";
  }
}

export default function OrderRevisionModals({
  mode,
  order,
  menuItems = [],
  defaultActorName = "كاشير المنظومة",
  onClose,
  onSuccess,
}: Props) {
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [performedBy, setPerformedBy] = useState<string>(defaultActorName);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("CARD");
  const [printAfterSave, setPrintAfterSave] = useState<boolean>(true);
  const [itemSearch, setItemSearch] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!order || !mode) return;
    let parsed: any[] = [];
    try {
      parsed = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    } catch {
      parsed = [];
    }
    setEditedItems(
      parsed.map((it: any, idx: number) => ({
        ...it,
        _rowKey: `${it.menuItemId || it.nameAr || "item"}-${idx}`,
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
      }))
    );
    setDiscountAmount(Number(order.discountAmount) || 0);
    setDeliveryFee(Number(order.deliveryFee) || 0);
    setReason("");
    setPerformedBy(defaultActorName || order.cashierName || "كاشير الفرع");
    const currMethod = order.paymentMethod || "CASH";
    setNewPaymentMethod(currMethod === "CASH" ? "CARD" : "CASH");
    setPrintAfterSave(true);
    setItemSearch("");
    setErrorMsg(null);
  }, [order, mode, defaultActorName]);

  const outletMenuChoices = useMemo(() => {
    if (!order) return [];
    const term = itemSearch.trim().toLowerCase();
    return menuItems
      .filter((m) => (!order.outletId || m.outletId === order.outletId) && m.isAvailable !== false)
      .filter((m) => !term || m.nameAr?.toLowerCase().includes(term) || m.nameEn?.toLowerCase().includes(term))
      .slice(0, 12);
  }, [menuItems, order, itemSearch]);

  if (!mode || !order) return null;

  const oldSubtotal = Number(order.subtotal) || 0;
  const oldFinal = Number(order.finalAmount) || 0;
  const serviceRatio =
    order.orderType === "DINE_IN" && oldSubtotal > 0 && Number(order.serviceCharge) > 0
      ? Number(order.serviceCharge) / oldSubtotal
      : 0;
  const taxRatio =
    oldSubtotal > 0 && Number(order.taxAmount) > 0 ? Number(order.taxAmount) / oldSubtotal : 0;

  const previewSubtotal = editedItems.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0);
  const previewService = Number((previewSubtotal * serviceRatio).toFixed(2));
  const previewTax = Number((previewSubtotal * taxRatio).toFixed(2));
  const previewFinal = Math.max(
    0,
    Number(
      (previewSubtotal + previewService + previewTax + Number(deliveryFee || 0) - Number(discountAmount || 0) + Number(order.tipAmount || 0)).toFixed(2)
    )
  );
  const previewDiff = Number((previewFinal - oldFinal).toFixed(2));

  const updateItemQty = (rowKey: string, nextQty: number) => {
    const clean = Math.max(0.05, Number(nextQty.toFixed(3)));
    setEditedItems((prev) => prev.map((it) => (it._rowKey === rowKey ? { ...it, qty: clean } : it)));
  };

  const removeItemRow = (rowKey: string) => {
    if (editedItems.length <= 1) {
      setErrorMsg("لا يمكن تفريغ الفاتورة بالكامل من هنا — يمكنك إلغاء الطلب أو ترك صنف واحد على الأقل.");
      return;
    }
    setErrorMsg(null);
    setEditedItems((prev) => prev.filter((it) => it._rowKey !== rowKey));
  };

  const addMenuChoice = (m: any) => {
    setErrorMsg(null);
    setEditedItems((prev) => {
      const existing = prev.find((it) => it.menuItemId === m.id && !it.isCustomBox);
      if (existing) {
        return prev.map((it) =>
          it._rowKey === existing._rowKey
            ? { ...it, qty: Number((Number(it.qty || 1) + (m.unitType === "KG" ? 0.5 : 1)).toFixed(3)) }
            : it
        );
      }
      return [
        ...prev,
        {
          _rowKey: `${m.id}-${Date.now()}`,
          menuItemId: m.id,
          nameAr: m.nameAr,
          name: m.nameAr,
          price: Number(m.price) || 0,
          costPrice: Number(m.costPrice) || 0,
          qty: m.unitType === "KG" ? 1 : 1,
          itemType: m.itemType || "READY_PASTRY",
          category: m.category,
          unitType: m.unitType || "PIECE",
        },
      ];
    });
  };

  const handleSaveInvoiceEdit = async () => {
    if (!reason.trim()) {
      setErrorMsg("يرجى كتابة سبب التعديل لإثباته على الفاتورة المعدلة وإخطار الإدارة.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payloadItems = editedItems.map(({ _rowKey, ...rest }) => rest);
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EDIT_INVOICE",
          orderId: order.id,
          items: payloadItems,
          discountAmount,
          deliveryFee,
          reason: reason.trim(),
          performedBy: performedBy.trim() || defaultActorName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "تعذر حفظ تعديل الفاتورة");
        return;
      }
      onSuccess(data.order, data.message || "تم حفظ الفاتورة المعدلة", printAfterSave);
    } catch (e: any) {
      setErrorMsg(e?.message || "حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePaymentChange = async () => {
    if (!reason.trim()) {
      setErrorMsg("يرجى كتابة سبب تعديل وسيلة الدفع لإرساله في تنبيه الإدارة.");
      return;
    }
    if (newPaymentMethod === order.paymentMethod) {
      setErrorMsg("يرجى اختيار وسيلة دفع مختلفة عن الوسيلة الحالية.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PAYMENT_METHOD",
          orderId: order.id,
          newPaymentMethod,
          reason: reason.trim(),
          performedBy: performedBy.trim() || defaultActorName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "تعذر تعديل وسيلة الدفع");
        return;
      }
      onSuccess(data.order, data.message || "تم تعديل وسيلة الدفع", printAfterSave);
    } catch (e: any) {
      setErrorMsg(e?.message || "حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b border-white/10 ${
            mode === "EDIT_INVOICE"
              ? "bg-gradient-to-l from-amber-500/20 via-orange-500/10 to-slate-900"
              : "bg-gradient-to-l from-sky-500/20 via-indigo-500/10 to-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                mode === "EDIT_INVOICE" ? "bg-amber-500/20 text-amber-400" : "bg-sky-500/20 text-sky-400"
              }`}
            >
              {mode === "EDIT_INVOICE" ? <Edit3 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                {mode === "EDIT_INVOICE" ? "تعديل فاتورة قائمة (فاتورة معدلة)" : "تعديل وسيلة الدفع (تعديل دفع)"}
                <span className="text-xs px-2 py-0.5 rounded-lg bg-white/10 text-amber-300 font-mono">
                  #{order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                سيتم تسوية المخزون/الخزينة تلقائياً مع إرسال تنبيه رقابي فوري للإدارة 🚨
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === "EDIT_INVOICE" ? (
            <>
              {/* Current Order Items Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>أصناف الفاتورة الحالية (تعديل الأوزان / الكميات أو حذف صنف):</span>
                  <span className="text-slate-400">{editedItems.length} أصناف</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editedItems.map((it) => {
                    const isWeight = it.unitType === "KG" || Number(it.qty) % 1 !== 0;
                    const stepSize = isWeight ? 0.25 : 1;
                    return (
                      <div
                        key={it._rowKey}
                        className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-white truncate">
                            {it.nameAr || it.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            سعر الوحدة: {Number(it.price).toFixed(2)} ج.م • الإجمالي:{" "}
                            <span className="text-amber-300 font-bold">
                              {(Number(it.price) * Number(it.qty)).toFixed(2)} ج.م
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isWeight && (
                            <div className="hidden sm:flex items-center gap-1 ml-1">
                              {[0.5, 1, 1.5, 2].map((w) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => updateItemQty(it._rowKey, w)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black border transition ${
                                    Number(it.qty) === w
                                      ? "bg-amber-500 text-slate-950 border-amber-400"
                                      : "bg-slate-900 text-slate-300 border-white/10 hover:border-amber-400/50"
                                  }`}
                                >
                                  {w} ك
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => updateItemQty(it._rowKey, Math.max(stepSize, Number(it.qty) - stepSize))}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step={isWeight ? "0.05" : "1"}
                            min="0.05"
                            value={it.qty}
                            onChange={(e) => updateItemQty(it._rowKey, Number(e.target.value) || stepSize)}
                            className="w-16 text-center bg-slate-900 border border-white/15 rounded-xl py-1 text-sm font-black text-white"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQty(it._rowKey, Number(it.qty) + stepSize)}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItemRow(it._rowKey)}
                            className="w-8 h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center mr-1"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Add Replacement/Extra Item */}
              {menuItems.length > 0 && (
                <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="إضافة صنف جديد أو بديل للفاتورة (ابحث بالاسم)..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>
                  {itemSearch.trim().length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {outletMenuChoices.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => addMenuChoice(m)}
                          className="text-xs px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 font-bold"
                        >
                          + {m.nameAr} ({m.price} ج.م)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Financial Diff Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3">
                  <label className="block text-[11px] text-slate-400 mb-1">الخصم (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-black text-white"
                  />
                </div>
                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3">
                  <label className="block text-[11px] text-slate-400 mb-1">رسوم التوصيل (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-black text-white"
                  />
                </div>
                <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3">
                  <label className="block text-[11px] text-slate-400 mb-1">اسم القائم بالتعديل</label>
                  <input
                    type="text"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold text-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">الإجمالي قبل التعديل</p>
                  <p className="text-base font-black text-slate-300 line-through">{oldFinal.toFixed(2)} ج.م</p>
                </div>
                <div>
                  <p className="text-xs text-amber-300 font-bold">الإجمالي بعد التعديل</p>
                  <p className="text-2xl font-black text-white">{previewFinal.toFixed(2)} ج.م</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400">صافي فرق التسوية</p>
                  <p
                    className={`text-lg font-black ${
                      previewDiff > 0
                        ? "text-emerald-400"
                        : previewDiff < 0
                        ? "text-rose-400"
                        : "text-slate-300"
                    }`}
                  >
                    {previewDiff > 0 ? `+${previewDiff.toFixed(2)}` : previewDiff.toFixed(2)} ج.م
                  </p>
                </div>
              </div>

              {/* Reason Input & Preset Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-amber-300">
                  سبب تعديل الفاتورة (مطلوب للطباعة وتنبيه الإدارة) *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "العميل قلّل الكمية قبل التسليم",
                    "تعديل وزن الحلويات (بالكيلو)",
                    "استبدال صنف بناءً على طلب العميل",
                    "تصحيح خطأ إدخال كاشير",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReason(chip)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 text-slate-200 font-bold"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: العميل طلب كيلو بسبوسة وكيلو بقلاوة بدلاً من 2 كيلو..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </>
          ) : (
            <>
              {/* CHANGE PAYMENT METHOD MODE */}
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">قيمة الفاتورة الإجمالية</p>
                  <p className="text-xl font-black text-white">{oldFinal.toFixed(2)} ج.م</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">وسيلة الدفع الحالية</p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black mt-1">
                    {paymentMethodAr(order.paymentMethod)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">حالة التحصيل</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black mt-1 ${
                      order.paymentStatus === "PAID"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {order.paymentStatus === "PAID" ? "تم التحصيل (مفتوح بالوردية)" : "لم يُحصّل بعد"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-sky-300">
                  اختر وسيلة الدفع الجديدة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isCurrent = opt.id === order.paymentMethod;
                    const isSelected = opt.id === newPaymentMethod;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => setNewPaymentMethod(opt.id)}
                        className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition ${
                          isCurrent
                            ? "opacity-40 cursor-not-allowed bg-slate-950 border-white/5 text-slate-500"
                            : isSelected
                            ? opt.activeClass + " ring-2 ring-white/20"
                            : "bg-slate-950 border-white/10 text-slate-300 hover:border-white/25"
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-black">{opt.label}</p>
                          {isCurrent && <p className="text-[10px]">الوسيلة المسجلة حالياً</p>}
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">اسم القائم بالتعديل</label>
                  <input
                    type="text"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-sky-300">
                  سبب تعديل الدفع (مطلوب لإشعار الإدارة) *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "العميل دفع بالفيزا بدلاً من الكاش",
                    "العميل دفع كاش بدلاً من الفيزا",
                    "العميل قام بالتحويل عبر إنستاباي",
                    "العميل دفع فودافون كاش",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReason(chip)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-sky-500/20 border border-white/10 text-slate-200 font-bold"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب تعديل وسيلة الدفع..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </>
          )}

          {/* Footer Controls */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={printAfterSave}
                onChange={(e) => setPrintAfterSave(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <Printer className="w-4 h-4 text-amber-400" />
              <span>
                فتح/طباعة إيصال 80 مم بختم {mode === "EDIT_INVOICE" ? "[فاتورة معدلة]" : "[تعديل دفع]"} فور الحفظ
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={mode === "EDIT_INVOICE" ? handleSaveInvoiceEdit : handleSavePaymentChange}
                className={`px-5 py-2.5 rounded-xl text-slate-950 text-xs font-black shadow-lg transition disabled:opacity-50 ${
                  mode === "EDIT_INVOICE"
                    ? "bg-amber-400 hover:bg-amber-300"
                    : "bg-sky-400 hover:bg-sky-300"
                }`}
              >
                {submitting
                  ? "جاري الحفظ وإرسال التنبيه..."
                  : mode === "EDIT_INVOICE"
                  ? "اعتماد [فاتورة معدلة] وإخطار الإدارة 🚨"
                  : "اعتماد [تعديل دفع] وإخطار الإدارة 🚨"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
