"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardQRModal from "@/components/CardQRModal";
import OrderRevisionModals, { RevisionModalMode } from "@/components/OrderRevisionModals";
import { PushOptInButton } from "@/components/PwaBootAndPushButton";
import { ThemeToggle } from "@/components/ThemeProviderAndToggle";
import {
  SOULMATE_CATEGORIES,
  ABU_ADEL_CATEGORIES,
  getCategoryLabel,
} from "@/lib/categories";
import {
  DEFAULT_OFFERS,
  OfferData,
  getItemDiscountPricing,
} from "@/lib/offers";
import {
  extractLoyaltyConfig,
  isLoyaltyActiveForOutlet,
  getLoyaltyProgress,
} from "@/lib/loyalty";
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
  Scale,
  MapPin,
  Truck,
  MessageCircle,
  Send,
  Phone,
  User,
  ShoppingBag,
  Package,
  Image as ImageIcon,
  Calendar,
  Gift,
  Tag,
  Edit3,
} from "lucide-react";

export default function PosTerminalPage() {
  const router = useRouter();

  // Current Staff User (Synchronous initial read to prevent 2-second glitch)
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved =
        localStorage.getItem("abuadel_soulmate_user") ||
        localStorage.getItem("abuadel_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active Outlet / Brand Tab in POS
  const [activeOutletId, setActiveOutletId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved =
        localStorage.getItem("abuadel_soulmate_user") ||
        localStorage.getItem("abuadel_auth_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u.outletId) return u.outletId;
      }
      return localStorage.getItem("activeOutletId") || "";
    } catch {
      return "";
    }
  });
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
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY" | "TALABAT">(() => {
    if (typeof window === "undefined") return "DINE_IN";
    try {
      const saved =
        localStorage.getItem("abuadel_soulmate_user") ||
        localStorage.getItem("abuadel_auth_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (
          u.outlet?.code === "ABU_ADEL_PATISSERIE" ||
          u.username?.includes("abuadel")
        ) {
          return "TAKEAWAY";
        }
      }
    } catch {}
    return "DINE_IN";
  });
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [posOrders, setPosOrders] = useState<any[]>([]);
  const [posChatMessages, setPosChatMessages] = useState<any[]>([]);
  const [showOnlineQueueModal, setShowOnlineQueueModal] = useState<boolean>(false);
  const [onlineZoneFilter, setOnlineZoneFilter] = useState<string>("ALL");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<string>("ACTIVE");
  const [driverNamesByOrder, setDriverNamesByOrder] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState<Record<string, string>>({});
  const [weightPickerItem, setWeightPickerItem] = useState<any>(null);
  const [customGramsInput, setCustomGramsInput] = useState<number>(500);
  const [editingFloat, setEditingFloat] = useState<boolean>(false);
  const [floatInput, setFloatInput] = useState<string>("0");
  const [showPosChatModal, setShowPosChatModal] = useState<boolean>(false);
  const [selectedChatThread, setSelectedChatThread] = useState<string>("ALL");
  const [posChatReply, setPosChatReply] = useState<string>("");
  const [posChatImage, setPosChatImage] = useState<string>("");
  const [uploadingPosChatImage, setUploadingPosChatImage] = useState<boolean>(false);
  const [previewPosImage, setPreviewPosImage] = useState<string | null>(null);
  const lastPendingCountRef = useRef<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "INSTAPAY" | "VODAFONE_CASH" | "TALABAT">("CASH");

  // Offers, Auto-Discount & Customer CRM / Loyalty in POS
  const [offers, setOffers] = useState<OfferData>(DEFAULT_OFFERS);
  const [posCustomer, setPosCustomer] = useState<any>(null);
  const [posCustomerProgress, setPosCustomerProgress] = useState<any>(null);
  const [redeemPosGift, setRedeemPosGift] = useState<boolean>(false);

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

  // Custom Weighed Sweet Box Builder (تكوين علبة مشكل بالوزن - ورقة الميزان)
  const [showBoxBuilderModal, setShowBoxBuilderModal] = useState<boolean>(false);
  const [boxName, setBoxName] = useState<string>("علبة مشكل رقم 1");
  const [customBoxesCount, setCustomBoxesCount] = useState<number>(0);
  const [boxComponents, setBoxComponents] = useState<Array<{ id: string; nameAr: string; pricePerKg: number; grams: number; subtotal: number }>>([]);
  const [boxSearchQuery, setBoxSearchQuery] = useState<string>("");
  const [selectedBoxItem, setSelectedBoxItem] = useState<any>(null);
  const [tempBoxGrams, setTempBoxGrams] = useState<number>(250);

  const handleOpenBoxBuilder = () => {
    setBoxName(`علبة مشكل رقم ${customBoxesCount + 1}`);
    setBoxComponents([]);
    setSelectedBoxItem(null);
    setTempBoxGrams(250);
    setBoxSearchQuery("");
    setShowBoxBuilderModal(true);
  };

  const handleAddBoxComponent = () => {
    if (!selectedBoxItem) {
      showToast("error", "اختر صنفاً من الحلويات أولاً");
      return;
    }
    if (!tempBoxGrams || tempBoxGrams <= 0) {
      showToast("error", "أدخل وزناً صحيحاً بالجرام");
      return;
    }

    const pricePerKg = Number(selectedBoxItem.price) || 0;
    const subtotal = Math.round((tempBoxGrams / 1000) * pricePerKg * 100) / 100;

    setBoxComponents((prev) => [
      ...prev,
      {
        id: selectedBoxItem.id,
        nameAr: selectedBoxItem.nameAr,
        pricePerKg,
        unitCost: Number(selectedBoxItem.costPrice || 0),
        grams: Number(tempBoxGrams),
        subtotal,
      },
    ]);

    showToast("success", `تمت إضافة ${tempBoxGrams} جم ${selectedBoxItem.nameAr} للعلبة (+${subtotal} ج) 👍`);
    setSelectedBoxItem(null);
    setTempBoxGrams(250);
  };

  const handleRemoveBoxComponent = (idx: number) => {
    setBoxComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmAddBoxToCart = () => {
    if (boxComponents.length === 0) {
      showToast("error", "العلبة فارغة! أضف صنفاً واحداً على الأقل بالوزن");
      return;
    }

    const totalWeightGrams = boxComponents.reduce((sum, c) => sum + c.grams, 0);
    const totalBoxPrice = boxComponents.reduce((sum, c) => sum + c.subtotal, 0);

    const newBoxCartItem = {
      menuItemId: `custom-box-${Date.now()}`,
      nameAr: `${boxName} (${(totalWeightGrams / 1000).toFixed(3)} كجم)`,
      nameEn: `Custom Sweet Box (${(totalWeightGrams / 1000).toFixed(2)} kg)`,
      price: Math.round(totalBoxPrice * 100) / 100,
      qty: 1,
      itemType: "READY_PASTRY",
      category: "ORIENTAL_SWEETS",
      isCustomBox: true,
      totalWeightGrams,
      boxComponents: boxComponents.map((c: any) => ({
        id: c.id,
        nameAr: c.nameAr,
        grams: c.grams,
        weightKg: c.grams / 1000,
        pricePerKg: c.pricePerKg,
        unitCost: Number(c.unitCost || 0),
        subtotal: c.subtotal,
      })),
    };

    setCart((prev) => [...prev, newBoxCartItem]);
    setCustomBoxesCount((prev) => prev + 1);
    setShowBoxBuilderModal(false);
    showToast("success", `تمت إضافة ${newBoxCartItem.nameAr} بإجمالي ${totalBoxPrice.toFixed(2)} ج.م للفاتورة 📦✨`);
  };

  // Completed Printed Receipt & Order Revision Modal
  const [lastPrintedOrder, setLastPrintedOrder] = useState<any>(null);
  const [settlingOrder, setSettlingOrder] = useState<boolean>(false);
  const [revisionTargetOrder, setRevisionTargetOrder] = useState<any>(null);
  const [revisionModalMode, setRevisionModalMode] = useState<RevisionModalMode>(null);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState<string>("");

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

  // Subtle Audio Alert for incoming online / delivery orders
  const playIncomingOrderChime = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.08, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.3);
      });
    } catch {}
  };

  // Load All POS Data
  const loadPosData = async () => {
    try {
      const effectiveOutletId = activeOutletId || currentUser?.outletId || "";
      const ordersQuery = effectiveOutletId
        ? `/api/orders?outletId=${effectiveOutletId}&limit=80`
        : "/api/orders?limit=80";
      const chatQuery = effectiveOutletId
        ? `/api/chat?outletId=${effectiveOutletId}`
        : "/api/chat";

      const [resOutlets, resTables, resMenu, resSettings, resShifts, resZones, resOrders, resChat, resDrivers, resOffers] =
        await Promise.all([
          fetch("/api/outlets"),
          fetch("/api/tables"),
          fetch("/api/menu"),
          fetch("/api/settings"),
          fetch(`/api/shifts?outletId=${effectiveOutletId || "ALL"}`),
          fetch("/api/delivery-zones"),
          fetch(ordersQuery),
          fetch(chatQuery),
          fetch("/api/drivers?onlyActive=true"),
          fetch("/api/public/offers", { cache: "no-store" }),
        ]);

      const [
        dataOutlets,
        dataTables,
        dataMenu,
        dataSettings,
        dataShifts,
        dataZones,
        dataOrders,
        dataChat,
        dataDrivers,
        dataOffers,
      ] = await Promise.all([
        resOutlets.json(),
        resTables.json(),
        resMenu.json(),
        resSettings.json(),
        resShifts.json(),
        resZones.json(),
        resOrders.json(),
        resChat.json(),
        resDrivers.json(),
        resOffers.json(),
      ]);

      if (dataOffers?.success && dataOffers.offers) {
        setOffers(dataOffers.offers);
      }

      if (dataDrivers?.success && Array.isArray(dataDrivers.drivers)) {
        setDrivers(dataDrivers.drivers);
      }

      if (dataOutlets.success) {
        setOutlets(dataOutlets.outlets);
        if (currentUser?.role !== "owner" && currentUser?.outletId) {
          setActiveOutletId(currentUser.outletId);
        } else if (!activeOutletId && dataOutlets.outlets.length > 0) {
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
      if (dataZones?.success && Array.isArray(dataZones.zones)) {
        setDeliveryZones(dataZones.zones);
      }
      if (dataOrders?.success && Array.isArray(dataOrders.orders)) {
        setPosOrders(dataOrders.orders);
        const pendingOnline = dataOrders.orders.filter(
          (o: any) => o.status === "NEW_PENDING" && o.orderType !== "DINE_IN"
        ).length;
        if (lastPendingCountRef.current > 0 && pendingOnline > lastPendingCountRef.current) {
          playIncomingOrderChime();
          showToast("info", "🔔 وصلك طلب أونلاين / دليفري جديد الآن!");
        }
        lastPendingCountRef.current = pendingOnline;
      }
      if (dataChat?.success && Array.isArray(dataChat.messages)) {
        setPosChatMessages(dataChat.messages);
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

  // Live Customer CRM & Loyalty Lookup by Phone Number
  useEffect(() => {
    const cleanDigits = customerPhone.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setPosCustomer(null);
      setPosCustomerProgress(null);
      setRedeemPosGift(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?phone=${encodeURIComponent(customerPhone.trim())}`);
        const data = await res.json();
        if (data.success && data.customer) {
          setPosCustomer(data.customer);
          setPosCustomerProgress(data.progress || null);
          if (!customerName.trim() && data.customer.name) {
            setCustomerName(data.customer.name);
          }
          if (!deliveryAddress.trim() && data.customer.address) {
            setDeliveryAddress(data.customer.address);
          }
        } else {
          setPosCustomer(null);
          setPosCustomerProgress(null);
          setRedeemPosGift(false);
        }
      } catch {
        // silent fail on lookup
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerPhone]);

  // Active Outlet & Identification (Immediate evaluation from currentUser or activeOutletId)
  const currentOutlet =
    outlets.find((o) => o.id === activeOutletId) ||
    currentUser?.outlet ||
    (currentUser?.role === "branch_manager" || currentUser?.role === "cashier"
      ? {
          id: currentUser?.outletId || "",
          code: currentUser?.username?.includes("abuadel")
            ? "ABU_ADEL_PATISSERIE"
            : "SOULMATE_CAFE",
          name: currentUser?.username?.includes("abuadel")
            ? "حلواني أبو عادل"
            : "سول ميت كافيه VIP",
        }
      : null) ||
    outlets[0];

  const isSoulmate =
    currentOutlet?.code === "SOULMATE_CAFE" ||
    currentUser?.outlet?.code === "SOULMATE_CAFE" ||
    currentUser?.username?.includes("soulmate");
  const isAbuAdel =
    currentOutlet?.code === "ABU_ADEL_PATISSERIE" ||
    currentUser?.outlet?.code === "ABU_ADEL_PATISSERIE" ||
    currentUser?.username?.includes("abuadel");
  const isOwner = currentUser?.role === "owner";

  // Enforce Abu Adel strictly as Takeaway & Delivery (Never Hall/Dine-In)
  useEffect(() => {
    if (isAbuAdel && orderType === "DINE_IN") {
      setOrderType("TAKEAWAY");
      setSelectedTable(null);
    }
  }, [isAbuAdel, orderType]);

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
    setRedeemPosGift(false);
    if (table.activeOrder) {
      if (table.activeOrder.customerName) setCustomerName(table.activeOrder.customerName);
      if (table.activeOrder.customerPhone) setCustomerPhone(table.activeOrder.customerPhone);
    }
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

  // Format KG vs Unit Qty cleanly
  const formatPosQty = (qty: number, unitType?: string) => {
    const q = Number(qty || 0);
    if (unitType === "KG") {
      if (q < 1) return `${Math.round(q * 1000)} جم`;
      return `${Number(q.toFixed(2))} كجم`;
    }
    return `×${q}`;
  };

  // Cart operations (Supports KG fractional weights + Units + Live Promotional Auto-Discount)
  const addWeightToPosCart = (item: any, weightKg: number) => {
    const cleanQty = Number(Math.max(0.05, weightKg).toFixed(3));
    const pricing = getItemDiscountPricing({ ...item, outlet: item.outlet || currentOutlet }, offers);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          price: pricing.finalPrice,
          originalPrice: pricing.hasDiscount ? pricing.originalPrice : undefined,
          qty: Number((copy[idx].qty + cleanQty).toFixed(3)),
        };
        return copy;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          nameAr: item.nameAr,
          price: pricing.finalPrice,
          originalPrice: pricing.hasDiscount ? pricing.originalPrice : undefined,
          costPrice: Number(item.calculatedCost || item.costPrice || 0),
          qty: cleanQty,
          unitType: item.unitType || "KG",
          notes: "",
          itemType: item.itemType,
          category: item.category,
        },
      ];
    });
    setWeightPickerItem(null);
  };

  const addToCart = (item: any) => {
    if (item.unitType === "KG") {
      setCustomGramsInput(500);
      setWeightPickerItem(item);
      return;
    }
    const pricing = getItemDiscountPricing({ ...item, outlet: item.outlet || currentOutlet }, offers);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItemId === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          price: pricing.finalPrice,
          originalPrice: pricing.hasDiscount ? pricing.originalPrice : undefined,
          qty: copy[idx].qty + 1,
        };
        return copy;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          nameAr: item.nameAr,
          price: pricing.finalPrice,
          originalPrice: pricing.hasDiscount ? pricing.originalPrice : undefined,
          costPrice: Number(item.calculatedCost || item.costPrice || 0),
          qty: 1,
          unitType: item.unitType || "PIECE",
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
            const step = i.unitType === "KG" ? delta * 0.25 : delta;
            const next = Number((i.qty + step).toFixed(3));
            return next >= 0.05 ? { ...i, qty: next } : null;
          }
          return i;
        })
        .filter(Boolean) as any[];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  // Financial & Loyalty calculations
  const selectedDeliveryZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const rawSubtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee =
    orderType === "DELIVERY"
      ? selectedDeliveryZone
        ? Number(selectedDeliveryZone.fee)
        : Number(settings?.deliveryFee || 20)
      : 0;
  const servicePercent = settings?.isServiceChargeEnabled ? settings.serviceChargePercent || 12 : 0;
  const taxPercent = settings?.isTaxEnabled ? settings.taxPercent || 14 : 0;
  const calculatedService = (rawSubtotal * servicePercent) / 100;
  const calculatedTax = (rawSubtotal * taxPercent) / 100;
  const loyaltyCfg = extractLoyaltyConfig(settings);
  const isLoyaltyOutletActive = isLoyaltyActiveForOutlet(currentOutlet?.code, loyaltyCfg);
  const liveCustomerProgress = posCustomer
    ? posCustomerProgress || getLoyaltyProgress(posCustomer.loyaltyPoints, settings)
    : null;
  const canRedeemPosMilestone = Boolean(
    isLoyaltyOutletActive && redeemPosGift && liveCustomerProgress?.canRedeemMilestone
  );
  const loyaltyGiftDiscount = canRedeemPosMilestone
    ? Math.min(rawSubtotal, loyaltyCfg.loyaltyRewardValue)
    : 0;
  const calculatedFinal = Number(
    Math.max(
      0,
      rawSubtotal + deliveryFee + calculatedService + calculatedTax - discountAmount - loyaltyGiftDiscount + tipAmount
    ).toFixed(2)
  );

  // Advance / Dispatch / Settle Online or Delivery Orders
  const handleAdvanceOnlineOrder = async (
    orderId: string,
    payload: Record<string, any>,
    successMsg: string
  ) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", successMsg);
        if (payload.action === "SETTLE" && data.order) {
          setLastPrintedOrder(data.order);
          setTimeout(() => window.print(), 350);
        }
        await loadPosData();
      } else {
        showToast("error", data.error || "تعذر تحديث حالة الطلب");
      }
    } catch {
      showToast("error", "فشل الاتصال بالخادم");
    }
  };

  // Update Opening Cash Float on Active Shift (0 or custom)
  const handleUpdateOpeningFloat = async () => {
    if (!openShift?.id) return;
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_OPENING_FLOAT",
          shiftId: openShift.id,
          openingCashFloat: Math.max(0, Number(floatInput) || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingFloat(false);
        showToast("success", data.message || "تم تحديث عهدة بداية الدرج بنجاح ✅");
        await loadPosData();
      } else {
        showToast("error", data.error || "تعذر تحديث عهدة الدرج");
      }
    } catch {
      showToast("error", "فشل الاتصال بالخادم");
    }
  };

  // Send Cashier Staff Reply in Direct Customer Chat (Auto-targets selected or latest customer thread!)
  const handleSendPosChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posChatReply.trim() && !posChatImage) return;

    const threadMsgs = posChatMessages.filter((m) => {
      if (selectedChatThread === "ALL") return m.senderType === "CUSTOMER";
      if (selectedChatThread.startsWith("PHONE:")) return m.senderPhone === selectedChatThread.slice(6);
      if (selectedChatThread.startsWith("TABLE:")) return m.tableNumber === selectedChatThread.slice(6);
      return false;
    });
    const lastMsg = threadMsgs[threadMsgs.length - 1];
    const senderPhone = selectedChatThread.startsWith("PHONE:")
      ? selectedChatThread.slice(6)
      : lastMsg?.senderPhone || null;
    const tableNumber = selectedChatThread.startsWith("TABLE:")
      ? selectedChatThread.slice(6)
      : lastMsg?.tableNumber || null;

    if (!senderPhone && !tableNumber) {
      showToast("error", "اختر محادثة العميل من القائمة الجانبية أولاً للرد عليه");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: currentOutlet?.id,
          senderType: "STAFF",
          senderName: currentUser?.name || "كاشير الفرع",
          senderPhone,
          tableNumber,
          message: posChatReply.trim() || "📎 صورة مرفقة",
          imageUrl: posChatImage || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPosChatReply("");
        setPosChatImage("");
        showToast("success", "تم إرسال ردك للعميل 💬");
        await loadPosData();
      }
    } catch {
      showToast("error", "فشل إرسال الرسالة");
    }
  };

  // Settle and Print Receipt
  const handleSettleAndPrint = async () => {
    if (cart.length === 0) {
      showToast("error", "السلة فارغة! برجاء إضافة أصناف أولاً");
      return;
    }
    if (orderType === "DELIVERY" && !deliveryAddress.trim()) {
      showToast("error", "برجاء إدخال عنوان التوصيل بالتفصيل");
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
            customerName: customerName.trim() || undefined,
            customerPhone: customerPhone.trim() || undefined,
            redeemRewardGift: canRedeemPosMilestone,
          }),
        });

        const data = await res.json();
        if (data.success && data.order) {
          setLastPrintedOrder(data.order);
          setCart([]);
          setSelectedTable(null);
          setRedeemPosGift(false);
          setPosCustomer(null);
          setPosCustomerProgress(null);
          setCustomerName("");
          setCustomerPhone("");
          setDeliveryAddress("");
          setDiscountAmount(0);
          setTipAmount(0);
          const earned = Number(data.pointsEarned || data.order?.pointsEarned || 0);
          const loyaltyNote =
            earned > 0
              ? ` | ⭐ +${earned} نقطة للعميل (رصيده ${data.customer?.loyaltyPoints ?? earned})`
              : "";
          showToast("success", (data.message || "تم تحصيل الشيك بنجاح 💵") + loyaltyNote);
          await loadPosData();
          setTimeout(() => window.print(), 350);
        } else {
          showToast("error", data.error || "فشل التحصيل");
        }
      } else {
        // Direct Walk-In or Quick Takeaway / Delivery / Retail Order
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outletId: currentOutlet?.id,
            orderType,
            paymentMethod,
            tableId: selectedTable?.id || null,
            tableNumber: selectedTable?.tableNumber || null,
            items: cart,
            customerName: customerName.trim() || (selectedTable ? `ترابيزة ${selectedTable.tableNumber}` : orderType === "DELIVERY" ? "عميل دليفري" : orderType === "TALABAT" ? "أوردر طلبات (Talabat)" : "عميل كاشير"),
            customerPhone: customerPhone.trim() || null,
            deliveryAddress: orderType === "DELIVERY" ? deliveryAddress.trim() : null,
            deliveryPhone: orderType === "DELIVERY" ? customerPhone.trim() : null,
            deliveryZoneId: orderType === "DELIVERY" && selectedDeliveryZone ? selectedDeliveryZone.id : null,
            deliveryZoneName: orderType === "DELIVERY" && selectedDeliveryZone ? selectedDeliveryZone.nameAr : null,
            deliveryFee,
            cashierName: currentUser?.name || "كاشير المنظومة",
            discountAmount,
            tipAmount,
            redeemRewardGift: canRedeemPosMilestone,
          }),
        });

        const data = await res.json();
        if (data.success && data.order) {
          // Immediately settle it (preserving server-applied total discountAmount incl. loyalty gift)
          const resSettle = await fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.order.id,
              action: "SETTLE",
              paymentMethod,
              discountAmount: Number(data.order.discountAmount ?? discountAmount),
              tipAmount,
              cashierName: currentUser?.name || "كاشير المنظومة",
            }),
          });
          const settleData = await resSettle.json();
          if (settleData.success && settleData.order) {
            setLastPrintedOrder(settleData.order);
            setCart([]);
            setSelectedTable(null);
            setRedeemPosGift(false);
            setPosCustomer(null);
            setPosCustomerProgress(null);
            setCustomerName("");
            setCustomerPhone("");
            setDeliveryAddress("");
            setDiscountAmount(0);
            setTipAmount(0);
            const earned = Number(settleData.pointsEarned || data.pointsEarned || settleData.order?.pointsEarned || 0);
            const totalPts = settleData.customer?.loyaltyPoints ?? data.customer?.loyaltyPoints;
            const loyaltyNote =
              earned > 0
                ? ` | ⭐ +${earned} نقطة للعميل${totalPts !== undefined ? ` (رصيده ${totalPts})` : ""}`
                : "";
            showToast("success", `تم تسجيل وتحصيل الشيك بنجاح 💵${loyaltyNote}`);
            await loadPosData();
            setTimeout(() => window.print(), 350);
          } else {
            showToast("error", settleData.error || "فشل تسوية الطلب");
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
          <div data-force-dark="true" className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shrink-0 p-1">
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
                {isAbuAdel ? "كاشير حلواني أبو عادل 🍰" : "كاشير سول ميت كافيه والترابيزات ☕"}
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

          {/* Online Orders & Delivery Queue Button */}
          {(() => {
            const activeOnline = posOrders.filter(
              (o) =>
                ["NEW_PENDING", "PREPARING", "READY_TO_SERVE", "OUT_FOR_DELIVERY"].includes(o.status) &&
                o.orderType !== "DINE_IN"
            );
            const hasNew = activeOnline.some((o) => o.status === "NEW_PENDING");
            return (
              <button
                onClick={() => setShowOnlineQueueModal(true)}
                className={`relative py-1.5 px-3 rounded-xl border text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  hasNew
                    ? "bg-purple-600/30 hover:bg-purple-600/40 border-purple-400 text-purple-200 shadow-lg shadow-purple-500/20 animate-pulse"
                    : "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/35 text-purple-300"
                }`}
                title="إدارة طلبات الأونلاين والدليفري وتجميع الطيارات حسب المنطقة"
              >
                <Truck className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">طلبات الأونلاين</span>
                {activeOnline.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-mono">
                    {activeOnline.length}
                  </span>
                )}
              </button>
            );
          })()}

          {/* Quick Invoice Revision / Payment Change Button */}
          <button
            type="button"
            onClick={() => {
              setOnlineStatusFilter("ALL_INVOICES");
              setShowOnlineQueueModal(true);
            }}
            className="py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
            title="تعديل أصناف وكميات فاتورة سابقة (فاتورة معدلة) أو تعديل وسيلة الدفع (تعديل دفع)"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">تعديل فاتورة / دفع</span>
          </button>

          {/* Customer Live Chat Button (Both Outlets) */}
          {(() => {
            const custMsgs = posChatMessages.filter((m) => m.senderType === "CUSTOMER").length;
            return (
              <button
                onClick={() => setShowPosChatModal(true)}
                className="relative py-1.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="الشات المباشر مع عملاء الفرع"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">شات العملاء</span>
                {custMsgs > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black font-mono">
                    {custMsgs}
                  </span>
                )}
              </button>
            );
          })()}

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

          <PushOptInButton
            role="POS"
            outletId={activeOutletId || currentUser?.outletId || null}
            userId={currentUser?.id || null}
            userName={currentUser?.name || "الكاشير"}
            compact
          />

          <ThemeToggle compact />

          {/* Navigation to Admin (Only for Owner or Branch Manager) */}
          {(isOwner || currentUser?.role === "branch_manager") && (
            <Link
              href="/admin"
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-105"
              title="الذهاب إلى لوحة الإدارة العامة"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span>لوحة الإدارة 👑</span>
            </Link>
          )}

          {/* Link to KDS (Only for Soulmate Cafe - Abu Adel has no bar/KDS) */}
          {isSoulmate && (
            <Link
              href="/kds"
              className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
              title="شاشة الباريستا والمطبخ"
            >
              <span>شاشة KDS ☕</span>
            </Link>
          )}

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
          {/* Search Bar & Categories Header */}
          <div className="shrink-0 space-y-2 pb-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، فنجان قهوة، تورتة، موهيتو، كرواسون..."
                className="w-full py-2 pr-9 pl-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-bold"
              />
            </div>

            {/* Abu Adel Custom Box Builder Banner Button */}
            {isAbuAdel && (
              <button
                type="button"
                onClick={handleOpenBoxBuilder}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                <Scale className="w-4 h-4" />
                <span>📦 تكوين علبة حلويات مشكل بالوزن (إدخال ورقة الميزان) ⚖️</span>
              </button>
            )}

            {/* Category Filter Pills - Flex Wrap so ALL categories are 100% visible on screen! */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs font-bold">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`py-1.5 px-3 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  activeCategory === "ALL"
                    ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                    : "bg-white/5 text-slate-400 hover:text-white"
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

          {/* Live Promotional Discount Alert Strip when enabled */}
          {offers?.enabled !== false && offers?.discount?.enabled && Number(offers?.discount?.value) > 0 && (
            <div className="shrink-0 mb-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 via-amber-500/15 to-rose-500/20 border border-rose-500/35 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-rose-200 font-bold truncate">
                <Tag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{offers.discount.title || "عرض خصم تلقائي مفعل"}</span>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px]">
                {offers.discount.type === "percentage" ? `خصم ${offers.discount.value}%` : `خصم ${offers.discount.value} ج`}
              </span>
            </div>
          )}

          {/* Menu Items Grid: 4 columns on large screens! */}
          <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pr-1 content-start">
            {filteredMenuItems.map((item) => {
              const pricing = getItemDiscountPricing({ ...item, outlet: item.outlet || currentOutlet }, offers);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-2.5 rounded-2xl bg-black/50 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/40 transition text-right flex flex-col justify-between space-y-1.5 group cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-black text-xs text-white group-hover:text-amber-300 line-clamp-2 leading-snug">
                        {item.nameAr}
                      </h4>
                      {pricing.hasDiscount && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-black">
                          {pricing.badgeText}
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-black text-xs text-amber-400">{pricing.finalPrice} ج</span>
                      {pricing.hasDiscount && (
                        <span className="text-[10px] text-slate-500 line-through">{pricing.originalPrice} ج</span>
                      )}
                    </div>
                    <div className="w-5 h-5 rounded-lg bg-white/10 group-hover:bg-amber-500 group-hover:text-slate-950 text-white flex items-center justify-center transition">
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              );
            })}
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

              <div className="flex items-center gap-1">
                {/* Button to build custom sweet box */}
                <button
                  type="button"
                  onClick={handleOpenBoxBuilder}
                  className="py-1 px-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition shadow-sm"
                  title="تكوين علبة حلويات مشكل حسب ورقة الميزان"
                >
                  <Scale className="w-3 h-3 text-amber-400" />
                  <span>+ علبة مشكل ⚖️</span>
                </button>

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
            </div>

            {/* ORDER TYPE SEGMENTED TABS (2 tabs for Abu Adel, 4 tabs for Soulmate incl. Talabat) */}
            <div className={`grid ${isAbuAdel ? "grid-cols-2" : "grid-cols-4"} gap-1 p-1 bg-black/60 border border-white/10 rounded-2xl text-xs font-black`}>
              {/* Option 1: DINE_IN (صالة) - Strictly for Soulmate Cafe */}
              {!isAbuAdel && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("DINE_IN");
                    if (paymentMethod === "TALABAT") setPaymentMethod("CASH");
                    setShowTableModal(true);
                  }}
                  className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                    orderType === "DINE_IN"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🪑</span>
                  <span className="truncate">
                    {selectedTable ? `ط${selectedTable.tableNumber}` : "صالة"}
                  </span>
                </button>
              )}

              {/* Option 2: TAKEAWAY (بيع مباشر / تيك أواي) */}
              <button
                type="button"
                onClick={() => {
                  setOrderType("TAKEAWAY");
                  if (paymentMethod === "TALABAT") setPaymentMethod("CASH");
                  setSelectedTable(null);
                  showToast("info", isAbuAdel ? "تم تفعيل وضع البيع المباشر (استلام فوري من المحل) 🛍️" : "تم تفعيل وضع التيك أواي السفري 🛍️");
                }}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  orderType === "TAKEAWAY"
                    ? isAbuAdel
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black"
                      : "bg-rose-500 text-white shadow-md shadow-rose-500/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🛍️</span>
                <span>{isAbuAdel ? "بيع مباشر (كاونتر)" : "تيك أواي"}</span>
              </button>

              {/* Option 3: DELIVERY (دليفري) */}
              <button
                type="button"
                onClick={() => {
                  setOrderType("DELIVERY");
                  if (paymentMethod === "TALABAT") setPaymentMethod("CASH");
                  setSelectedTable(null);
                  showToast("info", "تم تفعيل وضع التوصيل والدليفري 🛵");
                }}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  orderType === "DELIVERY"
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🛵</span>
                <span>دليفري</span>
              </button>

              {/* Option 4: TALABAT (طلبات - عمولة 25%) - Strictly for Soulmate Cafe */}
              {!isAbuAdel && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("TALABAT");
                    setPaymentMethod("TALABAT");
                    setSelectedTable(null);
                    showToast("info", `تم تفعيل قناة طلبات (عمولة ${settings?.talabatCommissionPercent ?? 25}% — لا يدخل درج الكاشير) 🟠`);
                  }}
                  className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                    orderType === "TALABAT"
                      ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30 font-black"
                      : "text-slate-400 hover:text-orange-300"
                  }`}
                >
                  <span>🟠</span>
                  <span>طلبات</span>
                </button>
              )}
            </div>

            {/* Contextual Sub-bar based on Selected Order Type */}
            {!isAbuAdel && orderType === "DINE_IN" ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowTableModal(true)}
                  className={`flex-1 py-1.5 px-3 rounded-xl border flex items-center justify-between text-xs font-black transition cursor-pointer ${
                    selectedTable
                      ? selectedTable.status === "BILL_REQUESTED"
                        ? "bg-purple-600/30 border-purple-500 text-purple-200 animate-pulse"
                        : "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {selectedTable
                        ? `ترابيزة صالة رقم [ ${selectedTable.tableNumber} ]`
                        : "اختر ترابيزة من الصالة (1 - 12) 🪑"}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-black/40 py-0.5 px-2 rounded-md">
                    تغيير ▾
                  </span>
                </button>
                {selectedTable && (
                  <button
                    onClick={() => {
                      setSelectedTable(null);
                      setCart([]);
                    }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    title="إلغاء الترابيزة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : orderType === "TAKEAWAY" ? (
              <div className="py-1.5 px-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>🛍️</span>
                  <span>طلب سفري تيك أواي • استلام مباشر</span>
                </span>
                <span className="text-[10px] font-mono bg-rose-500/20 px-2 py-0.5 rounded-full">
                  استلام كاونتر
                </span>
              </div>
            ) : (
              /* DELIVERY MODE: Shows Delivery Zone selector + Customer Address & Phone Inputs */
              <div className="space-y-1.5 pt-0.5">
                <div className="py-1 px-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🛵</span>
                    <span>طلب توصيل دليفري للمنزل</span>
                  </span>
                  <span className="text-[10px] font-black font-mono bg-sky-500/20 px-2 py-0.5 rounded-full text-sky-200">
                    رسوم التوصيل: +{deliveryFee} ج.م
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-black/60 border border-sky-500/30 space-y-1.5 text-xs">
                  <div>
                    <label className="text-[10px] text-purple-300 block mb-0.5 font-bold">
                      📍 منطقة التوصيل (يتم تحديد رسوم الدليفري تلقائياً):
                    </label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="w-full py-1.5 px-2 rounded-lg bg-black/80 border border-purple-500/40 text-white text-xs font-bold outline-none focus:border-purple-400"
                    >
                      <option value="">
                        -- منطقة عامة / تلقائي ({settings?.deliveryFee || 20} ج.م) --
                      </option>
                      {deliveryZones
                        .filter((z) => z.isActive)
                        .map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.nameAr} — ({z.fee} ج.م • {z.estimatedTime || "45-60 د"})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">عنوان التوصيل بالتفصيل *:</label>
                    <input
                      type="text"
                      placeholder="الشارع، العمارة، رقم الشقة أو علامة مميزة..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full py-1.5 px-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-sky-400 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Unified Customer CRM & Loyalty Phone/Name Lookup (ALL Modes: Dine-In, Takeaway, Delivery) */}
            <div className="p-2 rounded-xl bg-black/55 border border-emerald-500/25 space-y-1.5 text-xs">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-emerald-300 block mb-0.5 font-bold">
                    📱 موبايل العميل (CRM / النقاط):
                  </label>
                  <input
                    type="tel"
                    placeholder="010XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full py-1 px-2 rounded-lg bg-black/70 border border-white/10 text-white text-[11px] font-mono outline-none focus:border-emerald-400 font-bold"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5 font-bold">👤 اسم العميل:</label>
                  <input
                    type="text"
                    placeholder="عميل مميز..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full py-1 px-2 rounded-lg bg-black/70 border border-white/10 text-white text-[11px] outline-none focus:border-emerald-400 font-bold"
                  />
                </div>
              </div>

              {isLoyaltyOutletActive && posCustomer && liveCustomerProgress && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-emerald-300 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>{posCustomer.name}</span>
                    </span>
                    <span className="font-mono font-black text-amber-300">
                      ⭐ {Number(posCustomer.loyaltyPoints || 0).toLocaleString()} نقطة
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${liveCustomerProgress.progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-300">
                    <span>التقدم: {liveCustomerProgress.progressPct}%</span>
                    <span>
                      {liveCustomerProgress.canRedeemMilestone
                        ? `🎉 مؤهل لهدية ${loyaltyCfg.loyaltyRewardValue} ج.م!`
                        : `متبقي ${liveCustomerProgress.pointsToNextReward} نقطة للهدية`}
                    </span>
                  </div>
                  {liveCustomerProgress.canRedeemMilestone && (
                    <button
                      type="button"
                      onClick={() => setRedeemPosGift((prev) => !prev)}
                      className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        redeemPosGift
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25"
                          : "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200"
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>
                        {redeemPosGift
                          ? `✓ تم تفعيل خصم هدية الولاء (-${loyaltyCfg.loyaltyRewardValue} ج.م)`
                          : `استبدال ${loyaltyCfg.loyaltyRewardThreshold} نقطة بهدية (-${loyaltyCfg.loyaltyRewardValue} ج.م)`}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {isLoyaltyOutletActive && customerPhone.replace(/\D/g, "").length >= 10 && !posCustomer && (
                <p className="text-[9px] text-amber-300/90 font-bold">
                  🆕 عميل جديد — سيتم حفظه تلقائياً في قاعدة CRM وإضافة نقاط هذه الفاتورة ⭐
                </p>
              )}
            </div>
          </div>

          {/* Cart Items List: SCROLLABLE INDEPENDENTLY */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 py-1">
            {cart.length === 0 ? (
              <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-slate-500 text-xs py-4">
                <Receipt className="w-8 h-8 mb-1 opacity-30 text-amber-400" />
                <span className="font-bold text-slate-400">الفاتورة فارغة حالياً</span>
                <span className="text-[10px] text-slate-600">اختر أصنافاً من المنيو للإضافة</span>
              </div>
            ) : (
              cart.map((it) => {
                if (it.isCustomBox) {
                  return (
                    <div key={it.menuItemId} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-rose-300 block text-xs">
                            📦 {it.nameAr}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            وزن إجمالي: {it.totalWeightGrams ? (it.totalWeightGrams / 1000).toFixed(3) : 0} كجم
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-sm">
                            {it.price} ج
                          </span>
                          <button
                            onClick={() => removeFromCart(it.menuItemId)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                            title="حذف العلبة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sub-components of the custom box */}
                      {it.boxComponents && it.boxComponents.length > 0 && (
                        <div className="bg-black/50 p-2 rounded-lg border border-white/5 space-y-1 text-[11px] font-mono">
                          {it.boxComponents.map((comp: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-slate-300">
                              <span className="font-sans font-bold">• {comp.nameAr} ({comp.grams} جم)</span>
                              <span className="text-amber-300/80">{comp.subtotal} ج</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={it.menuItemId} className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-white block truncate">{it.nameAr}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {it.price} ج × {formatPosQty(it.qty, it.unitType)} ={" "}
                        <strong className="text-amber-300 font-black">
                          {(it.price * it.qty).toFixed(2)} ج
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateCartQty(it.menuItemId, -1)}
                        className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-[11px] px-1 text-white">
                        {formatPosQty(it.qty, it.unitType)}
                      </span>
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
                );
              })
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
            <div className={`grid ${!isAbuAdel ? "grid-cols-5" : "grid-cols-4"} gap-1 text-[11px] font-bold`}>
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
              {!isAbuAdel && (
                <button
                  onClick={() => {
                    setOrderType("TALABAT");
                    setPaymentMethod("TALABAT");
                    setSelectedTable(null);
                  }}
                  className={`py-1.5 rounded-lg border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                    paymentMethod === "TALABAT" ? "bg-orange-500 text-slate-950 font-black border-orange-400 shadow-md shadow-orange-500/25" : "bg-black/40 text-orange-300/80 border-white/5 hover:text-orange-200"
                  }`}
                >
                  <span>🟠</span>
                  <span>طلبات</span>
                </button>
              )}
            </div>

            {(paymentMethod === "TALABAT" || orderType === "TALABAT") && (() => {
              const talabatPct = Number(settings?.talabatCommissionPercent ?? 25) || 25;
              const storeBase = Math.max(0, calculatedFinal - deliveryFee);
              const commVal = (storeBase * talabatPct) / 100;
              const netVal = Math.max(0, storeBase - commVal);
              return (
                <div className="p-2 rounded-xl bg-orange-950/40 border border-orange-500/40 text-[10px] space-y-0.5">
                  <div className="flex justify-between text-orange-300 font-bold">
                    <span>🟠 أوردر تطبيق طلبات (لا يدخل الدرج الكاش)</span>
                    <span className="font-mono">كاش بالدرج = 0 ج</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>عمولة طلبات ({talabatPct}%): -{commVal.toFixed(2)} ج</span>
                    <span className="text-emerald-300 font-black">صافي مستحق: {netVal.toFixed(2)} ج</span>
                  </div>
                </div>
              );
            })()}

            {/* Totals Breakdown & Settle Button */}
            <div className="space-y-1 border-t border-white/10 pt-1.5 text-xs">
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>المجموع الفرعي:</span>
                <span>{rawSubtotal.toFixed(2)} ج</span>
              </div>
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
              {orderType === "DELIVERY" && (
                <div className="flex justify-between text-sky-300 font-mono text-[11px]">
                  <span>رسوم توصيل الطيار {selectedDeliveryZone ? `(${selectedDeliveryZone.nameAr})` : ""}:</span>
                  <span>+{deliveryFee} ج</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-300 font-mono text-[11px]">
                  <span>خصم يدوي:</span>
                  <span>-{discountAmount} ج</span>
                </div>
              )}
              {loyaltyGiftDiscount > 0 && (
                <div className="flex justify-between text-emerald-300 font-mono text-[11px] font-bold">
                  <span>🎁 خصم هدية الولاء VIP:</span>
                  <span>-{loyaltyGiftDiscount} ج</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black border-t border-white/10 pt-1">
                <span className="text-white">المبلغ المطلوب:</span>
                <span className="font-mono text-amber-400 text-base font-black">
                  {calculatedFinal} ج.م
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
                      <span>تحصيل {calculatedFinal} ج.م وطباعة الإيصال 🖨️</span>
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
          3.2 MODAL: WEIGHTED CUSTOM SWEET BOX BUILDER (حساب ورقة الميزان)
         ───────────────────────────────────────────────────────────── */}
      {showBoxBuilderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-rose-500/50 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span>مُنشئ علبة الحلويات المشكلة (ورقة الميزان) ⚖️</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  اختر الصنف واكتب الوزن بالجرام لاحتساب سعر العلبة آلياً
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBoxBuilderModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Box Name Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 font-bold shrink-0">اسم العلبة:</label>
              <input
                type="text"
                value={boxName}
                onChange={(e) => setBoxName(e.target.value)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-bold text-xs outline-none focus:border-amber-400"
                placeholder="مثال: علبة مشكل رقم 1"
              />
            </div>

            {/* Step 1: Pick an Item & Enter Weight */}
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-3">
              <span className="text-xs font-black text-amber-300 block">
                1. اختر الصنف والوزن بالجرام المدون في ورقة الميزان:
              </span>

              {/* Item Search / Selector */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="ابحث عن صنف (بسبوسة، كنافة، كعك، بقلاوة، رموش، بلح الشام...)"
                  value={boxSearchQuery}
                  onChange={(e) => setBoxSearchQuery(e.target.value)}
                  className="w-full py-1.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-amber-400 font-bold"
                />

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-white/5 rounded-xl p-1 bg-black/40">
                  {menuItems
                    .filter((m) => {
                      const matchesOutlet = m.outlet?.code === "ABU_ADEL_PATISSERIE" || m.itemType === "READY_PASTRY";
                      if (!matchesOutlet) return false;
                      if (!boxSearchQuery.trim()) return true;
                      return m.nameAr.toLowerCase().includes(boxSearchQuery.trim().toLowerCase());
                    })
                    .slice(0, 15)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedBoxItem(m)}
                        className={`w-full p-2 rounded-xl text-right flex items-center justify-between text-xs transition cursor-pointer ${
                          selectedBoxItem?.id === m.id
                            ? "bg-amber-500 text-slate-950 font-black shadow"
                            : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <span className="font-bold">{m.nameAr}</span>
                        <span className="font-mono font-bold text-[11px]">
                          {m.price} ج / {m.unitType === "KG" ? "كجم" : "صنف"}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Weight Entry (if item selected) */}
              {selectedBoxItem && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-amber-300">
                      الصنف المختار: {selectedBoxItem.nameAr}
                    </span>
                    <span className="font-mono text-white font-bold">
                      سعر الكيلو: {selectedBoxItem.price} ج
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 font-bold block mb-1">
                      الوزن بالجرام (كما في ورقة الميزان):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={10}
                        step={10}
                        value={tempBoxGrams}
                        onChange={(e) => setTempBoxGrams(Number(e.target.value))}
                        className="w-32 py-1.5 px-3 rounded-xl bg-black border border-amber-500/50 text-white font-mono font-black text-base text-center outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">جرام (جم)</span>
                      <div className="flex-1 text-left">
                        <span className="text-xs text-amber-400 font-mono font-black block">
                          = {Math.round((tempBoxGrams / 1000) * selectedBoxItem.price * 100) / 100} ج.م
                        </span>
                      </div>
                    </div>

                    {/* Weight Quick Chips */}
                    <div className="flex items-center gap-1.5 pt-2 flex-wrap text-[10px] font-bold">
                      <span className="text-slate-400">أوزان سريعة:</span>
                      {[
                        { label: "1/8 كجم (125 جم)", g: 125 },
                        { label: "1/4 كجم (250 جم)", g: 250 },
                        { label: "1/3 كجم (330 جم)", g: 330 },
                        { label: "1/2 كجم (500 جم)", g: 500 },
                        { label: "3/4 كجم (750 جم)", g: 750 },
                        { label: "1 كجم (1000 جم)", g: 1000 },
                      ].map((chip) => (
                        <button
                          key={chip.g}
                          type="button"
                          onClick={() => setTempBoxGrams(chip.g)}
                          className={`py-1 px-2 rounded-lg border transition cursor-pointer ${
                            tempBoxGrams === chip.g
                              ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                              : "bg-black/60 border-white/10 text-slate-300 hover:text-white"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBoxComponent}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة الصنف إلى هذه العلبة</span>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Current Box Items List */}
            <div className="space-y-2">
              <span className="text-xs font-black text-white flex items-center justify-between">
                <span>محتويات {boxName} حتى الآن:</span>
                <span className="font-mono text-amber-400 text-[11px]">
                  ({boxComponents.length} أصناف داخل العلبة)
                </span>
              </span>

              {boxComponents.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-center text-slate-500 text-xs">
                  لم تضف أصنافاً للعلبة بعد. اختر صنفاً وحدد وزنه من ورقة الميزان أعلاه.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {boxComponents.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-white block">{c.nameAr}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.grams} جم × ({c.pricePerKg} ج/كجم) ={" "}
                          <strong className="text-amber-300 font-black">{c.subtotal} ج</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBoxComponent(idx)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                        title="حذف من العلبة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Total Box Summary & Add to Cart Action */}
            <div className="p-3.5 rounded-2xl bg-[#1d111b] border-2 border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">إجمالي وزن العلبة:</span>
                <strong className="text-white text-sm">
                  {(boxComponents.reduce((s, c) => s + c.grams, 0) / 1000).toFixed(3)} كجم (
                  {boxComponents.reduce((s, c) => s + c.grams, 0)} جم)
                </strong>
              </div>
              <div className="flex items-center justify-between text-sm font-black border-t border-white/10 pt-1.5">
                <span className="text-white">إجمالي سعر العلبة:</span>
                <span className="font-mono text-amber-400 text-lg">
                  {boxComponents.reduce((s, c) => s + c.subtotal, 0).toFixed(2)} ج.م
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBoxBuilderModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء ✕
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddBoxToCart}
                  disabled={boxComponents.length === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>تأكيد وإضافة العلبة للفاتورة 📦</span>
                </button>
              </div>
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
                  <div className="flex items-center justify-between text-slate-400">
                    <span>فكة الدرج الافتتاحية:</span>
                    {editingFloat ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={floatInput}
                          onChange={(e) => setFloatInput(e.target.value)}
                          className="w-20 px-2 py-0.5 rounded bg-slate-900 border border-amber-500/50 text-amber-300 font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateOpeningFloat}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFloat(false)}
                          className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{shiftLiveStats?.openingFloat ?? 0} ج</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFloatInput(String(shiftLiveStats?.openingFloat ?? 0));
                            setEditingFloat(true);
                          }}
                          className="text-[10px] text-amber-300 underline cursor-pointer font-sans"
                        >
                          تعديل
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>مقبوضات مبيعات المحل كاش (+):</span>
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
                  <div className="flex justify-between text-rose-300">
                    <span>فودافون كاش:</span>
                    <span>{shiftLiveStats?.vodafoneCollected || 0} ج</span>
                  </div>
                  {(shiftLiveStats?.talabatCollected || 0) > 0 && (
                    <div className="flex flex-col gap-0.5 text-orange-300 bg-orange-950/30 px-2 py-1.5 rounded-lg border border-orange-500/30">
                      <div className="flex justify-between font-bold">
                        <span>🟠 مبيعات طلبات (Talabat - خارج الدرج):</span>
                        <span>{shiftLiveStats?.talabatCollected || 0} ج</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>عمولة التطبيق: -{shiftLiveStats?.talabatCommission || 0} ج</span>
                        <span className="text-emerald-300 font-bold">صافي مستحق: {shiftLiveStats?.talabatNetReceivable || 0} ج</span>
                      </div>
                    </div>
                  )}
                  {(shiftLiveStats?.deliveryFeesTotal || 0) > 0 && (
                    <div className="flex justify-between text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded-lg border border-cyan-500/20">
                      <span>🛵 رسوم توصيل (حق الطيارين — مفصولة):</span>
                      <span>{shiftLiveStats?.deliveryFeesTotal || 0} ج</span>
                    </div>
                  )}
                  <div className="flex justify-between text-rose-400">
                    <span>مصروفات ونثريات الدرج (-):</span>
                    <span>-{shiftLiveStats?.expensesTotal || 0} ج</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold border-t border-white/10 pt-1 text-sm">
                    <span>النقدية المتوقعة بالدرج:</span>
                    <span>{shiftLiveStats?.expectedCash ?? 0} ج.م</span>
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
          7. THERMAL RECEIPT PRINT TEMPLATE (CLIENT RECEIPT)
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
              {lastPrintedOrder.orderType === "DINE_IN" && lastPrintedOrder.tableNumber
                ? `ترابيزة: ${lastPrintedOrder.tableNumber}`
                : lastPrintedOrder.orderType === "TALABAT" || lastPrintedOrder.paymentMethod === "TALABAT"
                ? "🟠 أوردر تطبيق طلبات (Talabat)"
                : lastPrintedOrder.orderType === "DELIVERY"
                ? `🛵 توصيل دليفري للمنزل${lastPrintedOrder.deliveryZoneName ? ` (${lastPrintedOrder.deliveryZoneName})` : ""}`
                : "🛍️ طلب تيك أواي / استلام من الفرع"}
            </p>
            {lastPrintedOrder.deliveryAddress && (
              <p className="text-[10px]">العنوان: {lastPrintedOrder.deliveryAddress}</p>
            )}
            {(lastPrintedOrder.deliveryPhone || lastPrintedOrder.customerPhone) && (
              <p className="text-[10px] font-mono">
                هاتف: {lastPrintedOrder.deliveryPhone || lastPrintedOrder.customerPhone}
              </p>
            )}
            {lastPrintedOrder.driverName && (
              <p className="text-[10px] font-bold">
                الطيار: {lastPrintedOrder.driverName}
                {(lastPrintedOrder.driverPhone || lastPrintedOrder.driver?.phone)
                  ? ` (${lastPrintedOrder.driverPhone || lastPrintedOrder.driver?.phone})`
                  : ""}
              </p>
            )}
            <p className="text-[10px] font-mono">
              تاريخ: {new Date().toLocaleDateString("ar-EG")} • {new Date().toLocaleTimeString("ar-EG")}
            </p>
            <p className="text-[11px] font-black font-mono">
              إيصال طلب رقم: #{lastPrintedOrder.orderNumber}
            </p>
            {(lastPrintedOrder.isEdited || lastPrintedOrder.paymentModified) && (
              <div className="mt-1 pt-1 border-t border-dashed border-black space-y-0.5 text-[10px] font-black">
                {lastPrintedOrder.isEdited && (
                  <p className="bg-black text-white px-2 py-0.5 inline-block">
                    *** فاتورة معدلة (تعديل #{lastPrintedOrder.revisionCount || 1}) ***
                  </p>
                )}
                {lastPrintedOrder.paymentModified && (
                  <p className="border border-black px-2 py-0.5 inline-block mr-1">
                    *** تعديل دفع ***
                  </p>
                )}
                {lastPrintedOrder.lastEditReason && (
                  <p className="text-[9px] font-bold">
                    السبب: {lastPrintedOrder.lastEditReason}
                    {lastPrintedOrder.lastEditedBy ? ` (${lastPrintedOrder.lastEditedBy})` : ""}
                  </p>
                )}
              </div>
            )}
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
                  : lastPrintedOrder.paymentMethod === "TALABAT"
                  ? "تطبيق طلبات (Talabat) 🟠"
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
              return items.map((it: any, idx: number) => {
                if (it.isCustomBox) {
                  return (
                    <div key={idx} className="space-y-0.5 border-b border-gray-300 pb-1 mb-1">
                      <div className="flex justify-between font-bold">
                        <span>📦 {it.nameAr}</span>
                        <span className="font-mono font-black">{it.price * (it.qty || 1)} ج</span>
                      </div>
                      {it.boxComponents && it.boxComponents.map((c: any, cIdx: number) => (
                        <div key={cIdx} className="flex justify-between text-[10px] pr-2 text-gray-700">
                          <span>- {c.nameAr} ({c.grams} جم)</span>
                          <span>{c.subtotal} ج</span>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={idx} className="flex justify-between">
                    <span>{it.nameAr} ({formatPosQty(it.qty || 1, it.unitType)})</span>
                    <span className="font-mono font-bold">{(it.price * (it.qty || 1)).toFixed(2)} ج</span>
                  </div>
                );
              });
            })()}
          </div>

          <div className="text-[12px] space-y-1 font-black border-b-2 border-black pb-2 mb-2">
            {Number(lastPrintedOrder.deliveryFee || 0) > 0 && (
              <div className="flex justify-between text-[11px] font-normal">
                <span>رسوم توصيل الطيار:</span>
                <span className="font-mono">{lastPrintedOrder.deliveryFee} ج.م</span>
              </div>
            )}
            {Number(lastPrintedOrder.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-[11px] font-normal">
                <span>الخصم / هدية الولاء:</span>
                <span className="font-mono">-{lastPrintedOrder.discountAmount} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>المبلغ الإجمالي:</span>
              <span className="font-mono text-base">{lastPrintedOrder.finalAmount} ج.م</span>
            </div>
            {(Number(lastPrintedOrder.pointsEarned || 0) > 0 || Number(lastPrintedOrder.pointsRedeemed || 0) > 0) && (
              <div className="pt-1 border-t border-dashed border-black text-[10px] font-bold text-center">
                {Number(lastPrintedOrder.pointsEarned || 0) > 0 && (
                  <span>⭐ مكتسب: +{lastPrintedOrder.pointsEarned} نقطة ولاء</span>
                )}
                {Number(lastPrintedOrder.pointsRedeemed || 0) > 0 && (
                  <span className="mr-2">🎁 مستبدل: {lastPrintedOrder.pointsRedeemed} نقطة</span>
                )}
              </div>
            )}
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
          8. THERMAL SHIFT Z-REPORT PRINT TEMPLATE
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
          9A. MODAL: ONLINE & DELIVERY QUEUE (تجهيز وتجميع الدليفري حسب المنطقة)
         ───────────────────────────────────────────────────────────── */}
      {showOnlineQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-purple-500/40 rounded-3xl p-5 max-w-5xl w-full space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0 flex-wrap gap-2">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-400" />
                  <span>طلبات الأونلاين والدليفري — {currentOutlet?.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  فلتر الطلبات حسب المنطقة لتجميع أوردرات الطيارين، وتابع التجهيز والتحصيل بالترتيب
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnlineQueueModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕ إغلاق
              </button>
            </div>

            {/* Area / Zone + Status Filters */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 bg-black/40 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" />
                <select
                  value={onlineZoneFilter}
                  onChange={(e) => setOnlineZoneFilter(e.target.value)}
                  className="bg-slate-950 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-xl px-3 py-2 outline-none"
                >
                  <option value="ALL">🗺️ كل المناطق</option>
                  {deliveryZones.map((z) => {
                    const countInZone = posOrders.filter(
                      (o) =>
                        o.deliveryZoneId === z.id &&
                        ["NEW_PENDING", "PREPARING", "READY_TO_SERVE", "OUT_FOR_DELIVERY"].includes(o.status)
                    ).length;
                    return (
                      <option key={z.id} value={z.id}>
                        📍 {z.nameAr} ({countInZone} نشط • {z.fee} ج.م)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "ACTIVE", label: "🔥 النشط وقيد التوصيل" },
                  { key: "ALL_INVOICES", label: "🧾 كل الفواتير (تعديل / دفع)" },
                  { key: "NEW_PENDING", label: "🆕 جديد" },
                  { key: "PREPARING", label: "📦 قيد التجهيز" },
                  { key: "READY_TO_SERVE", label: "✅ جاهز للطيار" },
                  { key: "OUT_FOR_DELIVERY", label: "🛵 مع الطيار" },
                  { key: "COMPLETED", label: "✔️ مكتمل" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setOnlineStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      onlineStatusFilter === tab.key
                        ? "bg-purple-600 text-white shadow"
                        : "bg-black/60 text-slate-300 border border-white/10 hover:border-purple-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={invoiceSearchTerm}
                  onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                  placeholder="بحث برقم الفاتورة أو اسم/موبايل العميل..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Filtered Orders Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(() => {
                const qTerm = invoiceSearchTerm.trim().toLowerCase();
                const filteredQueue = posOrders.filter((o) => {
                  if (o.status === "CANCELLED") return false;
                  if (qTerm) {
                    const hay = `${o.orderNumber || ""} ${o.customerName || ""} ${o.customerPhone || ""} ${o.deliveryPhone || ""}`.toLowerCase();
                    if (!hay.includes(qTerm)) return false;
                  }
                  if (onlineZoneFilter !== "ALL" && o.deliveryZoneId !== onlineZoneFilter) return false;
                  if (onlineStatusFilter === "ALL_INVOICES") return true;
                  if (o.orderType === "DINE_IN" && onlineStatusFilter === "ACTIVE") return false;
                  if (onlineStatusFilter === "ACTIVE") {
                    return ["NEW_PENDING", "PREPARING", "READY_TO_SERVE", "OUT_FOR_DELIVERY"].includes(o.status);
                  }
                  return o.status === onlineStatusFilter;
                });

                if (filteredQueue.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      لا توجد طلبات في هذا التحديد حالياً
                    </div>
                  );
                }

                return filteredQueue.map((o) => {
                  let parsedItems: any[] = [];
                  try {
                    parsedItems = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
                  } catch {}
                  const zoneLabel = o.deliveryZone?.nameAr || o.deliveryZoneName;

                  return (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-sm">
                            #{o.orderNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              o.orderType === "DELIVERY"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {o.orderType === "DELIVERY" ? "🛵 دليفري" : "🛍️ تيك أواي"}
                          </span>
                          {zoneLabel && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              📍 {zoneLabel}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(o.createdAt).toLocaleTimeString("ar-EG")}
                          </span>
                          {o.isEdited && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              ✏️ فاتورة معدلة{o.revisionCount > 1 ? ` (${o.revisionCount})` : ""}
                            </span>
                          )}
                          {o.paymentModified && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              💳 تعديل دفع
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-200 flex flex-wrap items-center gap-3">
                          <span className="font-bold">👤 {o.customerName || "عميل"}</span>
                          {(o.deliveryPhone || o.customerPhone) && (
                            <span className="font-mono text-sky-300">
                              📞 {o.deliveryPhone || o.customerPhone}
                            </span>
                          )}
                          {o.driverName && (
                            <span className="text-purple-300 font-bold">
                              🏍️ الطيار: {o.driverName}
                              {(o.driverPhone || o.driver?.phone)
                                ? ` (${o.driverPhone || o.driver?.phone})`
                                : ""}
                            </span>
                          )}
                          {o.isScheduled && o.scheduledFor && (
                            <span className="text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              📅 حجز: {new Date(o.scheduledFor).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </div>

                        {o.deliveryAddress && (
                          <div className="text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 inline-block">
                            العنوان: {o.deliveryAddress}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-300 flex flex-wrap gap-1.5 pt-1">
                          {parsedItems.map((it: any, idx: number) => (
                            <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {it.nameAr} ({formatPosQty(it.qty || 1, it.unitType)})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0">
                        <div className="text-left">
                          <span className="text-sm font-black font-mono text-emerald-400">
                            {o.finalAmount} ج.م
                          </span>
                          {Number(o.deliveryFee) > 0 && (
                            <span className="text-[10px] text-cyan-300 block">
                              (توصيل الطيار: {o.deliveryFee} ج)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.status === "NEW_PENDING" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAdvanceOnlineOrder(
                                  o.id,
                                  { status: "PREPARING" },
                                  `بدأ تجهيز الطلب #${o.orderNumber} 📦`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                            >
                              بدء التجهيز 📦
                            </button>
                          )}

                          {o.status === "PREPARING" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAdvanceOnlineOrder(
                                  o.id,
                                  { status: "READY_TO_SERVE" },
                                  `الطلب #${o.orderNumber} جاهز الآن ✅`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                            >
                              {o.orderType === "DELIVERY" ? "جاهز للطيار ✅" : "جاهز للاستلام ✅"}
                            </button>
                          )}

                          {o.status === "READY_TO_SERVE" && o.orderType === "DELIVERY" && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {drivers.length > 0 ? (
                                <select
                                  value={selectedDriverByOrder[o.id] || ""}
                                  onChange={(e) =>
                                    setSelectedDriverByOrder((prev) => ({
                                      ...prev,
                                      [o.id]: e.target.value,
                                    }))
                                  }
                                  className="bg-slate-950 border border-purple-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold"
                                >
                                  <option value="">-- اختر الطيار --</option>
                                  {drivers.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      🛵 {d.name} ({d.phone})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="اسم الطيار..."
                                  value={driverNamesByOrder[o.id] || ""}
                                  onChange={(e) =>
                                    setDriverNamesByOrder((prev) => ({
                                      ...prev,
                                      [o.id]: e.target.value,
                                    }))
                                  }
                                  className="w-28 bg-slate-950 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const pickedDriver = drivers.find((d) => d.id === selectedDriverByOrder[o.id]);
                                  handleAdvanceOnlineOrder(
                                    o.id,
                                    {
                                      action: "DISPATCH_DRIVER",
                                      driverId: pickedDriver?.id || null,
                                      driverName: pickedDriver?.name || driverNamesByOrder[o.id] || "مندوب التوصيل",
                                      driverPhone: pickedDriver?.phone || null,
                                    },
                                    `خرج الطلب #${o.orderNumber} مع الطيار 🛵`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                              >
                                تسليم للطيار 🛵
                              </button>
                            </div>
                          )}

                          {(o.status === "OUT_FOR_DELIVERY" ||
                            (o.status === "READY_TO_SERVE" && o.orderType !== "DELIVERY")) &&
                            o.paymentStatus !== "PAID" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdvanceOnlineOrder(
                                    o.id,
                                    {
                                      action: "SETTLE",
                                      paymentMethod: o.paymentMethod || paymentMethod || "CASH",
                                      cashierName: currentUser?.name || "كاشير الفرع",
                                    },
                                    `تم تحصيل الطلب #${o.orderNumber} وإضافته للدرج 💵`
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black cursor-pointer"
                              >
                                تحصيل للدرج وطباعة 💵
                              </button>
                            )}

                          {(o.status === "OUT_FOR_DELIVERY" ||
                            (o.status === "READY_TO_SERVE" && o.orderType !== "DELIVERY")) &&
                            o.paymentStatus === "PAID" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdvanceOnlineOrder(
                                    o.id,
                                    { status: "COMPLETED" },
                                    `تم تسليم الطلب #${o.orderNumber} بالكامل ✔️`
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer"
                              >
                                تأكيد التسليم النهائي ✔️
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => {
                              setRevisionTargetOrder(o);
                              setRevisionModalMode("EDIT_INVOICE");
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                            title="تعديل أصناف وكميات الفاتورة (فاتورة معدلة)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل فاتورة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRevisionTargetOrder(o);
                              setRevisionModalMode("CHANGE_PAYMENT");
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/35 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                            title="تغيير وسيلة الدفع (تعديل دفع)"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>تعديل دفع</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setLastPrintedOrder(o);
                              setTimeout(() => window.print(), 250);
                            }}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-300 border border-white/10 cursor-pointer"
                            title="طباعة بون الطلب"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9B. MODAL: DIRECT CUSTOMER LIVE CHAT (POS STAFF)
         ───────────────────────────────────────────────────────────── */}
      {showPosChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#140e16] border-2 border-sky-500/40 rounded-3xl p-5 max-w-4xl w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-sky-400" />
                  <span>شات العملاء المباشر — {currentOutlet?.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  تواصل مباشر وفوري مع عملاء الدليفري والتيك أواي والصالة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPosChatModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕ إغلاق
              </button>
            </div>

            {(() => {
              const threadMap: Record<string, { key: string; label: string; lastMsg: any }> = {};
              posChatMessages.forEach((m) => {
                const key = m.senderPhone
                  ? `PHONE:${m.senderPhone}`
                  : m.tableNumber
                  ? `TABLE:${m.tableNumber}`
                  : "GENERAL";
                if (!threadMap[key]) {
                  threadMap[key] = {
                    key,
                    label: m.senderPhone
                      ? `${m.senderType === "CUSTOMER" ? m.senderName : "عميل"} (${m.senderPhone})`
                      : m.tableNumber
                      ? `ترابيزة ${m.tableNumber}`
                      : "رسائل عامة",
                    lastMsg: m,
                  };
                } else if (m.senderType === "CUSTOMER" && m.senderPhone) {
                  threadMap[key].label = `${m.senderName} (${m.senderPhone})`;
                }
                threadMap[key].lastMsg = m;
              });
              const threads = Object.values(threadMap).reverse();
              const visibleMsgs = posChatMessages.filter((m) => {
                if (selectedChatThread === "ALL") return true;
                if (selectedChatThread.startsWith("PHONE:")) return m.senderPhone === selectedChatThread.slice(6);
                if (selectedChatThread.startsWith("TABLE:")) return m.tableNumber === selectedChatThread.slice(6);
                return !m.senderPhone && !m.tableNumber;
              });

              return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0">
                  <div className="md:col-span-4 max-h-80 md:max-h-[420px] overflow-y-auto space-y-2 pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedChatThread("ALL")}
                      className={`w-full text-right p-2.5 rounded-xl border text-xs transition ${
                        selectedChatThread === "ALL"
                          ? "bg-sky-500/20 border-sky-400 text-sky-200 font-bold"
                          : "bg-black/40 border-white/10 text-slate-300"
                      }`}
                    >
                      📥 جميع المحادثات ({posChatMessages.length})
                    </button>
                    {threads.map((th) => (
                      <button
                        key={th.key}
                        type="button"
                        onClick={() => setSelectedChatThread(th.key)}
                        className={`w-full text-right p-2.5 rounded-xl border text-xs transition ${
                          selectedChatThread === th.key
                            ? "bg-sky-500/20 border-sky-400 text-white"
                            : "bg-black/40 border-white/10 text-slate-300"
                        }`}
                      >
                        <div className="font-bold truncate">{th.label}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {th.lastMsg?.message}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="md:col-span-8 flex flex-col gap-2 min-h-0">
                    <div className="h-80 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs">
                      {visibleMsgs.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.senderType === "STAFF" ? "items-start" : "items-end"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] p-2.5 rounded-2xl ${
                              msg.senderType === "STAFF"
                                ? "bg-amber-500 text-black font-bold"
                                : "bg-slate-800 text-white border border-white/10"
                            }`}
                          >
                            <div className="text-[10px] opacity-75 mb-0.5">
                              {msg.senderName}{" "}
                              {msg.senderPhone
                                ? `(${msg.senderPhone})`
                                : msg.tableNumber
                                ? `(ترابيزة ${msg.tableNumber})`
                                : ""}
                            </div>
                            <div>{msg.message}</div>
                            {msg.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewPosImage(msg.imageUrl)}
                                className="mt-2 block rounded-lg overflow-hidden border border-white/20 cursor-pointer"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={msg.imageUrl} alt="مرفق" className="max-w-[180px] max-h-[160px] object-cover" />
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-EG")}
                          </span>
                        </div>
                      ))}
                      {visibleMsgs.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          لا توجد رسائل مسجلة بعد
                        </div>
                      )}
                    </div>

                    {posChatImage && (
                      <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-xl border border-amber-500/30 text-xs">
                        <span className="text-emerald-300 font-bold">📎 تم إرفاق صورة وجاهزة للإرسال</span>
                        <button type="button" onClick={() => setPosChatImage("")} className="text-rose-400 font-bold cursor-pointer">حذف ✕</button>
                      </div>
                    )}

                    <form onSubmit={handleSendPosChatReply} className="flex items-center gap-2">
                      <label className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-amber-300 cursor-pointer shrink-0" title="إرفاق صورة">
                        <ImageIcon className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPosChatImage}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setUploadingPosChatImage(true);
                            const fd = new FormData();
                            fd.append("image", f);
                            try {
                              const r = await fetch("/api/upload", { method: "POST", body: fd });
                              const d = await r.json();
                              if (d.success && d.url) setPosChatImage(d.url);
                            } catch {}
                            setUploadingPosChatImage(false);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        placeholder={
                          selectedChatThread === "ALL"
                            ? "سيتم الرد على أحدث عميل (أو اختر عميلاً من اليمين)..."
                            : "اكتب رد الكاشير للعميل المحدد..."
                        }
                        value={posChatReply}
                        onChange={(e) => setPosChatReply(e.target.value)}
                        className="flex-1 py-2 px-3 rounded-xl bg-black/60 border border-white/15 text-xs text-white outline-none focus:border-sky-400"
                      />
                      <button
                        type="submit"
                        disabled={!posChatReply.trim() && !posChatImage}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        إرسال 💬
                      </button>
                    </form>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9C. MODAL: POS FRACTIONAL KG WEIGHT PICKER
         ───────────────────────────────────────────────────────────── */}
      {weightPickerItem && (() => {
        const wPricing = getItemDiscountPricing({ ...weightPickerItem, outlet: weightPickerItem.outlet || currentOutlet }, offers);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md no-print">
          <div className="bg-[#140e16] border-2 border-emerald-500/40 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setWeightPickerItem(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>تحديد الوزن — {weightPickerItem.nameAr}</span>
              </h3>
              <p className="text-xs text-amber-400 font-mono font-bold mt-0.5 flex items-center gap-2">
                <span>سعر الكيلو: {wPricing.finalPrice} ج.م</span>
                {wPricing.hasDiscount && (
                  <span className="text-slate-500 line-through">{wPricing.originalPrice} ج</span>
                )}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "ربع كيلو", sub: "250 جم", kg: 0.25 },
                { label: "نصف كيلو", sub: "500 جم", kg: 0.5 },
                { label: "كيلو إلا ربع", sub: "750 جم", kg: 0.75 },
                { label: "1 كيلو", sub: "1000 جم", kg: 1 },
                { label: "1.5 كيلو", sub: "1500 جم", kg: 1.5 },
                { label: "2 كيلو", sub: "2000 جم", kg: 2 },
              ].map((opt) => (
                <button
                  key={opt.kg}
                  type="button"
                  onClick={() => addWeightToPosCart(weightPickerItem, opt.kg)}
                  className="p-2.5 rounded-2xl bg-black/60 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-400 text-center cursor-pointer"
                >
                  <div className="font-black text-white">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{opt.sub}</div>
                  <div className="text-[11px] font-black text-emerald-400 font-mono">
                    {Math.round(wPricing.finalPrice * opt.kg)} ج
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                min={50}
                step={50}
                value={customGramsInput || ""}
                onChange={(e) => setCustomGramsInput(Number(e.target.value))}
                className="flex-1 py-2 px-3 rounded-xl bg-black/60 border border-white/15 text-white font-mono"
                placeholder="وزن بالجرام (مثال: 350)"
              />
              <button
                type="button"
                onClick={() => addWeightToPosCart(weightPickerItem, Math.max(0.05, (Number(customGramsInput) || 250) / 1000))}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer"
              >
                إضافة ({Math.round(((Number(customGramsInput) || 250) / 1000) * wPricing.finalPrice)} ج)
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {previewPosImage && (
        <div
          onClick={() => setPreviewPosImage(null)}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-pointer no-print"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewPosImage} alt="صورة" className="max-w-full max-h-[85vh] rounded-2xl border border-white/20" />
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

      {/* Order Revision & Payment Change Modals */}
      <OrderRevisionModals
        mode={revisionModalMode}
        order={revisionTargetOrder}
        menuItems={menuItems}
        defaultActorName={currentUser?.name || "كاشير الفرع"}
        onClose={() => {
          setRevisionModalMode(null);
          setRevisionTargetOrder(null);
        }}
        onSuccess={(updatedOrder, message, shouldPrint) => {
          setRevisionModalMode(null);
          setRevisionTargetOrder(null);
          setPosOrders((prev) => prev.map((x) => (x.id === updatedOrder.id ? updatedOrder : x)));
          if (shouldPrint || lastPrintedOrder?.id === updatedOrder.id) {
            setLastPrintedOrder(updatedOrder);
          }
          showToast("success", message);
          loadPosData();
          if (shouldPrint) {
            setTimeout(() => window.print(), 300);
          }
        }}
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
