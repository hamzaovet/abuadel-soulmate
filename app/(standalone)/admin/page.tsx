"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardQRModal from "@/components/CardQRModal";
import {
  Coffee,
  Cake,
  TrendingUp,
  DollarSign,
  Package,
  Boxes,
  Users,
  Settings,
  Receipt,
  RotateCcw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Printer,
  Shield,
  SlidersHorizontal,
  ChevronDown,
  LogOut,
  RefreshCw,
  Search,
  ExternalLink,
  Award,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Flame,
  Clock,
  Layers,
  UtensilsCrossed,
  QrCode,
  FileText,
} from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("ALL");

  // UI Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "treasury" | "recipes" | "pastry" | "orders" | "loyalty" | "settings"
  >("overview");

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [shiftData, setShiftData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showPastryModal, setShowPastryModal] = useState(false);
  const [selectedMenuItemForRecipe, setSelectedMenuItemForRecipe] = useState<any>(null);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "SUPPLIES",
    notes: "",
  });

  const [rawForm, setRawForm] = useState({
    nameAr: "",
    unit: "GRAM",
    currentStock: "",
    minStockAlert: "200",
    costPerUnit: "0.5",
    supplierName: "",
    outletId: "",
  });

  const [pastryForm, setPastryForm] = useState({
    nameAr: "",
    category: "ORIENTAL_SWEETS",
    price: "",
    costPrice: "",
    unitType: "PIECE",
    stockQty: "50",
    minStockAlert: "10",
    description: "",
    outletId: "",
  });

  const [recipeFormItems, setRecipeFormItems] = useState<
    { rawMaterialId: string; qtyRequired: number }[]
  >([]);

  // Reprint / View Order Receipt Modal
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);

  // Search queries
  const [searchQuery, setSearchQuery] = useState("");

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 1. Initial Load & Auth Check
  useEffect(() => {
    const saved = localStorage.getItem("abuadel_auth_user");
    if (!saved) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(saved);
      if (
        user.role !== "owner" &&
        user.role !== "general_manager" &&
        user.role !== "branch_manager"
      ) {
        addToast("error", "عفواً، لا تملك صلاحية دخول لوحة الإدارة");
        router.push("/pos");
        return;
      }
      setCurrentUser(user);
      if (user.role === "branch_manager" && user.outletId) {
        setSelectedOutletId(user.outletId);
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // 2. Fetch All Dashboard Data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const outletParam = selectedOutletId !== "ALL" ? `?outletId=${selectedOutletId}` : "";

      const [
        outletsRes,
        settingsRes,
        shiftRes,
        expensesRes,
        recipesRes,
        menuRes,
        ordersRes,
        customersRes,
        tablesRes,
      ] = await Promise.all([
        fetch("/api/outlets"),
        fetch("/api/settings"),
        fetch(`/api/shifts${outletParam}`),
        fetch(`/api/expenses${outletParam}`),
        fetch(`/api/recipes${outletParam}`),
        fetch(`/api/menu${outletParam}`),
        fetch(`/api/orders${outletParam}`),
        fetch("/api/customers"),
        fetch(`/api/tables${outletParam}`),
      ]);

      const [
        outletsData,
        settingsData,
        shiftDataRes,
        expensesData,
        recipesData,
        menuData,
        ordersData,
        customersData,
        tablesData,
      ] = await Promise.all([
        outletsRes.json(),
        settingsRes.json(),
        shiftRes.json(),
        expensesRes.json(),
        recipesRes.json(),
        menuRes.json(),
        ordersRes.json(),
        customersRes.json(),
        tablesRes.json(),
      ]);

      if (outletsData.success) setOutlets(outletsData.outlets);
      if (settingsData.success) setSettings(settingsData.settings);
      if (shiftDataRes.success) setShiftData(shiftDataRes);
      if (expensesData.success) setExpenses(expensesData.expenses);
      if (recipesData.success) setRawMaterials(recipesData.rawMaterials);
      if (menuData.success) setMenuItems(menuData.items);
      if (ordersData.success) setOrders(ordersData.orders);
      if (customersData.success) setCustomers(customersData.customers);
      if (tablesData.success) setTables(tablesData.tables);
    } catch (err) {
      console.error(err);
      addToast("error", "فشل تحديث بيانات لوحة الإدارة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, selectedOutletId]);

  // Active Outlet Info
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId);
  const isSoulmate = activeOutlet?.code === "SOULMATE_CAFE";
  const isAbuAdel = activeOutlet?.code === "ABU_ADEL_PATISSERIE";

  // KPIs Calculations
  const totalSales = orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  const soulmateSales = orders
    .filter((o) => o.paymentStatus === "PAID" && o.outlet?.code === "SOULMATE_CAFE")
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  const abuAdelSales = orders
    .filter((o) => o.paymentStatus === "PAID" && o.outlet?.code === "ABU_ADEL_PATISSERIE")
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const tableOccupancyRate =
    tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;

  // Toggle Loyalty Program Master Switch
  const toggleLoyaltyProgram = async () => {
    if (!settings) return;
    try {
      const nextVal = !settings.isLoyaltyEnabled;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLoyaltyEnabled: nextVal }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        addToast(
          "success",
          nextVal
            ? "تم تفعيل برنامج الولاء ونقاط سول ميت بنجاح ⭐"
            : "تم تعطيل برنامج الولاء مؤقتاً ⏸️"
        );
      } else {
        addToast("error", data.error || "فشل تغيير حالة برنامج الولاء");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء تعديل الإعدادات");
    }
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOutletId =
      selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id;
    if (!targetOutletId) {
      addToast("error", "يرجى تحديد الفرع أولاً");
      return;
    }
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutletId,
          title: expenseForm.title,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          recordedBy: currentUser?.name || "الإدارة",
          notes: expenseForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم تسجيل المصروف بنجاح وترحيله للدرج");
        setShowExpenseModal(false);
        setExpenseForm({ title: "", amount: "", category: "SUPPLIES", notes: "" });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تسجيل المصروف");
      }
    } catch {
      addToast("error", "حدث خطأ في الشبكة");
    }
  };

  // Quick Restock Raw Material
  const handleRestockRaw = async (rawId: string, addQty: number) => {
    try {
      const raw = rawMaterials.find((r) => r.id === rawId);
      if (!raw) return;
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESTOCK",
          rawMaterialId: rawId,
          addStock: addQty,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", `تم تزويد رصيد ${raw.nameAr} بنجاح (+${addQty} ${raw.unit})`);
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل التزويد");
      }
    } catch {
      addToast("error", "حدث خطأ في الاتصال");
    }
  };

  // Add New Raw Material
  const handleAddRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOutlet =
      outlets.find((o) => o.code === "SOULMATE_CAFE")?.id ||
      (selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_RAW",
          outletId: targetOutlet,
          nameAr: rawForm.nameAr,
          unit: rawForm.unit,
          currentStock: parseFloat(rawForm.currentStock) || 0,
          minStockAlert: parseFloat(rawForm.minStockAlert) || 100,
          costPerUnit: parseFloat(rawForm.costPerUnit) || 0.1,
          supplierName: rawForm.supplierName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تمت إضافة الخامة الجديدة بنجاح");
        setShowRawMaterialModal(false);
        setRawForm({
          nameAr: "",
          unit: "GRAM",
          currentStock: "",
          minStockAlert: "200",
          costPerUnit: "0.5",
          supplierName: "",
          outletId: "",
        });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل حفظ الخامة");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء الحفظ");
    }
  };

  // Save Recipe BOM
  const handleSaveRecipeBOM = async () => {
    if (!selectedMenuItemForRecipe) return;
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_RECIPE",
          menuItemId: selectedMenuItemForRecipe.id,
          ingredients: recipeFormItems.filter((i) => i.qtyRequired > 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم تحديث الريسيبي وحساب تكلفة الكوب بدقة");
        setShowRecipeModal(false);
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل حفظ الريسيبي");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء تحديث الريسيبي");
    }
  };

  // Add Finished Pastry Item (Abu Adel)
  const handleAddPastry = async (e: React.FormEvent) => {
    e.preventDefault();
    const abuAdelOutlet =
      outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id ||
      (selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id);

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: abuAdelOutlet,
          nameAr: pastryForm.nameAr,
          category: pastryForm.category,
          price: parseFloat(pastryForm.price),
          costPrice: parseFloat(pastryForm.costPrice) || 0,
          itemType: "READY_PASTRY",
          unitType: pastryForm.unitType,
          stockQty: parseInt(pastryForm.stockQty) || 50,
          minStockAlert: parseInt(pastryForm.minStockAlert) || 10,
          description: pastryForm.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تمت إضافة صنف الحلويات للمخزن بنجاح");
        setShowPastryModal(false);
        setPastryForm({
          nameAr: "",
          category: "ORIENTAL_SWEETS",
          price: "",
          costPrice: "",
          unitType: "PIECE",
          stockQty: "50",
          minStockAlert: "10",
          description: "",
          outletId: "",
        });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل إضافة الصنف");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء الحفظ");
    }
  };

  // Quick Restock Pastry
  const handleQuickPastryRestock = async (itemId: string, addQty: number) => {
    const item = menuItems.find((m) => m.id === itemId);
    if (!item) return;
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          stockQty: item.stockQty + addQty,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          `تم تزويد رصيد ${item.nameAr} (+${addQty} ${item.unitType === "KG" ? "كجم" : "قطعة"})`
        );
        fetchDashboardData();
      }
    } catch {
      addToast("error", "فشل تعديل رصيد الصنف");
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم حفظ كافة إعدادات المنظومة وهوية البراند بنجاح");
      } else {
        addToast("error", data.error || "فشل الحفظ");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("abuadel_auth_user");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-amber-400">
          جاري تحميل لوحة الإدارة الفاخرة...
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          سول ميت كافيه VIP & حلواني أبو عادل المستقل
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* 1. TOP HEADER & NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand Identity & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-black text-xl">
              {isAbuAdel ? "ع" : "S"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-wide">
                  لوحة إدارة المنظومة السحابية
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUser?.role === "owner"
                    ? "👑 المالك (Maestro)"
                    : currentUser?.role === "general_manager"
                    ? "⭐ المدير العام"
                    : "مدير الفرع"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                مجموعة حلواني أبو عادل المستقل & سول ميت كافيه VIP
              </p>
            </div>
          </div>

          {/* Outlet Switcher (Owner & GM only) */}
          <div className="flex items-center gap-3">
            {currentUser?.role !== "branch_manager" ? (
              <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 px-2 font-medium">الفرع:</span>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="bg-slate-900 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">🌟 جميع الفروع (نظام مدمج شامل)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code === "SOULMATE_CAFE" ? "☕ سول ميت كافيه" : "🍰 حلواني أبو عادل"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                {activeOutlet?.name || "فرعك المخصص"}
              </div>
            )}

            {/* Quick Navigation Buttons */}
            <Link
              href="/pos"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>نقطة البيع (POS)</span>
            </Link>

            <Link
              href="/kds"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 transition"
            >
              <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              <span>شاشة الباريستا (KDS)</span>
            </Link>

            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 transition"
              title="طباعة كارت الكيو آر كود المزدوج"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>كارت الـ 2 QR</span>
            </button>

            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl border border-rose-800/40 transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. TABS NAVIGATION */}
        <div className="border-t border-slate-800 bg-slate-900/60 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>نظرة عامة والتقارير</span>
            </button>

            <button
              onClick={() => setActiveTab("treasury")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "treasury"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>الخزنة والورديات وجرد الدرج</span>
            </button>

            <button
              onClick={() => setActiveTab("recipes")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "recipes"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>الريسيبي وتكاليف البار (Soulmate)</span>
            </button>

            <button
              onClick={() => setActiveTab("pastry")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "pastry"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>مخزن حلويات أبو عادل (Finished Goods)</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "orders"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>سجل الطلبات والفواتير</span>
            </button>

            <button
              onClick={() => setActiveTab("loyalty")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "loyalty"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>برنامج الولاء (Soulmate Points)</span>
              {settings?.isLoyaltyEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>الإعدادات وهوية المنظومة</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition" />
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>إجمالي المبيعات المدفوعة</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {totalSales.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                  <span className="text-emerald-400 font-bold">{orders.length} طلب</span>
                  <span>مسجل بالمنظومة</span>
                </div>
              </div>

              {/* Soulmate Cafe Revenue */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-600/10 rounded-full blur-xl group-hover:bg-amber-600/20 transition" />
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>إيرادات سول ميت كافيه VIP</span>
                  <Coffee className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-500">
                  {soulmateSales.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  باريستا، مشروبات ساخنة وباردة
                </div>
              </div>

              {/* Abu Adel Patisserie Revenue */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition" />
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>إيرادات حلواني أبو عادل</span>
                  <Cake className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {abuAdelSales.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  حلويات شرقية، تورت وبوكسات هدايا
                </div>
              </div>

              {/* Table Occupancy & Loyalty */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition" />
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>إشغال ترابيزات الكافيه</span>
                  <UtensilsCrossed className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-400">
                  {tableOccupancyRate}%
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {occupiedTables} من {tables.length} ترابيزة مشغولة الآن
                </div>
              </div>
            </div>

            {/* Quick Actions & Live Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Links Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>روابط وصول سريعة للمنظومة</span>
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/order"
                    target="_blank"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        QR
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                          صفحة طلب الزبون من الترابيزة
                        </div>
                        <div className="text-[10px] text-slate-400">/order?table=T-01</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
                  </Link>

                  <Link
                    href="/kds"
                    target="_blank"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        KDS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          شاشة باريستا ومطبخ الكافيه
                        </div>
                        <div className="text-[10px] text-slate-400">/kds (محطة التحضير المباشر)</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                        WEB
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                          البوابة الرقمية المزدوجة العامة
                        </div>
                        <div className="text-[10px] text-slate-400">عرض أصناف سول ميت وأبو عادل</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
                  </Link>

                  <div
                    onClick={() => setShowQRModal(true)}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-black flex items-center justify-center font-black">
                        2QR
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-400">
                          كارت الكيو آر كود المزدوج
                        </div>
                        <div className="text-[10px] text-amber-300/80">
                          جاهز للطباعة على الترابيزات والريسبشن
                        </div>
                      </div>
                    </div>
                    <Printer className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Recent Orders Stream */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>آخر الطلبات والشيكات المسجلة</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    عرض الكل
                  </button>
                </div>

                <div className="divide-y divide-slate-800">
                  {orders.slice(0, 5).map((order) => {
                    let itemsCount = 0;
                    try {
                      const parsed = JSON.parse(order.items || "[]");
                      itemsCount = parsed.length;
                    } catch {
                      itemsCount = 1;
                    }

                    return (
                      <div
                        key={order.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-amber-400 border border-slate-700">
                            {order.orderNumber.split("-")[1] || "1"}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{order.orderNumber}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {order.orderType === "DINE_IN"
                                  ? `ترابيزة ${order.tableNumber || "1"}`
                                  : order.orderType === "TAKEAWAY"
                                  ? "تيك أواي"
                                  : "دليفري"}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {order.outlet?.name} • {itemsCount} أصناف
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-bold text-amber-400">
                            {order.finalAmount} ج.م
                          </div>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              order.paymentStatus === "PAID"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {order.paymentStatus === "PAID" ? "مدفوع" : "معلق"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      لا توجد طلبات مسجلة اليوم حتى الآن
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TREASURY, SHIFTS & DRAWER */}
        {activeTab === "treasury" && (
          <div className="space-y-6">
            {/* Live Drawer Summary Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-400">
                      الوردية الحالية مفتوحة ونشطة
                    </span>
                    <span className="text-xs text-slate-400">
                      (وردية #{shiftData?.shift?.shiftNumber || 1})
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white">
                    الكاشير المسؤول: {shiftData?.shift?.openedBy || "كاشير الوردية"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    بدأت في: {new Date(shiftData?.shift?.openedAt || Date.now()).toLocaleTimeString("ar-EG")}
                  </p>
                </div>

                {/* Big Cash Drawer Number */}
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-4 px-6 text-center shadow-inner">
                  <div className="text-xs text-slate-400 font-medium mb-1">
                    صافي النقدية المتوقعة بالدرج الآن
                  </div>
                  <div className="text-3xl font-black text-amber-400 font-mono">
                    {(shiftData?.expectedCash || 0).toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    (فكة افتتاحية {shiftData?.shift?.openingCashFloat || 500} ج.م + كاش مبيعات - نثريات)
                  </div>
                </div>

                {/* Action to Add Expense */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل مصروف / نثرية</span>
                  </button>
                </div>
              </div>

              {/* Payment Methods Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">مقبوضات كاش (نقدي)</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    {(shiftData?.cashCollected || 0).toLocaleString()} ج.م
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">مقبوضات فيزا / كروت</div>
                  <div className="text-lg font-bold text-blue-400 font-mono mt-1">
                    {(shiftData?.visaCollected || 0).toLocaleString()} ج.م
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">إنستاباي (InstaPay)</div>
                  <div className="text-lg font-bold text-purple-400 font-mono mt-1">
                    {(shiftData?.instapayCollected || 0).toLocaleString()} ج.م
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">إجمالي المصروفات والنثريات</div>
                  <div className="text-lg font-bold text-rose-400 font-mono mt-1">
                    {(shiftData?.expensesTotal || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>سجل المصروفات والنثريات المنصرفة من الدرج</span>
                </h3>
                <span className="text-xs text-slate-400">
                  إجمالي: {totalExpenses.toLocaleString()} ج.م
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">بند المصروف</th>
                      <th className="py-2.5 px-3">المبلغ</th>
                      <th className="py-2.5 px-3">التصنيف</th>
                      <th className="py-2.5 px-3">المسؤول</th>
                      <th className="py-2.5 px-3">الوقت</th>
                      <th className="py-2.5 px-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-white">{exp.title}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-400 font-mono">
                          {exp.amount} ج.م
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{exp.recordedBy}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(exp.createdAt).toLocaleTimeString("ar-EG")}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{exp.notes || "-"}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500">
                          لا توجد مصروفات مسجلة خلال هذه الوردية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECIPES & BARISTA COSTING ENGINE (SOULMATE CAFE) */}
        {activeTab === "recipes" && (
          <div className="space-y-6">
            {/* Explanatory Banner */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
              <Flame className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-amber-300 mb-1">
                  محرك الريسيبي وتكاليف المشروبات (Soulmate Cafe BOM Engine)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  هنا يتم ربط كل مشروب (إسبريسو، لاتيه، موكا...) بمكوناته الدقيقة من البن (جرام)، الحليب (مل)، السيرب والنكهات.
                  عند بيع أي مشروب من الـ POS أو من طلب الترابيزة، يقوم السيستم تلقائياً بخصم الجرامات من رصيد خامات البار وحساب تكلفة الكوب ونسبة الربح الصافي لحظياً!
                </p>
              </div>
            </div>

            {/* Top Raw Materials Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-400" />
                  <span>مخزن خامات البار (Raw Materials) ومؤشرات الرصيد</span>
                </h3>
                <button
                  onClick={() => setShowRawMaterialModal(true)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-xl text-xs shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة خامة بار جديدة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rawMaterials.map((raw) => {
                  const isLow = raw.currentStock <= raw.minStockAlert;
                  return (
                    <div
                      key={raw.id}
                      className={`p-4 rounded-xl border transition ${
                        isLow
                          ? "bg-rose-950/20 border-rose-600/40"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white">{raw.nameAr}</span>
                        {isLow && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500 text-white font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            نواقص
                          </span>
                        )}
                      </div>

                      <div className="text-xl font-black text-amber-400 font-mono mt-2">
                        {raw.currentStock.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {raw.unit === "GRAM" ? "جرام" : raw.unit === "ML" ? "مل" : "قطعة"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>حد الطلب: {raw.minStockAlert}</span>
                        <span>تكلفة الوحدة: {raw.costPerUnit} ج.م</span>
                      </div>

                      {/* Quick Restock Buttons */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => handleRestockRaw(raw.id, 500)}
                          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition"
                        >
                          +500
                        </button>
                        <button
                          onClick={() => handleRestockRaw(raw.id, 1000)}
                          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition"
                        >
                          +1000
                        </button>
                        <button
                          onClick={() => handleRestockRaw(raw.id, 5000)}
                          className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition"
                        >
                          +5000
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Beverage Recipe BOM & Food Cost Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>قائمة المشروبات وتكلفة الكوب وهامش الربح</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">اسم المشروب</th>
                      <th className="py-2.5 px-3">سعر البيع</th>
                      <th className="py-2.5 px-3">تكلفة الخامات (Food Cost)</th>
                      <th className="py-2.5 px-3">هامش الربح الإجمالي</th>
                      <th className="py-2.5 px-3">المكونات المسجلة بالريسيبي</th>
                      <th className="py-2.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {menuItems
                      .filter((m) => m.itemType === "PREPARED_BEVERAGE")
                      .map((item) => {
                        const calculatedCost = (item.recipes || []).reduce(
                          (sum: number, r: any) =>
                            sum + r.qtyRequired * (r.rawMaterial?.costPerUnit || 0),
                          0
                        );
                        const effectiveCost = calculatedCost > 0 ? calculatedCost : item.costPrice;
                        const profitMargin =
                          item.price > 0
                            ? Math.round(((item.price - effectiveCost) / item.price) * 100)
                            : 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                              <Coffee className="w-4 h-4 text-amber-400" />
                              <span>{item.nameAr}</span>
                            </td>
                            <td className="py-3 px-3 font-bold text-amber-400 font-mono">
                              {item.price} ج.م
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-400 font-mono">
                              {effectiveCost.toFixed(2)} ج.م
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {profitMargin}% ربح
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div className="flex flex-wrap gap-1">
                                {(item.recipes || []).map((r: any) => (
                                  <span
                                    key={r.id}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                                  >
                                    {r.rawMaterial?.nameAr}: {r.qtyRequired}
                                  </span>
                                ))}
                                {(!item.recipes || item.recipes.length === 0) && (
                                  <span className="text-[10px] text-slate-500">
                                    لا يوجد ريسيبي مسجل بعد
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedMenuItemForRecipe(item);
                                  setRecipeFormItems(
                                    (item.recipes || []).map((r: any) => ({
                                      rawMaterialId: r.rawMaterialId,
                                      qtyRequired: r.qtyRequired,
                                    }))
                                  );
                                  setShowRecipeModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/40 transition"
                              >
                                تعديل الريسيبي
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINISHED PASTRY INVENTORY (ABU ADEL PATISSERIE) */}
        {activeTab === "pastry" && (
          <div className="space-y-6">
            {/* Explanatory Banner */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
              <Cake className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-emerald-300 mb-1">
                  مخزن حلويات أبو عادل المستقل (Ready-Made Units & Pastry Stock)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  بناءً على التوجيه المعتمد: أصناف حلواني أبو عادل جاهزة وتؤخذ من المحل كمنتجات تامة الصنع
                  (بالقطعة / بالكيلو / بالعلبة) بدون ريسيبي معقد! يتم هنا متابعة المخزون الفعلي، وإعادة تزويد الرصيد فوراً.
                </p>
              </div>
            </div>

            {/* Pastry Items List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Cake className="w-4 h-4 text-emerald-400" />
                  <span>أصناف حلواني أبو عادل بالمخزن</span>
                </h3>
                <button
                  onClick={() => setShowPastryModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة صنف حلويات جديد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems
                  .filter((m) => m.itemType === "READY_PASTRY")
                  .map((item) => {
                    const isLow = item.stockQty <= item.minStockAlert;
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition ${
                          isLow
                            ? "bg-rose-950/20 border-rose-600/40"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">{item.nameAr}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.category === "ORIENTAL_SWEETS"
                              ? "شرقي"
                              : item.category === "CAKES_TORTES"
                              ? "تورتة"
                              : "غربي / بوكس"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-lg font-black text-amber-400 font-mono">
                            {item.price} ج.م
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400">الرصيد بالمحل: </span>
                            <span
                              className={`font-black font-mono text-sm ${
                                isLow ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {item.stockQty} {item.unitType === "KG" ? "كجم" : "قطعة"}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                          <span>سعر التكلفة: {item.costPrice} ج.م</span>
                          <span>حد النواقص: {item.minStockAlert}</span>
                        </div>

                        {/* Quick Restock Buttons */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800">
                          <button
                            onClick={() => handleQuickPastryRestock(item.id, 10)}
                            className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => handleQuickPastryRestock(item.id, 25)}
                            className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition"
                          >
                            +25
                          </button>
                          <button
                            onClick={() => handleQuickPastryRestock(item.id, 50)}
                            className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition"
                          >
                            +50
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ORDERS & BILLS HISTORY */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>سجل الطلبات والفواتير الحرارية الصادرة</span>
                </h3>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث برقم الشيك أو الترابيزة..."
                    className="bg-slate-950 border border-slate-700 text-xs rounded-xl pr-9 pl-3 py-2 text-white focus:outline-none focus:border-amber-500 w-56"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">رقم الشيك</th>
                      <th className="py-2.5 px-3">الفرع</th>
                      <th className="py-2.5 px-3">النوع / الترابيزة</th>
                      <th className="py-2.5 px-3">الأصناف المطلوبة</th>
                      <th className="py-2.5 px-3">طريقة الدفع</th>
                      <th className="py-2.5 px-3">الإجمالي الصافي</th>
                      <th className="py-2.5 px-3">التاريخ والوقت</th>
                      <th className="py-2.5 px-3 text-center">طباعة الفاتورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders
                      .filter(
                        (o) =>
                          o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (o.tableNumber && o.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((o) => {
                        let parsedItems: any[] = [];
                        try {
                          parsedItems = JSON.parse(o.items || "[]");
                        } catch {
                          parsedItems = [];
                        }

                        return (
                          <tr key={o.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-bold text-amber-400 font-mono">
                              {o.orderNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {o.outlet?.name || "الفرع الرئيسي"}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {o.orderType === "DINE_IN"
                                  ? `ترابيزة ${o.tableNumber || "1"}`
                                  : o.orderType === "TAKEAWAY"
                                  ? "تيك أواي"
                                  : "دليفري"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div className="max-w-xs truncate">
                                {parsedItems.map((i) => `${i.nameAr} (${i.qty})`).join("، ")}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                {o.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-400 font-mono">
                              {o.finalAmount} ج.م
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono">
                              {new Date(o.createdAt).toLocaleString("ar-EG")}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => setSelectedOrderForPrint(o)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                                title="إعادة طباعة الفاتورة 80 مم"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: LOYALTY PROGRAM & POINTS (SOULMATE POINTS) */}
        {activeTab === "loyalty" && (
          <div className="space-y-6">
            {/* Master Switch Banner */}
            <div
              className={`rounded-2xl p-6 border transition shadow-xl ${
                settings?.isLoyaltyEnabled
                  ? "bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-6 h-6 text-amber-400" />
                    <h2 className="text-xl font-black text-white">
                      برنامج ولاء ومكافآت سول ميت (Soulmate Points VIP)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    ميزة حصرية لكافيه سول ميت: كل فنجان قهوة أو مشروب يمنح الزبون نقاط ولاء يمكن تجميعها واستبدالها بمشروبات مجانية أو خصومات.
                    يمكن للمالك أو المدير العام تفعيل أو تعطيل هذا البرنامج فوراً بنقرة زر واحدة في أي وقت!
                  </p>
                </div>

                {/* Master Switch Button */}
                <div className="flex items-center gap-3 bg-slate-950/80 p-3 px-5 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-300">حالة البرنامج:</span>
                  <button
                    onClick={toggleLoyaltyProgram}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
                      settings?.isLoyaltyEnabled
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {settings?.isLoyaltyEnabled ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-white" />
                        <span>مُفعّل ونشط الآن</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                        <span>مُعطّل مؤقتاً</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loyalty Settings Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">معدل اكتساب النقاط</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                    1 نقطة لكل 10 ج.م
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">تضاف تلقائياً عند سداد الشيك</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">قيمة استبدال النقطة</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    كل نقطة = 0.50 ج.م
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">تخصم من الفاتورة عند الدفع</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">إجمالي رصيد نقاط العملاء</div>
                  <div className="text-lg font-bold text-purple-400 font-mono mt-1">
                    {customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0)} نقطة
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">لدى {customers.length} عميل مسجل</div>
                </div>
              </div>
            </div>

            {/* Customers Loyalty CRM Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>قاعدة بيانات العملاء وأرصدة النقاط</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">اسم العميل</th>
                      <th className="py-2.5 px-3">رقم الهاتف</th>
                      <th className="py-2.5 px-3">رصيد النقاط</th>
                      <th className="py-2.5 px-3">القيمة التقديرية بالجنيه</th>
                      <th className="py-2.5 px-3">عدد الزيارات</th>
                      <th className="py-2.5 px-3">إجمالي الإنفاق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white">{c.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{c.phone}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {c.loyaltyPoints} نقطة
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400 font-mono">
                          {(c.loyaltyPoints * (settings?.poundValuePerPoint || 0.5)).toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-3 text-slate-300">{c.visitCount} زيارة</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{c.totalSpent} ج.م</td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500">
                          لا يوجد عملاء مسجلين بعد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & BRAND IDENTITY */}
        {activeTab === "settings" && settings && (
          <div className="space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Brand Information Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>بيانات وهوية العلامات التجارية والاتصال</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      اسم المنظومة (عربي)
                    </label>
                    <input
                      type="text"
                      value={settings.brandNameAr || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, brandNameAr: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      الخط الساخن الموحد لأبو عادل
                    </label>
                    <input
                      type="text"
                      value={settings.hotline || "15992"}
                      onChange={(e) =>
                        setSettings({ ...settings, hotline: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      هاتف سول ميت كافيه VIP
                    </label>
                    <input
                      type="text"
                      value={settings.soulmatePhone || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, soulmatePhone: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      رابط موقع حلواني أبو عادل الرسمي
                    </label>
                    <input
                      type="text"
                      value={settings.haliyomakUrl || "https://haliyomak.com/"}
                      onChange={(e) =>
                        setSettings({ ...settings, haliyomakUrl: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Tax & Service Charges */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>إعدادات الخدمة وضريبة القيمة المضافة</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">نسبة خدمة الصالة (Service Charge)</div>
                      <div className="text-[10px] text-slate-400">تضاف على شيكات الصالة بالكافيه</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.serviceChargePercent || 12}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            serviceChargePercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-amber-400"
                      />
                      <span className="text-xs text-slate-400">%</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            isServiceChargeEnabled: !settings.isServiceChargeEnabled,
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          settings.isServiceChargeEnabled
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {settings.isServiceChargeEnabled ? "مفعل" : "معطل"}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">ضريبة القيمة المضافة (VAT)</div>
                      <div className="text-[10px] text-slate-400">تضاف على الفاتورة الضريبية</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.taxPercent || 14}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-amber-400"
                      />
                      <span className="text-xs text-slate-400">%</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            isTaxEnabled: !settings.isTaxEnabled,
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          settings.isTaxEnabled
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {settings.isTaxEnabled ? "مفعل" : "معطل"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Footer Notes */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>رسالة أسفل الفاتورة الحرارية 80 مم</span>
                </h3>
                <input
                  type="text"
                  value={settings.receiptFooterNotes || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, receiptFooterNotes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-2.5 rounded-xl text-xs shadow-lg transition"
                >
                  حفظ كافة التعديلات والإعدادات
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* 4. MODALS */}

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">
              تسجيل مصروف / نثرية جديدة من الدرج
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">بيان المصروف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شراء بن إضافي، أدوات نظافة، صيانة ثلاجة..."
                  value={expenseForm.title}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">التصنيف</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="SUPPLIES">مستلزمات ونثريات</option>
                    <option value="RAW_MATERIALS">خامات بار ومطبخ</option>
                    <option value="MAINTENANCE">صيانة دورية</option>
                    <option value="UTILITIES">مرافق وفواتير</option>
                    <option value="SALARIES">سلف ومكافآت</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, notes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  تسجيل وخصم من الدرج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAW MATERIAL MODAL */}
      {showRawMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowRawMaterialModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">
              إضافة خامة بار ومشروبات جديدة (Soulmate)
            </h3>
            <form onSubmit={handleAddRawMaterial} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم الخامة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حبوب قهوة كولومبي، صوص بستاشيو..."
                  value={rawForm.nameAr}
                  onChange={(e) => setRawForm({ ...rawForm, nameAr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">وحدة القياس</label>
                  <select
                    value={rawForm.unit}
                    onChange={(e) => setRawForm({ ...rawForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="GRAM">جرام (Gram)</option>
                    <option value="ML">ميلي لتر (ML)</option>
                    <option value="PIECE">قطعة / كوب (Piece)</option>
                    <option value="PUMP">ضغطة سيرب (Pump)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="1000"
                    value={rawForm.currentStock}
                    onChange={(e) =>
                      setRawForm({ ...rawForm, currentStock: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    حد تنبيه النواقص
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="200"
                    value={rawForm.minStockAlert}
                    onChange={(e) =>
                      setRawForm({ ...rawForm, minStockAlert: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    تكلفة الوحدة (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.5"
                    value={rawForm.costPerUnit}
                    onChange={(e) =>
                      setRawForm({ ...rawForm, costPerUnit: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRawMaterialModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                >
                  حفظ الخامة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECIPE BOM MODAL */}
      {showRecipeModal && selectedMenuItemForRecipe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowRecipeModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1">
              تعديل ريسيبي المشروب: {selectedMenuItemForRecipe.nameAr}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              حدد المقادير الدقيقة بالجرام أو الميلي لحساب تكلفة الكوب وخصم الخامات أوتوماتيكياً.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {rawMaterials.map((raw) => {
                const currentQty =
                  recipeFormItems.find((i) => i.rawMaterialId === raw.id)?.qtyRequired || 0;
                return (
                  <div
                    key={raw.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{raw.nameAr}</div>
                      <div className="text-[10px] text-slate-400">
                        وحدة القياس: {raw.unit === "GRAM" ? "جرام" : raw.unit === "ML" ? "مل" : "قطعة"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={currentQty}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setRecipeFormItems((prev) => {
                            const filtered = prev.filter((i) => i.rawMaterialId !== raw.id);
                            if (val > 0) {
                              return [...filtered, { rawMaterialId: raw.id, qtyRequired: val }];
                            }
                            return filtered;
                          });
                        }}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-amber-400"
                      />
                      <span className="text-xs text-slate-400 w-8">
                        {raw.unit === "GRAM" ? "جرام" : raw.unit === "ML" ? "مل" : "قطعة"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRecipeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRecipeBOM}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
              >
                حفظ مقادير الريسيبي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASTRY MODAL (ABU ADEL) */}
      {showPastryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPastryModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">
              إضافة صنف حلويات جديد (حلواني أبو عادل)
            </h3>
            <form onSubmit={handleAddPastry} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم الصنف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بسبوسة بالمكسرات، تورتة فور سيزون..."
                  value={pastryForm.nameAr}
                  onChange={(e) =>
                    setPastryForm({ ...pastryForm, nameAr: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">التصنيف</label>
                  <select
                    value={pastryForm.category}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ORIENTAL_SWEETS">حلويات شرقية فاخرة</option>
                    <option value="CAKES_TORTES">تورت وكيك مناسبات</option>
                    <option value="WESTERN_PASTRY">حلويات غربية وجاتوه</option>
                    <option value="GIFT_BOXES">بوكسات هدايا ومواسم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الوحدة</label>
                  <select
                    value={pastryForm.unitType}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, unitType: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PIECE">قطعة / طبق</option>
                    <option value="KG">كيلو جرام (كجم)</option>
                    <option value="BOX">علبة / بوكس</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="120"
                    value={pastryForm.price}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, price: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">سعر التكلفة (ج.م)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="70"
                    value={pastryForm.costPrice}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, costPrice: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الرصيد المتاح</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="50"
                    value={pastryForm.stockQty}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, stockQty: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">حد تنبيه النواقص</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="10"
                    value={pastryForm.minStockAlert}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, minStockAlert: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPastryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  إضافة للمخزن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPRINT RECEIPT MODAL */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setSelectedOrderForPrint(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 80mm Thermal Receipt Template */}
            <div className="receipt-container bg-white text-black p-4 rounded-xl font-mono text-xs shadow-inner">
              <div className="text-center font-bold border-b border-black pb-2 mb-2">
                <div className="text-sm font-black">
                  {selectedOrderForPrint.outlet?.name || "سول ميت كافيه & حلواني أبو عادل"}
                </div>
                <div className="text-[10px]">فاتورة سداد ضريبية مبسطة</div>
                <div className="text-[10px]">
                  {selectedOrderForPrint.orderNumber} •{" "}
                  {selectedOrderForPrint.orderType === "DINE_IN"
                    ? `ترابيزة ${selectedOrderForPrint.tableNumber || "1"}`
                    : "تيك أواي"}
                </div>
                <div className="text-[10px]">
                  {new Date(selectedOrderForPrint.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>

              <div className="divide-y divide-dashed divide-black/40 py-1">
                {(() => {
                  try {
                    const parsed = JSON.parse(selectedOrderForPrint.items || "[]");
                    return parsed.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 text-[11px]">
                        <span>
                          {item.nameAr} x{item.qty}
                        </span>
                        <span className="font-bold">{(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ));
                  } catch {
                    return <div>أصناف الفاتورة</div>;
                  }
                })()}
              </div>

              <div className="border-t border-black pt-2 mt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{selectedOrderForPrint.subtotal} ج.م</span>
                </div>
                {selectedOrderForPrint.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>خدمة الصالة:</span>
                    <span>{selectedOrderForPrint.serviceCharge} ج.م</span>
                  </div>
                )}
                {selectedOrderForPrint.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة:</span>
                    <span>{selectedOrderForPrint.taxAmount} ج.م</span>
                  </div>
                )}
                {selectedOrderForPrint.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم:</span>
                    <span>-{selectedOrderForPrint.discountAmount} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                  <span>الإجمالي المدفوع:</span>
                  <span>{selectedOrderForPrint.finalAmount} ج.م</span>
                </div>
                <div className="text-[10px] text-center pt-2">
                  طريقة السداد: {selectedOrderForPrint.paymentMethod}
                </div>
              </div>

              <div className="text-center text-[10px] border-t border-black mt-3 pt-2">
                {settings?.receiptFooterNotes || "شكراً لزيارتكم! حلي يومك واستمتع بقهوتك"}
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال 80 مم</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-QR CARD MODAL */}
      <CardQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        activeTable="T-01"
      />

      {/* FLOATING TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold transition transform duration-200 border ${
              toast.type === "success"
                ? "bg-slate-900 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10"
                : toast.type === "error"
                ? "bg-slate-900 border-rose-500/50 text-rose-300 shadow-rose-500/10"
                : "bg-slate-900 border-blue-500/50 text-blue-300 shadow-blue-500/10"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
