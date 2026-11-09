"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Coffee,
  Cake,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  User,
  Phone,
  Flame,
  ArrowRight,
  Info,
  Gift,
  MessageCircle,
  X,
  Truck,
  MapPin,
  Mail,
  KeyRound,
  Award,
  ChevronDown,
  Smile,
  ShieldCheck,
} from "lucide-react";

function TableOrderContent() {
  const searchParams = useSearchParams();
  const paramTable = searchParams.get("table");

  // Mode: DINE_IN (الترابيزة) vs DELIVERY (توصيل للمنزل)
  const [orderMode, setOrderMode] = useState<"DINE_IN" | "DELIVERY">("DINE_IN");

  // Table State
  const [tableNumber, setTableNumber] = useState<string>(paramTable || "");
  const [showTableModal, setShowTableModal] = useState<boolean>(!paramTable);
  const [tempTableInput, setTempTableInput] = useState<string>(paramTable || "");

  // Digital Waiter state
  const [showWaiterGreeting, setShowWaiterGreeting] = useState<boolean>(true);

  // Data
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Category & Tab
  const [activeBrandTab, setActiveBrandTab] = useState<"SOULMATE" | "ABU_ADEL">("SOULMATE");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  // Cart State: array of { menuItemId, nameAr, price, qty, notes, itemType, category, image }
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);

  // Customer Account & Gmail Verification Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState<any>(null);

  // Live Chat with Barista & Kitchen
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Floating Toast State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Check saved customer in localStorage
  useEffect(() => {
    const savedCust = localStorage.getItem("abuadel_customer_session");
    if (savedCust) {
      try {
        const parsed = JSON.parse(savedCust);
        setLoggedInCustomer(parsed);
        setCustomerName(parsed.name || "");
        setCustomerPhone(parsed.phone || "");
        if (parsed.address) setDeliveryAddress(parsed.address);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resOutlets, resTables, resMenu, resSettings] = await Promise.all([
          fetch("/api/outlets"),
          fetch("/api/tables"),
          fetch("/api/menu"),
          fetch("/api/settings"),
        ]);

        const [dataOutlets, dataTables, dataMenu, dataSettings] = await Promise.all([
          resOutlets.json(),
          resTables.json(),
          resMenu.json(),
          resSettings.json(),
        ]);

        if (dataOutlets.success) setOutlets(dataOutlets.outlets);
        if (dataTables.success) setTables(dataTables.tables);
        if (dataMenu.success) setMenuItems(dataMenu.items);
        if (dataSettings.success) setSettings(dataSettings.settings);
      } catch (e) {
        console.error(e);
        showToast("error", "حدث خطأ أثناء تحميل بيانات المنيو");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Poll Chat Messages if Chat Modal is open
  useEffect(() => {
    if (!showChatModal) return;
    const fetchChat = async () => {
      try {
        const query = tableNumber ? `?tableNumber=${encodeURIComponent(tableNumber)}` : "";
        const res = await fetch(`/api/chat${query}`);
        const data = await res.json();
        if (data.success) {
          setChatMessages(data.messages);
          if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchChat();
    const interval = setInterval(fetchChat, 4000);
    return () => clearInterval(interval);
  }, [showChatModal, tableNumber]);

  // Cart Functions
  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].qty += 1;
        return updated;
      } else {
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
            image: item.image,
            outletCode: item.outlet?.code,
          },
        ];
      }
    });
    showToast("success", `تمت إضافة ${item.nameAr} إلى طلبك 🛒`);
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any[]
    );
  };

  // Financials
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const serviceCharge =
    orderMode === "DINE_IN" && settings?.isServiceChargeEnabled
      ? (subtotal * (settings.serviceChargePercent || 12)) / 100
      : 0;
  const taxAmount = settings?.isTaxEnabled ? (subtotal * (settings.taxPercent || 14)) / 100 : 0;
  const finalAmount = Math.max(0, subtotal + serviceCharge + taxAmount);

  // Submit Order directly to KDS / Kitchen
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast("error", "سلة الطلبات فارغة، اختر مشروباتك أو حلوياتك أولاً");
      return;
    }

    if (orderMode === "DINE_IN" && !tableNumber.trim()) {
      setShowTableModal(true);
      showToast("error", "برجاء تأكيد رقم الترابيزة أولاً ليتمكن الويتر من توصيل طلبك");
      return;
    }

    if (orderMode === "DELIVERY" && (!deliveryAddress.trim() || !customerPhone.trim())) {
      showToast("error", "برجاء إدخال رقم الهاتف وعنوان التوصيل بدقة لطلب الدليفري");
      return;
    }

    try {
      setSubmittingOrder(true);

      const targetOutlet =
        activeBrandTab === "SOULMATE"
          ? outlets.find((o) => o.code === "SOULMATE_CAFE")?.id || outlets[0]?.id
          : outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id || outlets[0]?.id;

      const matchedTable = tables.find((t) => t.tableNumber === tableNumber);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutlet,
          orderType: orderMode,
          tableId: orderMode === "DINE_IN" ? matchedTable?.id : null,
          tableNumber: orderMode === "DINE_IN" ? tableNumber : null,
          items: cart,
          customerName: customerName.trim() || "عميل راقٍ",
          customerPhone: customerPhone.trim() || null,
          deliveryAddress: orderMode === "DELIVERY" ? deliveryAddress.trim() : null,
          deliveryPhone: orderMode === "DELIVERY" ? customerPhone.trim() : null,
          notes: orderNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setSubmittedOrder(data.order);
        setCart([]);
        showToast("success", "تم إرسال طلبك فوراً لشاشة الباريستا وبدأ التحضير! ☕🎉");
      } else {
        showToast("error", data.error || "فشل إرسال الطلب، يرجى المحاولة ثانية");
      }
    } catch {
      showToast("error", "حدث خطأ في الاتصال بالشبكة، حاول مجدداً");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Send Chat Message to Barista
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    try {
      setSendingChat(true);
      const targetOutlet =
        outlets.find((o) => o.code === "SOULMATE_CAFE")?.id || outlets[0]?.id;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutlet,
          senderType: "CUSTOMER",
          senderName: customerName || (tableNumber ? `ترابيزة ${tableNumber}` : "عميل"),
          senderPhone: customerPhone || null,
          tableNumber: orderMode === "DINE_IN" ? tableNumber : "DELIVERY",
          message: newChatMessage.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [...prev, data.message]);
        setNewChatMessage("");
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }
    } catch {
      showToast("error", "فشل إرسال الرسالة للباريستا");
    } finally {
      setSendingChat(false);
    }
  };

  // Customer Register / Login with Gmail Verification
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPhone || !authEmail || !authName) {
      showToast("error", "جميع الحقول مطلوبة");
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch("/api/customers/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTER",
          name: authName.trim(),
          phone: authPhone.trim(),
          email: authEmail.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", "تم إرسال كود التحقق السري إلى بريدك الإلكتروني بنجاح ⭐");
        setAuthStep("OTP");
      } else {
        showToast("error", data.error || "فشل إرسال كود التحقق");
      }
    } catch {
      showToast("error", "حدث خطأ في الاتصال بالخادم");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authOtp.trim()) return;

    try {
      setAuthLoading(true);
      const res = await fetch("/api/customers/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_OTP",
          phone: authPhone.trim(),
          code: authOtp.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.customer) {
        setLoggedInCustomer(data.customer);
        setCustomerName(data.customer.name);
        setCustomerPhone(data.customer.phone);
        if (data.customer.address) setDeliveryAddress(data.customer.address);
        localStorage.setItem("abuadel_customer_session", JSON.stringify(data.customer));
        setShowAuthModal(false);
        showToast("success", `أهلاً بك يا ${data.customer.name}! تم تفعيل حسابك ونقاط الولاء ⭐`);
      } else {
        showToast("error", data.error || "كود التحقق غير صحيح");
      }
    } catch {
      showToast("error", "حدث خطأ أثناء التحقق");
    } finally {
      setAuthLoading(false);
    }
  };

  // Filter Menu Items
  const filteredItems = menuItems.filter((item) => {
    const isSoulmateItem =
      item.outlet?.code === "SOULMATE_CAFE" || item.itemType === "PREPARED_BEVERAGE";
    const matchesBrand = activeBrandTab === "SOULMATE" ? isSoulmateItem : !isSoulmateItem;
    if (!matchesBrand) return false;
    if (activeCategory === "ALL") return true;
    return item.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black pb-28">
      {/* 1. TOP HEADER & BRAND BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand & Table Status Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-amber-500/20">
              {activeBrandTab === "SOULMATE" ? "S" : "ع"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white">
                  {activeBrandTab === "SOULMATE"
                    ? "سول ميت كافيه VIP"
                    : "حلواني أبو عادل المستقل"}
                </h1>
              </div>

              {/* Order Mode & Table Indicator (No confusing table dropdown!) */}
              <div className="flex items-center gap-2 mt-0.5">
                {orderMode === "DINE_IN" ? (
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 transition"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      ترابيزة: {tableNumber ? tableNumber : "انقر لتحديد الترابيزة"} ✏️
                    </span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Truck className="w-3 h-3" />
                    <span>طلب دليفري للمنزل 🛵</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mode Switcher & Account Button */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
              <button
                onClick={() => setOrderMode("DINE_IN")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  orderMode === "DINE_IN"
                    ? "bg-amber-500 text-black shadow font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                صالة
              </button>
              <button
                onClick={() => setOrderMode("DELIVERY")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  orderMode === "DELIVERY"
                    ? "bg-emerald-600 text-white shadow font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                دليفري
              </button>
            </div>

            {/* Customer Account Button with Points */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow"
            >
              {loggedInCustomer ? (
                <>
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate max-w-[80px]">{loggedInCustomer.name}</span>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded-full">
                    {loggedInCustomer.loyaltyPoints}★
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>دخول / ولاء</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Brand Switcher Bar (Soulmate Cafe vs Abu Adel) */}
        <div className="bg-slate-900/60 border-t border-slate-800/80 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveBrandTab("SOULMATE");
                  setActiveCategory("ALL");
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                  activeBrandTab === "SOULMATE"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>☕ سول ميت كافيه</span>
              </button>

              <button
                onClick={() => {
                  setActiveBrandTab("ABU_ADEL");
                  setActiveCategory("ALL");
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                  activeBrandTab === "ABU_ADEL"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Cake className="w-3.5 h-3.5" />
                <span>🍰 حلواني أبو عادل</span>
              </button>
            </div>

            {/* Live Chat with Barista Trigger Button */}
            <button
              onClick={() => setShowChatModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>شات الباريستا 💬</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY */}
      <main className="max-w-4xl mx-auto px-4 py-4 w-full space-y-4">
        {/* DIGITAL WAITER INTERACTIVE GREETING BANNER */}
        {showWaiterGreeting && (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <button
              onClick={() => setShowWaiterGreeting(false)}
              className="absolute left-3 top-3 text-slate-500 hover:text-slate-300 text-xs"
              title="إغلاق الترحيب"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl flex-shrink-0 shadow">
                🤵🏻‍♂️
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-amber-400">
                    كابتن زياد (الويتر الذكي الخاص بك)
                  </h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    جاهز لخدمتك الآن
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يا أهلاً ومرحباً بك في <span className="text-amber-400 font-bold">سول ميت كافيه VIP</span>! شرفتنا ونورت مكانك.
                  اطلب مشروبك المفضل أو حلوياتك، وهيصل طلبك مباشرة لشاشة الباريستا بدون أي انتظار. ولو عندك أي ملحوظة (سكر برة أو ماء إضافي) تواصل معايا في الشات المباشر فوراً! ☕✨
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PROMINENT TABLE CONFIRMATION CARD (For Dine-in) */}
        {orderMode === "DINE_IN" && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black text-base shadow">
                {tableNumber || "؟"}
              </div>
              <div>
                <div className="text-xs text-slate-400">طاولتك الحالية بالصالة:</div>
                <div className="text-sm font-black text-white">
                  {tableNumber ? `ترابيزة رقم [ ${tableNumber} ]` : "لم تحدد رقم الترابيزة بعد"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTableModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-500/30 transition shadow"
            >
              {tableNumber ? "تغيير رقم الترابيزة ✏️" : "أدخل رقم الترابيزة الآن 📍"}
            </button>
          </div>
        )}

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCategory === "ALL"
                ? "bg-white text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            الكل
          </button>

          {activeBrandTab === "SOULMATE" ? (
            <>
              <button
                onClick={() => setActiveCategory("HOT_COFFEE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "HOT_COFFEE"
                    ? "bg-amber-500 text-black font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                قهوة ساخنة ☕
              </button>
              <button
                onClick={() => setActiveCategory("COLD_COFFEE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "COLD_COFFEE"
                    ? "bg-amber-500 text-black font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                مثلجات وفرابيه وموهيتو 🧊
              </button>
              <button
                onClick={() => setActiveCategory("WAFFLES_PANCAKES")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "WAFFLES_PANCAKES"
                    ? "bg-amber-500 text-black font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                وافل وبان كيك 🥞
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveCategory("ORIENTAL_SWEETS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "ORIENTAL_SWEETS"
                    ? "bg-emerald-600 text-white font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                حلويات شرقية فاخرة 🍯
              </button>
              <button
                onClick={() => setActiveCategory("CAKES_TORTES")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "CAKES_TORTES"
                    ? "bg-emerald-600 text-white font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                تورت وكيك مناسبات 🎂
              </button>
              <button
                onClick={() => setActiveCategory("WESTERN_PASTRY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "WESTERN_PASTRY"
                    ? "bg-emerald-600 text-white font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                جاتوه وغربي 🍰
              </button>
              <button
                onClick={() => setActiveCategory("GIFT_BOXES")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === "GIFT_BOXES"
                    ? "bg-emerald-600 text-white font-black shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                بوكسات هدايا 🎁
              </button>
            </>
          )}
        </div>

        {/* PRODUCTS LIST */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const inCart = cart.find((i) => i.menuItemId === item.id);
            const fallbackImage =
              item.itemType === "READY_PASTRY"
                ? "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600"
                : "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600";
            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 shadow group"
              >
                {/* Product Thumbnail Image */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image || fallbackImage}
                    alt={item.nameAr}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as any).src = fallbackImage;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white text-sm truncate">{item.nameAr}</h4>
                    {item.loyaltyPointsEarned > 0 && settings?.isLoyaltyEnabled && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                        +{item.loyaltyPointsEarned}★
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {item.description || "صنف فاخر معد بأعلى معايير الجودة."}
                  </p>
                  <div className="text-sm font-black text-amber-400 font-mono mt-2">
                    {item.price} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                    {item.itemType === "READY_PASTRY" && (
                      <span className="text-[10px] text-slate-400 mr-1">
                        ({item.unitType === "KG" ? "كجم" : "قطعة / علبة"})
                      </span>
                    )}
                  </div>
                </div>

                {/* Add / Qty Controls */}
                <div className="flex-shrink-0">
                  {inCart ? (
                    <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-amber-500/30">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-rose-900/50 transition cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-xs text-amber-400 font-mono w-5 text-center">
                        {inCart.qty}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold hover:bg-amber-400 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer ${
                        activeBrandTab === "SOULMATE"
                          ? "bg-amber-500 hover:bg-amber-400 text-black font-black"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Orca Tech Developer Signature */}
        <footer className="mt-12 mb-20 text-center border-t border-slate-800/80 pt-6 pb-2">
          <p className="text-[11px] text-slate-400 font-medium">
            تصميم وتطوير المنظومة الذكية:{" "}
            <strong className="text-white font-bold">م / حمزة عباس</strong> — شركة{" "}
            <strong className="text-amber-400 font-black">أوركا للحلول البرمجية والذكاء الاصطناعي (Orca Tech) 🐬</strong>
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            خدمة الدعم الفني المباشر وتطوير الأنظمة: 01018671000
          </p>
        </footer>
      </main>

      {/* 3. STICKY BOTTOM ORDER BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{cart.reduce((s, i) => s + i.qty, 0)} أصناف مطلوبة</span>
                {orderMode === "DINE_IN" ? (
                  <span className="text-amber-400 font-bold">ترابيزة {tableNumber || "-"}</span>
                ) : (
                  <span className="text-emerald-400 font-bold">دليفري للمنزل</span>
                )}
              </div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {finalAmount.toFixed(2)} <span className="text-xs font-normal text-slate-400">ج.م</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submittingOrder}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm px-6 py-3 rounded-2xl shadow-xl shadow-amber-500/25 transition disabled:opacity-50"
            >
              {submittingOrder ? (
                <span>جارٍ إرسال الطلب...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>تأكيد وإرسال الطلب الآن ☕</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. MODALS */}

      {/* BIG TABLE ENTRY MODAL (When customer scans QR or clicks change) */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120d14] border-2 border-amber-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-4">
            <button
              onClick={() => setShowTableModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto shadow">
              📍
            </div>

            <div>
              <h3 className="text-base font-black text-white">تأكيد رقم الترابيزة في الصالة</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                من فضلك اكتب رقم الترابيزة المكتوب أمامك على الستاند ليتمكن الويتر من توصيل طلبك فوراً.
              </p>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="مثال: 5 أو T-01 أو VIP-1"
              value={tempTableInput}
              onChange={(e) => setTempTableInput(e.target.value)}
              className="w-full text-center py-3 px-4 rounded-xl bg-black border-2 border-amber-500/50 text-white font-mono font-bold text-lg focus:outline-none focus:border-amber-400 shadow-inner"
            />

            <button
              type="button"
              onClick={() => {
                if (!tempTableInput.trim()) {
                  showToast("error", "برجاء كتابة رقم الترابيزة");
                  return;
                }
                setTableNumber(tempTableInput.trim());
                setShowTableModal(false);
                showToast("success", `تم تثبيت ترابيزة رقم ${tempTableInput.trim()} بنجاح 👍`);
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg transition"
            >
              تأكيد والبدء باختيار المشروبات والمنيو
            </button>
          </div>
        </div>
      )}

      {/* LIVE CHAT WITH BARISTA MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md h-[500px] flex flex-col shadow-2xl overflow-hidden">
            {/* Chat Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">
                  ☕
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    شات مباشر مع الباريستا والمطبخ
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    ترابيزة: {tableNumber || "غير محدد"} • رد فوري
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-center text-[11px]">
                أهلاً بك! يمكنك إرسال أي ملحوظة خاصة بالتحضير (سكر برة، حليب خالي الدسم، مناديل إضافية على الترابيزة).
              </div>

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.senderType === "CUSTOMER" ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.senderType === "CUSTOMER"
                        ? "bg-slate-800 text-white rounded-br-none"
                        : "bg-amber-500 text-black font-medium rounded-bl-none shadow"
                    }`}
                  >
                    <div className="text-[10px] opacity-70 mb-0.5">
                      {msg.senderType === "CUSTOMER" ? msg.senderName : "كابتن الباريستا ☕"}
                    </div>
                    <div>{msg.message}</div>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="اكتب ملحوظتك للباريستا..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={sendingChat || !newChatMessage.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                إرسال
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER AUTH & GMAIL OTP MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120d14] border-2 border-amber-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xl mx-auto">
                ⭐
              </div>
              <h3 className="text-base font-black text-white">
                {authStep === "DETAILS" ? "تفعيل حساب العميل ونقاط الولاء" : "تأكيد كود الجي ميل السري"}
              </h3>
              <p className="text-xs text-slate-400">
                {authStep === "DETAILS"
                  ? "سجل بريدك لتجميع نقاط سول ميت مع كل فنجان قهوة واستبدالها مجاناً!"
                  : `أدخل كود التحقق المرسل إلى: ${authEmail}`}
              </p>
            </div>

            {authStep === "DETAILS" ? (
              <form onSubmit={handleCustomerRegister} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">الاسم الكريم *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أ / أحمد علي"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رقم الموبايل *</label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">البريد الإلكتروني (Gmail) *</label>
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow transition disabled:opacity-50"
                >
                  {authLoading ? "جارٍ إرسال كود التحقق..." : "إرسال كود التحقق على الجي ميل ✉️"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 text-center">
                    أدخل كود الـ 6 أرقام:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value)}
                    className="w-full text-center py-3 bg-black border-2 border-amber-500/50 rounded-xl text-white font-mono text-xl tracking-widest focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow transition disabled:opacity-50"
                >
                  {authLoading ? "جارٍ التحقق..." : "تأكيد وتفعيل الحساب فوراً ⭐"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS ORDER POPUP */}
      {submittedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120d14] border-2 border-emerald-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto animate-bounce">
              ☕
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">تم استلام طلبك بنجاح!</h3>
              <p className="text-xs text-amber-400 font-mono font-bold">
                رقم الشيك: {submittedOrder.orderNumber}
              </p>
              <p className="text-xs text-slate-300">
                الطلب يطير الآن لشاشة الباريستا وجاري تحضيره بكل حب وعناية.
              </p>
            </div>

            <button
              onClick={() => setSubmittedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs shadow transition"
            >
              طلب مشروب أو صنف إضافي
            </button>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 shadow-2xl text-xs font-bold animate-fade-in">
          <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function TableOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-amber-400 text-sm">
          جارٍ تحميل منيو الطلب الذكي...
        </div>
      }
    >
      <TableOrderContent />
    </Suspense>
  );
}
