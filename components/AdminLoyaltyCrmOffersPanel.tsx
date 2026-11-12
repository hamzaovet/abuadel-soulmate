"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ALL_CATEGORIES, getCategoryLabel } from "@/lib/categories";
import {
  DEFAULT_DISCOUNT,
  DEFAULT_OFFERS,
  OfferData,
  parseOfferData,
} from "@/lib/offers";
import {
  extractLoyaltyConfig,
  getLoyaltyProgress,
} from "@/lib/loyalty";
import {
  Award,
  CheckCircle2,
  Download,
  Edit,
  Flame,
  Gift,
  MessageCircle,
  Package,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";

interface AdminLoyaltyCrmOffersPanelProps {
  settings: any;
  setSettings: (next: any) => void;
  menuItems: any[];
  initialCustomers: any[];
  onRefreshParent: () => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
}

export default function AdminLoyaltyCrmOffersPanel({
  settings,
  setSettings,
  menuItems,
  initialCustomers,
  onRefreshParent,
  addToast,
}: AdminLoyaltyCrmOffersPanelProps) {
  const [subTab, setSubTab] = useState<"rules" | "crm" | "offers">("rules");

  // ── 1. DYNAMIC LOYALTY CONFIG STATE ──
  const initialCfg = extractLoyaltyConfig(settings);
  const [loyaltyForm, setLoyaltyForm] = useState({
    isLoyaltyEnabled: initialCfg.isLoyaltyEnabled,
    pointsPerPoundSpent: initialCfg.pointsPerPoundSpent,
    poundValuePerPoint: initialCfg.poundValuePerPoint,
    loyaltyRewardThreshold: initialCfg.loyaltyRewardThreshold,
    loyaltyRewardValue: initialCfg.loyaltyRewardValue,
    loyaltyAppliesToAbuAdel: initialCfg.loyaltyAppliesToAbuAdel,
    loyaltyAppliesToSoulmate: initialCfg.loyaltyAppliesToSoulmate,
    loyaltyMotivationalMsg: initialCfg.loyaltyMotivationalMsg,
  });
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  useEffect(() => {
    if (settings) {
      const cfg = extractLoyaltyConfig(settings);
      setLoyaltyForm({
        isLoyaltyEnabled: cfg.isLoyaltyEnabled,
        pointsPerPoundSpent: cfg.pointsPerPoundSpent,
        poundValuePerPoint: cfg.poundValuePerPoint,
        loyaltyRewardThreshold: cfg.loyaltyRewardThreshold,
        loyaltyRewardValue: cfg.loyaltyRewardValue,
        loyaltyAppliesToAbuAdel: cfg.loyaltyAppliesToAbuAdel,
        loyaltyAppliesToSoulmate: cfg.loyaltyAppliesToSoulmate,
        loyaltyMotivationalMsg: cfg.loyaltyMotivationalMsg,
      });
    }
  }, [settings]);

  const handleSaveLoyaltyRules = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSavingLoyalty(true);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loyaltyForm),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        addToast("success", "تم حفظ قواعد الولاء والهدايا وتطبيقها على أبو عادل وسول ميت بنجاح 👑⭐");
      } else {
        addToast("error", data.error || "تعذر حفظ إعدادات الولاء");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ قواعد الولاء");
    } finally {
      setSavingLoyalty(false);
    }
  };

  // Simulator preview for owner
  const simSamplePoints = Math.round(loyaltyForm.loyaltyRewardThreshold * 0.8);
  const simProgress = getLoyaltyProgress(simSamplePoints, loyaltyForm);

  // ── 2. CUSTOMERS CRM STATE ──
  const [customers, setCustomers] = useState<any[]>(initialCustomers || []);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmFilter, setCrmFilter] = useState<"all" | "reward_ready" | "verified" | "repeat">("all");
  const [crmLoading, setCrmLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [customerForm, setCustomerForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
    loyaltyPoints: "0",
    isVerified: false,
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const fetchCustomersCrm = useCallback(async () => {
    try {
      setCrmLoading(true);
      const params = new URLSearchParams();
      if (crmSearch.trim()) params.set("q", crmSearch.trim());
      if (crmFilter !== "all") params.set("filter", crmFilter);
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch {
      addToast("error", "تعذر تحميل قاعدة بيانات العملاء");
    } finally {
      setCrmLoading(false);
    }
  }, [crmSearch, crmFilter, addToast]);

  useEffect(() => {
    if (subTab === "crm") {
      fetchCustomersCrm();
    }
  }, [subTab, fetchCustomersCrm]);

  const openCustomerOrders = async (cust: any) => {
    setSelectedCustomer(cust);
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/customers?customerId=${encodeURIComponent(cust.id)}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setSelectedCustomer(data.customer);
        setCustomerOrders(Array.isArray(data.customer.orders) ? data.customer.orders : []);
      } else {
        setCustomerOrders([]);
      }
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.phone.trim()) {
      addToast("error", "رقم موبايل العميل مطلوب");
      return;
    }
    try {
      setSavingCustomer(true);
      const method = customerModalMode === "ADD" ? "POST" : "PATCH";
      const res = await fetch("/api/customers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(customerModalMode === "EDIT" ? { id: customerForm.id } : {}),
          name: customerForm.name,
          phone: customerForm.phone,
          email: customerForm.email,
          address: customerForm.address,
          city: customerForm.city,
          notes: customerForm.notes,
          loyaltyPoints: parseInt(customerForm.loyaltyPoints) || 0,
          isVerified: customerForm.isVerified,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم حفظ بيانات العميل بنجاح ✅");
        setShowCustomerModal(false);
        fetchCustomersCrm();
        onRefreshParent();
      } else {
        addToast("error", data.error || "فشل حفظ بيانات العميل");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ بيانات العميل");
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleAdjustPoints = async (cust: any, delta: number) => {
    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cust.id,
          action: "ADJUST_POINTS",
          pointsDelta: delta,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message);
        fetchCustomersCrm();
        onRefreshParent();
      } else {
        addToast("error", data.error || "تعذر تعديل النقاط");
      }
    } catch {
      addToast("error", "تعذر الاتصال بالسيرفر");
    }
  };

  const handleDeleteCustomer = async (cust: any) => {
    if (!window.confirm(`هل أنت متأكد من حذف بيانات العميل "${cust.name}"؟`)) return;
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(cust.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم حذف العميل");
        fetchCustomersCrm();
        onRefreshParent();
      }
    } catch {
      addToast("error", "تعذر حذف العميل");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "الاسم",
      "رقم الهاتف",
      "البريد الإلكتروني",
      "المنطقة",
      "العنوان",
      "عدد الطلبات / الزيارات",
      "إجمالي الإنفاق (ج.م)",
      "نقاط الولاء",
      "مستحق هدية؟",
      "حالة التوثيق",
      "ملاحظات",
    ];
    const rows = customers.map((c) => {
      const ordersCount = Math.max(c.visitCount || 0, c._count?.orders || 0);
      const isRewardReady = (c.loyaltyPoints || 0) >= loyaltyForm.loyaltyRewardThreshold;
      return [
        c.name || "",
        c.phone || "",
        c.email || "",
        c.city || "",
        c.address || "",
        ordersCount,
        Number(c.totalSpent || 0).toFixed(2),
        c.loyaltyPoints || 0,
        isRewardReady ? `نعم (${loyaltyForm.loyaltyRewardValue} ج.م)` : "لا",
        c.isVerified ? "موثق Gmail" : "عادي",
        c.notes || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-customers-abuadel-soulmate-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("success", "تم تصدير قاعدة العملاء إلى ملف Excel / CSV بنجاح 📥");
  };

  const totalCustomersCount = customers.length;
  const verifiedCustomersCount = customers.filter((c) => c.isVerified).length;
  const repeatCustomersCount = customers.filter(
    (c) => (c.visitCount || 0) >= 2 || (c._count?.orders || 0) >= 2
  ).length;
  const rewardReadyCount = customers.filter(
    (c) => (c.loyaltyPoints || 0) >= loyaltyForm.loyaltyRewardThreshold
  ).length;

  // ── 3. OFFERS & LIVE DISCOUNT ENGINE (Waffle House Architecture) ──
  const [offers, setOffers] = useState<OfferData>(() =>
    parseOfferData(settings?.specialOffers, settings?.offersEnabled)
  );
  const [offersLoading, setOffersLoading] = useState(false);
  const [savingOffers, setSavingOffers] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);

  const loadOffers = useCallback(async () => {
    try {
      setOffersLoading(true);
      const res = await fetch("/api/offers", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOffers({ ...DEFAULT_OFFERS, ...data, discount: data.discount || { ...DEFAULT_DISCOUNT } });
      }
    } catch {
      // keep existing
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "offers") {
      loadOffers();
    }
  }, [subTab, loadOffers]);

  const handleSaveOffers = async (overrideOffers?: OfferData) => {
    const payload = overrideOffers || offers;
    try {
      setSavingOffers(true);
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOffers(data.offers || payload);
        if (settings) {
          setSettings({
            ...settings,
            offersEnabled: payload.enabled,
            specialOffers: JSON.stringify(payload),
          });
        }
        addToast("success", "تم حفظ ونشر العروض والخصومات على اللاندينج بيدج والمنيو بنجاح! 🎉🔥");
      } else {
        addToast("error", data.error || "تعذر حفظ العروض");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ العروض");
    } finally {
      setSavingOffers(false);
    }
  };

  const handleToggleMasterOffers = async () => {
    const nextEnabled = offers.enabled === false;
    const updated: OfferData = { ...offers, enabled: nextEnabled };
    setOffers(updated);
    await handleSaveOffers(updated);
  };

  const updateCard = (idx: number, field: string, value: string) => {
    const nextCards = [...offers.cards];
    nextCards[idx] = { ...nextCards[idx], [field]: value };
    setOffers({ ...offers, cards: nextCards });
  };

  const addOfferCard = () => {
    setOffers({
      ...offers,
      cards: [
        ...offers.cards,
        {
          id: `offer-${Date.now()}`,
          title: "عرض خاص جديد 🎁",
          desc: "أضف تفاصيل العرض هنا ليظهر فوراً في الصفحة الرئيسية",
          icon: "fire",
        },
      ],
    });
  };

  const removeOfferCard = (idx: number) => {
    if (offers.cards.length <= 1) {
      addToast("info", "يفضل إبقاء كرت عرض واحد على الأقل، أو يمكنك إخفاء السكشن بالكامل من زر الإظهار/الإخفاء.");
      return;
    }
    setOffers({
      ...offers,
      cards: offers.cards.filter((_, i) => i !== idx),
    });
  };

  const updateDiscount = (field: string, value: any) => {
    setOffers((prev) => ({
      ...prev,
      discount: {
        ...(prev.discount || { ...DEFAULT_DISCOUNT }),
        [field]: value,
      },
    }));
  };

  const toggleProductInDiscount = (prodId: string) => {
    const curIds = offers.discount?.productIds || [];
    const nextIds = curIds.includes(prodId)
      ? curIds.filter((id) => id !== prodId)
      : [...curIds, prodId];
    updateDiscount("productIds", nextIds);
  };

  const handleBannerImageUpload = async (file: File) => {
    try {
      setUploadingBannerImg(true);
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setOffers((prev) => ({
          ...prev,
          banner: { ...prev.banner, image: data.url },
        }));
        addToast("success", "تم رفع صورة بانر العروض بنجاح ✅");
      } else {
        addToast("error", data.error || "فشل رفع الصورة");
      }
    } catch {
      addToast("error", "تعذر رفع صورة البانر");
    } finally {
      setUploadingBannerImg(false);
    }
  };

  const filteredDiscountProducts = (menuItems || []).filter((p) => {
    const dBrand = offers.discount?.brandScope || "ALL";
    if (dBrand !== "ALL") {
      const code = p.outlet?.code || (p.itemType === "PREPARED_BEVERAGE" ? "SOULMATE_CAFE" : "ABU_ADEL_PATISSERIE");
      if (code !== dBrand) return false;
    }
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.nameAr?.toLowerCase().includes(q) ||
      p.nameEn?.toLowerCase().includes(q) ||
      getCategoryLabel(p.category).toLowerCase().includes(q)
    );
  });

  const discount = offers.discount || DEFAULT_DISCOUNT;

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Pills */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center gap-2 shadow-lg">
        <button
          type="button"
          onClick={() => setSubTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            subTab === "rules"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>قواعد الولاء والهدايا الديناميكية 👑</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("crm")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            subTab === "crm"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>قاعدة بيانات العملاء (CRM والدعاية) ({totalCustomersCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("offers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            subTab === "offers"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>إدارة العروض والخصومات (Landing & المنيو) 🔥</span>
          {discount.enabled && (
            <span className="px-2 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-black animate-pulse">
              خصم نشط
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SUB-TAB 1: DYNAMIC MULTI-BRAND LOYALTY ENGINE
      ═══════════════════════════════════════════════════════ */}
      {subTab === "rules" && (
        <div className="space-y-6">
          <div
            className={`rounded-2xl p-6 border transition shadow-xl ${
              loyaltyForm.isLoyaltyEnabled
                ? "bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/30 border-amber-500/40"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Award className="w-6 h-6 text-amber-400" />
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    محرك نقاط الولاء ومكافآت العملاء الموحد (أبو عادل & سول ميت)
                  </h2>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  كل عملية شراء من <strong className="text-emerald-300">حلواني أبو عادل</strong> أو{" "}
                  <strong className="text-amber-300">سول ميت كافيه VIP</strong> بتتسجل تلقائياً في قاعدة بيانات العميل وبتجمعله نقاط ولاء حسب القواعد اللي بتحددها هنا ديناميكياً.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = { ...loyaltyForm, isLoyaltyEnabled: !loyaltyForm.isLoyaltyEnabled };
                  setLoyaltyForm(next);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                  loyaltyForm.isLoyaltyEnabled
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {loyaltyForm.isLoyaltyEnabled ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    <span>البرنامج مُفعّل ونشط 🟢</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    <span>البرنامج متوقف مؤقتاً ⏸️</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveLoyaltyRules} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Editable Rules */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sparkles className="w-4 h-4" />
                <span>تحديد معادلة النقاط والهدف وقيمة الهدية (ديناميكي 100%)</span>
              </h3>

              {/* Brand Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                    loyaltyForm.loyaltyAppliesToAbuAdel
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span>🍰</span>
                    <span>تطبيق على حلواني أبو عادل</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={loyaltyForm.loyaltyAppliesToAbuAdel}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, loyaltyAppliesToAbuAdel: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>

                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                    loyaltyForm.loyaltyAppliesToSoulmate
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span>☕</span>
                    <span>تطبيق على سول ميت كافيه VIP</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={loyaltyForm.loyaltyAppliesToSoulmate}
                    onChange={(e) =>
                      setLoyaltyForm({ ...loyaltyForm, loyaltyAppliesToSoulmate: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-500"
                  />
                </label>
              </div>

              {/* Numeric Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    1️⃣ عدد النقاط لكل 1 جنيه إنفاق:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={loyaltyForm.pointsPerPoundSpent}
                    onChange={(e) =>
                      setLoyaltyForm({
                        ...loyaltyForm,
                        pointsPerPoundSpent: Math.max(0.1, parseFloat(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-black text-base focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { v: 0.1, label: "نقطة لكل 10 ج" },
                      { v: 1, label: "1 نقطة = 1 جنيه" },
                      { v: 2, label: "ضعف النقاط (2×)" },
                    ].map((preset) => (
                      <button
                        key={preset.v}
                        type="button"
                        onClick={() => setLoyaltyForm({ ...loyaltyForm, pointsPerPoundSpent: preset.v })}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          loyaltyForm.pointsPerPoundSpent === preset.v
                            ? "bg-amber-500 text-black border-amber-400"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    2️⃣ الهدف المطلوب للهدية (عدد النقاط):
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="10"
                    value={loyaltyForm.loyaltyRewardThreshold}
                    onChange={(e) =>
                      setLoyaltyForm({
                        ...loyaltyForm,
                        loyaltyRewardThreshold: Math.max(10, parseInt(e.target.value) || 3000),
                      })
                    }
                    className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-black text-base focus:outline-none focus:border-emerald-400"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[1000, 2000, 3000, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLoyaltyForm({ ...loyaltyForm, loyaltyRewardThreshold: val })}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          loyaltyForm.loyaltyRewardThreshold === val
                            ? "bg-emerald-500 text-black border-emerald-400"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                        }`}
                      >
                        {val.toLocaleString()} نقطة
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    3️⃣ قيمة الهدية عند الوصول للهدف (ج.م):
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="5"
                    value={loyaltyForm.loyaltyRewardValue}
                    onChange={(e) =>
                      setLoyaltyForm({
                        ...loyaltyForm,
                        loyaltyRewardValue: Math.max(5, parseFloat(e.target.value) || 200),
                      })
                    }
                    className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-rose-400 font-mono font-black text-base focus:outline-none focus:border-rose-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    يستبدل العميل {loyaltyForm.loyaltyRewardThreshold.toLocaleString()} نقطة بمنتجات من المحل بقيمة{" "}
                    <strong className="text-rose-300">{loyaltyForm.loyaltyRewardValue} ج.م</strong>
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    4️⃣ قيمة النقطة عند الاستبدال الجزئي (ج.م):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={loyaltyForm.poundValuePerPoint}
                    onChange={(e) =>
                      setLoyaltyForm({
                        ...loyaltyForm,
                        poundValuePerPoint: Math.max(0.01, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-sky-400 font-mono font-black text-base focus:outline-none focus:border-sky-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    مثال: لو استبدل العميل رصيده مباشرة قبل الهدف، كل 100 نقطة ={" "}
                    <strong className="text-sky-300">
                      {(100 * loyaltyForm.poundValuePerPoint).toFixed(0)} ج.م
                    </strong>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5">
                  💬 الرسالة التحفيزية للعملاء (تظهر باللاندينج بيدج وصفحة الطلب):
                </label>
                <textarea
                  rows={2}
                  value={loyaltyForm.loyaltyMotivationalMsg}
                  onChange={(e) =>
                    setLoyaltyForm({ ...loyaltyForm, loyaltyMotivationalMsg: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={savingLoyalty}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingLoyalty ? "جاري الحفظ..." : "حفظ قواعد الولاء وتطبيقها الآن 👑"}</span>
              </button>
            </div>

            {/* Right Col: Live Customer Widget Simulation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black text-white">معاينة ما يراه العميل 📱</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  بث حي لمؤشر العميل
                </span>
              </div>

              <div className="bg-gradient-to-br from-[#1b1420] to-slate-950 border border-amber-500/35 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-amber-300 font-bold">رصيد نقاطك الحالي ⭐</div>
                    <div className="text-2xl font-black text-white font-mono">
                      {simSamplePoints.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-amber-400">نقطة</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
                    🎁
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1 font-bold">
                    <span>التقدم نحو هدية {loyaltyForm.loyaltyRewardValue} ج.م</span>
                    <span className="text-emerald-400 font-mono">{simProgress.progressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/70 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${simProgress.progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 text-[11px] text-emerald-200 leading-relaxed">
                  {simProgress.motivationalHeadline}
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                  ✅ عند الشراء بـ{" "}
                  <strong className="text-white">
                    {Math.round(loyaltyForm.loyaltyRewardThreshold / Math.max(0.1, loyaltyForm.pointsPerPoundSpent)).toLocaleString()} ج.م
                  </strong>{" "}
                  يجمع العميل{" "}
                  <strong className="text-amber-300">
                    {loyaltyForm.loyaltyRewardThreshold.toLocaleString()} نقطة
                  </strong>{" "}
                  ويأخذ منتجات من المحل بقيمة{" "}
                  <strong className="text-emerald-300">{loyaltyForm.loyaltyRewardValue} ج.م مجاناً!</strong>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SUB-TAB 2: CUSTOMERS CRM DATABASE (Waffle House Style)
      ═══════════════════════════════════════════════════════ */}
      {subTab === "crm" && (
        <div className="space-y-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>إجمالي قاعدة العملاء</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{totalCustomersCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">أونلاين + كاشير + شات + حجوزات</div>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>عملاء جاهزين للهدية 🎁</span>
                <Gift className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{rewardReadyCount}</div>
              <div className="text-[10px] text-emerald-300/70 mt-1">
                وصلوا لـ {loyaltyForm.loyaltyRewardThreshold.toLocaleString()}+ نقطة
              </div>
            </div>

            <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>عملاء موثقين بالـ Gmail</span>
                <UserCheck className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-400 font-mono">{verifiedCustomersCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">حسابات مفعّلة بالكود السري</div>
            </div>

            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>عملاء متكررين (VIP) ⭐</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400 font-mono">{repeatCustomersCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">أصحاب زيارتين وطلبين فأكثر</div>
            </div>
          </div>

          {/* Search, Filters & Actions Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 min-w-[240px] items-center gap-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              <input
                type="text"
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                placeholder="بحث بالاسم، الموبايل، الإيميل، المنطقة أو العنوان..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "الكل" },
                { id: "reward_ready", label: "🎁 مستحقين هدية" },
                { id: "repeat", label: "⭐ متكررين VIP" },
                { id: "verified", label: "✅ موثقين" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCrmFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    crmFilter === f.id
                      ? "bg-amber-500 text-black font-black"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-black cursor-pointer"
                title="تصدير قاعدة البيانات للدعاية والواتساب"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV للدعاية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomerModalMode("ADD");
                  setCustomerForm({
                    id: "",
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                    city: "",
                    notes: "",
                    loyaltyPoints: "0",
                    isVerified: true,
                  });
                  setShowCustomerModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة عميل</span>
              </button>

              <button
                type="button"
                onClick={fetchCustomersCrm}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${crmLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* CRM Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">العميل والتوثيق</th>
                    <th className="py-3 px-4">الموبايل & واتساب دعاية</th>
                    <th className="py-3 px-4">المنطقة والعنوان</th>
                    <th className="py-3 px-4">الطلبات والإنفاق</th>
                    <th className="py-3 px-4">رصيد النقاط & شريط الهدية</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        لا يوجد عملاء مطابقون للبحث الحالي
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const cleanWa = String(c.phone || "").replace(/\D/g, "");
                      const waNum = cleanWa.startsWith("0") ? `2${cleanWa}` : cleanWa;
                      const prog = getLoyaltyProgress(c.loyaltyPoints || 0, loyaltyForm);
                      const ordersCnt = Math.max(c.visitCount || 0, c._count?.orders || 0);
                      const waText = prog.canRedeemMilestone
                        ? `أهلاً بك يا ${c.name} من حلواني أبو عادل وسول ميت كافيه 🍰☕! مبروك وصلت لـ ${c.loyaltyPoints} نقطة ولاء وعندك هدية بقيمة ${prog.unlockedRewardEgp} ج.م مستنياك في المحل 🎁`
                        : `أهلاً بك يا ${c.name} من حلواني أبو عادل وسول ميت كافيه 🍰☕! رصيدك الحالي ${c.loyaltyPoints || 0} نقطة ولاء وباقي ${prog.pointsToNextReward} نقطة على هدية ${loyaltyForm.loyaltyRewardValue} ج.م ✨`;

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-black text-white flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {c.isVerified && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                                  موثق ✓
                                </span>
                              )}
                              {prog.canRedeemMilestone && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30 animate-pulse">
                                  🎁 جاهز للهدية
                                </span>
                              )}
                            </div>
                            {c.email && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.email}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-200" dir="ltr">
                                {c.phone}
                              </span>
                              <a
                                href={`https://wa.me/${waNum}?text=${encodeURIComponent(waText)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-black border border-emerald-500/30"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>واتساب</span>
                              </a>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-bold">{c.city || "-"}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[190px]">
                              {c.address || c.notes || "—"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-black text-amber-300 font-mono">
                              {ordersCnt} زيارة / طلب
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              إنفاق: {Number(c.totalSpent || 0).toFixed(0)} ج.م
                            </div>
                          </td>

                          <td className="py-3.5 px-4 min-w-[190px]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono font-black text-amber-400">
                                {(c.loyaltyPoints || 0).toLocaleString()} ★
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustPoints(c, 100)}
                                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold cursor-pointer"
                                  title="منح +100 نقطة هدية"
                                >
                                  +100
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustPoints(c, -100)}
                                  className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
                                  title="خصم 100 نقطة"
                                >
                                  -100
                                </button>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                                style={{ width: `${prog.progressPct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openCustomerOrders(c)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Package className="w-3.5 h-3.5" />
                                <span>الطلبات</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerModalMode("EDIT");
                                  setCustomerForm({
                                    id: c.id,
                                    name: c.name || "",
                                    phone: c.phone || "",
                                    email: c.email || "",
                                    address: c.address || "",
                                    city: c.city || "",
                                    notes: c.notes || "",
                                    loyaltyPoints: String(c.loyaltyPoints || 0),
                                    isVerified: Boolean(c.isVerified),
                                  });
                                  setShowCustomerModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(c)}
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SUB-TAB 3: SPECIAL OFFERS & LIVE DISCOUNT ENGINE (Waffle House)
      ═══════════════════════════════════════════════════════ */}
      {subTab === "offers" && (
        <div className="space-y-6">
          {/* Master Offers Status Banner */}
          <div
            className={`rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4 shadow-xl ${
              offers.enabled !== false
                ? "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border-emerald-500/40"
                : "bg-rose-950/20 border-rose-500/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
                {offers.enabled !== false ? "🎁" : "🙈"}
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {offers.enabled !== false
                    ? "قسم العروض الخاصة والخصومات ظاهر الآن على اللاندينج بيدج ✅"
                    : "قسم العروض والخصومات مخفي مؤقتاً عن اللاندينج بيدج ⚠️"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  تحكم كامل لإظهار أو إخفاء أو تعديل العروض والبانر وماكينة الخصم التلقائي الفوري.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMasterOffers}
                disabled={savingOffers}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow ${
                  offers.enabled !== false
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{offers.enabled !== false ? "🛑 إخفاء العروض مؤقتاً" : "✅ إظهار العروض على الموقع"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveOffers()}
                disabled={savingOffers || offersLoading}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>{savingOffers ? "جاري النشر..." : "حفظ ونشر كل العروض والخصومات"}</span>
              </button>
            </div>
          </div>

          {/* LIVE DISCOUNT ENGINE (ماكينة الخصومات الترويجية الذكية) */}
          <div
            className={`bg-slate-900 rounded-2xl p-6 space-y-5 border transition shadow-xl ${
              discount.enabled ? "border-amber-500/60" : "border-slate-800"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-xl">
                  🔥
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      ماكينة تطبيق الخصومات الترويجية على المنيو والأقسام ⚡
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        discount.enabled ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {discount.enabled ? "نشط ومطبق 🔥" : "متوقف"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تطبيق خصم مباشر على كل المنيو أو قسم أو أصناف محددة — يظهر مشطوباً تلقائياً في اللاندينج والطلب أونلاين والكاشير.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateDiscount("enabled", !discount.enabled)}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
                  discount.enabled
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{discount.enabled ? "🟢 الخصم مُفعّل (شغال)" : "⚪ تفعيل الخصم الآن"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Col 1: Type & Value */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="text-xs font-black text-amber-300 block">1. نوع وقيمة الخصم:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateDiscount("type", "percentage")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                      discount.type === "percentage"
                        ? "bg-amber-500 text-black border-amber-400 font-black"
                        : "bg-slate-900 text-slate-300 border-slate-800"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>نسبة (%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDiscount("type", "fixed")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                      discount.type === "fixed"
                        ? "bg-amber-500 text-black border-amber-400 font-black"
                        : "bg-slate-900 text-slate-300 border-slate-800"
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>مبلغ (ج.م)</span>
                  </button>
                </div>

                <input
                  type="number"
                  min={1}
                  max={discount.type === "percentage" ? 95 : 5000}
                  value={discount.value}
                  onChange={(e) => updateDiscount("value", Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-black text-base"
                />

                <div className="flex flex-wrap gap-1.5">
                  {[10, 15, 20, 25, 30].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        updateDiscount("type", "percentage");
                        updateDiscount("value", v);
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                        discount.type === "percentage" && discount.value === v
                          ? "bg-amber-500 text-black border-amber-400"
                          : "bg-slate-900 text-slate-300 border-slate-800"
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      updateDiscount("type", "fixed");
                      updateDiscount("value", 50);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                      discount.type === "fixed" && discount.value === 50
                        ? "bg-amber-500 text-black border-amber-400"
                        : "bg-slate-900 text-slate-300 border-slate-800"
                    }`}
                  >
                    50 ج.م
                  </button>
                </div>
              </div>

              {/* Col 2: Brand & Scope */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <label className="text-xs font-black text-amber-300 block">2. المنفذ ونطاق التطبيق:</label>
                <select
                  value={discount.brandScope || "ALL"}
                  onChange={(e) => updateDiscount("brandScope", e.target.value)}
                  className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="ALL">🌐 أبو عادل + سول ميت معاً</option>
                  <option value="ABU_ADEL_PATISSERIE">🍰 حلواني أبو عادل فقط</option>
                  <option value="SOULMATE_CAFE">☕ سول ميت كافيه VIP فقط</option>
                </select>

                <div className="space-y-1.5 text-xs">
                  {[
                    { id: "all", label: "🌐 كل الأصناف والمنيو بالكامل" },
                    { id: "category", label: "📂 قسم محدد فقط" },
                    { id: "products", label: `🎯 أصناف محددة بالاسم (${discount.productIds.length})` },
                  ].map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        discount.scope === s.id
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-200 font-bold"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="abuAdelDiscountScope"
                        checked={discount.scope === s.id}
                        onChange={() => updateDiscount("scope", s.id)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Col 3: Target Detail & Title */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="text-xs font-black text-amber-300 block">3. الهدف وعنوان البانر:</label>
                {discount.scope === "category" && (
                  <select
                    value={discount.categoryName}
                    onChange={(e) => updateDiscount("categoryName", e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.nameAr}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={discount.title}
                  onChange={(e) => updateDiscount("title", e.target.value)}
                  placeholder="مثال: خصم 15% على الشرقيات لفترة محدودة 🔥"
                  className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-[11px] text-emerald-300">
                  💡 <strong>معاينة:</strong> صنف بسعر <strong>200 ج.م</strong> يصبح بـ{" "}
                  <strong className="underline">
                    {discount.type === "percentage"
                      ? Math.max(1, Math.round(200 * (1 - discount.value / 100)))
                      : Math.max(1, 200 - discount.value)}{" "}
                    ج.م
                  </strong>
                </div>
              </div>
            </div>

            {discount.scope === "products" && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-white">
                    🎯 حدد الأصناف المطبق عليها الخصم ({discount.productIds.length} صنف):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateDiscount("productIds", filteredDiscountProducts.map((p) => p.id))}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-bold cursor-pointer"
                    >
                      تحديد الكل ({filteredDiscountProducts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDiscount("productIds", [])}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ابحث عن صنف لتحديده..."
                  className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                  {filteredDiscountProducts.map((p) => {
                    const selected = discount.productIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductInDiscount(p.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                          selected
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-200"
                            : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}
                      >
                        <input type="checkbox" checked={selected} onChange={() => {}} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{p.nameAr}</div>
                          <div className="text-[10px] text-slate-400">
                            {getCategoryLabel(p.category)} • {p.price} ج
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2-Column Offer Section Editor + Live Storefront Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Forms */}
            <div className="space-y-5">
              {/* Header Texts */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>نصوص عنوان سكشن العروض على اللاندينج بيدج</span>
                </h4>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">الشارة العلوية (Badge):</label>
                  <input
                    type="text"
                    value={offers.badge}
                    onChange={(e) => setOffers({ ...offers, badge: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">العنوان الرئيسي (Title):</label>
                  <input
                    type="text"
                    value={offers.title}
                    onChange={(e) => setOffers({ ...offers, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">الوصف التوضيحي (Subtitle):</label>
                  <input
                    type="text"
                    value={offers.subtitle}
                    onChange={(e) => setOffers({ ...offers, subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Offer Cards Editor */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    <span>كروت العروض ({offers.cards.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addOfferCard}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة كرت</span>
                  </button>
                </div>

                {offers.cards.map((card, idx) => (
                  <div key={card.id || idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400">عرض #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={card.icon}
                          onChange={(e) => updateCard(idx, "icon", e.target.value)}
                          className="bg-black border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                        >
                          <option value="party">احتفال / كومبو (🎉)</option>
                          <option value="gift">هدية / ولاء (🎁)</option>
                          <option value="delivery">توصيل سريع (🛵)</option>
                          <option value="fire">عرض ناري (🔥)</option>
                          <option value="star">مميز ذهبي (⭐)</option>
                          <option value="student">خصم خاص (🎓)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOfferCard(idx)}
                          className="p-1 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => updateCard(idx, "title", e.target.value)}
                      placeholder="عنوان العرض..."
                      className="w-full bg-black border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                    />
                    <textarea
                      rows={2}
                      value={card.desc}
                      onChange={(e) => updateCard(idx, "desc", e.target.value)}
                      placeholder="تفاصيل العرض..."
                      className="w-full bg-black border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>

              {/* Featured Promo Banner Editor */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>بانر العرض المميز الكبير</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">شارة البانر:</label>
                    <input
                      type="text"
                      value={offers.banner.badge}
                      onChange={(e) =>
                        setOffers({ ...offers, banner: { ...offers.banner, badge: e.target.value } })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">نص الزر:</label>
                    <input
                      type="text"
                      value={offers.banner.linkText}
                      onChange={(e) =>
                        setOffers({ ...offers, banner: { ...offers.banner, linkText: e.target.value } })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">العنوان الرئيسي بالبانر:</label>
                  <input
                    type="text"
                    value={offers.banner.title}
                    onChange={(e) =>
                      setOffers({ ...offers, banner: { ...offers.banner, title: e.target.value } })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">رابط الصورة أو مسارها:</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={offers.banner.image}
                      onChange={(e) =>
                        setOffers({ ...offers, banner: { ...offers.banner, image: e.target.value } })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingBannerImg ? "جاري الرفع..." : "رفع صورة جديدة"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingBannerImg}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleBannerImageUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Sticky Live Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:sticky lg:top-24 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black text-white">معاينة حية لشكل العروض على اللاندينج بيدج 👁️</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black text-amber-400">{offers.badge}</span>
                <h3 className="text-lg font-black text-white">{offers.title}</h3>
                <p className="text-[11px] text-slate-400">{offers.subtitle}</p>
              </div>

              <div className="space-y-2">
                {offers.cards.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-black text-white">{c.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{c.desc}</div>
                    </div>
                    <span className="text-2xl shrink-0">
                      {c.icon === "delivery"
                        ? "🛵"
                        : c.icon === "student"
                        ? "🎓"
                        : c.icon === "gift"
                        ? "🎁"
                        : c.icon === "fire"
                        ? "🔥"
                        : c.icon === "star"
                        ? "⭐"
                        : "🎉"}
                    </span>
                  </div>
                ))}
              </div>

              <div
                data-force-dark="true"
                className="relative h-32 rounded-2xl overflow-hidden border border-amber-500/30 flex items-center p-4"
                style={{
                  backgroundImage: `url('${offers.banner.image || "/products/nawaem-mix-real.webp"}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/65 to-black/25" />
                <div className="relative z-10 space-y-1 max-w-sm">
                  <div className="text-[10px] font-black text-amber-400">{offers.banner.badge}</div>
                  <div className="text-sm font-black text-white leading-snug">{offers.banner.title}</div>
                  <div className="text-[11px] font-bold text-emerald-300">{offers.banner.linkText} ←</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveOffers()}
                disabled={savingOffers}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
              >
                {savingOffers ? "جاري الحفظ..." : "تطبيق ونشر العروض على الموقع الآن 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL: ADD / EDIT CUSTOMER CRM
      ═══════════════════════════════════════════════════════ */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setShowCustomerModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>{customerModalMode === "ADD" ? "إضافة عميل جديد لقاعدة البيانات" : "تعديل بيانات العميل والنقاط"}</span>
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">رقم الموبايل *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المنطقة</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    placeholder="حدائق القبة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-amber-300 mb-1 font-bold">رصيد نقاط الولاء ⭐</label>
                  <input
                    type="number"
                    min={0}
                    value={customerForm.loyaltyPoints}
                    onChange={(e) => setCustomerForm({ ...customerForm, loyaltyPoints: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 cursor-pointer text-slate-300 font-bold">
                  <input
                    type="checkbox"
                    checked={customerForm.isVerified}
                    onChange={(e) => setCustomerForm({ ...customerForm, isVerified: e.target.checked })}
                  />
                  <span>حساب موثّق ✅</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ملاحظات تسويقية / تفضيلات العميل</label>
                <textarea
                  rows={2}
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={savingCustomer}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black cursor-pointer"
              >
                {savingCustomer ? "جاري الحفظ..." : "حفظ بيانات العميل ✅"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL: CUSTOMER ORDER HISTORY
      ═══════════════════════════════════════════════════════ */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-black text-white">سجل طلبات: {selectedCustomer.name}</h3>
              <p className="text-xs text-amber-300 font-mono mt-0.5">
                {selectedCustomer.phone} • النقاط: {selectedCustomer.loyaltyPoints || 0} ★ • إجمالي الإنفاق:{" "}
                {Number(selectedCustomer.totalSpent || 0).toFixed(0)} ج.م
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingOrders ? (
                <div className="text-center py-8 text-slate-400 text-xs">جاري تحميل الطلبات...</div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  لا توجد طلبات مسجلة لهذا العميل حتى الآن
                </div>
              ) : (
                customerOrders.map((o) => {
                  let itemsList: any[] = [];
                  try {
                    itemsList = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
                  } catch {
                    itemsList = [];
                  }
                  return (
                    <div key={o.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400">{o.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                            {o.outlet?.code === "ABU_ADEL_PATISSERIE" ? "🍰 أبو عادل" : "☕ سول ميت"}
                          </span>
                        </div>
                        <span className="font-mono font-black text-emerald-400">{o.finalAmount} ج.م</span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {itemsList.map((it) => `${it.nameAr} (×${it.qty || 1})`).join(" • ")}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                        <span>{new Date(o.createdAt).toLocaleString("ar-EG")}</span>
                        <div className="flex items-center gap-2">
                          {o.pointsEarned > 0 && (
                            <span className="text-emerald-400 font-bold">+{o.pointsEarned} نقطة مكتسبة</span>
                          )}
                          {o.pointsRedeemed > 0 && (
                            <span className="text-rose-400 font-bold">-{o.pointsRedeemed} مستبدلة</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
