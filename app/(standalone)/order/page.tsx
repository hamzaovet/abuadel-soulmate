"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  SOULMATE_CATEGORIES,
  ABU_ADEL_CATEGORIES,
  getCategoryLabel,
} from "@/lib/categories";
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
  Receipt,
  Heart,
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

  // Active Open Table Check Tracking & Celebration Sound
  const [activeTableOrder, setActiveTableOrder] = useState<any>(null);
  const [showReadyModal, setShowReadyModal] = useState<boolean>(false);
  const [requestingBill, setRequestingBill] = useState<boolean>(false);
  const lastOrderStatusRef = useRef<string | null>(null);

  // Web Audio API Cheerful Chime
  const playCelebrationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Bright cheerful arpeggio)
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.65);
        });
      }
    } catch {
      // Audio fallback
    }
  };

  // Poll Active Table Order
  useEffect(() => {
    if (orderMode !== "DINE_IN" || !tableNumber) return;

    let isSubscribed = true;
    const fetchActiveOrder = async () => {
      try {
        const res = await fetch(`/api/orders?tableNumber=${encodeURIComponent(tableNumber)}&limit=5`);
        const data = await res.json();
        if (data.success && isSubscribed) {
          const active = data.orders.find(
            (o: any) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
          );

          if (active) {
            setActiveTableOrder(active);
            if (active.status === "READY_TO_SERVE" && lastOrderStatusRef.current !== "READY_TO_SERVE") {
              playCelebrationChime();
              setShowReadyModal(true);
            }
            lastOrderStatusRef.current = active.status;
          } else {
            if (lastOrderStatusRef.current && lastOrderStatusRef.current !== "COMPLETED") {
              showToast("success", "تم سداد الشيك بنجاح بالخزينة، نورتنا وشرفتنا دائماً في سول ميت كافيه VIP ☕❤️");
            }
            setActiveTableOrder(null);
            lastOrderStatusRef.current = null;
          }
        }
      } catch {
        // silent
      }
    };

    fetchActiveOrder();
    const interval = setInterval(fetchActiveOrder, 3500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [tableNumber, orderMode]);

  // Request Bill Handler (شيك أوت / طلب الحساب)
  const handleRequestBill = async () => {
    if (!activeTableOrder) return;
    try {
      setRequestingBill(true);
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeTableOrder.id,
          action: "REQUEST_BILL",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || "تم إخطار الكاشير والويتر بطلب الحساب 🧾");
        setActiveTableOrder((prev: any) => (prev ? { ...prev, status: "BILL_REQUESTED" } : null));
      } else {
        showToast("error", data.error || "فشل إرسال طلب الحساب");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم لطلب الحساب");
    } finally {
      setRequestingBill(false);
    }
  };

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
  const deliveryFee = orderMode === "DELIVERY" ? (settings?.deliveryFee || 20) : 0;
  const serviceCharge =
    orderMode === "DINE_IN" && settings?.isServiceChargeEnabled
      ? (subtotal * (settings.serviceChargePercent || 12)) / 100
      : 0;
  const taxAmount = settings?.isTaxEnabled ? (subtotal * (settings.taxPercent || 14)) / 100 : 0;
  const finalAmount = Math.max(0, subtotal + serviceCharge + taxAmount + deliveryFee);

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

        
        {/* ACTIVE OPEN TABLE CHECK WIDGET (الشيك المفتوح لطاولتك) */}
        {orderMode === "DINE_IN" && activeTableOrder && (
          <div className="bg-gradient-to-br from-[#161019] via-[#100b13] to-black border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-xs sm:text-sm text-white">
                  الشيك المفتوح لطاولتك (ترابيزة #{tableNumber})
                </h3>
              </div>
              <span
                className={`text-[10px] font-black py-0.5 px-2 rounded-full border ${
                  activeTableOrder.status === "BILL_REQUESTED"
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse"
                    : activeTableOrder.status === "READY_TO_SERVE"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-bounce"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                }`}
              >
                {activeTableOrder.status === "BILL_REQUESTED"
                  ? "تم طلب الحساب 🧾"
                  : activeTableOrder.status === "READY_TO_SERVE"
                  ? "طلبك جاهز ☕🎉"
                  : "جاري التحضير ⏳"}
              </span>
            </div>

            {/* List of active items in the open check */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs font-mono">
              {(() => {
                let parsed: any[] = [];
                try {
                  parsed = typeof activeTableOrder.items === "string" ? JSON.parse(activeTableOrder.items) : activeTableOrder.items;
                } catch {
                  parsed = [];
                }
                return parsed.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300 py-0.5 border-b border-white/5">
                    <span className="font-sans font-bold">{it.nameAr || it.name} ×{it.qty || 1}</span>
                    <span className="text-amber-300 font-bold">{Number(it.price) * Number(it.qty || 1)} ج</span>
                  </div>
                ));
              })()}
            </div>

            {/* Total and Checkout Action */}
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">إجمالي الشيك المفتوح:</span>
                <span className="text-base font-black font-mono text-amber-400">
                  {activeTableOrder.finalAmount || activeTableOrder.subtotal || 0} ج.م
                </span>
              </div>

              <button
                type="button"
                onClick={handleRequestBill}
                disabled={requestingBill || activeTableOrder.status === "BILL_REQUESTED"}
                className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>
                  {activeTableOrder.status === "BILL_REQUESTED"
                    ? "تم طلب الحساب (الويتر قادم) 🧾"
                    : requestingBill
                    ? "جارٍ الطلب..."
                    : "طلب الحساب / شيك أوت 🧾"}
                </span>
              </button>
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

          {(activeBrandTab === "SOULMATE" ? SOULMATE_CATEGORIES : ABU_ADEL_CATEGORIES).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeCategory === cat.id
                  ? activeBrandTab === "SOULMATE"
                    ? "bg-amber-500 text-black font-black shadow-md shadow-amber-500/20"
                    : "bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>{cat.nameAr}</span> <span className="mr-1">{cat.icon}</span>
            </button>
          ))}
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
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {getCategoryLabel(item.category)}
                    </span>
                    {item.loyaltyPointsEarned > 0 && settings?.isLoyaltyEnabled && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                        +{item.loyaltyPointsEarned}★
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm truncate">{item.nameAr}</h4>
                  {item.nameEn && (
                    <p className="text-[10px] text-amber-300/75 font-mono truncate" dir="ltr">
                      {item.nameEn}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {item.description || "صنف فاخر معد بأعلى معايير الجودة."}
                  </p>
                  <div className="text-sm font-black text-amber-400 font-mono mt-1.5">
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
                  <span>
                    {activeTableOrder
                      ? `إضافة للشيك المفتوح (+${finalAmount.toFixed(0)} ج.م) ☕➕`
                      : "تأكيد وإرسال الطلب الآن ☕"}
                  </span>
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
              placeholder="اكتب رقم الترابيزة (مثال: 1 أو 2 أو 3)"
              value={tempTableInput}
              onChange={(e) => setTempTableInput(e.target.value)}
              className="w-full text-center py-2.5 px-4 rounded-xl bg-black border-2 border-amber-500/50 text-white font-mono font-black text-xl focus:outline-none focus:border-amber-400 shadow-inner"
            />

            {/* Quick 12 Table Buttons (1 - 12) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-amber-300 block">
                أو اختر رقم الترابيزة بضغطة واحدة:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      const strNum = String(num);
                      setTableNumber(strNum);
                      setTempTableInput(strNum);
                      setShowTableModal(false);
                      showToast("success", `تم تثبيت ترابيزة رقم ${strNum} بنجاح 🪑`);
                    }}
                    className={`py-2.5 rounded-xl border font-mono font-black text-base transition cursor-pointer hover:scale-105 ${
                      tempTableInput === String(num) || tableNumber === String(num)
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30"
                        : "bg-black/60 border-white/10 text-white hover:border-amber-500 hover:text-amber-300"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!tempTableInput.trim()) {
                  showToast("error", "برجاء كتابة أو اختيار رقم الترابيزة");
                  return;
                }
                setTableNumber(tempTableInput.trim());
                setShowTableModal(false);
                showToast("success", `تم تثبيت ترابيزة رقم ${tempTableInput.trim()} بنجاح 👍`);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer"
            >
              تأكيد والبدء باختيار المشروبات والمنيو ☕
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

      {/* CELEBRATORY ORDER READY MODAL (نوتيفيكيشن جاهزية الطلب مع الباريستا) */}
      {showReadyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#120d14] border-2 border-emerald-500/70 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto animate-bounce shadow-lg shadow-emerald-500/20">
              ☕🎉
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-wider bg-emerald-500/20 text-emerald-300 py-1 px-3 rounded-full border border-emerald-500/30">
                الباريستا انتهى من التحضير ☕
              </span>
              <h3 className="text-xl font-black text-white">طلبك جاهز الآن يا فندم!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                الباريستا انتهى من تحضير مشروبك بكل حب وإتقان. الكابتن في طريقه إليك لتسليمه على ترابيزتك بكل سرور. بالهنا والشفا! ❤️
              </p>
            </div>

            <button
              onClick={() => setShowReadyModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer"
            >
              تسلم إيدك يا باريستا! بالهنا والشفا ❤️
            </button>
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
