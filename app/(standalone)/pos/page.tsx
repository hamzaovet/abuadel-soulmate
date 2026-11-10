"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardQRModal from "@/components/CardQRModal";
import {
  SOULMATE_CATEGORIES,
  ABU_ADEL_CATEGORIES,
  getCategoryLabel,
} from "@/lib/categories";
import {
  Coffee,
  Cake,
  LayoutGrid,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  Lock,
  Unlock,
  QrCode,
  RefreshCw,
  Search,
  DollarSign,
  ArrowRightLeft,
  Percent,
  Split,
  CreditCard,
  Smartphone,
  Wallet,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  LogOut,
  SlidersHorizontal,
  Home,
  Crown,
  Shield,
} from "lucide-react";

export default function PosTerminalPage() {
  const router = useRouter();

  // Current Staff User
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active Outlet / Brand Tab in POS
  const [activeOutletId, setActiveOutletId] = useState<string>("");
  const [outlets, setOutlets] = useState<any[]>([]);

  // Tables & Menu Items
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Category & Search
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Current Order Cart (Active Table Check or Walk-In Order)
  const [cart, setCart] = useState<any[]>([]);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "INSTAPAY" | "VODAFONE_CASH">("CASH");

  // Modals
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [targetTransferTableId, setTargetTransferTableId] = useState<string>("");
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [splitParts, setSplitParts] = useState<number>(2);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState({ title: "", amount: 100, category: "SUPPLIES", notes: "" });

  // Shift & Cash Drawer Close
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [shiftLiveStats, setShiftLiveStats] = useState<any>(null);
  const [openShift, setOpenShift] = useState<any>(null);
  const [shiftActualCash, setShiftActualCash] = useState<number>(0);
  const [shiftHandedTo, setShiftHandedTo] = useState<string>("أ / حمزة عباس (المايسترو - المالك) 👑");
  const [shiftNotes, setShiftNotes] = useState<string>("");
  const [lastClosedShift, setLastClosedShift] = useState<any>(null);
  const [closingShift, setClosingShift] = useState<boolean>(false);
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [shiftModalTab, setShiftModalTab] = useState<"SHIFT" | "DAILY">("SHIFT");
  const [selectedShiftType, setSelectedShiftType] = useState<"SHIFT_1" | "SHIFT_2">("SHIFT_1");
  const [lastDailyClose, setLastDailyClose] = useState<any>(null);
  const [closingDaily, setClosingDaily] = useState<boolean>(false);

  // Completed Printed Receipt
  const [lastPrintedOrder, setLastPrintedOrder] = useState<any>(null);
  const [settlingOrder, setSettlingOrder] = useState<boolean>(false);

  // Floating Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Check Staff Auth
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("abuadel_soulmate_user") ||
        localStorage.getItem("abuadel_auth_user");
      if (!saved) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(saved);
      setCurrentUser(user);
      if (user.outletId) {
        setActiveOutletId(user.outletId);
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Load All POS Data
  const loadPosData = async () => {
    try {
      const [resOutlets, resTables, resMenu, resSettings, resShifts] = await Promise.all([
        fetch("/api/outlets"),
        fetch("/api/tables"),
        fetch("/api/menu"),
        fetch("/api/settings"),
        fetch(`/api/shifts?outletId=${activeOutletId || "ALL"}`),
      ]);

      const [dataOutlets, dataTables, dataMenu, dataSettings, dataShifts] = await Promise.all([
        resOutlets.json(),
        resTables.json(),
        resMenu.json(),
        resSettings.json(),
        resShifts.json(),
      ]);

      if (dataOutlets.success) {
        setOutlets(dataOutlets.outlets);
        if (!activeOutletId && dataOutlets.outlets.length > 0) {
          setActiveOutletId(dataOutlets.outlets[0].id);
        }
      }
      if (dataTables.success) setTables(dataTables.tables);
      if (dataMenu.success) setMenuItems(dataMenu.items);
      if (dataSettings.success) setSettings(dataSettings.settings);
      if (dataShifts.success) {
        setShiftLiveStats(dataShifts.liveStats);
        setOpenShift(dataShifts.openShift);
        setLastClosedShift(dataShifts.lastClosedShift);
        if (dataShifts.liveStats) {
          setShiftActualCash(dataShifts.liveStats.expectedCash || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadPosData();
      const interval = setInterval(loadPosData, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser, activeOutletId]);

  // Active Outlet & Identification
  const currentOutlet = outlets.find((o) => o.id === activeOutletId) || outlets[0];
  const isSoulmate = currentOutlet?.code === "SOULMATE_CAFE";
  const isAbuAdel = currentOutlet?.code === "ABU_ADEL_PATISSERIE";
  const isOwner = currentUser?.role === "owner";

  // Filtered Menu Items
  const filteredMenuItems = menuItems.filter((item) => {
    const isOutletMatch = activeOutletId ? item.outletId === activeOutletId : true;
    const isCatMatch = activeCategory === "ALL" || item.category === activeCategory;
    const isSearchMatch = searchQuery.trim()
      ? item.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return isOutletMatch && isCatMatch && isSearchMatch && item.isAvailable;
  });

  // Table selection & load order into cart
  const handleSelectTable = (table: any) => {
    setSelectedTable(table);
    setOrderType("DINE_IN");
    if (table.activeOrder && table.activeOrder.items) {
      try {
        const parsed =
          typeof table.activeOrder.items === "string"
            ? JSON.parse(table.activeOrder.items)
            : table.activeOrder.items;
        setCart(parsed);
      } catch {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  };

  // Cart operations
  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          nameAr: item.nameAr,
          price: item.price,
          qty: 1,
          notes: "",
          itemType: item.itemType,
          category: item.category,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const next = i.qty + delta;
            return next > 0 ? { ...i, qty: next } : null;
          }
          return i;
        })
        .filter(Boolean) as any[];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  // Financial calculations
  const rawSubtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const servicePercent = settings?.isServiceChargeEnabled ? settings.serviceChargePercent || 12 : 0;
  const taxPercent = settings?.isTaxEnabled ? settings.taxPercent || 14 : 0;
  const calculatedService = (rawSubtotal * servicePercent) / 100;
  const calculatedTax = (rawSubtotal * taxPercent) / 100;
  const calculatedFinal = Math.max(0, rawSubtotal + calculatedService + calculatedTax - discountAmount + tipAmount);

  // Settle and Print Receipt
  const handleSettleAndPrint = async () => {
    if (cart.length === 0) {
      showToast("error", "السلة فارغة! برجاء إضافة أصناف أولاً");
      return;
    }

    try {
      setSettlingOrder(true);

      // If this was an existing active order on table, settle it
      if (selectedTable?.activeOrderId) {
        const res = await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: selectedTable.activeOrderId,
            action: "SETTLE",
            paymentMethod,
            discountAmount,
            tipAmount,
            cashierName: currentUser?.name || "كاشير المنظومة",
          }),
        });

        const data = await res.json();
        if (data.success && data.order) {
          setLastPrintedOrder(data.order);
          setCart([]);
          setSelectedTable(null);
          showToast("success", data.message || "تم تحصيل الشيك بنجاح 💵");
          await loadPosData();
          setTimeout(() => window.print(), 350);
        } else {
          showToast("error", data.error || "فشل التحصيل");
        }
      } else {
        // Direct Walk-In or Quick Takeaway / Retail Order
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outletId: currentOutlet?.id,
            orderType,
            tableId: selectedTable?.id || null,
            tableNumber: selectedTable?.tableNumber || null,
            items: cart,
            customerName: customerName.trim() || (selectedTable ? `ترابيزة ${selectedTable.tableNumber}` : "عميل كاشير"),
            customerPhone: customerPhone.trim() || null,
            cashierName: currentUser?.name || "كاشير المنظومة",
            discountAmount,
            tipAmount,
          }),
        });

        const data = await res.json();
        if (data.success && data.order) {
          // Immediately settle it
          const resSettle = await fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.order.id,
              action: "SETTLE",
              paymentMethod,
              discountAmount,
              tipAmount,
              cashierName: currentUser?.name || "كاشير المنظومة",
            }),
          });
          const settleData = await resSettle.json();
          if (settleData.success && settleData.order) {
            setLastPrintedOrder(settleData.order);
            setCart([]);
            setSelectedTable(null);
            showToast("success", "تم تسجيل وتحصيل الشيك بنجاح 💵");
            await loadPosData();
            setTimeout(() => window.print(), 350);
          }
        } else {
          showToast("error", data.error || "فشل تسجيل الطلب");
        }
      }
    } catch {
      showToast("error", "تعذر تسجيل التحصيل");
    } finally {
      setSettlingOrder(false);
    }
  };

  // Transfer Table (نقل ترابيزة)
  const handleExecuteTransfer = async () => {
    if (!selectedTable || !targetTransferTableId) {
      showToast("error", "يرجى اختيار الترابيزة الجديدة المراد النقل إليها");
      return;
    }

    try {
      const res = await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER",
          sourceTableId: selectedTable.id,
          targetTableId: targetTransferTableId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || "تم نقل الترابيزة بنجاح 💺");
        setShowTransferModal(false);
        setSelectedTable(data.table);
        await loadPosData();
      } else {
        showToast("error", data.error || "فشل نقل الترابيزة");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم");
    }
  };

  // Close Shift Handler (Z-Report)
  const handleCloseShift = async () => {
    if (!openShift) return;

    try {
      setClosingShift(true);
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: openShift.id,
          shiftType: selectedShiftType,
          actualCash: shiftActualCash,
          handedTo: shiftHandedTo,
          notes: shiftNotes,
          closedBy: currentUser?.name || "الكاشير",
        }),
      });

      const data = await res.json();
      if (data.success && data.closedShift) {
        setLastClosedShift(data.closedShift);
        showToast("success", data.message || "تم إقفال الوردية بنجاح 🔒");
        setShowShiftModal(false);
        await loadPosData();
        setTimeout(() => window.print(), 400);
      } else {
        showToast("error", data.error || "فشل إقفال الوردية");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم");
    } finally {
      setClosingShift(false);
    }
  };

  // Close Daily End-of-Day Consolidated Handler
  const handleCloseDaily = async () => {
    try {
      setClosingDaily(true);
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DAILY_CLOSE",
          outletId: currentOutlet?.id,
          closedBy: currentUser?.name || "المايسترو (المالك) 👑",
          notes: shiftNotes,
        }),
      });

      const data = await res.json();
      if (data.success && data.dailyClose) {
        setLastDailyClose(data.dailyClose);
        showToast("success", data.message || "تم اعتماد إقفال اليومية الشامل بنجاح 📑");
        setShowShiftModal(false);
        await loadPosData();
        setTimeout(() => window.print(), 400);
      } else {
        showToast("error", data.error || "فشل إقفال اليومية");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالسيرفر لإقفال اليومية");
    } finally {
      setClosingDaily(false);
    }
  };

  // Record Petty Cash Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: currentOutlet?.id,
          title: expenseForm.title,
          amount: Number(expenseForm.amount),
          category: expenseForm.category,
          recordedBy: currentUser?.name || "الكاشير",
          notes: expenseForm.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", "تم صرف المصروف وخصمه من الدرج 💸");
        setShowExpenseModal(false);
        setExpenseForm({ title: "", amount: 100, category: "SUPPLIES", notes: "" });
        await loadPosData();
      } else {
        showToast("error", data.error || "فشل تسجيل المصروف");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("abuadel_soulmate_user");
    router.push("/login");
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#07070a] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black" dir="rtl">
      {/* ─────────────────────────────────────────────────────────────
          1. POS TOP HEADER
         ───────────────────────────────────────────────────────────── */}
      <header className="shrink-0 z-40 bg-[#120d14]/95 backdrop-blur-md border-b border-amber-500/25 px-3 sm:px-5 py-2 flex items-center justify-between shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isAbuAdel ? "/abuadel-logo.svg" : "/soulmate-logo.svg"}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-amber-300">
                {isAbuAdel ? "كاشير حلواني أبو عادل المستقل 🍰" : "كاشير سول ميت كافيه والترابيزات ☕"}
              </h1>
              <span className="py-0.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                نشط 🟢
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold">
              الكاشير: {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Top Controls & Direct Navigation */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Outlet Switcher (Maestro Owner only) or Locked Badge (Cashiers & Branch Managers) */}
          {isOwner ? (
            <select
              value={activeOutletId}
              onChange={(e) => {
                setActiveOutletId(e.target.value);
                setSelectedTable(null);
                setCart([]);
              }}
              className="py-1.5 px-3 rounded-xl bg-[#18121c] border border-amber-500/40 text-amber-300 text-xs font-black focus:outline-none cursor-pointer"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{currentOutlet?.name || "فرعك المعتمد"}</span>
            </div>
          )}

          {/* Quick Expense */}
          <button
            onClick={() => setShowExpenseModal(true)}
            className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">مصروف نثريات 💸</span>
          </button>

          {/* Close Shift */}
          <button
            onClick={() => setShowShiftModal(true)}
            className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>إقفال الوردية 🔒</span>
          </button>

          {/* Navigation to Admin (Crucial Exit Button!) */}
          <Link
            href="/admin"
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-105"
            title="الذهاب إلى لوحة الإدارة العامة"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950" />
            <span>لوحة الإدارة 👑</span>
          </Link>

          {/* Link to KDS */}
          <Link
            href="/kds"
            className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
            title="شاشة الباريستا والمطبخ"
          >
            <span>شاشة KDS ☕</span>
          </Link>

          {/* Link to Home (Storefront) */}
          <Link
            href="/"
            className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
            title="الصفحة الرئيسية للموقع"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">الرئيسية 🏠</span>
          </Link>

          {/* Card 2 QR */}
          <button
            onClick={() => setShowQrModal(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 transition cursor-pointer"
            title="كارت الـ 2 QR الملكي"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={loadPosData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logout Button */}
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

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN POS WORKSPACE: 2 WIDE COLUMNS (MENU CATALOG 8 COLS | CART & CHECKOUT 4 COLS)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 h-[calc(100vh-58px)] max-h-[calc(100vh-58px)] grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden no-print">
        {/* COLUMN 1: MENU CATALOG & SEARCH (8 Cols - Wide & Spacious!) */}
        <div className="lg:col-span-8 h-full max-h-full bg-[#110c14] border border-white/10 rounded-2xl p-3.5 flex flex-col overflow-hidden shadow-xl">
          {/* Search Bar & Fast Table Selector Pill */}
          <div className="shrink-0 space-y-2 pb-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، فنجان قهوة، تورتة، موهيتو، كرواسون..."
                  className="w-full py-2 pr-9 pl-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              {/* Quick Table Switcher Button in Header */}
              {isSoulmate && (
                <button
                  type="button"
                  onClick={() => setShowTableModal(true)}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-black transition cursor-pointer shrink-0 shadow-sm ${
                    selectedTable
                      ? selectedTable.status === "BILL_REQUESTED"
                        ? "bg-purple-600/30 border-purple-500 text-purple-200 animate-pulse"
                        : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-500"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedTable ? `ترابيزة ${selectedTable.tableNumber}` : "اختر ترابيزة (1 - 12) 🪑"}
                  </span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`py-1.5 px-3 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  activeCategory === "ALL" ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                الكل ✨
              </button>

              {(isAbuAdel ? ABU_ADEL_CATEGORIES : SOULMATE_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`py-1.5 px-3 rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    activeCategory === cat.id
                      ? isAbuAdel
                        ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20"
                        : "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{cat.nameAr}</span> <span>{cat.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid: 4 columns on large screens! */}
          <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pr-1 content-start">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-2.5 rounded-2xl bg-black/50 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/40 transition text-right flex flex-col justify-between space-y-1.5 group cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                <div>
                  <h4 className="font-black text-xs text-white group-hover:text-amber-300 line-clamp-2 leading-snug">
                    {item.nameAr}
                  </h4>
                  {item.nameEn && (
                    <span className="text-[10px] text-amber-200/70 font-mono block truncate" dir="ltr">
                      {item.nameEn}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    {item.itemType === "READY_PASTRY" ? `رصيد: ${item.stockQty} ${item.unitType}` : "تحضير فوري ☕"}
                  </span>
                </div>

                <div className="flex items-center justify-between w-full pt-1.5 border-t border-white/5">
                  <span className="font-mono font-black text-xs text-amber-400">{item.price} ج</span>
                  <div className="w-5 h-5 rounded-lg bg-white/10 group-hover:bg-amber-500 group-hover:text-slate-950 text-white flex items-center justify-center transition">
                    <Plus className="w-3 h-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* COLUMN 2: CART, BILL & PINNED SETTLEMENT (4 Cols) */}
        <div className="lg:col-span-4 h-full max-h-full bg-[#110c14] border border-white/10 rounded-2xl p-3 flex flex-col overflow-hidden shadow-xl">
          {/* Header & Quick Table Selector Button */}
          <div className="shrink-0 space-y-2 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>شيك الحساب والفاتورة</span>
              </h3>

              {/* Table Actions (Transfer & Split) */}
              {selectedTable && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="py-1 px-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="نقل الشيك لترابيزة ثانية"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>نقل</span>
                  </button>
                  <button
                    onClick={() => setShowSplitModal(true)}
                    className="py-1 px-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="تقسيم الفاتورة"
                  >
                    <Split className="w-3 h-3" />
                    <span>تقسيم</span>
                  </button>
                </div>
              )}
            </div>

            {/* Prominent Table / Order Type Trigger Bar */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowTableModal(true)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl border flex items-center justify-between text-xs font-black transition cursor-pointer ${
                  selectedTable
                    ? selectedTable.status === "BILL_REQUESTED"
                      ? "bg-purple-600/30 border-purple-500 text-purple-200 animate-pulse"
                      : "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                    : orderType === "TAKEAWAY"
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                    : orderType === "DELIVERY"
                    ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-500"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedTable
                      ? `ترابيزة رقم [ ${selectedTable.tableNumber} ]`
                      : orderType === "TAKEAWAY"
                      ? "طلب تيك أواي سفري 🛍️"
                      : orderType === "DELIVERY"
                      ? "طلب دليفري للمنزل 🛵"
                      : "اختر الترابيزة (1 - 12) 🪑"}
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 bg-black/40 py-0.5 px-1.5 rounded-md">
                  تغيير ▾
                </span>
              </button>

              {selectedTable && (
                <button
                  onClick={() => {
                    setSelectedTable(null);
                    setCart([]);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition cursor-pointer"
                  title="إلغاء الترابيزة"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Delivery Fields (if Delivery) */}
          {orderType === "DELIVERY" && (
            <div className="shrink-0 grid grid-cols-2 gap-1.5 py-1.5 border-b border-white/5 text-[11px]">
              <input
                type="text"
                placeholder="اسم العميل..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="py-1 px-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none"
              />
              <input
                type="tel"
                placeholder="رقم الهاتف..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="py-1 px-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none"
              />
            </div>
          )}

          {/* Cart Items List: SCROLLABLE INDEPENDENTLY */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 py-1">
            {cart.length === 0 ? (
              <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-slate-500 text-xs py-4">
                <Receipt className="w-8 h-8 mb-1 opacity-30 text-amber-400" />
                <span className="font-bold text-slate-400">الفاتورة فارغة حالياً</span>
                <span className="text-[10px] text-slate-600">اختر أصنافاً من المنيو للإضافة</span>
              </div>
            ) : (
              cart.map((it) => (
                <div key={it.menuItemId} className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white block truncate">{it.nameAr}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {it.price} ج × {it.qty} = <strong className="text-amber-300 font-black">{it.price * it.qty} ج</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCartQty(it.menuItemId, -1)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-xs px-1 text-white">{it.qty}</span>
                    <button
                      onClick={() => updateCartQty(it.menuItemId, 1)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(it.menuItemId)}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PINNED SETTLEMENT PANEL - PERMANENTLY VISIBLE AT THE BOTTOM */}
          <div className="shrink-0 border-t border-white/10 pt-2 space-y-2 bg-[#110c14]">
            {/* Discount & Tip Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">خصم (ج.م):</label>
                <input
                  type="number"
                  min={0}
                  value={discountAmount || ""}
                  placeholder="0"
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full py-1 px-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-bold text-center outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">إكرامية / Tip (ج.م):</label>
                <input
                  type="number"
                  min={0}
                  value={tipAmount || ""}
                  placeholder="0"
                  onChange={(e) => setTipAmount(Number(e.target.value))}
                  className="w-full py-1 px-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-bold text-center outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
              <button
                onClick={() => setPaymentMethod("CASH")}
                className={`py-1.5 rounded-lg border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  paymentMethod === "CASH" ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20" : "bg-black/40 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <span>💵</span>
                <span>كاش</span>
              </button>
              <button
                onClick={() => setPaymentMethod("CARD")}
                className={`py-1.5 rounded-lg border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  paymentMethod === "CARD" ? "bg-sky-500 text-white font-black border-sky-400 shadow-md shadow-sky-500/20" : "bg-black/40 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <span>💳</span>
                <span>فيزا</span>
              </button>
              <button
                onClick={() => setPaymentMethod("INSTAPAY")}
                className={`py-1.5 rounded-lg border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  paymentMethod === "INSTAPAY" ? "bg-purple-600 text-white font-black border-purple-400 shadow-md shadow-purple-600/20" : "bg-black/40 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <span>⚡</span>
                <span>إنستاباي</span>
              </button>
              <button
                onClick={() => setPaymentMethod("VODAFONE_CASH")}
                className={`py-1.5 rounded-lg border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  paymentMethod === "VODAFONE_CASH" ? "bg-rose-600 text-white font-black border-rose-400 shadow-md shadow-rose-600/20" : "bg-black/40 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <span>📱</span>
                <span>فودافون</span>
              </button>
            </div>

            {/* Totals Breakdown & Settle Button */}
            <div className="space-y-1 border-t border-white/10 pt-1.5 text-xs">
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>المجموع الفرعي:</span>
                <span>{rawSubtotal} ج</span>
              </div>
              {orderType === "DELIVERY" && (
                <div className="flex justify-between text-sky-400 font-mono text-[11px]">
                  <span>خدمة توصيل دليفري:</span>
                  <span>+{settings?.deliveryFee || 20} ج</span>
                </div>
              )}
              {settings?.isServiceChargeEnabled && (
                <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                  <span>خدمة ({settings.serviceChargePercent}%):</span>
                  <span>+{calculatedService.toFixed(2)} ج</span>
                </div>
              )}
              {settings?.isTaxEnabled && (
                <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                  <span>ضريبة ({settings.taxPercent}%):</span>
                  <span>+{calculatedTax.toFixed(2)} ج</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black border-t border-white/10 pt-1">
                <span className="text-white">المبلغ المطلوب:</span>
                <span className="font-mono text-amber-400 text-base font-black">
                  {calculatedFinal + (orderType === "DELIVERY" ? (settings?.deliveryFee || 20) : 0)} ج.م
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition cursor-pointer"
                    title="مسح الفاتورة بالكامل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleSettleAndPrint}
                  disabled={settlingOrder || cart.length === 0}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {settlingOrder ? (
                    <span>جاري التحصيل والطباعة...</span>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>تحصيل {calculatedFinal + (orderType === "DELIVERY" ? (settings?.deliveryFee || 20) : 0)} ج.م وطباعة الإيصال 🖨️</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MODAL: TRANSFER TABLE (نقل ترابيزة)
         ───────────────────────────────────────────────────────────── */}
      {showTransferModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-sky-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-400" />
              <span>نقل شيك ترابيزة ({selectedTable.tableNumber})</span>
            </h3>
            <p className="text-xs text-slate-300">
              اختر الترابيزة الجديدة لترحيل الشيك والطلبات إليها تلقائياً:
            </p>

            <select
              value={targetTransferTableId}
              onChange={(e) => setTargetTransferTableId(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-bold focus:outline-none"
            >
              <option value="">-- اختر ترابيزة فاضية --</option>
              {tables
                .filter((t) => t.id !== selectedTable.id && t.status === "AVAILABLE")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tableNumber} ({t.zone === "OUTDOOR" ? "تراس" : "صالة"})
                  </option>
                ))}
            </select>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExecuteTransfer}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                تأكيد النقل الآن 💺
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="py-2.5 px-4 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3.1 MODAL: FAST TABLE & ORDER TYPE SELECTOR (خريطة الترابيزات الذكية)
         ───────────────────────────────────────────────────────────── */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-amber-500/40 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-amber-400" />
                  <span>ترابيزات كافيه سول ميت (1 - 12)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  اضغط على رقم الترابيزة لاختيارها فوراً، أو اختر سفري / دليفري
                </p>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer text-sm font-bold"
              >
                ✕ إغلاق
              </button>
            </div>

            {/* Quick Order Type Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => {
                  setOrderType("TAKEAWAY");
                  setSelectedTable(null);
                  setShowTableModal(false);
                  showToast("info", "تم تفعيل وضع الطلب السفري (تيك أواي) 🛍️");
                }}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                  orderType === "TAKEAWAY" && !selectedTable
                    ? "bg-rose-500 text-white border-rose-400 font-black shadow-lg shadow-rose-500/20"
                    : "bg-black/40 text-slate-300 border-white/10 hover:border-rose-500"
                }`}
              >
                <span>🛍️</span>
                <span>طلب سفري / تيك أواي</span>
              </button>
              <button
                onClick={() => {
                  setOrderType("DELIVERY");
                  setSelectedTable(null);
                  setShowTableModal(false);
                  showToast("info", "تم تفعيل وضع التوصيل (دليفري) 🛵");
                }}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                  orderType === "DELIVERY" && !selectedTable
                    ? "bg-sky-500 text-white border-sky-400 font-black shadow-lg shadow-sky-500/20"
                    : "bg-black/40 text-slate-300 border-white/10 hover:border-sky-500"
                }`}
              >
                <span>🛵</span>
                <span>طلب دليفري للمنزل</span>
              </button>
            </div>

            {/* Tables Grid (1 - 12) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-amber-300 block">
                ترابيزات الصالة المتاحة:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {tables.map((t) => {
                  const isSelected = selectedTable?.id === t.id;
                  const isOccupied = t.status === "OCCUPIED";
                  const isBillReq = t.status === "BILL_REQUESTED";

                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        handleSelectTable(t);
                        setShowTableModal(false);
                        showToast("success", `تم اختيار ترابيزة رقم ${t.tableNumber} بنجاح 🪑`);
                      }}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1 cursor-pointer shadow-sm hover:scale-105 ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20"
                          : isBillReq
                          ? "bg-purple-950/60 border-purple-500/80 text-purple-200 animate-pulse"
                          : isOccupied
                          ? "bg-rose-950/40 border-rose-500/50 text-rose-200 hover:bg-rose-900/60"
                          : "bg-black/50 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      <div className="text-xl font-black font-mono">
                        {t.tableNumber}
                      </div>
                      <span className="text-[10px] block opacity-80">
                        {t.zone === "OUTDOOR" ? "تراس 🌿" : t.zone === "VIP_LOUNGE" ? "VIP 👑" : "داخلية"}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full block ${
                          isSelected
                            ? "bg-black/30 text-black"
                            : isBillReq
                            ? "bg-purple-500 text-white"
                            : isOccupied
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {isBillReq
                          ? "طلب حساب 🧾"
                          : isOccupied
                          ? `مشغولة (${t.activeOrder?.finalAmount || 0}ج)`
                          : "فاضية 🟢"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                رجوع وإغلاق ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL: SPLIT BILL (تقسيم الفاتورة)
         ───────────────────────────────────────────────────────────── */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-purple-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <Split className="w-4 h-4 text-purple-400" />
              <span>تقسيم فاتورة الحساب (Split Bill)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-bold block">عدد أفراد التقسيم:</label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSplitParts(num)}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer transition ${
                      splitParts === num ? "bg-purple-600 text-white font-black" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {num} أفراد
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-center space-y-1">
              <span className="text-[11px] text-slate-400">نصيب كل فرد مطلوب تحصيله:</span>
              <p className="text-xl font-black font-mono text-purple-300">
                {(calculatedFinal / splitParts).toFixed(2)} ج.م
              </p>
            </div>

            <button
              onClick={() => {
                showToast("info", `تم تقسيم الشيك على ${splitParts} أفراد بقيمة ${(calculatedFinal / splitParts).toFixed(2)} ج لكل فرد`);
                setShowSplitModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer"
            >
              اعتماد التقسيم
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL: PETTY CASH EXPENSE (صرف نثريات نقدية من الدرج)
         ───────────────────────────────────────────────────────────── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-rose-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-rose-400" />
              <span>صرف مصروف نثريات من درج الكاشير</span>
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">بيان المصروف:</label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="مثال: ثلج إضافي، سكر، صيانة ماكينة، نظافة..."
                  className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">المبلغ (ج.م):</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-center font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer"
                >
                  صرف وخصم من الدرج 💸
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: CLOSE SHIFT & DAILY CLOSE (إقفال الشيفت واليومية الشاملة)
         ───────────────────────────────────────────────────────────── */}
      {showShiftModal && openShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-amber-500/40 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header & Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>إقفال الحسابات والخزينة</span>
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            {/* Toggle Tabs: Shift Close vs Daily Close */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold text-center">
              <button
                onClick={() => setShiftModalTab("SHIFT")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  shiftModalTab === "SHIFT" ? "bg-amber-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                إقفال الوردية (Z-Report) 🔒
              </button>
              <button
                onClick={() => setShiftModalTab("DAILY")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  shiftModalTab === "DAILY" ? "bg-amber-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                إقفال اليومية بالكامل 📑
              </button>
            </div>

            {shiftModalTab === "SHIFT" ? (
              /* TAB 1: SHIFT CLOSE */
              <div className="space-y-3">
                {/* Shift Selector */}
                <div>
                  <label className="text-slate-300 font-bold text-xs block mb-1">حدد الوردية المراد إقفالها:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedShiftType("SHIFT_1")}
                      className={`py-2 px-3 rounded-xl border transition cursor-pointer ${
                        selectedShiftType === "SHIFT_1"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 font-black"
                          : "bg-black/40 border-white/10 text-slate-400"
                      }`}
                    >
                      الوردية 1 (الصباحية ☀️)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedShiftType("SHIFT_2")}
                      className={`py-2 px-3 rounded-xl border transition cursor-pointer ${
                        selectedShiftType === "SHIFT_2"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 font-black"
                          : "bg-black/40 border-white/10 text-slate-400"
                      }`}
                    >
                      الوردية 2 (المسائية 🌙)
                    </button>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>فكة الدرج الافتتاحية:</span>
                    <span>{shiftLiveStats?.openingFloat || 500} ج</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>مقبوضات الكاش النقدية (+):</span>
                    <span>+{shiftLiveStats?.cashCollected || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-sky-400">
                    <span>فيزا وبطاقات إلكترونية:</span>
                    <span>{shiftLiveStats?.visaCollected || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-purple-400">
                    <span>انستاباي InstaPay:</span>
                    <span>{shiftLiveStats?.instapayCollected || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>مصروفات ونثريات الدرج (-):</span>
                    <span>-{shiftLiveStats?.expensesTotal || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold border-t border-white/10 pt-1 text-sm">
                    <span>النقدية المتوقعة بالدرج:</span>
                    <span>{shiftLiveStats?.expectedCash || 0} ج.م</span>
                  </div>
                </div>

                {/* Actual Cash Input */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">النقدية الفعلية بالدرج بعد العد (ج.م) *:</label>
                    <input
                      type="number"
                      value={shiftActualCash}
                      onChange={(e) => setShiftActualCash(Number(e.target.value))}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-amber-500/40 text-amber-300 text-base font-black font-mono text-center focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block pt-1 text-center font-mono">
                      الفارق:{" "}
                      <strong className={shiftActualCash - (shiftLiveStats?.expectedCash || 0) === 0 ? "text-emerald-400" : "text-rose-400"}>
                        {shiftActualCash - (shiftLiveStats?.expectedCash || 0)} ج.م{" "}
                        {shiftActualCash - (shiftLiveStats?.expectedCash || 0) === 0 ? "(مطابقة تامة ✅)" : "(عجز/زيادة ⚠️)"}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">تسليم النقدية إلى:</label>
                    <input
                      type="text"
                      value={shiftHandedTo}
                      onChange={(e) => setShiftHandedTo(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-bold"
                    />
                  </div>

                  <button
                    onClick={handleCloseShift}
                    disabled={closingShift}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {closingShift ? "جارٍ الإقفال..." : "إقفال وتسليم الوردية وطباعة Z-Report 🔒🖨️"}
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: DAILY CONSOLIDATED CLOSE */
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                  <span className="font-black text-sm block">تقرير إقفال اليومية الشامل 📑</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    يقوم هذا الإجراء بتجميع كافة مبيعات ومصروفات اليوم بالكامل لكافة الورديات (الصباحية والمسائية)، واحتساب صافي النقدية الموردة للخزينة الرئيسية.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>إجمالي إيرادات اليوم:</span>
                    <span className="text-white font-bold">{shiftLiveStats?.totalRevenue || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>صافي النقدية (الكاش):</span>
                    <span>{shiftLiveStats?.cashCollected || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-sky-400">
                    <span>المدفوعات الإلكترونية:</span>
                    <span>{(shiftLiveStats?.visaCollected || 0) + (shiftLiveStats?.instapayCollected || 0) + (shiftLiveStats?.vodafoneCollected || 0)} ج</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>إجمالي المصروفات:</span>
                    <span>-{shiftLiveStats?.expensesTotal || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold border-t border-white/10 pt-1 text-sm">
                    <span>صافي الكاش المورد للخزينة:</span>
                    <span>{Math.max(0, (shiftLiveStats?.cashCollected || 0) - (shiftLiveStats?.expensesTotal || 0))} ج.م</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">ملاحظات إقفال اليومية:</label>
                  <input
                    type="text"
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    placeholder="أي ملاحظات حول يومية العمل..."
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white"
                  />
                </div>

                <button
                  onClick={handleCloseDaily}
                  disabled={closingDaily}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {closingDaily ? "جارٍ إقفال اليومية..." : "اعتماد إقفال اليومية وطباعة التقرير الشامل 📑🖨️"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. THERMAL RECEIPT PRINT TEMPLATE (80MM CLIENT RECEIPT)
         ───────────────────────────────────────────────────────────── */}
      {lastPrintedOrder && (
        <div id="thermal-receipt" className="hidden print:block text-black font-sans" dir="rtl">
          <div className="text-center space-y-1 border-b-2 border-black pb-2 mb-2">
            <h2 className="text-base font-black tracking-wider">
              {lastPrintedOrder.outlet?.name || "حلواني أبو عادل & سول ميت كافيه"}
            </h2>
            <p className="text-[10px] font-mono font-bold">
              {lastPrintedOrder.outlet?.code === "SOULMATE_CAFE" ? "SOULMATE SPECIALTY CAFE" : "ABU ADEL PATISSERIE"}
            </p>
            <p className="text-[10px]">
              {lastPrintedOrder.tableNumber ? `ترابيزة: ${lastPrintedOrder.tableNumber}` : "طلب تيك أواي / سفري"}
            </p>
            <p className="text-[10px] font-mono">
              تاريخ: {new Date().toLocaleDateString("ar-EG")} • {new Date().toLocaleTimeString("ar-EG")}
            </p>
            <p className="text-[11px] font-black font-mono">
              فاتورة رقم: #{lastPrintedOrder.orderNumber}
            </p>
          </div>

          <div className="text-[11px] space-y-1 border-b border-black pb-2 mb-2">
            <div className="flex justify-between">
              <span>العميل:</span>
              <strong>{lastPrintedOrder.customerName || "عميل محترم"}</strong>
            </div>
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <strong>{lastPrintedOrder.cashierName || currentUser?.name || "الكاشير"}</strong>
            </div>
            <div className="flex justify-between">
              <span>طريقة الدفع:</span>
              <strong>
                {lastPrintedOrder.paymentMethod === "CASH"
                  ? "نقداً (كاش) 💵"
                  : lastPrintedOrder.paymentMethod === "CARD"
                  ? "بطاقة بنكية 💳"
                  : lastPrintedOrder.paymentMethod === "INSTAPAY"
                  ? "انستاباي ⚡"
                  : "فودافون كاش 📱"}
              </strong>
            </div>
          </div>

          {/* Items */}
          <div className="text-[11px] space-y-1 border-b border-black pb-2 mb-2">
            <p className="font-black">تفاصيل الطلب:</p>
            {(() => {
              let items: any[] = [];
              try {
                items = typeof lastPrintedOrder.items === "string" ? JSON.parse(lastPrintedOrder.items) : lastPrintedOrder.items || [];
              } catch {}
              return items.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.nameAr} (×{it.qty || 1})</span>
                  <span className="font-mono font-bold">{(it.price * (it.qty || 1))} ج</span>
                </div>
              ));
            })()}
          </div>

          <div className="text-[12px] space-y-1 font-black border-b-2 border-black pb-2 mb-2">
            <div className="flex justify-between text-sm">
              <span>المبلغ الإجمالي المدفوع:</span>
              <span className="font-mono text-base">{lastPrintedOrder.finalAmount} ج.م</span>
            </div>
          </div>

          <div className="text-center text-[10px] space-y-1 pt-1.5 border-t border-black">
            <p className="font-bold">{settings?.receiptFooterNotes || "شكراً لزيارتكم • حلي يومك واستمتع بقهوتك ☕🍰"}</p>
            <p className="font-mono font-black text-[11px]">
              الخط الساخن لأبو عادل: 15992 • واتساب الكافيه: 01099887766
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. THERMAL SHIFT Z-REPORT PRINT TEMPLATE (80MM)
         ───────────────────────────────────────────────────────────── */}
      {lastClosedShift && (
        <div id="shift-handover-receipt" className="hidden print:block text-black font-sans" dir="rtl">
          <div className="text-center space-y-1 border-b-2 border-black pb-2 mb-2">
            <h2 className="text-base font-black tracking-wider">
              {lastClosedShift.outlet?.name || "حلواني أبو عادل وسول ميت كافيه"}
            </h2>
            <p className="text-[11px] font-mono font-bold">تقرير إقفال وتسليم وردية الكاشير (Z-Report)</p>
            <p className="text-[11px] font-black font-mono">وردية رقم: #{lastClosedShift.shiftNumber}</p>
            <p className="text-[10px]">الكاشير المسلّم: {lastClosedShift.closedBy}</p>
            <p className="text-[10px] font-mono">
              تاريخ الإقفال: {new Date(lastClosedShift.closedAt || new Date()).toLocaleDateString("ar-EG")} •{" "}
              {new Date(lastClosedShift.closedAt || new Date()).toLocaleTimeString("ar-EG")}
            </p>
          </div>

          <div className="text-[11px] space-y-1.5 border-b border-black pb-2 mb-2">
            <div className="flex justify-between">
              <span>عدد الشيكات / الفواتير:</span>
              <strong>{lastClosedShift.ticketsCount} شيك</strong>
            </div>
            <div className="flex justify-between">
              <span>إجمالي المبيعات والإيراد:</span>
              <strong>{lastClosedShift.totalRevenue} ج.م</strong>
            </div>
          </div>

          <div className="text-[11px] space-y-1 border-b border-black pb-2 mb-2">
            <p className="font-black">تفاصيل المقبوضات والدرج:</p>
            <div className="flex justify-between">
              <span>فكة الدرج الافتتاحية:</span>
              <strong>{lastClosedShift.openingCashFloat} ج.م</strong>
            </div>
            <div className="flex justify-between">
              <span>المقبوض نقداً (كاش):</span>
              <strong>{lastClosedShift.cashCollected} ج.م</strong>
            </div>
            <div className="flex justify-between">
              <span>فيزا وبطاقات إلكترونية:</span>
              <strong>{lastClosedShift.visaCollected} ج.م</strong>
            </div>
            <div className="flex justify-between">
              <span>انستاباي InstaPay:</span>
              <strong>{lastClosedShift.instapayCollected} ج.م</strong>
            </div>
            <div className="flex justify-between">
              <span>فودافون كاش:</span>
              <strong>{lastClosedShift.vodafoneCollected} ج.م</strong>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>مصروفات ونثريات منصرفة:</span>
              <strong>-{lastClosedShift.expensesTotal} ج.م</strong>
            </div>
          </div>

          <div className="text-[12px] space-y-1 border-b-2 border-black pb-2 mb-2 font-black">
            <div className="flex justify-between">
              <span>النقدية المتوقعة بالدرج:</span>
              <span className="font-mono">{lastClosedShift.expectedCash} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>النقدية الفعلية المسلمة:</span>
              <span className="font-mono text-base">{lastClosedShift.actualCash} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>الفارق (مطابقة / عجز / زيادة):</span>
              <span className="font-mono">
                {lastClosedShift.difference === 0 ? "متطابق تماماً (0 ج.م) ✅" : `${lastClosedShift.difference} ج.م`}
              </span>
            </div>
          </div>

          <div className="text-[11px] space-y-1 border-b border-black pb-2 mb-2">
            <div>
              <span className="block font-bold">تم تسليم النقدية إلى:</span>
              <span className="font-black text-xs block mt-0.5">
                👑 {lastClosedShift.handedTo || "المايسترو"}
              </span>
            </div>
          </div>

          <div className="text-[10px] grid grid-cols-2 gap-4 pt-3 pb-4">
            <div className="text-center space-y-6">
              <p className="font-bold">توقيع الكاشير المسلّم</p>
              <p className="border-t border-black pt-1">.........................</p>
            </div>
            <div className="text-center space-y-6">
              <p className="font-bold">توقيع المستلم (المالك)</p>
              <p className="border-t border-black pt-1">.........................</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. CARD 2 QR MODAL
         ───────────────────────────────────────────────────────────── */}
      <CardQRModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        hotline={settings?.hotline || "15992"}
        abuAdelPhone={settings?.abuAdelPhone || "15992"}
        soulmatePhone={settings?.soulmatePhone || "01099887766"}
      />

      {/* ─────────────────────────────────────────────────────────────
          10. VIP FLOATING TOAST NOTIFICATION
         ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-fade-in font-sans no-print">
          <div
            className={`py-3 px-5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 text-xs font-black ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-500/60 text-rose-200 shadow-rose-950/50"
                : "bg-amber-950/90 border-amber-500/60 text-amber-200 shadow-amber-950/50"
            }`}
          >
            <span className="text-base">{toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "👑"}</span>
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
