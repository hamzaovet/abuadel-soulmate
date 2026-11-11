"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function DualBrandLandingPage() {
  const [activeBrand, setActiveBrand] = useState<"SOULMATE" | "ABU_ADEL">("SOULMATE");
  const [showQRCardModal, setShowQRCardModal] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [settings, setSettings] = useState<any>(null);

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
        const [menuRes, settingsRes] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/settings"),
        ]);
        const [menuData, settingsData] = await Promise.all([
          menuRes.json(),
          settingsRes.json(),
        ]);
        if (menuData.success) {
          setMenuItems(menuData.items);
        }
        if (settingsData.success) {
          setSettings(settingsData.settings);
        }
      } catch (err) {
        console.error("Failed to load landing data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div
        className={`py-2 px-4 text-center text-xs font-bold transition-colors ${
          activeBrand === "SOULMATE"
            ? "bg-amber-500/10 text-amber-300 border-b border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {activeBrand === "SOULMATE"
                ? "☕ مرحباً بك في سول ميت كافيه VIP - قهوة مختصة وأجواء استثنائية مع خدمة الطلب من الترابيزة"
                : "🍰 حلواني أبو عادل - حلي يومك مع المذاق المصري الأصيل وتوصيل دليفري (حجوزات وطلبات: 01146862114)"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400">
              منظومة سحابية متكاملة (POS + KDS + دليفري)
            </span>
            <span className="text-slate-600">|</span>
            <Link
              href="/login"
              className="hover:underline flex items-center gap-1 text-amber-400 font-bold"
            >
              <LogIn className="w-3 h-3" />
              <span>دخول الإدارة والتشغيل</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER & BRAND SWITCHER */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-transform hover:scale-105 ${
                activeBrand === "SOULMATE"
                  ? "bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-amber-500/20"
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20"
              }`}
            >
              {activeBrand === "SOULMATE" ? "S" : "ع"}
            </div>
            <div>
              <h1 className="text-base font-black text-white">
                {activeBrand === "SOULMATE"
                  ? "سول ميت كافيه VIP"
                  : "حلواني أبو عادل"}
              </h1>
              <p className="text-[11px] text-slate-400">
                {activeBrand === "SOULMATE"
                  ? "Soulmate Specialty Coffee & Lounge"
                  : "Abu Adel Authentic Patisserie (حلي يومك)"}
              </p>
            </div>
          </div>

          {/* Interactive Brand Selector Pills */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
            <button
              onClick={() => {
                setActiveBrand("SOULMATE");
                setSelectedCategory("ALL");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
                activeBrand === "SOULMATE"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>☕ سول ميت كافيه</span>
            </button>

            <button
              onClick={() => {
                setActiveBrand("ABU_ADEL");
                setSelectedCategory("ALL");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
                activeBrand === "ABU_ADEL"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>🍰 حلواني أبو عادل</span>
            </button>
          </div>

          {/* Header Quick CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQRCardModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow"
            >
              <QrCode className="w-4 h-4" />
              <span>كارت الـ 3 QR</span>
            </button>

            <Link
              href={activeBrand === "ABU_ADEL" ? "/order?brand=abuadel&mode=delivery" : "/order?brand=soulmate"}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-lg transition ${
                activeBrand === "SOULMATE"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/20"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>اطلب الآن 📱</span>
            </Link>
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

      {/* 4. DIGITAL MENU & SHOWCASE CATALOG */}
      <section className="py-10 max-w-7xl mx-auto px-4 w-full flex-1">
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

        {/* Product Cards Grid with REAL IMAGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
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
                            ? "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600"
                            : "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600";
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {getCategoryLabel(item.category)}
                  </span>
                  {item.loyaltyPointsEarned > 0 && settings?.isLoyaltyEnabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      +{item.loyaltyPointsEarned}★
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
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {item.price} <span className="text-xs font-normal text-slate-400">ج.م</span>
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
          ))}

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
