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
  Home,
  Package,
  Store,
  LogOut,
  Search,
} from "lucide-react";

function TableOrderContent() {
  const searchParams = useSearchParams();
  const paramTable = searchParams.get("table");
  const paramBrand = searchParams.get("brand");
  const paramMode = searchParams.get("mode");

  // Brand Tab: initialized cleanly from URL query params (?brand=abuadel or ?brand=soulmate)
  const initialBrand: "SOULMATE" | "ABU_ADEL" =
    paramBrand?.toLowerCase().includes("abu") ? "ABU_ADEL" : "SOULMATE";

  const [activeBrandTab, setActiveBrandTab] = useState<"SOULMATE" | "ABU_ADEL">(initialBrand);

  // Order Mode: Soulmate supports DINE_IN | TAKEAWAY | DELIVERY; Abu Adel supports ONLY DELIVERY | TAKEAWAY
  const initialMode: "DINE_IN" | "TAKEAWAY" | "DELIVERY" =
    initialBrand === "ABU_ADEL"
      ? paramMode?.toLowerCase() === "takeaway"
        ? "TAKEAWAY"
        : "DELIVERY"
      : paramMode?.toLowerCase() === "delivery"
      ? "DELIVERY"
      : paramMode?.toLowerCase() === "takeaway"
      ? "TAKEAWAY"
      : "DINE_IN";

  const [orderMode, setOrderMode] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">(initialMode);

  // Table State (STRICTLY Soulmate DINE_IN only)
  const [tableNumber, setTableNumber] = useState<string>(paramTable || "");
  const [showTableModal, setShowTableModal] = useState<boolean>(
    initialBrand === "SOULMATE" && initialMode === "DINE_IN" && !paramTable
  );
  const [tempTableInput, setTempTableInput] = useState<string>(paramTable || "");

  // Digital Waiter / Greeting Banner
  const [showWaiterGreeting, setShowWaiterGreeting] = useState<boolean>(true);

  // Core Data
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Separate Carts per Brand so Soulmate Coffee & Abu Adel Sweets never mix unintentionally
  const [cartsByBrand, setCartsByBrand] = useState<{ SOULMATE: any[]; ABU_ADEL: any[] }>({
    SOULMATE: [],
    ABU_ADEL: [],
  });
  const cart = cartsByBrand[activeBrandTab];

  const setCart = (updater: any[] | ((prev: any[]) => any[])) => {
    setCartsByBrand((prev) => ({
      ...prev,
      [activeBrandTab]: typeof updater === "function" ? updater(prev[activeBrandTab]) : updater,
    }));
  };

  // Customer & Delivery Checkout Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Checkout Modal (Review + Auth Gate for Delivery + Confirm)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Tracked Order (Live Status + Receipt for Delivery / Takeaway)
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [showTrackerModal, setShowTrackerModal] = useState(false);

  // Active Open Table Check Tracking & Celebration Sound (Soulmate Dine-in)
  const [activeTableOrder, setActiveTableOrder] = useState<any>(null);
  const [showReadyModal, setShowReadyModal] = useState<boolean>(false);
  const [requestingBill, setRequestingBill] = useState<boolean>(false);
  const lastOrderStatusRef = useRef<string | null>(null);

  // Customer Account Auth Modal (Register with Gmail OTP OR Quick Login by Phone)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"REGISTER" | "LOGIN">("REGISTER");
  const [authStep, setAuthStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState<any>(null);
  const [guestChatId, setGuestChatId] = useState<string>("");

  // Live Direct Chat Modal (Works independently for BOTH Soulmate AND Abu Adel!)
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Web Audio API Cheerful Chime
  const playCelebrationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];
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
      // silent
    }
  };

  // Enforce strict rule: Abu Adel NEVER allows DINE_IN
  const handleSwitchBrand = (brand: "SOULMATE" | "ABU_ADEL") => {
    setActiveBrandTab(brand);
    setActiveCategory("ALL");
    setSearchQuery("");
    if (brand === "ABU_ADEL") {
      setShowTableModal(false);
      if (orderMode === "DINE_IN") {
        setOrderMode("DELIVERY");
      }
    }
  };

  // Load saved customer session, guest chat ID, and last active tracked order
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

    let gId = localStorage.getItem("abuadel_guest_chat_id");
    if (!gId) {
      gId = `GUEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem("abuadel_guest_chat_id", gId);
    }
    setGuestChatId(gId);

    const savedOrderId = localStorage.getItem("abuadel_active_tracked_order_id");
    if (savedOrderId) {
      fetch(`/api/orders?orderId=${encodeURIComponent(savedOrderId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.orders?.length > 0) {
            const ord = d.orders[0];
            if (ord.status !== "COMPLETED" && ord.status !== "CANCELLED") {
              setTrackedOrder(ord);
            } else {
              localStorage.removeItem("abuadel_active_tracked_order_id");
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Load Initial Data (Outlets, Tables, Menu, Settings, Delivery Zones)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resOutlets, resTables, resMenu, resSettings, resZones] = await Promise.all([
          fetch("/api/outlets"),
          fetch("/api/tables"),
          fetch("/api/menu"),
          fetch("/api/settings"),
          fetch("/api/delivery-zones"),
        ]);

        const [dataOutlets, dataTables, dataMenu, dataSettings, dataZones] = await Promise.all([
          resOutlets.json(),
          resTables.json(),
          resMenu.json(),
          resSettings.json(),
          resZones.json(),
        ]);

        if (dataOutlets.success) setOutlets(dataOutlets.outlets);
        if (dataTables.success) setTables(dataTables.tables);
        if (dataMenu.success) setMenuItems(dataMenu.items);
        if (dataSettings.success) setSettings(dataSettings.settings);
        if (dataZones.success && dataZones.zones?.length > 0) {
          setDeliveryZones(dataZones.zones);
          setSelectedZoneId((prev) => prev || dataZones.zones[0].id);
        }
      } catch (e) {
        console.error(e);
        showToast("error", "حدث خطأ أثناء تحميل بيانات المنيو");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Poll Active Table Order (Strictly Soulmate Dine-in)
  useEffect(() => {
    if (activeBrandTab !== "SOULMATE" || orderMode !== "DINE_IN" || !tableNumber) return;

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
  }, [tableNumber, orderMode, activeBrandTab]);

  // Poll Live Tracked Delivery/Takeaway Order Status
  useEffect(() => {
    if (!trackedOrder?.id) return;
    if (trackedOrder.status === "COMPLETED" || trackedOrder.status === "CANCELLED") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders?orderId=${encodeURIComponent(trackedOrder.id)}`);
        const data = await res.json();
        if (data.success && data.orders?.length > 0) {
          const updated = data.orders[0];
          if (updated.status !== trackedOrder.status) {
            if (updated.status === "OUT_FOR_DELIVERY") {
              playCelebrationChime();
              showToast("info", `طلبك خرج الآن مع الطيار (${updated.driverName || "مندوب التوصيل"}) في الطريق إليك 🛵`);
            } else if (updated.status === "READY_TO_SERVE") {
              playCelebrationChime();
              showToast("success", "طلبك جاهز الآن! 🎉");
            } else if (updated.status === "COMPLETED") {
              localStorage.removeItem("abuadel_active_tracked_order_id");
              showToast("success", "تم تسليم طلبك بنجاح! بالهنا والشفا ❤️");
            }
          }
          setTrackedOrder(updated);
        }
      } catch {
        // silent
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [trackedOrder?.id, trackedOrder?.status]);

  // Active Outlet ID for Chat & Orders
  const activeOutletObj =
    activeBrandTab === "ABU_ADEL"
      ? outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")
      : outlets.find((o) => o.code === "SOULMATE_CAFE");

  const activeThreadPhone = loggedInCustomer?.phone || customerPhone.trim() || guestChatId;

  // Poll Direct Chat Messages scoped specifically to active Brand & this customer's thread/table
  useEffect(() => {
    if (!showChatModal || !activeOutletObj?.id) return;

    const fetchChat = async () => {
      try {
        const params = new URLSearchParams({ outletId: activeOutletObj.id });
        if (activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" && tableNumber) {
          params.set("tableNumber", tableNumber);
        } else if (activeThreadPhone) {
          params.set("customerPhone", activeThreadPhone);
        }

        const res = await fetch(`/api/chat?${params.toString()}`);
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
    const interval = setInterval(fetchChat, 3500);
    return () => clearInterval(interval);
  }, [showChatModal, activeOutletObj?.id, activeBrandTab, orderMode, tableNumber, activeThreadPhone]);

  // Request Bill Handler (Soulmate Dine-in)
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

  // Cart Functions
  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
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
          image: item.image,
          outletCode: item.outlet?.code,
        },
      ];
    });
    showToast("success", `تمت إضافة ${item.nameAr} للسلة 🛒`);
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

  // Financials with Dynamic Delivery Zone Fee
  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId) || deliveryZones[0];
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee =
    orderMode === "DELIVERY" ? (selectedZone ? Number(selectedZone.fee) : settings?.deliveryFee || 20) : 0;
  const serviceCharge =
    activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" && settings?.isServiceChargeEnabled
      ? (subtotal * (settings.serviceChargePercent || 12)) / 100
      : 0;
  const taxAmount = settings?.isTaxEnabled ? (subtotal * (settings.taxPercent || 14)) / 100 : 0;
  const finalAmount = Math.max(0, subtotal + serviceCharge + taxAmount + deliveryFee);

  // Open Checkout Step (Clean Auth + Delivery Address Verification)
  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      showToast("error", "سلة الطلبات فارغة، اختر أصنافك أولاً");
      return;
    }
    if (activeBrandTab === "SOULMATE" && orderMode === "DINE_IN") {
      if (!tableNumber.trim()) {
        setShowTableModal(true);
        showToast("error", "برجاء تحديد رقم الترابيزة أولاً");
        return;
      }
      // For Dine-in Soulmate, open Checkout confirmation or submit directly
      handleSubmitOrder();
      return;
    }
    setShowCheckoutModal(true);
  };

  // Final Order Submission
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    const isAbuAdel = activeBrandTab === "ABU_ADEL";
    const actualOrderType = isAbuAdel
      ? orderMode === "DELIVERY"
        ? "DELIVERY"
        : "TAKEAWAY"
      : orderMode;

    if (actualOrderType === "DINE_IN" && !tableNumber.trim()) {
      setShowTableModal(true);
      showToast("error", "برجاء تأكيد رقم الترابيزة أولاً");
      return;
    }

    if (actualOrderType === "DELIVERY") {
      if (!customerPhone.trim() || !deliveryAddress.trim()) {
        showToast("error", "برجاء كتابة رقم الموبايل وعنوان التوصيل بالتفصيل");
        return;
      }
      if (deliveryZones.length > 0 && !selectedZoneId) {
        showToast("error", "برجاء اختيار منطقة التوصيل أولاً");
        return;
      }
    }

    if (actualOrderType === "TAKEAWAY" && !customerPhone.trim()) {
      showToast("error", "برجاء كتابة رقم الموبايل لتأكيد طلب الاستلام");
      return;
    }

    try {
      setSubmittingOrder(true);
      const targetOutlet =
        activeOutletObj?.id || outlets[0]?.id;
      const matchedTable =
        actualOrderType === "DINE_IN"
          ? tables.find(
              (t) =>
                t.tableNumber === tableNumber ||
                t.tableNumber === `T-${tableNumber.padStart(2, "0")}`
            )
          : null;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutlet,
          orderType: actualOrderType,
          tableId: actualOrderType === "DINE_IN" ? matchedTable?.id : null,
          tableNumber: actualOrderType === "DINE_IN" ? tableNumber : null,
          deliveryZoneId: actualOrderType === "DELIVERY" ? selectedZone?.id || null : null,
          deliveryZoneName: actualOrderType === "DELIVERY" ? selectedZone?.nameAr || null : null,
          deliveryFee: actualOrderType === "DELIVERY" ? deliveryFee : 0,
          items: cart,
          customerName:
            customerName.trim() ||
            (isAbuAdel ? "عميل حلواني أبو عادل" : "عميل سول ميت كافيه"),
          customerPhone: customerPhone.trim() || null,
          deliveryAddress: actualOrderType === "DELIVERY" ? deliveryAddress.trim() : null,
          deliveryPhone: actualOrderType === "DELIVERY" ? customerPhone.trim() : null,
          notes: orderNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCart([]);
        setShowCheckoutModal(false);
        // Save customer address locally too
        if (loggedInCustomer) {
          const updatedCust = {
            ...loggedInCustomer,
            name: customerName.trim() || loggedInCustomer.name,
            address: deliveryAddress.trim() || loggedInCustomer.address,
            city: selectedZone?.nameAr || loggedInCustomer.city,
          };
          setLoggedInCustomer(updatedCust);
          localStorage.setItem("abuadel_customer_session", JSON.stringify(updatedCust));
        }

        if (actualOrderType === "DINE_IN") {
          showToast("success", "تم إرسال طلبك فوراً لشاشة الباريستا وبدأ التحضير! ☕🎉");
          setActiveTableOrder(data.order);
        } else {
          setTrackedOrder(data.order);
          localStorage.setItem("abuadel_active_tracked_order_id", data.order.id);
          setShowTrackerModal(true);
          showToast(
            "success",
            isAbuAdel
              ? "تم استلام طلبك بنجاح في حلواني أبو عادل وجاري تجهيزه! 🍰🛵"
              : "تم استلام طلبك بنجاح في سول ميت كافيه! ☕🛵"
          );
        }
      } else {
        showToast("error", data.error || "فشل إرسال الطلب، يرجى المحاولة ثانية");
      }
    } catch {
      showToast("error", "حدث خطأ في الاتصال بالشبكة، حاول مجدداً");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Send Direct Chat Message to Active Outlet (Soulmate OR Abu Adel)
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    try {
      setSendingChat(true);
      const targetOutlet = activeOutletObj?.id || outlets[0]?.id;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutlet,
          senderType: "CUSTOMER",
          senderName:
            customerName.trim() ||
            loggedInCustomer?.name ||
            (activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" && tableNumber
              ? `ترابيزة ${tableNumber}`
              : orderMode === "DELIVERY"
              ? "عميل دليفري"
              : "عميل تيك أواي"),
          senderPhone: activeThreadPhone || null,
          tableNumber:
            activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" ? tableNumber : null,
          orderNumber: trackedOrder?.orderNumber || activeTableOrder?.orderNumber || null,
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
      showToast("error", "فشل إرسال الرسالة، يرجى المحاولة مجدداً");
    } finally {
      setSendingChat(false);
    }
  };

  // Customer Register with Gmail OTP
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPhone.trim() || !authEmail.trim() || !authName.trim()) {
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
        showToast("success", `أهلاً بك يا ${data.customer.name}! تم تفعيل حسابك بنجاح ⭐`);
      } else {
        showToast("error", data.error || "كود التحقق غير صحيح");
      }
    } catch {
      showToast("error", "حدث خطأ أثناء التحقق");
    } finally {
      setAuthLoading(false);
    }
  };

  // Customer Quick Phone Login (Returning Users)
  const handleQuickCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPhone.trim()) {
      showToast("error", "برجاء إدخال رقم الموبايل المسجل");
      return;
    }
    try {
      setAuthLoading(true);
      const res = await fetch("/api/customers/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOGIN",
          phone: authPhone.trim(),
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
        showToast("success", `مرحباً بعودتك يا ${data.customer.name}! ⭐`);
      } else {
        showToast("error", data.error || "رقم الهاتف غير مسجل بعد");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem("abuadel_customer_session");
    setLoggedInCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    showToast("info", "تم تسجيل الخروج من حساب العميل");
  };

  // Filtered Menu Items strictly matching selected Brand Tab
  const filteredItems = menuItems.filter((item) => {
    const isSoulmateItem =
      item.outlet?.code === "SOULMATE_CAFE" || item.itemType === "PREPARED_BEVERAGE";
    const matchesBrand = activeBrandTab === "SOULMATE" ? isSoulmateItem : !isSoulmateItem;
    if (!matchesBrand) return false;
    if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.nameAr?.toLowerCase().includes(q) ||
        item.nameEn?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Delivery/Takeaway Tracker Status Helper
  const getOrderStageInfo = (status: string) => {
    switch (status) {
      case "NEW_PENDING":
        return { step: 1, label: "تم استلام الطلب وبانتظار التجهيز", color: "text-amber-400" };
      case "PREPARING":
        return { step: 2, label: "جاري تجهيز وتغليف طلبك الآن 📦", color: "text-sky-400" };
      case "READY_TO_SERVE":
        return {
          step: 3,
          label:
            trackedOrder?.orderType === "DELIVERY"
              ? "طلبك جاهز وبانتظار خروج الطيار 🛵"
              : "طلبك جاهز للاستلام الآن! 🎉",
          color: "text-emerald-400",
        };
      case "OUT_FOR_DELIVERY":
        return {
          step: 4,
          label: `طلبك في الطريق إليك مع الطيار: ${trackedOrder?.driverName || "مندوب التوصيل"} 🛵`,
          color: "text-purple-400",
        };
      case "COMPLETED":
        return { step: 5, label: "تم التسليم بنجاح • بالهنا والشفا ❤️", color: "text-emerald-400" };
      default:
        return { step: 1, label: "قيد المتابعة", color: "text-slate-300" };
    }
  };

  return (
    <div
      className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black pb-28"
      dir="rtl"
    >
      {/* 1. TOP HEADER & BRAND BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          {/* Back to Home + Brand Title */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-black transition shadow-sm"
              title="العودة للصفحة الرئيسية للموقع"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Link>

            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shadow-lg ${
                activeBrandTab === "SOULMATE"
                  ? "bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-amber-500/20"
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20"
              }`}
            >
              {activeBrandTab === "SOULMATE" ? "S" : "ع"}
            </div>

            <div>
              <h1 className="text-xs sm:text-sm font-black text-white leading-tight">
                {activeBrandTab === "SOULMATE" ? "سول ميت كافيه VIP" : "حلواني أبو عادل"}
              </h1>

              {/* Active Mode Badge */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" ? (
                  <button
                    onClick={() => setShowTableModal(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 transition cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      ترابيزة: {tableNumber ? tableNumber : "حدد الترابيزة"} ✏️
                    </span>
                  </button>
                ) : orderMode === "DELIVERY" ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Truck className="w-3 h-3" />
                    <span>
                      دليفري {selectedZone ? `(${selectedZone.nameAr})` : ""} 🛵
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/30">
                    <Store className="w-3 h-3" />
                    <span>تيك أواي • استلام من الفرع 🛍️</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Order Mode Switcher + Customer Account */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher strictly separated by brand */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
              {activeBrandTab === "SOULMATE" && (
                <button
                  onClick={() => setOrderMode("DINE_IN")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    orderMode === "DINE_IN"
                      ? "bg-amber-500 text-black shadow font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  صالة
                </button>
              )}

              <button
                onClick={() => {
                  setOrderMode("TAKEAWAY");
                  setShowTableModal(false);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  orderMode === "TAKEAWAY"
                    ? "bg-sky-600 text-white shadow font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {activeBrandTab === "ABU_ADEL" ? "استلام من الفرع" : "تيك أواي"}
              </button>

              <button
                onClick={() => {
                  setOrderMode("DELIVERY");
                  setShowTableModal(false);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  orderMode === "DELIVERY"
                    ? "bg-emerald-600 text-white shadow font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                دليفري 🛵
              </button>
            </div>

            {/* Account Button */}
            {loggedInCustomer ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate max-w-[75px]">{loggedInCustomer.name}</span>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 rounded-full">
                    {loggedInCustomer.loyaltyPoints || 0}★
                  </span>
                </button>
                <button
                  onClick={handleCustomerLogout}
                  className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition cursor-pointer"
                  title="تسجيل الخروج من حسابي"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthTab("REGISTER");
                  setAuthStep("DETAILS");
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>دخول / تسجيل</span>
              </button>
            )}
          </div>
        </div>

        {/* Brand Switcher Bar + Direct Chat Button for BOTH Shops */}
        <div className="bg-slate-900/70 border-t border-slate-800/80 px-3 sm:px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between py-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSwitchBrand("SOULMATE")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeBrandTab === "SOULMATE"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white bg-slate-950/50 border border-slate-800"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>☕ سول ميت كافيه</span>
                {cartsByBrand.SOULMATE.length > 0 && (
                  <span className="bg-black text-amber-400 px-1.5 rounded-full text-[10px]">
                    {cartsByBrand.SOULMATE.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSwitchBrand("ABU_ADEL")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeBrandTab === "ABU_ADEL"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-400 hover:text-white bg-slate-950/50 border border-slate-800"
                }`}
              >
                <Cake className="w-3.5 h-3.5" />
                <span>🍰 حلواني أبو عادل</span>
                {cartsByBrand.ABU_ADEL.length > 0 && (
                  <span className="bg-white text-emerald-700 px-1.5 rounded-full text-[10px]">
                    {cartsByBrand.ABU_ADEL.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Track Button if there's an active delivery/takeaway order */}
              {trackedOrder && (
                <button
                  onClick={() => setShowTrackerModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 animate-pulse transition cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>تتبع طلبك #{trackedOrder.orderNumber}</span>
                </button>
              )}

              {/* Direct Live Chat Trigger for BOTH Shops */}
              <button
                onClick={() => setShowChatModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  activeBrandTab === "SOULMATE"
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>
                  {activeBrandTab === "SOULMATE"
                    ? "شات الباريستا والكافيه 💬"
                    : "شات حلواني أبو عادل 💬"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 w-full space-y-4">
        {/* WELCOME BANNER */}
        {showWaiterGreeting && (
          <div
            className={`border rounded-2xl p-4 shadow-xl relative overflow-hidden ${
              activeBrandTab === "SOULMATE"
                ? "bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40"
                : "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40"
            }`}
          >
            <button
              onClick={() => setShowWaiterGreeting(false)}
              className="absolute left-3 top-3 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              title="إغلاق الترحيب"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl flex-shrink-0 shadow ${
                  activeBrandTab === "SOULMATE"
                    ? "bg-amber-500/20 border-amber-500/40"
                    : "bg-emerald-500/20 border-emerald-500/40"
                }`}
              >
                {activeBrandTab === "SOULMATE" ? "🤵🏻‍♂️" : "🍰"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`text-sm font-black ${
                      activeBrandTab === "SOULMATE" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {activeBrandTab === "SOULMATE"
                      ? "كابتن زياد (سول ميت كافيه VIP)"
                      : "حلواني أبو عادل • الطلب الأونلاين والدليفري"}
                  </h3>
                  <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-full font-bold">
                    خدمة فورية ومباشرة
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeBrandTab === "SOULMATE" ? (
                    <>
                      يا أهلاً بك في <span className="text-amber-400 font-bold">سول ميت كافيه VIP</span>!
                      يمكنك الطلب من <strong className="text-white">الترابيزة</strong> أو{" "}
                      <strong className="text-white">تيك أواي</strong> أو{" "}
                      <strong className="text-white">دليفري</strong> لأي منطقة. ولو عندك أي طلب خاص تواصل مع الباريستا مباشرة في الشات! ☕✨
                    </>
                  ) : (
                    <>
                      أهلاً بك في <span className="text-emerald-400 font-bold">حلواني أبو عادل</span>!
                      توصيل دليفري سريع لأي منطقة أو استلام فوري من الفرع (بدون صالة). أضف حلوياتك المفضلة واختر منطقتك لحساب مصاريف التوصيل فوراً! 🍰🛵
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DYNAMIC DELIVERY ZONE SELECTOR BANNER (Shown whenever orderMode === "DELIVERY") */}
        {orderMode === "DELIVERY" && (
          <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-4 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    اختر منطقة التوصيل لمعرفة مصاريف الدليفري فوراً:
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    التوصيل متاح لجميع المناطق • تتحدد رسوم التوصيل تلقائياً حسب منطقتك
                  </p>
                </div>
              </div>

              {selectedZone && (
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-300">رسوم التوصيل:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {selectedZone.fee} ج.م
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({selectedZone.estimatedTime})
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black border border-emerald-500/40 text-white text-xs font-bold focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {deliveryZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    📍 {z.nameAr} — التوصيل: {z.fee} ج.م ({z.estimatedTime})
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="العنوان التفصيلي (الشارع، العمارة، الشقة)..."
                className="w-full py-2.5 px-3 rounded-xl bg-black border border-slate-700 text-white text-xs font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}

        {/* ACTIVE OPEN TABLE CHECK WIDGET (Strictly Soulmate Dine-in) */}
        {activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" && activeTableOrder && (
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

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs font-mono">
              {(() => {
                let parsed: any[] = [];
                try {
                  parsed =
                    typeof activeTableOrder.items === "string"
                      ? JSON.parse(activeTableOrder.items)
                      : activeTableOrder.items;
                } catch {
                  parsed = [];
                }
                return parsed.map((it: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-slate-300 py-0.5 border-b border-white/5"
                  >
                    <span className="font-sans font-bold">
                      {it.nameAr || it.name} ×{it.qty || 1}
                    </span>
                    <span className="text-amber-300 font-bold">
                      {Number(it.price) * Number(it.qty || 1)} ج
                    </span>
                  </div>
                ));
              })()}
            </div>

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

        {/* TABLE CONFIRMATION CARD (Strictly Soulmate Dine-in Only) */}
        {activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-4 shadow-lg flex-wrap">
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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-500/30 transition shadow cursor-pointer"
            >
              {tableNumber ? "تغيير رقم الترابيزة ✏️" : "أدخل رقم الترابيزة الآن 📍"}
            </button>
          </div>
        )}

        {/* SEARCH BAR & CATEGORY FILTER PILLS */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeBrandTab === "SOULMATE"
                  ? "ابحث في منيو سول ميت (قهوة، لاتيه، بان كيك...)"
                  : "ابحث في حلويات أبو عادل (كنافة، بسبوسة، تورتة، جاتوه...)"
              }
              className="w-full py-2 pr-9 pl-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-bold"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategory === "ALL"
                  ? "bg-white text-slate-950 shadow font-black"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              الكل
            </button>

            {(activeBrandTab === "SOULMATE" ? SOULMATE_CATEGORIES : ABU_ADEL_CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const inCart = cart.find((i) => i.menuItemId === item.id);
            const fallbackImage =
              item.itemType === "READY_PASTRY"
                ? "/products/nawaem-mix-real.webp"
                : "/products/cafe-cappuccino.webp";
            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 shadow group"
              >
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

        {/* Orca Tech Signature Footer */}
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
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">
                  {cart.reduce((s, i) => s + i.qty, 0)} أصناف
                </span>
                {activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" ? (
                  <span className="text-amber-400 font-bold">ترابيزة {tableNumber || "-"}</span>
                ) : orderMode === "DELIVERY" ? (
                  <span className="text-emerald-400 font-bold">
                    دليفري ({selectedZone ? `${selectedZone.nameAr} +${deliveryFee} ج` : `+${deliveryFee} ج`})
                  </span>
                ) : (
                  <span className="text-sky-400 font-bold">استلام من الفرع (تيك أواي)</span>
                )}
              </div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {finalAmount.toFixed(2)} <span className="text-xs font-normal text-slate-400">ج.م</span>
              </div>
            </div>

            <button
              onClick={handleProceedToCheckout}
              disabled={submittingOrder}
              className={`flex items-center gap-2 font-black text-xs sm:text-sm px-5 sm:px-6 py-3 rounded-2xl shadow-xl transition cursor-pointer disabled:opacity-50 ${
                activeBrandTab === "SOULMATE"
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25"
                  : "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {activeBrandTab === "SOULMATE" && orderMode === "DINE_IN"
                  ? activeTableOrder
                    ? `إضافة للشيك المفتوح (+${finalAmount.toFixed(0)} ج.م)`
                    : "إرسال للباريستا الآن ☕"
                  : "مراجعة وتأكيد الطلب 🛍️"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. MODALS */}

      {/* MODAL 1: TABLE ENTRY MODAL (STRICTLY SOULMATE DINE_IN ONLY!) */}
      {showTableModal && activeBrandTab === "SOULMATE" && orderMode === "DINE_IN" && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120d14] border-2 border-amber-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-4">
            <button
              onClick={() => setShowTableModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto shadow">
              📍
            </div>

            <div>
              <h3 className="text-base font-black text-white">تأكيد رقم الترابيزة في الصالة</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                اكتب رقم الترابيزة المكتوب أمامك على الستاند أو اختره مباشرة:
              </p>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="مثال: 1 أو 2 أو 3"
              value={tempTableInput}
              onChange={(e) => setTempTableInput(e.target.value)}
              className="w-full text-center py-2.5 px-4 rounded-xl bg-black border-2 border-amber-500/50 text-white font-mono font-black text-base focus:outline-none focus:border-amber-400 shadow-inner"
            />

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
              تأكيد والبدء باختيار المشروبات ☕
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: DELIVERY & TAKEAWAY CHECKOUT MODAL (With Integrated Auth + Dynamic Zone + Receipt Summary) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#120d14] border-2 border-emerald-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-4 my-6">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xl">
                {orderMode === "DELIVERY" ? "🛵" : "🛍️"}
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {orderMode === "DELIVERY"
                    ? `تأكيد طلب الدليفري (${activeBrandTab === "ABU_ADEL" ? "حلواني أبو عادل" : "سول ميت كافيه"})`
                    : `تأكيد طلب الاستلام من الفرع (${activeBrandTab === "ABU_ADEL" ? "حلواني أبو عادل" : "سول ميت كافيه"})`}
                </h3>
                <p className="text-xs text-slate-400">
                  {orderMode === "DELIVERY"
                    ? "راجع أصنافك وأكمل بيانات المنطقة والعنوان ليتم تجهيز طلبك وإرساله مع الطيار"
                    : "راجع أصنافك وسجل رقم موبايلك لتأكيد التجهيز السريع"}
                </p>
              </div>
            </div>

            {/* IF DELIVERY & NOT LOGGED IN: Offer Seamless Registration/Login right here! */}
            {orderMode === "DELIVERY" && !loggedInCustomer ? (
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>سجل حسابك لإتمام طلب الدليفري وحفظ بياناتك:</span>
                  </span>
                  <div className="flex bg-black p-0.5 rounded-lg border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab("REGISTER");
                        setAuthStep("DETAILS");
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                        authTab === "REGISTER" ? "bg-amber-500 text-black" : "text-slate-400"
                      }`}
                    >
                      حساب جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthTab("LOGIN")}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                        authTab === "LOGIN" ? "bg-emerald-500 text-black" : "text-slate-400"
                      }`}
                    >
                      لدي حساب (بالموبايل)
                    </button>
                  </div>
                </div>

                {authTab === "REGISTER" ? (
                  authStep === "DETAILS" ? (
                    <form onSubmit={handleCustomerRegister} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="الاسم بالكامل *"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="رقم الموبايل *"
                          value={authPhone}
                          onChange={(e) => setAuthPhone(e.target.value)}
                          className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="البريد الإلكتروني (Gmail) لاستلام كود التحقق *"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {authLoading ? "جارٍ إرسال كود التحقق..." : "إرسال كود التحقق وتفعيل الحساب ✉️"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-2.5 text-xs">
                      <p className="text-[11px] text-emerald-300 text-center">
                        تم إرسال كود التحقق السري إلى: <strong>{authEmail}</strong>
                      </p>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        placeholder="أدخل كود الـ 6 أرقام..."
                        value={authOtp}
                        onChange={(e) => setAuthOtp(e.target.value)}
                        className="w-full text-center py-2.5 bg-black border-2 border-amber-500/50 rounded-xl text-white font-mono text-lg tracking-widest focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer"
                      >
                        {authLoading ? "جارٍ التحقق..." : "تأكيد الكود والمتابعة للعنوان ✅"}
                      </button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handleQuickCustomerLogin} className="space-y-2.5 text-xs">
                    <input
                      type="tel"
                      required
                      placeholder="أدخل رقم الموبايل المسجل مسبقاً (مثال: 010...)"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer"
                    >
                      {authLoading ? "جارٍ الدخول..." : "دخول سريع ومتابعة الطلب ✅"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* LOGGED IN OR TAKEAWAY: Show Delivery / Pickup Form + Receipt Summary */
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="اسم العميل..."
                      className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                      رقم الموبايل *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {orderMode === "DELIVERY" && (
                  <>
                    <div>
                      <label className="text-[11px] text-emerald-300 block mb-1 font-bold">
                        منطقة التوصيل (مصاريف التوصيل تتحدث تلقائياً) *
                      </label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        {deliveryZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            📍 {z.nameAr} — التوصيل: {z.fee} ج.م ({z.estimatedTime})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                        العنوان بالتفصيل (الشارع، رقم العمارة، الدور، علامة مميزة) *
                      </label>
                      <textarea
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="اكتب عنوان التوصيل بالكامل..."
                        className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                    ملاحظات إضافية (اختياري):
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="مثال: تغليف هدايا، كتابة اسم على التورتة، اتصل قبل الوصول..."
                    className="w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Live Receipt Preview */}
                <div className="bg-black/60 border border-white/10 rounded-2xl p-3 space-y-2">
                  <div className="text-[11px] font-black text-amber-300 border-b border-white/10 pb-1">
                    ملخص الفاتورة ({cart.reduce((s, i) => s + i.qty, 0)} أصناف):
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px]">
                    {cart.map((c) => (
                      <div key={c.menuItemId} className="flex justify-between text-slate-300">
                        <span>
                          {c.nameAr} ×{c.qty}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {(c.price * c.qty).toFixed(2)} ج
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>المجموع الفرعي:</span>
                      <span className="font-mono">{subtotal.toFixed(2)} ج.م</span>
                    </div>
                    {orderMode === "DELIVERY" && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>مصاريف التوصيل ({selectedZone?.nameAr}):</span>
                        <span className="font-mono">+{deliveryFee.toFixed(2)} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-amber-400 border-t border-white/10 pt-1">
                      <span>الإجمالي النهائي المطلوب:</span>
                      <span className="font-mono">{finalAmount.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submittingOrder}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl transition cursor-pointer disabled:opacity-50"
                >
                  {submittingOrder
                    ? "جاري تأكيد وإرسال الطلب..."
                    : orderMode === "DELIVERY"
                    ? `تأكيد وإرسال طلب الدليفري الآن (${finalAmount.toFixed(2)} ج.م) 🛵`
                    : `تأكيد طلب الاستلام من المحل (${finalAmount.toFixed(2)} ج.م) 🛍️`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: LIVE DELIVERY & TAKEAWAY ORDER TRACKER + RECEIPT */}
      {showTrackerModal && trackedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#120d14] border-2 border-emerald-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4 my-6">
            <button
              onClick={() => setShowTrackerModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto animate-bounce">
                {trackedOrder.orderType === "DELIVERY" ? "🛵" : "🛍️"}
              </div>
              <h3 className="text-lg font-black text-white">تم استلام طلبك بنجاح!</h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-black">
                <span>رقم الطلب: {trackedOrder.orderNumber}</span>
                <span>•</span>
                <span>
                  {trackedOrder.outlet?.code === "ABU_ADEL_PATISSERIE"
                    ? "حلواني أبو عادل"
                    : "سول ميت كافيه"}
                </span>
              </div>
            </div>

            {/* Live Stage Stepper */}
            {(() => {
              const info = getOrderStageInfo(trackedOrder.status);
              const steps =
                trackedOrder.orderType === "DELIVERY"
                  ? [
                      { s: 1, label: "تم الاستلام" },
                      { s: 2, label: "جاري التجهيز" },
                      { s: 3, label: "جاهز للطيار" },
                      { s: 4, label: "في الطريق إليك" },
                    ]
                  : [
                      { s: 1, label: "تم الاستلام" },
                      { s: 2, label: "جاري التجهيز" },
                      { s: 3, label: "جاهز للاستلام" },
                    ];

              return (
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className={`text-xs font-black text-center ${info.color}`}>
                    {info.label}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {steps.map((st) => (
                      <div key={st.s} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full h-2 rounded-full transition-all ${
                            info.step >= st.s ? "bg-emerald-500 shadow shadow-emerald-500/40" : "bg-slate-800"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold ${
                            info.step >= st.s ? "text-emerald-300" : "text-slate-500"
                          }`}
                        >
                          {st.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {trackedOrder.driverName && (
                    <div className="text-center text-[11px] text-purple-300 font-bold bg-purple-500/10 border border-purple-500/30 rounded-xl py-1.5">
                      🛵 الطيار المكلف: {trackedOrder.driverName}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Customer Receipt Details */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-2 text-xs">
              {trackedOrder.deliveryZoneName && (
                <div className="flex justify-between text-emerald-300 font-bold">
                  <span>منطقة التوصيل:</span>
                  <span>{trackedOrder.deliveryZoneName}</span>
                </div>
              )}
              {trackedOrder.deliveryAddress && (
                <div className="text-[11px] text-slate-300 border-b border-white/10 pb-2">
                  📍 العنوان: {trackedOrder.deliveryAddress}
                </div>
              )}

              <div className="space-y-1 max-h-28 overflow-y-auto py-1">
                {(() => {
                  let parsed: any[] = [];
                  try {
                    parsed =
                      typeof trackedOrder.items === "string"
                        ? JSON.parse(trackedOrder.items)
                        : trackedOrder.items;
                  } catch {
                    parsed = [];
                  }
                  return parsed.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>
                        {it.nameAr} ×{it.qty || 1}
                      </span>
                      <span className="font-mono">{Number(it.price) * Number(it.qty || 1)} ج</span>
                    </div>
                  ));
                })()}
              </div>

              <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>قيمة الأصناف:</span>
                  <span className="font-mono">{trackedOrder.subtotal} ج.م</span>
                </div>
                {trackedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>مصاريف الدليفري:</span>
                    <span className="font-mono">+{trackedOrder.deliveryFee} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-amber-400 pt-1 border-t border-white/10">
                  <span>الإجمالي الكلي:</span>
                  <span className="font-mono">{trackedOrder.finalAmount} ج.م</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowTrackerModal(false);
                  setShowChatModal(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل شات مع المحل</span>
              </button>
              <button
                onClick={() => setShowTrackerModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer"
              >
                متابعة التصفح 🍰☕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LIVE DIRECT CHAT MODAL (Scoped to Soulmate OR Abu Adel!) */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md h-[520px] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${
                    activeBrandTab === "SOULMATE"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {activeBrandTab === "SOULMATE" ? "☕" : "🍰"}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">
                    {activeBrandTab === "SOULMATE"
                      ? "شات مباشر مع كافيه سول ميت والباريستا"
                      : "شات مباشر مع خدمة عملاء حلواني أبو عادل"}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {activeBrandTab === "SOULMATE" && orderMode === "DINE_IN"
                      ? `ترابيزة: ${tableNumber || "غير محدد"} • رد فوري`
                      : `${customerPhone || loggedInCustomer?.name || "طلب أونلاين"} • رد مباشر`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div
                className={`p-3 rounded-2xl border text-center text-[11px] ${
                  activeBrandTab === "SOULMATE"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                }`}
              >
                {activeBrandTab === "SOULMATE"
                  ? "أهلاً بك في سول ميت! ابعت أي ملاحظة للباريستا (سكر برة، تلج إضافي، تجهيز الشيك) وهنرد عليك فوراً."
                  : "أهلاً بك في حلواني أبو عادل! تواصل معنا فوراً للاستفسار عن طلبات الدليفري، تجهيز التورت الخاصة، أو متابعة الطيار."}
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
                        : activeBrandTab === "SOULMATE"
                        ? "bg-amber-500 text-black font-medium rounded-bl-none shadow"
                        : "bg-emerald-500 text-slate-950 font-medium rounded-bl-none shadow"
                    }`}
                  >
                    <div className="text-[10px] opacity-75 mb-0.5 font-bold">
                      {msg.senderType === "CUSTOMER"
                        ? msg.senderName
                        : activeBrandTab === "SOULMATE"
                        ? `${msg.senderName} (سول ميت) ☕`
                        : `${msg.senderName} (أبو عادل) 🍰`}
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

            <form
              onSubmit={handleSendChatMessage}
              className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2"
            >
              <input
                type="text"
                placeholder={
                  activeBrandTab === "SOULMATE"
                    ? "اكتب رسالتك للباريستا والكافيه..."
                    : "اكتب رسالتك لحلواني أبو عادل..."
                }
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={sendingChat || !newChatMessage.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                إرسال
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CUSTOMER AUTH & GMAIL OTP MODAL (Header Trigger) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120d14] border-2 border-amber-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xl mx-auto">
                ⭐
              </div>
              <h3 className="text-base font-black text-white">
                {loggedInCustomer
                  ? `أهلاً بك يا ${loggedInCustomer.name}`
                  : authStep === "OTP"
                  ? "تأكيد كود التحقق السري"
                  : "حساب العميل • دليفري وولاء"}
              </h3>
            </div>

            {loggedInCustomer ? (
              <div className="space-y-3 text-xs bg-black/50 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم الموبايل:</span>
                  <span className="font-mono font-bold text-white">{loggedInCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">البريد الإلكتروني:</span>
                  <span className="font-mono text-amber-300">{loggedInCustomer.email || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نقاط الولاء:</span>
                  <span className="font-black text-amber-400">{loggedInCustomer.loyaltyPoints || 0} ★</span>
                </div>
                <button
                  onClick={handleCustomerLogout}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer"
                >
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1 bg-black p-1 rounded-xl border border-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("REGISTER");
                      setAuthStep("DETAILS");
                    }}
                    className={`py-1.5 rounded-lg cursor-pointer ${
                      authTab === "REGISTER" ? "bg-amber-500 text-black font-black" : "text-slate-400"
                    }`}
                  >
                    حساب جديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab("LOGIN")}
                    className={`py-1.5 rounded-lg cursor-pointer ${
                      authTab === "LOGIN" ? "bg-emerald-500 text-black font-black" : "text-slate-400"
                    }`}
                  >
                    لدي حساب
                  </button>
                </div>

                {authTab === "LOGIN" ? (
                  <form onSubmit={handleQuickCustomerLogin} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">رقم الموبايل المسجل *</label>
                      <input
                        type="tel"
                        required
                        placeholder="010XXXXXXXX"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer"
                    >
                      {authLoading ? "جارٍ الدخول..." : "دخول سريع لحسابي ✅"}
                    </button>
                  </form>
                ) : authStep === "DETAILS" ? (
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
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow transition disabled:opacity-50 cursor-pointer"
                    >
                      {authLoading ? "جارٍ إرسال كود التحقق..." : "إرسال كود التحقق على الجي ميل ✉️"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 text-center">
                        أدخل كود الـ 6 أرقام المرسل لبريدك ({authEmail}):
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
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow transition disabled:opacity-50 cursor-pointer"
                    >
                      {authLoading ? "جارٍ التحقق..." : "تأكيد وتفعيل الحساب فوراً ⭐"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* CELEBRATORY ORDER READY MODAL (Soulmate Barista Dine-in) */}
      {showReadyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#120d14] border-2 border-emerald-500/70 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto animate-bounce shadow-lg shadow-emerald-500/20">
              ☕🎉
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">🎉 يا هلا بيك! طلبك جاهز الآن ☕🍰</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                تفضل بالتوجه لاستلام طلبك، بالهنا والشفا ❤️
              </p>
            </div>
            <button
              onClick={() => setShowReadyModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer"
            >
              تسلم إيدك! بالهنا والشفا ❤️
            </button>
          </div>
        </div>
      )}

      {/* FLOATING TOAST */}
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
