"use client";

import React, { useState, useEffect, Suspense } from "react";
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
} from "lucide-react";

function TableOrderContent() {
  const searchParams = useSearchParams();
  const initialTable = searchParams.get("table") || "T-01";

  const [tableNumber, setTableNumber] = useState<string>(initialTable);
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
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);

  // Floating Toast State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter items by active brand & category
  const soulmateOutlet = outlets.find((o) => o.code === "SOULMATE_CAFE");
  const abuAdelOutlet = outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE");

  const filteredItems = menuItems.filter((item) => {
    const isBrandMatch =
      activeBrandTab === "SOULMATE"
        ? item.outletId === soulmateOutlet?.id || item.itemType === "PREPARED_BEVERAGE"
        : item.outletId === abuAdelOutlet?.id || item.itemType === "READY_PASTRY";

    const isCategoryMatch = activeCategory === "ALL" || item.category === activeCategory;
    return isBrandMatch && isCategoryMatch && item.isAvailable;
  });

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
          image: item.image,
        },
      ];
    });
    showToast("success", `تمت إضافة (${item.nameAr}) للطلب 🛒`);
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const nextQty = i.qty + delta;
            return nextQty > 0 ? { ...i, qty: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as any[];
    });
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartItemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // Submit Order from Table
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast("error", "السلة فارغة! يرجى اختيار مشروبات أو حلويات أولاً");
      return;
    }

    try {
      setSubmittingOrder(true);
      const matchedTable = tables.find((t) => t.tableNumber === tableNumber);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: soulmateOutlet?.id || outlets[0]?.id,
          orderType: "DINE_IN",
          tableId: matchedTable?.id || null,
          tableNumber,
          items: cart,
          customerName: customerName.trim() || `عميل ترابيزة ${tableNumber}`,
          customerPhone: customerPhone.trim() || null,
          notes: orderNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setSubmittedOrder(data.order);
        setCart([]);
        showToast("success", "تم إرسال طلبك فورياً للباريستا والمطبخ! ☕🎉");
      } else {
        showToast("error", data.error || "فشل إرسال الطلب، يرجى المحاولة مرة أخرى");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم، تأكد من اتصال الإنترنت");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black" dir="rtl">
      {/* Background Glows */}
      <div className="absolute w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -top-10 -right-10" />
      <div className="absolute w-96 h-96 bg-rose-500/10 blur-[130px] rounded-full pointer-events-none top-96 -left-10" />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#120d14]/95 backdrop-blur-md border-b border-amber-500/25 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-amber-400 bg-black shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/soulmate-logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
              <span>طلب مباشر من الترابيزة</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h1>
            <p className="text-[11px] text-slate-400">سول ميت كافيه &amp; حلواني أبو عادل</p>
          </div>
        </div>

        {/* Table Selector Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 py-1 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
            <span>💺 ترابيزة:</span>
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="bg-transparent font-mono text-white font-black focus:outline-none cursor-pointer"
            >
              {tables.length > 0 ? (
                tables.map((t) => (
                  <option key={t.id} value={t.tableNumber} className="bg-slate-900 text-white">
                    {t.tableNumber} ({t.zone === "OUTDOOR" ? "تراس" : t.zone === "VIP_LOUNGE" ? "VIP" : "صالة"})
                  </option>
                ))
              ) : (
                <option value="T-01">T-01</option>
              )}
            </select>
          </div>

          <Link
            href="/"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition flex items-center gap-1"
          >
            <span>الرئيسية</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      </header>

      {/* SUCCESS CONFIRMED ORDER SCREEN */}
      {submittedOrder ? (
        <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6 flex flex-col justify-center animate-fade-in">
          <div className="bg-[#140e16] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-300">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-white">تم استلام طلبك بنجاح! 🎉</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              طلبك طار في ثانية لشاشة الباريستا والمطبخ، وهيتم تحضيره وتقديمه لترابيزتك في أسرع وقت.
            </p>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>رقم الطلب:</span>
                <strong className="text-amber-300 font-black">#{submittedOrder.orderNumber}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>رقم الترابيزة:</span>
                <strong className="text-white font-black">{submittedOrder.tableNumber}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>إجمالي الحساب:</span>
                <strong className="text-emerald-400 font-black text-sm">{submittedOrder.finalAmount} ج.م</strong>
              </div>
              {submittedOrder.pointsEarned > 0 && (
                <div className="flex justify-between text-purple-300 font-bold border-t border-white/10 pt-2">
                  <span>نقاط الولاء المكتسبة:</span>
                  <span>+{submittedOrder.pointsEarned} نقطة سول ميت 🎁</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSubmittedOrder(null)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg cursor-pointer"
            >
              طلب مشروبات أو حلويات إضافية ☕🍰
            </button>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-28">
          {/* BRAND TABS (Soulmate Cafe vs Abu Adel Patisserie) */}
          <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-black/60 border border-white/10">
            <button
              onClick={() => {
                setActiveBrandTab("SOULMATE");
                setActiveCategory("ALL");
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                activeBrandTab === "SOULMATE"
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>☕ سول ميت كافيه (مشروبات ووافل)</span>
            </button>

            <button
              onClick={() => {
                setActiveBrandTab("ABU_ADEL");
                setActiveCategory("ALL");
              }}
              className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                activeBrandTab === "ABU_ADEL"
                  ? "bg-gradient-to-r from-rose-500 via-rose-400 to-pink-600 text-white shadow-md shadow-rose-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>🍰 حلواني أبو عادل (تورت وحلويات)</span>
            </button>
          </div>

          {/* CATEGORIES PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`py-1.5 px-4 rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeCategory === "ALL"
                  ? activeBrandTab === "SOULMATE"
                    ? "bg-amber-500 text-slate-950 font-black shadow-md"
                    : "bg-rose-500 text-white font-black shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-slate-400"
              }`}
            >
              الكل ✨
            </button>

            {activeBrandTab === "SOULMATE" ? (
              <>
                <button
                  onClick={() => setActiveCategory("HOT_COFFEE")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "HOT_COFFEE" ? "bg-amber-500 text-slate-950 font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  قهوة ساخنة ☕
                </button>
                <button
                  onClick={() => setActiveCategory("COLD_COFFEE")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "COLD_COFFEE" ? "bg-amber-500 text-slate-950 font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  قهوة مثلجة 🧊
                </button>
                <button
                  onClick={() => setActiveCategory("BEVERAGES")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "BEVERAGES" ? "bg-amber-500 text-slate-950 font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  مشروبات وميلك شيك 🥤
                </button>
                <button
                  onClick={() => setActiveCategory("WAFFLES_PANCAKES")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "WAFFLES_PANCAKES" ? "bg-amber-500 text-slate-950 font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  بان كيك ووافل 🥞
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveCategory("ORIENTAL_SWEETS")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "ORIENTAL_SWEETS" ? "bg-rose-500 text-white font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  حلويات شرقية بالسمن البلدي 🍯
                </button>
                <button
                  onClick={() => setActiveCategory("CAKES_TORTES")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "CAKES_TORTES" ? "bg-rose-500 text-white font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  تورت وكيكات مناسبات 🎂
                </button>
                <button
                  onClick={() => setActiveCategory("WESTERN_PASTRY")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "WESTERN_PASTRY" ? "bg-rose-500 text-white font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  جاتوهات وتشيز كيك 🍰
                </button>
                <button
                  onClick={() => setActiveCategory("GIFT_BOXES")}
                  className={`py-1.5 px-3.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    activeCategory === "GIFT_BOXES" ? "bg-rose-500 text-white font-black" : "bg-white/5 text-slate-400"
                  }`}
                >
                  نواعم وعلب مشكلة 🎁
                </button>
              </>
            )}
          </div>

          {/* MENU ITEMS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const inCartItem = cart.find((i) => i.menuItemId === item.id);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-[#140f16]/90 border border-white/10 hover:border-amber-500/40 transition flex gap-3.5 shadow-md relative overflow-hidden group"
                >
                  {/* Image */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black shrink-0 relative border border-white/5">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.nameAr} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        {activeBrandTab === "SOULMATE" ? <Coffee className="w-8 h-8" /> : <Cake className="w-8 h-8" />}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition">
                        {item.nameAr}
                      </h4>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono font-black text-base text-amber-400">
                        {item.price} <span className="text-[10px] text-slate-400">ج.م</span>
                      </span>

                      {/* Add / Qty controls */}
                      {inCartItem ? (
                        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-xl p-1">
                          <button
                            onClick={() => updateCartQty(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-xs px-1 text-white">{inCartItem.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white font-black text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* FLOATING BOTTOM CART BAR */}
      {cart.length > 0 && !submittedOrder && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-[#120d14]/95 backdrop-blur-xl border-t border-amber-500/30 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Quick Customer Phone for Loyalty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسمك الكريم (اختياري)..."
                className="py-1.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="رقم الموبايل (لكسب نقاط الولاء 🎁)..."
                className="py-1.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Notes to Barista / Kitchen */}
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="ملاحظاتك للباريستا أو الشيف (سكر زيادة، بدون كراميل، إلخ)..."
              className="w-full py-1.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
            />

            {/* Bottom Button Bar */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  إجمالي طلب ترابيزة ({tableNumber}) • {cartItemCount} أصناف:
                </span>
                <span className="text-xl font-black font-mono text-amber-400">{cartSubtotal} ج.م</span>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={submittingOrder}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingOrder ? (
                  <span>جارٍ الإرسال...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال الطلب للبار والمطبخ 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING VIP TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-fade-in font-sans">
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

export default function TableOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07070b] text-white flex items-center justify-center">جارٍ التحميل...</div>}>
      <TableOrderContent />
    </Suspense>
  );
}
