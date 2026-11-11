"use client";

import React, { useState, useEffect } from "react";
import {
  Factory,
  Sparkles,
  Upload,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  RefreshCw,
  ArrowRightLeft,
  Wallet,
  CreditCard,
  Building2,
  TrendingUp,
  Edit3,
  KeyRound,
  AlertCircle,
} from "lucide-react";

interface AdminSuppliersAndAiPanelProps {
  currentUser: any;
  outlets: any[];
  menuItems: any[];
  rawMaterials: any[];
  settings: any;
  onSettingsUpdated?: (newSettings: any) => void;
  onDataChanged?: () => void;
}

type SupSubTab = "overview" | "ai_digest" | "manual_tx" | "statement";

const PAYMENT_METHODS = [
  { id: "CASH", label: "💵 كاش" },
  { id: "INSTAPAY", label: "⚡ إنستاباي" },
  { id: "VODAFONE_CASH", label: "📱 فودافون كاش" },
  { id: "BANK_TRANSFER", label: "🏦 تحويل بنكي" },
  { id: "CARD", label: "💳 فيزا" },
];

const PAYMENT_SOURCES = [
  { id: "OWNER_CURRENT_ACCOUNT", label: "👑 حساب جاري المالك (خارج الدرج)" },
  { id: "DRAWER", label: "💵 درج الكاشير بالفرع (يُصفّى يومياً)" },
  { id: "MAIN_SAFE", label: "🔐 الخزينة الرئيسية" },
  { id: "BANK_ACCOUNT", label: "🏦 الحساب البنكي للشركة" },
];

function formatUnit(u?: string) {
  if (u === "KG") return "كجم";
  if (u === "GRAM") return "جم";
  if (u === "ML") return "مل";
  if (u === "LITER") return "لتر";
  if (u === "BOX") return "علبة";
  return "قطعة";
}

