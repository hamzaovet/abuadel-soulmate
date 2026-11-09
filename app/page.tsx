"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import CardQRModal from "@/components/CardQRModal";
import {
  Coffee,
  Cake,
  Phone,
  QrCode,
  Sparkles,
  ShoppingBag,
  Award,
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";

export default function DualBrandLandingPage() {
  const [activeBrand, setActiveBrand] = useState<"SOULMATE" | "ABU_ADEL">("SOULMATE");
  const [showQRCardModal, setShowQRCardModal] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [settings, setSettings] = useState<any>(null);

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

  // Filter items based on active brand
  const filteredItems = menuItems.filter((item) => {
    const isSoulmateItem = item.outlet?.code === "SOULMATE_CAFE" || item.itemType === "PREPARED_BEVERAGE";
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
                ? "☕ مرحباً بك في سول ميت كافيه VIP - قهوة مختصة وأجواء ساحرة"
                : "🍰 حلواني أبو عادل المستقل - حلي يومك مع المذاق المصري الأصيل (الخط الساخن: 15992)"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a
              href={settings?.haliyomakUrl || "https://haliyomak.com/"}
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 text-slate-300"
            >
              <span>بوابة حلي يومك</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">|</span>
            <Link
              href="/login"
              className="hover:underline flex items-center gap-1 text-amber-400 font-bold"
            >
              <LogIn className="w-3 h-3" />
              <span>دخول الموظفين والإدارة</span>
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
                  : "حلواني أبو عادل المستقل"}
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
              <span>كارت الـ 2 QR</span>
            </button>

            <Link
              href="/order"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-lg transition ${
                activeBrand === "SOULMATE"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/20"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>اطلب من ترابيزتك الآن 📱</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SHOWCASE SECTION */}
      <section className="relative overflow-hidden py-12 md:py-16 border-b border-slate-800">
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
                    ? "قهوة مختصة، باريستا محترف، وطلب ذكي من الترابيزة"
                    : "حلويات شرقية، تورت، وبوكسات هدايا ومناسبات فاخرة"}
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
                  ? "امسح الكيو آر كود من ترابيزتك، اختر مشروبك المفضل، ويصل طلبك مباشرة لشاشة الباريستا بدون أي انتظار. واكسب نقاط ولاء حصرية مع كل طلب!"
                  : "نقدم لكم أرقى تشكيلة من الحلويات الشرقية بالسمن البلدي الفاخر، والتورت والجاتوهات المعدة يومياً بأعلى معايير الجودة لتشارككم أجمل اللحظات."}
              </p>

              {/* Call to Actions & Hotline */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <Link
                  href="/order"
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black shadow-xl transition ${
                    activeBrand === "SOULMATE"
                      ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>فتح المنيو والطلب من الترابيزة</span>
                </Link>

                <a
                  href={`tel:${
                    activeBrand === "SOULMATE"
                      ? settings?.soulmatePhone || "01099887766"
                      : settings?.hotline || "15992"
                  }`}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-3 rounded-xl text-sm font-bold transition shadow"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>
                    {activeBrand === "SOULMATE"
                      ? `هاتف الكافيه: ${settings?.soulmatePhone || "01099887766"}`
                      : `الخط الساخن: ${settings?.hotline || "15992"}`}
                  </span>
                </a>
              </div>
            </div>

            {/* Hero Right Visual Card */}
            <div className="relative">
              <div
                className={`rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
                  activeBrand === "SOULMATE"
                    ? "bg-gradient-to-br from-stone-900 to-amber-950/40 border-amber-500/30"
                    : "bg-gradient-to-br from-slate-900 to-emerald-950/40 border-emerald-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">
                      مفتوح للخدمة والطلبات اليوم
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {new Date().toLocaleDateString("ar-EG")}
                  </span>
                </div>

                {/* Features highlight */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Digital QR Ordering (طلب ذكي فوري)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        اطلب مباشرة من هاتفك بالجلوس على أي ترابيزة بدون منيو ورقي ملوث.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        ربط فوري بشاشة الباريستا (Live KDS)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        الطلب يطير فوراً لمحطة التحضير مع تنبيه صوتي لضمان أسرع تقديم.
                      </p>
                    </div>
                  </div>

                  {settings?.isLoyaltyEnabled && (
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-purple-300">
                          برنامج ولاء ومكافآت سول ميت ⭐
                        </h4>
                        <p className="text-[11px] text-purple-200/80">
                          كل فنجان قهوة بيقربك من مشروبك المفضل مجاناً مع نقاط Soulmate VIP.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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
                  ? "bg-slate-100 text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              جميع الأصناف
            </button>

            {activeBrand === "SOULMATE" ? (
              <>
                <button
                  onClick={() => setSelectedCategory("HOT_COFFEE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === "HOT_COFFEE"
                      ? "bg-amber-500 text-black"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  قهوة ساخنة ☕
                </button>
                <button
                  onClick={() => setSelectedCategory("COLD_COFFEE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === "COLD_COFFEE"
                      ? "bg-amber-500 text-black"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  مشروبات مثلجة ومثلجات 🧊
                </button>
                <button
                  onClick={() => setSelectedCategory("WAFFLES_PANCAKES")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === "WAFFLES_PANCAKES"
                      ? "bg-amber-500 text-black"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  وافل وبان كيك 🥞
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectedCategory("ORIENTAL_SWEETS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === "ORIENTAL_SWEETS"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  شرقيات ملكية 🍯
                </button>
                <button
                  onClick={() => setSelectedCategory("CAKES_TORTES")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === "CAKES_TORTES"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  تورت وكيك مناسبات 🎂
                </button>
                <button
                  onClick={() => setSelectedCategory("GIFT_BOXES")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === "GIFT_BOXES"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  بوكسات وعلب هدايا 🎁
                </button>
              </>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {item.category}
                  </span>
                  {item.loyaltyPointsEarned > 0 && settings?.isLoyaltyEnabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      +{item.loyaltyPointsEarned} نقطة ⭐
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
                  {item.nameAr}
                </h3>
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
                  href="/order"
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

      {/* 5. FOOTER & CONTACT */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              👑
            </div>
            <div>
              <div className="font-bold text-white">
                منظومة حلواني أبو عادل المستقل & سول ميت كافيه VIP
              </div>
              <div className="text-[10px] text-slate-400">
                نظام إدارة الكافيهات والمطاعم السحابي الذكي (Table POS + KDS + Loyalty)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a
              href={settings?.haliyomakUrl || "https://haliyomak.com/"}
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-400 transition"
            >
              موقع أبو عادل (haliyomak.com)
            </a>
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
      </footer>

      {/* 6. MODAL 2-QR CARDS */}
      <CardQRModal
        isOpen={showQRCardModal}
        onClose={() => setShowQRCardModal(false)}
        hotline={settings?.hotline || "15992"}
        soulmatePhone={settings?.soulmatePhone || "01099887766"}
        abuAdelPhone={settings?.abuAdelPhone || "15992"}
      />
    </div>
  );
}
