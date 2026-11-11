"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CardQRModal from "@/components/CardQRModal";
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
  calculateEarnedPoints,
  extractLoyaltyConfig,
  getLoyaltyProgress,
} from "@/lib/loyalty";
import {
  Coffee,
  Cake,
  Phone,
  QrCode,
  Sparkles,
  ShoppingBag,
  Award,
  Clock,
  MapPin,
  ExternalLink,
  Flame,
  ShieldCheck,
  Heart,
  LogIn,
  Search,
  CheckCircle2,
  DollarSign,
  UtensilsCrossed,
  Calendar,
  PartyPopper,
  X,
  Truck,
  Send,
  MessageCircle,
  Gift,
  Trophy,
} from "lucide-react";

export default function DualBrandLandingPage() {
  const [activeBrand, setActiveBrand] = useState<"SOULMATE" | "ABU_ADEL">("SOULMATE");
  const [showQRCardModal, setShowQRCardModal] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [settings, setSettings] = useState<any>(null);
  const [offers, setOffers] = useState<OfferData>(DEFAULT_OFFERS);
  const [loyaltyPhoneInput, setLoyaltyPhoneInput] = useState("");
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<any>(null);
  const [checkingLoyalty, setCheckingLoyalty] = useState(false);

  // Reservation & Party Modal State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationType, setReservationType] = useState<"TABLE" | "PARTY">("TABLE");
  const [resForm, setResForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    guestCount: "2",
    bookingDate: new Date().toISOString().split("T")[0],
    timeSlot: "08:00 مساءً",
    zonePreference: "INDOOR",
    specialRequests: "",
  });
  const [submittingRes, setSubmittingRes] = useState(false);

  // Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [menuRes, settingsRes, offersRes] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/settings"),
          fetch("/api/public/offers", { cache: "no-store" }),
        ]);
        const [menuData, settingsData, offersData] = await Promise.all([
          menuRes.json(),
          settingsRes.json(),
          offersRes.ok ? offersRes.json() : null,
        ]);
        if (menuData.success) {
          setMenuItems(menuData.items);
        }
        if (settingsData.success) {
          setSettings(settingsData.settings);
        }
        if (offersData && typeof offersData === "object") {
          setOffers({ ...DEFAULT_OFFERS, ...offersData });
        }

        // Load saved customer session/phone hint to auto-populate Loyalty Meter
        try {
          const savedSession = localStorage.getItem("abuadel_customer_session");
          const savedHint = localStorage.getItem("abuadel_customer_phone_hint");
          let lookupPhone = savedHint || "";
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed?.phone) lookupPhone = parsed.phone;
          }
          if (lookupPhone) {
            setLoyaltyPhoneInput(lookupPhone);
            const custRes = await fetch(`/api/customers?phone=${encodeURIComponent(lookupPhone)}`);
            const custData = await custRes.json();
            if (custData.success && custData.customer) {
              setLoyaltyCustomer(custData.customer);
            }
          }
        } catch {
          // Non-fatal
        }
      } catch (err) {
        console.error("Failed to load landing data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCheckLoyaltyByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = loyaltyPhoneInput.trim();
    if (!clean) {
      showToast("أدخل رقم الموبايل للاستعلام عن نقاطك ⭐");
      return;
    }
    try {
      setCheckingLoyalty(true);
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setLoyaltyCustomer(data.customer);
        localStorage.setItem("abuadel_customer_phone_hint", clean);
        showToast(`مرحباً ${data.customer.name}! رصيدك الحالي ${(data.customer.loyaltyPoints || 0).toLocaleString()} نقطة ⭐`);
      } else {
        setLoyaltyCustomer(null);
        showToast("لم نجد نقاطاً مسجلة لهذا الرقم بعد — اطلب الآن وابدأ التجميع فوراً! 🎁");
      }
    } catch {
      showToast("تعذر التحقق من النقاط حالياً");
    } finally {
      setCheckingLoyalty(false);
    }
  };

  // Submit Reservation
  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.customerName || !resForm.customerPhone || !resForm.bookingDate) {
      showToast("برجاء إدخال الاسم ورقم الهاتف وتاريخ الحجز");
      return;
    }

    try {
      setSubmittingRes(true);
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resForm,
          reservationType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "تم تسجيل الحجز بنجاح ⭐");
        setShowReservationModal(false);
        setResForm({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          guestCount: "2",
          bookingDate: new Date().toISOString().split("T")[0],
          timeSlot: "08:00 مساءً",
          zonePreference: "INDOOR",
          specialRequests: "",
        });
      } else {
        showToast(data.error || "فشل تسجيل الحجز");
      }
    } catch {
      showToast("حدث خطأ أثناء إرسال طلب الحجز");
    } finally {
      setSubmittingRes(false);
    }
  };

  // Filter items based on active brand
  const filteredItems = menuItems.filter((item) => {
    const isSoulmateItem =
      item.outlet?.code === "SOULMATE_CAFE" || item.itemType === "PREPARED_BEVERAGE";
    const matchesBrand = activeBrand === "SOULMATE" ? isSoulmateItem : !isSoulmateItem;
    if (!matchesBrand) return false;
    if (selectedCategory === "ALL") return true;
    return item.category === selectedCategory;
  });

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-500 ${
        activeBrand === "SOULMATE"
          ? "bg-gradient-to-b from-stone-950 via-slate-950 to-stone-950"
          : "bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950"
      }`}
    >
      {/* 1. COMPACT TOP UTILITY STRIP (Mobile-First Clean Single Line) */}
      <div
        className={`py-1.5 px-3 sm:px-4 text-[11px] font-bold transition-colors ${
          activeBrand === "SOULMATE"
            ? "bg-amber-500/10 text-amber-300 border-b border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate md:hidden">
              {activeBrand === "SOULMATE"
                ? "☕ سول ميت كافيه VIP"
                : "🍰 أبو عادل • دليفري 15992"}
            </span>
            <span className="hidden md:inline truncate">
              {activeBrand === "SOULMATE"
                ? "☕ مرحباً بك في سول ميت كافيه VIP - قهوة مختصة وأجواء استثنائية مع خدمة الطلب من الترابيزة"
                : "🍰 حلواني أبو عادل - حلي يومك مع المذاق المصري الأصيل وتوصيل دليفري (حجوزات وطلبات: 01146862114)"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden lg:inline text-slate-400">
              منظومة سحابية متكاملة (POS + KDS + دليفري)
            </span>
            <span className="hidden lg:inline text-slate-600">|</span>
            <ThemeToggle compact />
            <Link
              href="/login"
              className="hover:underline flex items-center gap-1 text-amber-400 font-black whitespace-nowrap px-2 py-1 rounded-lg bg-slate-900/60 border border-amber-500/25"
            >
              <LogIn className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">دخول الإدارة والتشغيل</span>
              <span className="sm:hidden">الإدارة</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER & BRAND SWITCHER (Sleek Mobile + Desktop Navbar) */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg shrink-0 transition-transform hover:scale-105 ${
                activeBrand === "SOULMATE"
                  ? "bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-amber-500/20"
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20"
              }`}
            >
              {activeBrand === "SOULMATE" ? "S" : "ع"}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                {activeBrand === "SOULMATE"
                  ? "سول ميت كافيه VIP"
                  : "حلواني أبو عادل"}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {activeBrand === "SOULMATE"
                  ? "Soulmate Specialty Coffee"
                  : "Abu Adel Patisserie (حلي يومك)"}
              </p>
            </div>
          </div>

          {/* Header Quick CTA (Always crisp single row on right/left) */}
          <div className="flex items-center gap-1.5 sm:gap-2 order-2 lg:order-3">
            <Link
              href="/install"
              className="flex items-center gap-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/35 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black transition shadow-sm whitespace-nowrap"
              title="تثبيت التطبيق على الموبايل وتفعيل إشعارات الخلفية"
            >
              <span>📲</span>
              <span className="hidden sm:inline">تثبيت التطبيق</span>
            </Link>

            <button
              onClick={() => setShowQRCardModal(true)}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm whitespace-nowrap cursor-pointer"
              title="عرض وطباعة كارت الـ 3 QR"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">كارت الـ 3 QR</span>
              <span className="sm:hidden">QR</span>
            </button>

            <Link
              href={activeBrand === "ABU_ADEL" ? "/order?brand=abuadel&mode=delivery" : "/order?brand=soulmate"}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black shadow-lg transition whitespace-nowrap ${
                activeBrand === "SOULMATE"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/20"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>اطلب الآن</span>
            </Link>
          </div>

          {/* Interactive Brand Selector Pills (Full neat row on mobile, centered on desktop) */}
          <div className="w-full lg:w-auto order-3 lg:order-2 flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
            <button
              onClick={() => {
                setActiveBrand("SOULMATE");
                setSelectedCategory("ALL");
              }}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeBrand === "SOULMATE"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>☕ سول ميت كافيه</span>
            </button>

            <button
              onClick={() => {
                setActiveBrand("ABU_ADEL");
                setSelectedCategory("ALL");
              }}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeBrand === "ABU_ADEL"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>🍰 حلواني أبو عادل</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SHOWCASE SECTION */}
      <section className="relative overflow-hidden py-10 md:py-14 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Hero Left Text */}
            <div className="space-y-4">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                  activeBrand === "SOULMATE"
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {activeBrand === "SOULMATE"
                    ? "قهوة مختصة، باريستا محترف، وحجز ترابيزات وحفلات راقية"
                    : "حلويات شرقية بالسمن البلدي، تورت، وبوكسات هدايا وتوصيل دليفري لجميع المناطق"}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                {activeBrand === "SOULMATE" ? (
                  <>
                    استمتع بأفخر فنجان قهوة في{" "}
                    <span className="text-amber-400">سول ميت كافيه VIP</span>
                  </>
                ) : (
                  <>
                    حلي يومك مع الأصالة والمذاق الملكي في{" "}
                    <span className="text-emerald-400">حلواني أبو عادل</span>
                  </>
                )}
              </h1>

              <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                {activeBrand === "SOULMATE"
                  ? "امسح الكيو آر كود من ترابيزتك، اختر مشروبك المفضل، ويصل طلبك فوراً لشاشة الباريستا بدون أي انتظار. واكسب نقاط ولاء حصرية مع كل طلب!"
                  : "نقدم لكم أرقى تشكيلة من الحلويات الشرقية بالسمن البلدي الفاخر، والتورت والجاتوهات المعدة يومياً بأعلى معايير الجودة — اطلب أونلاين دليفري لأي مكان أو استلم من الفرع."}
              </p>

              {/* Call to Actions & Hotline */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <Link
                  href={activeBrand === "ABU_ADEL" ? "/order?brand=abuadel&mode=delivery" : "/order?brand=soulmate"}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black shadow-xl transition ${
                    activeBrand === "SOULMATE"
                      ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  }`}
                >
                  {activeBrand === "SOULMATE" ? (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>اطلب من الترابيزة / تيك أواي / دليفري</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>اطلب دليفري أو استلام من الفرع 🛵</span>
                    </>
                  )}
                </Link>

                <a
                  href={`tel:${
                    activeBrand === "SOULMATE"
                      ? settings?.soulmatePhone || "01099887766"
                      : settings?.abuAdelPhone || "01146862114"
                  }`}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-3 rounded-xl text-sm font-bold transition shadow"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>
                    {activeBrand === "SOULMATE"
                      ? `هاتف الكافيه: ${settings?.soulmatePhone || "01099887766"}`
                      : `حجوزات وطلبات: ${settings?.abuAdelPhone || "01146862114"}`}
                  </span>
                </a>
              </div>
            </div>

            {/* Hero Right Visual: PROMOTIONS & RESERVATIONS BANNER */}
            <div className="space-y-4">
              {/* Table Booking Banner (Strictly Soulmate Only — Abu Adel has NO Tables/Hall!) */}
              {activeBrand === "SOULMATE" ? (
                <div className="bg-gradient-to-br from-stone-900 to-amber-950/50 border border-amber-500/40 rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-white">
                        حجز ترابيزة VIP مسبقاً (صالة داخلية أو تراس)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      اضمن جلوسك بأرقى مكان مع إطلالة هادئة ومشروبات ترحيبية جاهزة فور وصولك.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReservationType("TABLE");
                      setShowReservationModal(true);
                    }}
                    className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg transition"
                  >
                    احجز ترابيزتك 🥂
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950/50 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        توصيل دليفري سريع لجميع المناطق 🛵
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      نصلك أينما كنت! اختر منطقتك واعرف رسوم التوصيل فوراً واستمتع بالحلويات طازجة لباب البيت أو استلمها بنفسك من المحل.
                    </p>
                  </div>
                  <Link
                    href="/order?brand=abuadel&mode=delivery"
                    className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition"
                  >
                    اطلب دليفري 🛵
                  </Link>
                </div>
              )}

              {/* Birthday & Party Booking Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-purple-950/50 border border-purple-500/40 rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">
                      {activeBrand === "SOULMATE"
                        ? "إقامة الحفلات والمناسبات وأعياد الميلاد 🎉"
                        : "حجز تورت المناسبات وبوكسات الهدايا الخاصة 🎂"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    {activeBrand === "SOULMATE"
                      ? "باقات حفلات متكاملة: تزيين احترافي، موسيقى خاصة، وتورتة حلواني أبو عادل المخصصة!"
                      : "احجز تورتتك الخاصة لحفلتك أو أعياد الميلاد بتصميمات فاخرة ومذاق لا يُقاوم."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setReservationType("PARTY");
                    setShowReservationModal(true);
                  }}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg transition"
                >
                  {activeBrand === "SOULMATE" ? "احجز حفلتك 🎂" : "احجز تورتتك 🎂"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.5 SPECIAL OFFERS SECTION (Managed Live from Dashboard — Waffle House Engine) */}
      {offers.enabled !== false && (
        <section id="offers" className="py-8 max-w-7xl mx-auto px-4 w-full border-b border-slate-800/80">
          <div className="mb-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full mb-2">
              <Flame className="w-3.5 h-3.5" />
              <span>{offers.badge}</span>
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white">{offers.title}</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">{offers.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {offers.cards.map((card, idx) => (
              <Link
                key={card.id || idx}
                href={activeBrand === "ABU_ADEL" ? "/order?brand=abuadel&mode=delivery" : "/order?brand=soulmate"}
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 flex items-center justify-between gap-4 transition group shadow-lg"
              >
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                  {card.icon === "delivery"
                    ? "🛵"
                    : card.icon === "student"
                    ? "🎓"
                    : card.icon === "gift"
                    ? "🎁"
                    : card.icon === "fire"
                    ? "🔥"
                    : card.icon === "star"
                    ? "⭐"
                    : "🎉"}
                </div>
              </Link>
            ))}
          </div>

          {offers.banner && (
            <Link
              href={offers.banner.linkHref || "#menu"}
              data-force-dark="true"
              className="relative block min-h-[150px] rounded-3xl overflow-hidden border border-amber-500/35 shadow-2xl group"
            >
              <div
                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: `url('${offers.banner.image || "/products/nawaem-mix-real.webp"}')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/95 via-black/75 to-black/30" />
              <div className="relative z-10 p-6 md:p-8 flex flex-col justify-center min-h-[150px] max-w-2xl space-y-1.5">
                <span className="text-[11px] font-black text-amber-400">{offers.banner.badge}</span>
                <h3 className="text-xl md:text-2xl font-black text-white leading-snug">
                  {offers.banner.title}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300 pt-1">
                  <span>{offers.banner.linkText}</span>
                  <span>←</span>
                </span>
              </div>
            </Link>
          )}
        </section>
      )}

      {/* 3.6 UNIFIED CUSTOMER LOYALTY COUNTER & PROGRESS WIDGET (Abu Adel & Soulmate) */}
      {settings?.isLoyaltyEnabled !== false && (() => {
        const lCfg = extractLoyaltyConfig(settings);
        const lProg = loyaltyCustomer ? getLoyaltyProgress(loyaltyCustomer.loyaltyPoints, settings) : null;
        return (
          <section className="max-w-7xl mx-auto px-4 w-full pt-6">
            <div className="bg-gradient-to-r from-amber-950/35 via-slate-900 to-emerald-950/35 border border-amber-500/35 rounded-3xl p-5 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                <div className="lg:col-span-7 space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>نادي مكافآت أبو عادل & سول ميت VIP 🎁</span>
                  </div>
                  <h3 className="text-base md:text-lg font-black text-white">
                    {lProg
                      ? `أهلاً بك يا ${loyaltyCustomer.name}! رصيدك ${(loyaltyCustomer.loyaltyPoints || 0).toLocaleString()} نقطة ⭐`
                      : `جمع ${lCfg.loyaltyRewardThreshold.toLocaleString()} نقطة واكسب هدية بقيمة ${lCfg.loyaltyRewardValue} ج.م!`}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lProg ? lProg.motivationalHeadline : lCfg.loyaltyMotivationalMsg}
                  </p>
                  {lProg && (
                    <div className="pt-1 space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-amber-300">
                          الهدف: {lProg.threshold.toLocaleString()} نقطة = هدية {lProg.rewardValue} ج.م
                        </span>
                        <span className="text-emerald-400 font-mono">{lProg.progressPct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/70 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${lProg.progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5">
                  <form onSubmit={handleCheckLoyaltyByPhone} className="bg-black/50 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      استعلم برقم موبايلك عن عداد نقاطك والهدايا المستحقة:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={loyaltyPhoneInput}
                        onChange={(e) => setLoyaltyPhoneInput(e.target.value)}
                        placeholder="010XXXXXXXX"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        disabled={checkingLoyalty}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer shrink-0"
                      >
                        {checkingLoyalty ? "..." : "استعلام ★"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 4. DIGITAL MENU & SHOWCASE CATALOG */}
      <section id="menu" className="py-10 max-w-7xl mx-auto px-4 w-full flex-1">
        {/* Active Promotional Discount Banner */}
        {offers.enabled !== false && offers.discount?.enabled && offers.discount.value > 0 && (
          <div className="mb-6 bg-gradient-to-r from-rose-950/60 via-amber-950/40 to-rose-950/60 border-2 border-rose-500/45 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🔥</span>
              <div>
                <div className="text-sm font-black text-white">{offers.discount.title}</div>
                <div className="text-xs text-rose-200">
                  {offers.discount.scope === "all"
                    ? "يطبق الخصم تلقائياً الآن عند الإضافة للسلة!"
                    : offers.discount.scope === "category"
                    ? `خصم تلقائي على قسم (${getCategoryLabel(offers.discount.categoryName)})!`
                    : "خصم تلقائي على الأصناف المميزة بالشارة الحمراء 🔥!"}
                </div>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs shadow">
              {offers.discount.type === "percentage"
                ? `خصم ${offers.discount.value}%`
                : `وفر ${offers.discount.value} ج.م`}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              {activeBrand === "SOULMATE" ? (
                <>
                  <Coffee className="w-6 h-6 text-amber-400" />
                  <span>قائمة مشروبات وضيافة سول ميت كافيه</span>
                </>
              ) : (
                <>
                  <Cake className="w-6 h-6 text-emerald-400" />
                  <span>تشكيلة حلويات ومنتجات حلواني أبو عادل</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeBrand === "SOULMATE"
                ? "معدّة بأجود خامات البن والألبان والنكهات الإيطالية الأصلية"
                : "أصناف تامة الصنع طازجة يومياً بالسمن البلدي والمكسرات الفاخرة"}
            </p>
          </div>

          {/* Quick Categories Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === "ALL"
                  ? "bg-slate-100 text-slate-950 font-black shadow"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              جميع الأصناف ({filteredItems.length})
            </button>

            {(activeBrand === "SOULMATE" ? SOULMATE_CATEGORIES : ABU_ADEL_CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? activeBrand === "SOULMATE"
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

        {/* Product Cards Grid with REAL IMAGES + LIVE PROMOTIONAL PRICING */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const pricing = getItemDiscountPricing(item, offers);
            const estPoints = calculateEarnedPoints(pricing.finalPrice, item.outlet?.code, settings);
            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 shadow-lg transition flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {/* Product Card Image Banner */}
                  {item.image && (
                    <div className="w-full h-40 rounded-xl overflow-hidden mb-3 bg-slate-950 border border-slate-800 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.nameAr}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src =
                            item.itemType === "READY_PASTRY"
                              ? "/products/nawaem-mix-real.webp"
                              : "/products/cafe-cappuccino.webp";
                        }}
                      />
                      {pricing.hasDiscount && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black shadow-lg">
                          {pricing.badgeText}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {getCategoryLabel(item.category)}
                    </span>
                    {estPoints > 0 && settings?.isLoyaltyEnabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        +{estPoints}★
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                    {item.nameAr}
                  </h3>
                  {item.nameEn && (
                    <p className="text-[11px] text-amber-300/70 font-mono font-medium truncate mt-0.5" dir="ltr">
                      {item.nameEn}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {item.description || "صنف فاخر معد بأعلى معايير الجودة والضيافة."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {pricing.hasDiscount && (
                        <span className="text-xs text-slate-500 line-through font-mono">
                          {pricing.originalPrice}
                        </span>
                      )}
                      <div className={`text-lg font-black font-mono ${pricing.hasDiscount ? "text-rose-400" : "text-amber-400"}`}>
                        {pricing.finalPrice} <span className="text-xs font-normal text-slate-400">ج.م</span>
                      </div>
                    </div>
                    {item.itemType === "READY_PASTRY" && (
                      <span className="text-[10px] text-slate-400">
                        {item.unitType === "KG" ? "لكل كيلو" : "للقطعة / العلبة"}
                      </span>
                    )}
                  </div>

                  <Link
                    href={activeBrand === "ABU_ADEL" ? "/order?brand=abuadel&mode=delivery" : "/order?brand=soulmate"}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-black text-slate-200 transition shadow"
                    title="اطلب الآن"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm">
              لا توجد أصناف مسجلة في هذا القسم حالياً
            </div>
          )}
        </div>
      </section>

      {/* 5. RESERVATION & PARTY BOOKING MODAL */}
      {showReservationModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120d14] border-2 border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-right space-y-4">
            <button
              onClick={() => setShowReservationModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl flex-shrink-0">
                {reservationType === "PARTY" ? "🎉" : "🥂"}
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {reservationType === "PARTY"
                    ? "حجز باقة حفلة أو عيد ميلاد خاصة"
                    : "حجز ترابيزة VIP مسبقاً في كافيه سول ميت"}
                </h3>
                <p className="text-xs text-slate-400">
                  {reservationType === "PARTY"
                    ? "تجهيز الطاولة، ديكورات احتفالية، وتورتة مخصصة من حلواني أبو عادل"
                    : "اختر موعدك والصالة المفضلة وسنكون بانتظارك"}
                </p>
              </div>
            </div>

            <form onSubmit={handleReservationSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">الاسم الكريم *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ / كريم محمود"
                  value={resForm.customerName}
                  onChange={(e) => setResForm({ ...resForm, customerName: e.target.value })}
                  className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">رقم الموبايل *</label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={resForm.customerPhone}
                    onChange={(e) => setResForm({ ...resForm, customerPhone: e.target.value })}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">عدد الأفراد *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={resForm.guestCount}
                    onChange={(e) => setResForm({ ...resForm, guestCount: e.target.value })}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">تاريخ الحجز *</label>
                  <input
                    type="date"
                    required
                    value={resForm.bookingDate}
                    onChange={(e) => setResForm({ ...resForm, bookingDate: e.target.value })}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الوقت المفضل</label>
                  <select
                    value={resForm.timeSlot}
                    onChange={(e) => setResForm({ ...resForm, timeSlot: e.target.value })}
                    className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="06:00 مساءً">06:00 مساءً</option>
                    <option value="07:00 مساءً">07:00 مساءً</option>
                    <option value="08:00 مساءً">08:00 مساءً</option>
                    <option value="09:00 مساءً">09:00 مساءً</option>
                    <option value="10:00 مساءً">10:00 مساءً</option>
                    <option value="11:00 مساءً">11:00 مساءً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">المنطقة المفضلة</label>
                <select
                  value={resForm.zonePreference}
                  onChange={(e) => setResForm({ ...resForm, zonePreference: e.target.value })}
                  className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="INDOOR">صالة داخلية مكيفة هادئة</option>
                  <option value="OUTDOOR_TERRACE">تراس خارجي في الهواء الطلق</option>
                  <option value="VIP_LOUNGE">ركن الـ VIP الفاخر</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ملاحظات أو طلبات خاصة (تزيين، نوع التورتة...)</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={resForm.specialRequests}
                  onChange={(e) => setResForm({ ...resForm, specialRequests: e.target.value })}
                  className="w-full bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRes}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition disabled:opacity-50"
              >
                {submittingRes ? "جارٍ تسجيل الحجز..." : "تأكيد طلب الحجز الآن ⭐"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. GRAND FOOTER WITH ORCA TECH DEVELOPER SIGNATURE */}
      <footer className="bg-slate-950 border-t border-slate-900 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              👑
            </div>
            <div>
              <div className="font-bold text-white">
                منظومة حلواني أبو عادل & سول ميت كافيه VIP
              </div>
              <div className="text-[10px] text-slate-400">
                نظام إدارة الكافيهات والمطاعم السحابي الذكي (Table POS + KDS + Loyalty + Delivery)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a
              href={settings?.facebookUrl || "https://www.facebook.com/hashtag/soulmate_cafe"}
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-400 transition"
            >
              جروب وفيسبوك سول ميت
            </a>
            <Link href="/login" className="hover:text-amber-400 transition font-bold">
              لوحة تحكم الطاقم
            </Link>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            الخط الساخن: 15992 • موبايل: 01099887766
          </div>
        </div>

        {/* 🐬 GRAND ORCA TECH SIGNATURE */}
        <div className="border-t border-slate-900 bg-black/80 py-5 px-4 text-center space-y-1.5 text-xs">
          <p className="text-slate-400 font-bold">
            جميع الحقوق محفوظة © {new Date().getFullYear()} لـ{" "}
            <span className="text-amber-400 font-black">مجموعة حلواني أبو عادل & سول ميت كافيه VIP</span>
          </p>

          <p className="text-[11px] text-amber-300/90 font-medium">
            تصميم وتطوير المنظومة الذكية:{" "}
            <strong className="text-white font-black">م / حمزة عباس</strong> — شركة{" "}
            <strong className="text-amber-400 font-black">أوركا للحلول البرمجية والذكاء الاصطناعي (Orca Tech) 🐬</strong>
          </p>

          <p className="text-[10px] text-slate-500 font-mono">
            خدمة الدعم الفني المباشر وتطوير الأنظمة: 01018671000
          </p>
        </div>
      </footer>

      {/* 7. MODAL 3-QR CARDS */}
      <CardQRModal
        isOpen={showQRCardModal}
        onClose={() => setShowQRCardModal(false)}
        hotline={settings?.hotline || "15992"}
        soulmatePhone={settings?.soulmatePhone || "01099887766"}
        abuAdelPhone={settings?.abuAdelPhone || "15992"}
      />

      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 shadow-2xl text-xs font-bold animate-fade-in">
          <span>ℹ️</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