// Client-side Canvas compression so invoice photos remain crisp & fast over Vercel
async function compressFileToBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ base64: dataUrl, mimeType: file.type || "image/jpeg", previewUrl: dataUrl });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ base64: compressed, mimeType: "image/jpeg", previewUrl: compressed });
      };
      img.onerror = () => resolve({ base64: dataUrl, mimeType: file.type || "image/jpeg", previewUrl: dataUrl });
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminSuppliersAndAiPanel({
  currentUser,
  outlets,
  menuItems,
  rawMaterials,
  settings,
  onSettingsUpdated,
  onDataChanged,
}: AdminSuppliersAndAiPanelProps) {
  const [subTab, setSubTab] = useState<SupSubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [debtSplit, setDebtSplit] = useState<any>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const notify = (type: "success" | "error" | "info", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  // Internal supply markup settings (Abu Adel -> Soulmate)
  const [markupEnabled, setMarkupEnabled] = useState<boolean>(
    Boolean(settings?.internalSupplyMarkupEnabled)
  );
  const [markupPercent, setMarkupPercent] = useState<string>(
    String(settings?.internalSupplyMarkupPercent ?? 0)
  );
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Add/Edit Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    id: "",
    name: "",
    supplierType: "FACTORY",
    outletId: "",
    phone: "",
    contactPerson: "",
    openingBalance: "0",
    isInternalSupply: false,
    deductFromSourceOutlet: true,
    notes: "",
  });
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Statement Tab state
  const [statementSupplierId, setStatementSupplierId] = useState<string>("");
  const [statementData, setStatementData] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Manual Payment state
  const [payForm, setPayForm] = useState({
    supplierId: "",
    amount: "",
    paymentMethod: "CASH",
    paymentSource: "OWNER_CURRENT_ACCOUNT",
    invoiceNumber: "",
    notes: "",
  });
  const [submittingPay, setSubmittingPay] = useState(false);

  // Manual Invoice Entry state
  const [manualInv, setManualInv] = useState({
    supplierId: "",
    invoiceNumber: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    paymentMode: "CREDIT" as "CREDIT" | "PARTIAL" | "PAID",
    paidAmount: "0",
    paymentMethod: "CASH",
    paymentSource: "OWNER_CURRENT_ACCOUNT",
    deductFromSourceOutlet: true,
    notes: "",
  });
  const [manualItems, setManualItems] = useState<
    Array<{ tempId: string; targetType: "MENU_ITEM" | "RAW_MATERIAL"; matchedId: string; name: string; quantity: number; unit: string; unitCost: number }>
  >([]);
  const [manualPickSearch, setManualPickSearch] = useState("");
  const [submittingManualInv, setSubmittingManualInv] = useState(false);

  // AI Digest State (Gemini OCR for Factory Invoices & Opening Stock)
  const [aiMode, setAiMode] = useState<"FACTORY_INVOICE" | "OPENING_STOCK">("FACTORY_INVOICE");
  const [aiDomain, setAiDomain] = useState<"ABU_ADEL_PRODUCTS" | "SOULMATE_RAW_MATERIALS" | "AUTO">("ABU_ADEL_PRODUCTS");
  const [aiImages, setAiImages] = useState<Array<{ name: string; base64: string; mimeType: string; previewUrl: string }>>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiInvoiceMeta, setAiInvoiceMeta] = useState<{
    supplierId: string;
    invoiceNumber: string;
    transactionDate: string;
    paymentMode: "CREDIT" | "PARTIAL" | "PAID";
    paidAmount: string;
    paymentMethod: string;
    paymentSource: string;
    deductFromSourceOutlet: boolean;
    notes: string;
  }>({
    supplierId: "",
    invoiceNumber: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    paymentMode: "CREDIT",
    paidAmount: "0",
    paymentMethod: "CASH",
    paymentSource: "OWNER_CURRENT_ACCOUNT",
    deductFromSourceOutlet: true,
    notes: "",
  });
  const [aiParsedItems, setAiParsedItems] = useState<any[]>([]);
  const [aiCommitting, setAiCommitting] = useState(false);

  useEffect(() => {
    if (settings) {
      setMarkupEnabled(Boolean(settings.internalSupplyMarkupEnabled));
      setMarkupPercent(String(settings.internalSupplyMarkupPercent ?? 0));
    }
  }, [settings]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.allSuppliers || data.suppliers || []);
        setDebtSplit(data.debtSplit || null);
        const list = data.allSuppliers || data.suppliers || [];
        if (list.length > 0) {
          setStatementSupplierId((prev) => prev || list[0].id);
          setPayForm((prev) => (prev.supplierId ? prev : { ...prev, supplierId: list[0].id }));
          setManualInv((prev) => (prev.supplierId ? prev : { ...prev, supplierId: list[0].id }));
          setAiInvoiceMeta((prev) => (prev.supplierId ? prev : { ...prev, supplierId: list[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadStatement = async (supId = statementSupplierId) => {
    if (!supId) return;
    try {
      setStatementLoading(true);
      const res = await fetch(`/api/suppliers?supplierId=${encodeURIComponent(supId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setStatementData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatementLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "statement" && statementSupplierId) {
      loadStatement(statementSupplierId);
    }
  }, [subTab, statementSupplierId]);

  const handleSaveInternalAndAiSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalSupplyMarkupEnabled: markupEnabled,
          internalSupplyMarkupPercent: Number(markupPercent) || 0,
          ...(geminiKeyInput.trim() ? { geminiApiKey: geminiKeyInput.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        onSettingsUpdated?.(data.settings);
        setGeminiKeyInput("");
        notify("success", "تم حفظ إعدادات التوريد البيني ومفتاح الذكاء الاصطناعي بنجاح ✅");
      }
    } catch {
      notify("error", "تعذر حفظ الإعدادات");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      notify("error", "يرجى كتابة اسم المورد أو المصنع");
      return;
    }
    try {
      setSavingSupplier(true);
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: supplierForm.id ? "UPDATE_SUPPLIER" : "CREATE_SUPPLIER",
          id: supplierForm.id || undefined,
          name: supplierForm.name.trim(),
          supplierType: supplierForm.supplierType,
          outletId: supplierForm.outletId || undefined,
          phone: supplierForm.phone,
          contactPerson: supplierForm.contactPerson,
          openingBalance: Number(supplierForm.openingBalance) || 0,
          isInternalSupply: supplierForm.isInternalSupply || supplierForm.supplierType === "INTERNAL_ABU_ADEL",
          deductFromSourceOutlet: supplierForm.deductFromSourceOutlet,
          notes: supplierForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify("success", data.message);
        setShowSupplierModal(false);
        await loadSuppliers();
        onDataChanged?.();
      } else {
        notify("error", data.error || "فشل حفظ المورد");
      }
    } catch {
      notify("error", "خطأ في الاتصال بالخادم");
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payForm.amount || 0);
    if (!payForm.supplierId || amt <= 0) {
      notify("error", "يرجى اختيار المورد وإدخال مبلغ سداد صحيح");
      return;
    }
    try {
      setSubmittingPay(true);
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          supplierId: payForm.supplierId,
          amount: amt,
          paymentMethod: payForm.paymentMethod,
          paymentSource: payForm.paymentSource,
          invoiceNumber: payForm.invoiceNumber,
          notes: payForm.notes,
          recordedBy: currentUser?.name || "المايسترو",
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify("success", data.message);
        setPayForm((p) => ({ ...p, amount: "", invoiceNumber: "", notes: "" }));
        await loadSuppliers();
        if (statementSupplierId === payForm.supplierId) {
          await loadStatement(statementSupplierId);
        }
        onDataChanged?.();
      } else {
        notify("error", data.error || "فشل تسجيل السداد");
      }
    } catch {
      notify("error", "فشل الاتصال بالخادم");
    } finally {
      setSubmittingPay(false);
    }
  };

  // Upload images for Gemini OCR
  const handleSelectAiImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    if (files.length === 0) return;
    const processed = await Promise.all(
      files.map(async (f) => {
        const res = await compressFileToBase64(f);
        return { name: f.name, ...res };
      })
    );
    setAiImages(processed);
    setAiResults([]);
    setAiParsedItems([]);
  };

  const handleRunGeminiDigest = async () => {
    if (aiImages.length === 0) {
      notify("error", "اختر صورة فاتورة أو ورقة جرد واحدة على الأقل أولاً");
      return;
    }
    try {
      setAiAnalyzing(true);
      setAiResults([]);
      setAiParsedItems([]);

      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: aiMode,
          targetDomain: aiDomain,
          images: aiImages.map((im) => ({
            name: im.name,
            base64: im.base64,
            mimeType: im.mimeType,
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        notify("error", data.error || "تعذر تحليل الصور بـ Gemini AI");
        return;
      }

      setAiResults(data.results || []);
      const combinedItems: any[] = [];
      let detectedInvNo = "";
      let detectedDate = "";
      let detectedPaid = 0;
      let detectedTotal = 0;
      let detectedSupName = "";

      for (const r of data.results || []) {
        if (!r.data) continue;
        if (!detectedInvNo && r.data.invoiceNumber) detectedInvNo = r.data.invoiceNumber;
        if (!detectedDate && r.data.invoiceDate) detectedDate = r.data.invoiceDate;
        if (!detectedSupName && r.data.supplierName) detectedSupName = r.data.supplierName;
        detectedPaid += Number(r.data.paidAmount || 0);
        detectedTotal += Number(r.data.totalAmount || 0);
        for (const it of r.data.items || []) {
          combinedItems.push(it);
        }
      }

      setAiParsedItems(combinedItems);

      // Guess matching supplier from extracted supplier name
      let matchedSupId = aiInvoiceMeta.supplierId;
      if (detectedSupName) {
        const foundSup = suppliers.find(
          (s) => s.name.includes(detectedSupName) || detectedSupName.includes(s.name)
        );
        if (foundSup) matchedSupId = foundSup.id;
      }

      setAiInvoiceMeta((prev) => ({
        ...prev,
        supplierId: matchedSupId || prev.supplierId,
        invoiceNumber: detectedInvNo || prev.invoiceNumber || `AI-${Date.now().toString().slice(-5)}`,
        transactionDate: detectedDate || prev.transactionDate,
        paidAmount: String(detectedPaid || 0),
        paymentMode:
          detectedPaid <= 0
            ? "CREDIT"
            : detectedTotal > 0 && detectedPaid >= detectedTotal
            ? "PAID"
            : "PARTIAL",
      }));

      if (combinedItems.length > 0) {
        notify("success", `✨ استخرج Gemini AI عدد (${combinedItems.length}) صنف ومطابقتهم تلقائياً!`);
      } else {
        notify("info", "لم يستخرج النظام أصنافاً واضحة — يمكنك الإضافة أو التعديل يدوياً أسفل الصورة");
      }
    } catch {
      notify("error", "حدث خطأ أثناء الاتصال بخدمة Gemini AI");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleCommitAiDigest = async () => {
    if (aiParsedItems.length === 0) {
      notify("error", "لا توجد أصناف في جدول المراجعة للاعتماد");
      return;
    }

    try {
      setAiCommitting(true);
      if (aiMode === "OPENING_STOCK") {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "APPLY_OPENING_STOCK_AI",
            outletId:
              aiDomain === "SOULMATE_RAW_MATERIALS"
                ? outlets.find((o) => o.code === "SOULMATE_CAFE")?.id
                : outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id,
            items: aiParsedItems.map((it) => ({
              targetType: it.matchedTargetType,
              id: it.matchedId || undefined,
              name: it.extractedName,
              quantity: Number(it.quantity) || 0,
              unit: it.unit || "PIECE",
              unitCost: Number(it.unitCost) || 0,
              dailyLimit: it.dailyLimit,
            })),
            recordedBy: currentUser?.name || "المايسترو (Gemini AI)",
          }),
        });
        const data = await res.json();
        if (data.success) {
          notify("success", data.message);
          setAiParsedItems([]);
          setAiImages([]);
          onDataChanged?.();
        } else {
          notify("error", data.error || "فشل اعتماد رصيد أول المدة");
        }
      } else {
        if (!aiInvoiceMeta.supplierId) {
          notify("error", "اختر المورد أو المصنع الذي تُرحّل له الفاتورة أولاً");
          return;
        }
        const computedTotal = aiParsedItems.reduce(
          (s, it) => s + (Number(it.quantity || 0) * Number(it.unitCost || 0)),
          0
        );
        const effectivePaid =
          aiInvoiceMeta.paymentMode === "PAID"
            ? computedTotal
            : aiInvoiceMeta.paymentMode === "CREDIT"
            ? 0
            : Math.min(computedTotal, Math.max(0, Number(aiInvoiceMeta.paidAmount) || 0));

        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RECORD_INVOICE",
            supplierId: aiInvoiceMeta.supplierId,
            invoiceNumber: aiInvoiceMeta.invoiceNumber,
            transactionDate: aiInvoiceMeta.transactionDate,
            items: aiParsedItems.map((it) => ({
              targetType: it.matchedTargetType,
              id: it.matchedId || undefined,
              name: it.extractedName,
              quantity: Number(it.quantity) || 0,
              unit: it.unit || "PIECE",
              unitCost: Number(it.unitCost) || 0,
              dailyLimit: it.dailyLimit,
            })),
            totalAmount: Number(computedTotal.toFixed(2)),
            paidAmount: Number(effectivePaid.toFixed(2)),
            paymentMethod: aiInvoiceMeta.paymentMethod,
            paymentSource: aiInvoiceMeta.paymentSource,
            deductFromSourceOutlet: aiInvoiceMeta.deductFromSourceOutlet,
            aiConfidence: aiResults[0]?.data?.confidence || "HIGH",
            recordedBy: currentUser?.name || "المايسترو (Gemini AI)",
            notes: aiInvoiceMeta.notes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          notify("success", data.message);
          setAiParsedItems([]);
          setAiImages([]);
          setAiResults([]);
          await loadSuppliers();
          onDataChanged?.();
        } else {
          notify("error", data.error || "فشل ترحيل الفاتورة");
        }
      }
    } catch {
      notify("error", "تعذر اعتماد البيانات في الخادم");
    } finally {
      setAiCommitting(false);
    }
  };

  // Manual invoice helpers
  const manualSupObj = suppliers.find((s) => s.id === manualInv.supplierId);
  const aiSupObj = suppliers.find((s) => s.id === aiInvoiceMeta.supplierId);

  const catalogChoices = [
    ...menuItems.map((m) => ({
      targetType: "MENU_ITEM" as const,
      id: m.id,
      name: `${m.nameAr} (${m.outlet?.code === "ABU_ADEL_PATISSERIE" ? "أبو عادل" : "سول ميت"})`,
      rawName: m.nameAr,
      unit: m.unitType || "PIECE",
      cost: m.costPrice || 0,
    })),
    ...rawMaterials.map((r) => ({
      targetType: "RAW_MATERIAL" as const,
      id: r.id,
      name: `📦 خامة: ${r.nameAr}`,
      rawName: r.nameAr,
      unit: r.unit || "PIECE",
      cost: r.costPerUnit || 0,
    })),
  ];

  const handleAddManualItem = (choice: (typeof catalogChoices)[number]) => {
    setManualItems((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}-${Math.random()}`,
        targetType: choice.targetType,
        matchedId: choice.id,
        name: choice.rawName,
        quantity: 10,
        unit: choice.unit,
        unitCost: choice.cost,
      },
    ]);
    setManualPickSearch("");
  };

  const handleSubmitManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInv.supplierId || manualItems.length === 0) {
      notify("error", "اختر المورد وأضف صنفاً واحداً على الأقل للفاتورة");
      return;
    }
    const subtotal = manualItems.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unitCost || 0), 0);
    const paidNow =
      manualInv.paymentMode === "PAID"
        ? subtotal
        : manualInv.paymentMode === "CREDIT"
        ? 0
        : Math.min(subtotal, Math.max(0, Number(manualInv.paidAmount) || 0));

    try {
      setSubmittingManualInv(true);
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_INVOICE",
          supplierId: manualInv.supplierId,
          invoiceNumber: manualInv.invoiceNumber,
          transactionDate: manualInv.transactionDate,
          items: manualItems.map((it) => ({
            targetType: it.targetType,
            id: it.matchedId,
            name: it.name,
            quantity: Number(it.quantity),
            unit: it.unit,
            unitCost: Number(it.unitCost),
          })),
          totalAmount: Number(subtotal.toFixed(2)),
          paidAmount: Number(paidNow.toFixed(2)),
          paymentMethod: manualInv.paymentMethod,
          paymentSource: manualInv.paymentSource,
          deductFromSourceOutlet: manualInv.deductFromSourceOutlet,
          recordedBy: currentUser?.name || "المايسترو",
          notes: manualInv.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify("success", data.message);
        setManualItems([]);
        setManualInv((p) => ({ ...p, invoiceNumber: "", notes: "", paidAmount: "0" }));
        await loadSuppliers();
        onDataChanged?.();
      } else {
        notify("error", data.error || "فشل حفظ الفاتورة");
      }
    } catch {
      notify("error", "خطأ في الاتصال بالخادم");
    } finally {
      setSubmittingManualInv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "overview" ? "bg-amber-500 text-slate-950 shadow-lg" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>المؤشر اللولبي للديون والموردين 🏭</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("ai_digest")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "ai_digest"
                ? "bg-gradient-to-r from-purple-500 to-amber-500 text-slate-950 shadow-lg"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>هضم الفواتير وجرد أول المدة (Gemini AI) 🤖</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("manual_tx")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "manual_tx" ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>فاتورة يدوية / دفعة سداد للدرج أو جاري المالك 💵</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("statement")}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
              subTab === "statement" ? "bg-sky-500 text-slate-950 shadow-lg" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>كشف حساب الموردين التفصيلي 📒</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setSupplierForm({
              id: "",
              name: "",
              supplierType: "FACTORY",
              outletId: outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id || "",
              phone: "",
              contactPerson: "",
              openingBalance: "0",
              isInternalSupply: false,
              deductFromSourceOutlet: true,
              notes: "",
            });
            setShowSupplierModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مورد / مصنع جديد</span>
        </button>
      </div>

      {/* Inline Toast */}
      {toast && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            toast.type === "success"
              ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
              : toast.type === "error"
              ? "bg-rose-950/50 border-rose-500/50 text-rose-300"
              : "bg-sky-950/50 border-sky-500/50 text-sky-300"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs underline cursor-pointer">
            إغلاق
          </button>
        </div>
      )}

      {/* SUBTAB 1: OVERVIEW + SPIRAL INTER-BRAND DEBT SPLIT + SUPPLIER CARDS */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* THE SIGNATURE SPIRAL INTER-BRAND DEBT SPLIT CARD */}
          {debtSplit && (
            <div className="bg-gradient-to-br from-slate-900 via-[#1b1224] to-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>المؤشر المالي الذكي: تقسيم الدين الإجمالي بين المصنع وحلواني أبو عادل وسول ميت كافيه 🌀🔥</span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    صافي توزيع مديونية المصنع على الفرعين (مقاصة التوريد البيني اللحظية)
                  </h3>
                </div>
                <div className="text-left font-mono bg-black/50 border border-white/10 rounded-2xl px-4 py-2">
                  <div className="text-[10px] text-slate-400">إجمالي مديونية المصنع (الخارجية على أبو عادل)</div>
                  <div className="text-2xl font-black text-rose-400">
                    {debtSplit.totalExternalFactoryDebt.toLocaleString()} <span className="text-xs">ج.م</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Share 1: Abu Adel Net Own Burden */}
                <div className="bg-slate-950/80 border border-rose-500/35 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-300">🍰 صافي نصيب حلواني أبو عادل وحده</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-black">
                      {debtSplit.abuAdelSharePct}%
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {debtSplit.abuAdelNetShareOfFactoryDebt.toLocaleString()} ج.م
                  </div>
                  <p className="text-[11px] text-slate-400">
                    إجمالي دين المصنع ({debtSplit.totalExternalFactoryDebt.toLocaleString()} ج) مطروحاً منه مسحوبات سول ميت الآجلة (
                    {debtSplit.soulmateCoveredShareOfFactoryDebt.toLocaleString()} ج).
                  </p>
                </div>

                {/* Share 2: Soulmate's Share inside Factory Debt */}
                <div className="bg-slate-950/80 border border-amber-500/35 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300">☕ نصيب سول ميت (مديونيته لأبو عادل)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black">
                      {debtSplit.soulmateSharePct}%
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-400">
                    {debtSplit.soulmateDebtToAbuAdel.toLocaleString()} ج.م
                  </div>
                  <p className="text-[11px] text-slate-400">
                    حلواني أبو عادل يورد حلويات سول ميت من مسحوبات المصنع؛ سداد سول ميت لهذا الجزء يغطي{" "}
                    <strong className="text-emerald-300">{debtSplit.soulmateCoveredShareOfFactoryDebt.toLocaleString()} ج</strong> من فاتورة المصنع!
                    {debtSplit.excessFromSoulmateToAbuAdel > 0 && (
                      <span className="block text-emerald-400 font-bold mt-0.5">
                        ✨ وفائض إضافي مستحق لأبو عادل: +{debtSplit.excessFromSoulmateToAbuAdel.toLocaleString()} ج.م!
                      </span>
                    )}
                  </p>
                </div>

                {/* Share 3: External Raw Materials & Total Group */}
                <div className="bg-slate-950/80 border border-sky-500/35 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300">📦 موردي الخامات والأكواب (سول ميت)</span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">خارجي</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-sky-400">
                    {debtSplit.totalRawMaterialSuppliersDebt.toLocaleString()} ج.م
                  </div>
                  <p className="text-[11px] text-slate-400">
                    إجمالي التزام المجموعة بالكامل (مصنع + موردين خامات وأكواب):{" "}
                    <strong className="text-white font-mono">{debtSplit.totalGroupExternalLiability.toLocaleString()} ج.م</strong>
                  </p>
                </div>
              </div>

              {/* Progress Split Bar */}
              {debtSplit.totalExternalFactoryDebt > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                    <span>نصيب سول ميت في تغطية دين المصنع ({debtSplit.soulmateSharePct}%)</span>
                    <span>العبء الصافي المتبقي على أبو عادل ({debtSplit.abuAdelSharePct}%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-950 border border-white/10 overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                      style={{ width: `${debtSplit.soulmateSharePct}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all"
                      style={{ width: `${debtSplit.abuAdelSharePct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Future Markup Setting for Abu Adel -> Soulmate + Cloud Gemini Key */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-end text-xs">
            <div className="space-y-2">
              <div className="font-black text-amber-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" />
                <span>تسعير توريد الحلويات من حلواني أبو عادل إلى سول ميت كافيه</span>
              </div>
              <p className="text-[11px] text-slate-400">
                الافتراضي: يتسلم سول ميت الحلويات بنفس سعر تكلفة المصنع بالضبط (0% هامش). يمكنك تفعيل إضافة هامش بسيط للزمن من هنا:
              </p>
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
                  <input
                    type="checkbox"
                    checked={markupEnabled}
                    onChange={(e) => setMarkupEnabled(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="font-bold text-white">تفعيل هامش بسيط على التحويل لسول ميت</span>
                </label>
                {markupEnabled && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">نسبة الهامش %:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(e.target.value)}
                      className="w-20 bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-2 text-center font-mono font-bold text-amber-300"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    حالة مفتاح Gemini AI:{" "}
                    <strong className={settings?.hasGeminiKey ? "text-emerald-400" : "text-amber-400"}>
                      {settings?.hasGeminiKey ? "متصل وجاهز 🤖✅" : "أدخل المفتاح إذا لم يُضف في Vercel Env"}
                    </strong>
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="اختياري: تحديث مفتاح Gemini API للسحابة..."
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveInternalAndAiSettings}
                disabled={savingSettings}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer"
              >
                {savingSettings ? "جاري الحفظ..." : "حفظ الإعدادات 💾"}
              </button>
            </div>
          </div>

          {/* SUPPLIERS GRID */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل حسابات المصنع والموردين...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                    sup.isInternalSupply
                      ? "bg-purple-950/20 border-purple-500/40"
                      : sup.supplierType === "FACTORY"
                      ? "bg-amber-950/15 border-amber-500/40"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-sm text-white">{sup.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          {sup.isInternalSupply
                            ? "🔄 مورد داخلي (أبو عادل ➔ سول ميت)"
                            : sup.supplierType === "FACTORY"
                            ? "🏭 مصنع الإنتاج الرئيسي"
                            : "📦 مورد خامات وأكواب"}
                          {" • "}
                          {sup.outlet?.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierForm({
                            id: sup.id,
                            name: sup.name,
                            supplierType: sup.supplierType,
                            outletId: sup.outletId,
                            phone: sup.phone || "",
                            contactPerson: sup.contactPerson || "",
                            openingBalance: String(sup.openingBalance || 0),
                            isInternalSupply: Boolean(sup.isInternalSupply),
                            deductFromSourceOutlet: Boolean(sup.deductFromSourceOutlet),
                            notes: sup.notes || "",
                          });
                          setShowSupplierModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="تعديل بيانات المورد ورصيد أول المدة"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] pt-1">
                      <div className="bg-slate-950 rounded-lg p-1.5 border border-white/5">
                        <div className="text-slate-400 font-sans">أول المدة</div>
                        <div className="font-bold text-slate-200">{Number(sup.openingBalance || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-950 rounded-lg p-1.5 border border-white/5">
                        <div className="text-slate-400 font-sans">فواتير (+)</div>
                        <div className="font-bold text-amber-300">{Number(sup.invoicesSum || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-950 rounded-lg p-1.5 border border-white/5">
                        <div className="text-slate-400 font-sans">مسدد (-)</div>
                        <div className="font-bold text-emerald-400">{Number(sup.paymentsSum || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">الرصيد المتبقي المستحق له:</span>
                      <span className="text-base font-black font-mono text-rose-400">
                        {Number(sup.currentBalance || 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setStatementSupplierId(sup.id);
                          setSubTab("statement");
                        }}
                        className="py-1.5 px-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 cursor-pointer"
                      >
                        📒 كشف الحساب
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPayForm((p) => ({ ...p, supplierId: sup.id }));
                          setSubTab("manual_tx");
                        }}
                        className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 cursor-pointer"
                      >
                        💵 سداد / فاتورة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: GEMINI AI OCR DIGEST FOR INVOICES & OPENING STOCK */}
      {subTab === "ai_digest" && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/30 border border-purple-500/40 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>محرك هضم الفواتير وجرد أول المدة بالذكاء الاصطناعي (Gemini Vision AI من روح Orca Wear)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  ارفع صورة فاتورة المصنع أو ورقة جرد أول المدة (مطبوعة أو مكتوبة بخط اليد)، وهيتم قراءتها ومطابقتها أوتوماتيكياً لتراجع وتعتمد بضغطة زر.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAiMode("FACTORY_INVOICE");
                    setAiParsedItems([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-black cursor-pointer ${
                    aiMode === "FACTORY_INVOICE" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"
                  }`}
                >
                  🧾 هضم فاتورة مصنع / مورد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiMode("OPENING_STOCK");
                    setAiParsedItems([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-black cursor-pointer ${
                    aiMode === "OPENING_STOCK" ? "bg-purple-500 text-white" : "text-slate-300 hover:text-white"
                  }`}
                >
                  📋 هضم جرد ورصيد أول المدة
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">نطاق المطابقة التلقائية في المخزن</label>
                <select
                  value={aiDomain}
                  onChange={(e) => setAiDomain(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="ABU_ADEL_PRODUCTS">🍰 منتجات حلواني أبو عادل (أو تحويل لسول ميت)</option>
                  <option value="SOULMATE_RAW_MATERIALS">☕ خامات وأكواب سول ميت كافيه</option>
                  <option value="AUTO">🔍 تلقائي (بحث شامل في جميع الأصناف والخامات)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col justify-end">
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">
                  اختيار صور الفواتير أو كشوف الجرد (حتى 6 صور في المرة الواحدة)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-dashed border-purple-500/60 hover:border-amber-400 text-purple-200 font-bold">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{aiImages.length > 0 ? `تم اختيار ${aiImages.length} صورة ✅` : "اضغط لرفع صورة الفاتورة أو الكشف..."}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSelectAiImages}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRunGeminiDigest}
                    disabled={aiAnalyzing || aiImages.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 ${aiAnalyzing ? "animate-spin" : ""}`} />
                    <span>{aiAnalyzing ? "جاري الهضم بالذكاء الاصطناعي..." : "تحليل واستخراج بـ Gemini AI 🚀"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Uploaded Thumbnails */}
            {aiImages.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {aiImages.map((img, i) => (
                  <div key={i} className="shrink-0 w-24 space-y-1 text-center">
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-24 h-24 object-cover rounded-xl border border-white/15"
                    />
                    <div className="text-[10px] text-slate-400 truncate">{img.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Extracted Items Table */}
          {aiParsedItems.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-sm text-emerald-300">
                  ✅ مراجعة وتعديل الأصناف المستخرجة ({aiParsedItems.length} صنف) قبل الاعتماد
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setAiParsedItems((prev) => [
                      ...prev,
                      {
                        tempId: `${Date.now()}`,
                        extractedName: "صنف جديد",
                        quantity: 1,
                        unit: "PIECE",
                        unitCost: 0,
                        dailyLimit: 10,
                        matchedTargetType: aiDomain === "SOULMATE_RAW_MATERIALS" ? "RAW_MATERIAL" : "MENU_ITEM",
                        matchedId: "",
                        matchScore: 0,
                      },
                    ])
                  }
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer"
                >
                  + إضافة سطر يدوياً
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-2">الاسم المقروء بالذكاء</th>
                      <th className="py-2.5 px-2">مطابقة صنف بالنظام</th>
                      <th className="py-2.5 px-2 text-center">الكمية</th>
                      <th className="py-2.5 px-2 text-center">الوحدة</th>
                      <th className="py-2.5 px-2 text-center">التكلفة للوحدة</th>
                      {aiMode === "OPENING_STOCK" && <th className="py-2.5 px-2 text-center">حد الطلب اليومي</th>}
                      <th className="py-2.5 px-2 text-center">الإجمالي</th>
                      <th className="py-2.5 px-2 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {aiParsedItems.map((row, idx) => (
                      <tr key={row.tempId} className="hover:bg-slate-800/30">
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.extractedName}
                            onChange={(e) =>
                              setAiParsedItems((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, extractedName: e.target.value } : x))
                              )
                            }
                            className="w-40 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={row.matchedId ? `${row.matchedTargetType}:${row.matchedId}` : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                setAiParsedItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, matchedId: "", matchScore: 0 } : x))
                                );
                                return;
                              }
                              const [tType, id] = val.split(":");
                              const found = catalogChoices.find((c) => c.targetType === tType && c.id === id);
                              setAiParsedItems((prev) =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        matchedTargetType: tType,
                                        matchedId: id,
                                        unit: found?.unit || x.unit,
                                        unitCost: Number(x.unitCost) > 0 ? x.unitCost : found?.cost || 0,
                                        matchScore: 1,
                                      }
                                    : x
                                )
                              );
                            }}
                            className="w-52 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 text-[11px]"
                          >
                            <option value="">✨ إنشاء كصنف جديد بالمنظومة</option>
                            {catalogChoices.map((c) => (
                              <option key={`${c.targetType}:${c.id}`} value={`${c.targetType}:${c.id}`}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={row.quantity}
                            onChange={(e) =>
                              setAiParsedItems((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x))
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-white font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={row.unit}
                            onChange={(e) =>
                              setAiParsedItems((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x))
                              )
                            }
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                          >
                            <option value="PIECE">قطعة</option>
                            <option value="KG">كجم</option>
                            <option value="BOX">علبة</option>
                            <option value="GRAM">جم</option>
                            <option value="LITER">لتر</option>
                            <option value="ML">مل</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={row.unitCost}
                            onChange={(e) =>
                              setAiParsedItems((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, unitCost: Number(e.target.value) } : x))
                              )
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-emerald-300 font-mono"
                          />
                        </td>
                        {aiMode === "OPENING_STOCK" && (
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              value={row.dailyLimit ?? ""}
                              onChange={(e) =>
                                setAiParsedItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, dailyLimit: Number(e.target.value) } : x))
                                )
                              }
                              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-amber-300 font-mono"
                            />
                          </td>
                        )}
                        <td className="py-2 px-2 text-center font-mono font-bold text-amber-400">
                          {((Number(row.quantity) || 0) * (Number(row.unitCost) || 0)).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setAiParsedItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-400 hover:bg-rose-500/15 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Settlement & Supplier Target Box for AI Invoice Mode */}
              {aiMode === "FACTORY_INVOICE" && (
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">المورد / الحساب المُرحّل له الفاتورة *</label>
                    <select
                      value={aiInvoiceMeta.supplierId}
                      onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, supplierId: e.target.value }))}
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-2.5 py-2 text-white font-bold"
                    >
                      <option value="">-- اختر المورد --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">رقم الفاتورة</label>
                    <input
                      type="text"
                      value={aiInvoiceMeta.invoiceNumber}
                      onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, invoiceNumber: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-bold">وضع السداد للفاتورة</label>
                    <select
                      value={aiInvoiceMeta.paymentMode}
                      onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, paymentMode: e.target.value as any }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-amber-300 font-bold"
                    >
                      <option value="CREDIT">📌 آجل بالكامل (على الحساب)</option>
                      <option value="PARTIAL">🌗 دفع جزء + الباقي آجل</option>
                      <option value="PAID">✅ مسددة بالكامل الآن</option>
                    </select>
                  </div>

                  {aiInvoiceMeta.paymentMode === "PARTIAL" && (
                    <div>
                      <label className="block text-[10px] text-emerald-300 mb-1 font-bold">المبلغ المدفوع الآن (ج.م)</label>
                      <input
                        type="number"
                        value={aiInvoiceMeta.paidAmount}
                        onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, paidAmount: e.target.value }))}
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-2.5 py-2 text-emerald-300 font-mono font-bold"
                      />
                    </div>
                  )}

                  {aiInvoiceMeta.paymentMode !== "CREDIT" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-bold">وسيلة الدفع</label>
                        <select
                          value={aiInvoiceMeta.paymentMethod}
                          onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, paymentMethod: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-[10px] text-amber-300 mb-1 font-bold">مصدر الدفع (الدرج vs جاري المالك) *</label>
                        <select
                          value={aiInvoiceMeta.paymentSource}
                          onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, paymentSource: e.target.value }))}
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-2.5 py-2 text-amber-200 font-bold"
                        >
                          {PAYMENT_SOURCES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {aiSupObj?.isInternalSupply && (
                    <div className="lg:col-span-3 flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer text-purple-300 font-bold">
                        <input
                          type="checkbox"
                          checked={aiInvoiceMeta.deductFromSourceOutlet}
                          onChange={(e) => setAiInvoiceMeta((p) => ({ ...p, deductFromSourceOutlet: e.target.checked }))}
                          className="accent-purple-500"
                        />
                        <span>خصم الكمية تلقائياً من مخزن حلواني أبو عادل وإضافتها في سول ميت 🔄</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-sm font-black font-mono text-amber-400">
                  إجمالي الفاتورة / الجرد:{" "}
                  {aiParsedItems
                    .reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitCost || 0), 0)
                    .toLocaleString()}{" "}
                  ج.م
                </div>
                <button
                  type="button"
                  onClick={handleCommitAiDigest}
                  disabled={aiCommitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-xl cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {aiCommitting
                      ? "جاري الترحيل..."
                      : aiMode === "OPENING_STOCK"
                      ? "اعتماد وتثبيت كرصيد أول المدة في المخزن 🎯"
                      : "اعتماد وترحيل الفاتورة للمخزن وكشف الحساب ✅"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MANUAL INVOICE & SUPPLIER PAYMENT */}
      {subTab === "manual_tx" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT 7 COLS: RECORD MANUAL SUPPLY INVOICE / INTERNAL TRANSFER */}
          <form
            onSubmit={handleSubmitManualInvoice}
            className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
          >
            <h3 className="font-black text-sm text-amber-300 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>تسجيل فاتورة توريد يدوياً (مصنع / خامات / تحويل من أبو عادل لسول ميت)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">المورد المستلم منه *</label>
                <select
                  value={manualInv.supplierId}
                  onChange={(e) => setManualInv((p) => ({ ...p, supplierId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">رقم الفاتورة / الإذن</label>
                <input
                  type="text"
                  placeholder="FAC-102"
                  value={manualInv.invoiceNumber}
                  onChange={(e) => setManualInv((p) => ({ ...p, invoiceNumber: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            {manualSupObj?.isInternalSupply && (
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/35 flex flex-col gap-1.5 text-purple-200">
                <div className="font-bold">
                  🔄 فاتورة توريد داخلي من حلواني أبو عادل ➔ سول ميت كافيه (هامش الإضافة الحالي:{" "}
                  {settings?.internalSupplyMarkupEnabled ? `${settings.internalSupplyMarkupPercent}%` : "0% — نفس التكلفة"})
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualInv.deductFromSourceOutlet}
                    onChange={(e) => setManualInv((p) => ({ ...p, deductFromSourceOutlet: e.target.checked }))}
                    className="accent-purple-400"
                  />
                  <span>خصم الكمية تلقائياً من رصيد مخزن حلواني أبو عادل</span>
                </label>
              </div>
            )}

            {/* Quick Pick Search */}
            <div className="relative">
              <label className="block text-[11px] text-slate-400 mb-1 font-bold">إضافة أصناف أو خامات للفاتورة</label>
              <input
                type="text"
                placeholder="ابحث باسم الصنف أو الخامة (مثلاً: كنافة، تورتة، أكواب ورقية)..."
                value={manualPickSearch}
                onChange={(e) => setManualPickSearch(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-white"
              />
              {manualPickSearch.trim().length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800">
                  {catalogChoices
                    .filter((c) => c.name.toLowerCase().includes(manualPickSearch.trim().toLowerCase()))
                    .slice(0, 15)
                    .map((c) => (
                      <button
                        key={`${c.targetType}:${c.id}`}
                        type="button"
                        onClick={() => handleAddManualItem(c)}
                        className="w-full text-right px-3 py-2 hover:bg-amber-500/20 text-white flex items-center justify-between cursor-pointer"
                      >
                        <span>{c.name}</span>
                        <span className="font-mono text-amber-300">
                          {c.cost} ج / {formatUnit(c.unit)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Selected Items Table */}
            {manualItems.length > 0 && (
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-black text-slate-400">
                    <tr>
                      <th className="py-2 px-2">الصنف</th>
                      <th className="py-2 px-2 text-center">الكمية</th>
                      <th className="py-2 px-2 text-center">التكلفة</th>
                      <th className="py-2 px-2 text-center">الإجمالي</th>
                      <th className="py-2 px-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {manualItems.map((it, idx) => (
                      <tr key={it.tempId}>
                        <td className="py-1.5 px-2 font-bold text-white">{it.name}</td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={it.quantity}
                            onChange={(e) =>
                              setManualItems((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, quantity: Number(e.target.value) } : r))
                              )
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={it.unitCost}
                            onChange={(e) =>
                              setManualItems((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, unitCost: Number(e.target.value) } : r))
                              )
                            }
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-emerald-300"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-amber-300">
                          {(Number(it.quantity) * Number(it.unitCost)).toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setManualItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">السداد عند الاستلام</label>
                <select
                  value={manualInv.paymentMode}
                  onChange={(e) => setManualInv((p) => ({ ...p, paymentMode: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-amber-300 font-bold"
                >
                  <option value="CREDIT">آجل بالكامل</option>
                  <option value="PARTIAL">دفع جزئي والباقي آجل</option>
                  <option value="PAID">مسددة بالكامل</option>
                </select>
              </div>
              {manualInv.paymentMode === "PARTIAL" && (
                <div>
                  <label className="block text-[11px] text-emerald-300 mb-1 font-bold">المدفوع الآن (ج.م)</label>
                  <input
                    type="number"
                    value={manualInv.paidAmount}
                    onChange={(e) => setManualInv((p) => ({ ...p, paidAmount: e.target.value }))}
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-2.5 py-2 font-mono text-emerald-300 font-bold"
                  />
                </div>
              )}
              {manualInv.paymentMode !== "CREDIT" && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-bold">وسيلة الدفع</label>
                    <select
                      value={manualInv.paymentMethod}
                      onChange={(e) => setManualInv((p) => ({ ...p, paymentMethod: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-amber-300 mb-1 font-bold">مصدر الدفع</label>
                    <select
                      value={manualInv.paymentSource}
                      onChange={(e) => setManualInv((p) => ({ ...p, paymentSource: e.target.value }))}
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-2 text-amber-200 font-bold"
                    >
                      {PAYMENT_SOURCES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="font-mono font-black text-sm text-amber-400">
                الإجمالي: {manualItems.reduce((s, x) => s + Number(x.quantity) * Number(x.unitCost), 0).toLocaleString()} ج.م
              </div>
              <button
                type="submit"
                disabled={submittingManualInv || manualItems.length === 0}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer"
              >
                {submittingManualInv ? "جاري الترحيل..." : "حفظ وترحيل الفاتورة ✅"}
              </button>
            </div>
          </form>

          {/* RIGHT 5 COLS: STANDALONE SUPPLIER PAYMENT (DRAWER VS OWNER ACCOUNT) */}
          <form
            onSubmit={handleRecordPayment}
            className="lg:col-span-5 bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 text-xs"
          >
            <h3 className="font-black text-sm text-emerald-300 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>تسجيل دفعة سداد للمصنع / المورد</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تُخصم الدفعة تلقائياً من مديونية المورد في كشف الحساب. إذا اخترت <strong>درج الكاشير + كاش</strong>، ستُخصم أيضاً من تقفيل درج اليومية فوراً!
            </p>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-bold">اختر المورد المراد سداده *</label>
              <select
                value={payForm.supplierId}
                onChange={(e) => setPayForm((p) => ({ ...p, supplierId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — (عليه: {Number(s.currentBalance || 0).toLocaleString()} ج)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-emerald-300 mb-1 font-bold">مبلغ الدفعة (ج.م) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="مثال: 5000"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-300 font-mono font-black"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">وسيلة الدفع *</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-amber-300 mb-1 font-bold">مصدر الدفع الفعلي *</label>
              <select
                value={payForm.paymentSource}
                onChange={(e) => setPayForm((p) => ({ ...p, paymentSource: e.target.value }))}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-200 font-bold"
              >
                {PAYMENT_SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-bold">رقم إيصال / مرجع السداد</label>
              <input
                type="text"
                placeholder="مثال: سند صرف 44..."
                value={payForm.invoiceNumber}
                onChange={(e) => setPayForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-bold">ملاحظات</label>
              <input
                type="text"
                placeholder="دفعة تحت الحساب..."
                value={payForm.notes}
                onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submittingPay}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
            >
              {submittingPay ? "جاري تسجيل الدفعة..." : "✅ اعتماد وترحيل دفعة السداد لكشف الحساب"}
            </button>
          </form>
        </div>
      )}

      {/* SUBTAB 4: SUPPLIER STATEMENT LEDGER */}
      {subTab === "statement" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="font-black text-sky-300">اختر المورد لعرض كشف الحساب:</label>
              <select
                value={statementSupplierId}
                onChange={(e) => setStatementSupplierId(e.target.value)}
                className="bg-slate-950 border border-sky-500/40 rounded-xl px-3 py-2 text-white font-bold min-w-[260px]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — (الرصيد: {Number(s.currentBalance || 0).toLocaleString()} ج.م)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadStatement(statementSupplierId)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${statementLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب 🖨️</span>
            </button>
          </div>

          {statementData?.supplier && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-black text-base text-white">{statementData.supplier.name}</h4>
                  <div className="text-slate-400">
                    رصيد أول المدة التأسيسي:{" "}
                    <strong className="text-slate-200 font-mono">
                      {Number(statementData.supplier.openingBalance || 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-[11px] text-slate-400 font-sans">الرصيد الختامي المستحق للمورد الآن</div>
                  <div className="text-xl font-black text-rose-400">
                    {Number(statementData.supplier.currentBalance || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/70 text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">التاريخ والمرجع</th>
                      <th className="py-3 px-2">نوع الحركة والبيان</th>
                      <th className="py-3 px-2">الوسيلة ومصدر السداد</th>
                      <th className="py-3 px-2 text-center text-rose-300">مستحق له / فاتورة (+)</th>
                      <th className="py-3 px-2 text-center text-emerald-300">مسدد له (-)</th>
                      <th className="py-3 px-3 text-center text-amber-300">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    <tr className="bg-slate-950/40">
                      <td className="py-2.5 px-3 text-slate-400">رصيد افتتاحي</td>
                      <td className="py-2.5 px-2 font-sans font-bold text-slate-200">رصيد المورد أول المدة عند بدء الشغل</td>
                      <td className="py-2.5 px-2 text-slate-400">—</td>
                      <td className="py-2.5 px-2 text-center">{Number(statementData.supplier.openingBalance || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-center">0</td>
                      <td className="py-2.5 px-3 text-center font-black text-amber-300">
                        {Number(statementData.supplier.openingBalance || 0).toLocaleString()} ج.م
                      </td>
                    </tr>
                    {(statementData.statement || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3">
                          <div className="text-slate-200">{new Date(row.transactionDate || row.createdAt).toLocaleDateString("ar-EG")}</div>
                          <div className="text-[10px] text-slate-400">{row.invoiceNumber || "—"}</div>
                        </td>
                        <td className="py-2.5 px-2 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ml-1.5 ${
                              row.type === "INVOICE"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {row.type === "INVOICE" ? "فاتورة توريد" : row.type === "PAYMENT" ? "دفعة سداد" : row.type}
                          </span>
                          <span className="text-slate-200">{row.notes}</span>
                        </td>
                        <td className="py-2.5 px-2 font-sans text-[11px] text-slate-300">
                          {row.paymentMethod || "—"} •{" "}
                          {row.paymentSource === "DRAWER"
                            ? "💵 درج الكاشير"
                            : row.paymentSource === "OWNER_CURRENT_ACCOUNT"
                            ? "👑 جاري المالك"
                            : row.paymentSource === "MAIN_SAFE"
                            ? "🔐 الخزينة"
                            : "🏦 البنك"}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-rose-300">
                          {row.creditEffect > 0 ? `+${row.creditEffect.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-300">
                          {row.debitEffect > 0 ? `-${row.debitEffect.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-amber-300">
                          {Number(row.runningBalance || 0).toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 text-xs shadow-2xl"
          >
            <h3 className="font-black text-base text-white">
              {supplierForm.id ? "✏️ تعديل بيانات المورد ورصيد أول المدة" : "➕ إضافة مصنع / مورد جديد"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">اسم المورد / المصنع *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">تصنيف المورد</label>
                <select
                  value={supplierForm.supplierType}
                  onChange={(e) =>
                    setSupplierForm((p) => ({
                      ...p,
                      supplierType: e.target.value,
                      isInternalSupply: e.target.value === "INTERNAL_ABU_ADEL",
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="FACTORY">🏭 مصنع منتجات حلويات (أبو عادل)</option>
                  <option value="RAW_MATERIALS">📦 مورد خامات / أكواب (سول ميت)</option>
                  <option value="INTERNAL_ABU_ADEL">🔄 مورد داخلي (أبو عادل ➔ سول ميت)</option>
                  <option value="GENERAL">🤝 مورد عام</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-amber-300 mb-1 font-bold">رصيد أول المدة (علينا للمورد) ج.م</label>
                <input
                  type="number"
                  step="any"
                  value={supplierForm.openingBalance}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, openingBalance: e.target.value }))}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">الفرع التابع له</label>
                <select
                  value={supplierForm.outletId}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, outletId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-bold">رقم الهاتف</label>
                <input
                  type="text"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingSupplier}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
              >
                {savingSupplier ? "جاري الحفظ..." : "حفظ المورد ✅"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
