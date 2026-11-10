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
  Calendar,
  PartyPopper,
  MessageCircle,
  Truck,
  Upload,
  Image as ImageIcon,
  History,
  ClipboardCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Home,
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
    | "overview"
    | "treasury"
    | "menu"
    | "recipes"
    | "pastry"
    | "orders"
    | "reservations"
    | "chat"
    | "loyalty"
    | "users"
    | "settings"
  >("overview");

  // Users Management state (Maestro & GM)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [userForm, setUserForm] = useState({
    id: "",
    name: "",
    username: "",
    password: "",
    pin: "",
    role: "cashier",
    outletId: "",
    phone: "",
    isActive: true,
  });

  // Menu Items Management state
  const [menuSearch, setMenuSearch] = useState("");
  const [menuOutletFilter, setMenuOutletFilter] = useState("ALL");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("ALL");
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [menuItemModalMode, setMenuItemModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [menuItemForm, setMenuItemForm] = useState({
    id: "",
    outletId: "",
    nameAr: "",
    nameEn: "",
    category: "HOT_DRINKS",
    price: "",
    costPrice: "",
    stockQty: "100",
    minStockAlert: "10",
    unitType: "PIECE",
    itemType: "PREPARED_BEVERAGE",
    image: "",
    isAvailable: true,
    description: "",
  });

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
  const [reservations, setReservations] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Modals & Sliders
  const [showQRModal, setShowQRModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [selectedRawForInbound, setSelectedRawForInbound] = useState<any>(null);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedRawForMovements, setSelectedRawForMovements] = useState<any>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showPastryModal, setShowPastryModal] = useState(false);
  const [selectedMenuItemForRecipe, setSelectedMenuItemForRecipe] = useState<any>(null);

  // Opening Stock Modal States
  const [selectedRawForOpening, setSelectedRawForOpening] = useState<any>(null);
  const [showRawOpeningModal, setShowRawOpeningModal] = useState(false);
  const [rawOpeningValue, setRawOpeningValue] = useState("");

  const [selectedPastryForOpening, setSelectedPastryForOpening] = useState<any>(null);
  const [showPastryOpeningModal, setShowPastryOpeningModal] = useState(false);
  const [pastryOpeningValue, setPastryOpeningValue] = useState("");

  // Abu Adel Pastry ERP States
  const [pastryInventory, setPastryInventory] = useState<any[]>([]);
  const [pastrySubTab, setPastrySubTab] = useState<"cards" | "audit">("cards");
  const [pastryAuditCounts, setPastryAuditCounts] = useState<Record<string, string>>({});
  const [isSubmittingPastryAudit, setIsSubmittingPastryAudit] = useState(false);
  const [pastrySearchQuery, setPastrySearchQuery] = useState("");
  const [pastryCategoryFilter, setPastryCategoryFilter] = useState("ALL");
  const [selectedPastryForInbound, setSelectedPastryForInbound] = useState<any>(null);
  const [showPastryInboundModal, setShowPastryInboundModal] = useState(false);
  const [pastryInboundForm, setPastryInboundForm] = useState({
    quantity: "",
    unitCost: "",
    supplierName: "",
    invoiceNumber: "",
    notes: "",
  });
  const [selectedPastryForMovements, setSelectedPastryForMovements] = useState<any>(null);
  const [showPastryMovementsModal, setShowPastryMovementsModal] = useState(false);

  // Sub-tabs for Recipes / Inventory Tab
  const [recipeSubTab, setRecipeSubTab] = useState<"cards" | "audit" | "bom">("cards");
  const [auditCounts, setAuditCounts] = useState<Record<string, string>>({});
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

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
    openingStock: "1000",
    minStockAlert: "200",
    costPerUnit: "0.5",
    supplierName: "",
    notes: "",
    outletId: "",
  });

  const [inboundForm, setInboundForm] = useState({
    quantity: "",
    costPerUnit: "",
    supplierName: "",
    invoiceNumber: "",
    notes: "",
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
    image: "",
    outletId: "",
  });

  const [recipeFormItems, setRecipeFormItems] = useState<
    { rawMaterialId: string; qtyRequired: number }[]
  >([]);

  // Live Chat Reply Form
  const [chatReplyText, setChatReplyText] = useState("");
  const [selectedChatTable, setSelectedChatTable] = useState<string>("ALL");

  // Reprint / View Order Receipt Modal
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);

  // Image Uploading
  const [uploadingImage, setUploadingImage] = useState(false);

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
    const saved =
      localStorage.getItem("abuadel_soulmate_user") ||
      localStorage.getItem("abuadel_auth_user");
    if (!saved) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(saved);
      if (
        user.role !== "owner" &&
        user.role !== "branch_manager"
      ) {
        addToast("error", "عفواً، لا تملك صلاحية دخول لوحة الإدارة");
        router.push("/pos");
        return;
      }
      setCurrentUser(user);
      if (user.role === "branch_manager" && user.outletId) {
        setSelectedOutletId(user.outletId);
        setMenuOutletFilter(user.outletId);
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
        pastryRes,
        ordersRes,
        customersRes,
        tablesRes,
        reservationsRes,
        chatRes,
        usersRes,
      ] = await Promise.all([
        fetch("/api/outlets"),
        fetch("/api/settings"),
        fetch(`/api/shifts${outletParam}`),
        fetch(`/api/expenses${outletParam}`),
        fetch(currentUser?.role === "owner" ? "/api/recipes" : `/api/recipes${outletParam}`),
        fetch(currentUser?.role === "owner" ? "/api/menu" : `/api/menu${outletParam}`),
        fetch("/api/pastry-inventory"),
        fetch(`/api/orders${outletParam}`),
        fetch("/api/customers"),
        fetch(`/api/tables${outletParam}`),
        fetch(`/api/reservations${outletParam}`),
        fetch(`/api/chat${outletParam}`),
        fetch("/api/users"),
      ]);

      const [
        outletsData,
        settingsData,
        shiftDataRes,
        expensesData,
        recipesData,
        menuData,
        pastryData,
        ordersData,
        customersData,
        tablesData,
        resData,
        chatData,
        usersData,
      ] = await Promise.all([
        outletsRes.json(),
        settingsRes.json(),
        shiftRes.json(),
        expensesRes.json(),
        recipesRes.json(),
        menuRes.json(),
        pastryRes.json(),
        ordersRes.json(),
        customersRes.json(),
        tablesRes.json(),
        reservationsRes.json(),
        chatRes.json(),
        usersRes.json(),
      ]);

      if (outletsData.success) setOutlets(outletsData.outlets);
      if (settingsData.success) setSettings(settingsData.settings);
      if (shiftDataRes.success) setShiftData(shiftDataRes);
      if (expensesData.success) setExpenses(expensesData.expenses);
      if (recipesData.success) setRawMaterials(recipesData.rawMaterials);
      if (menuData.success) setMenuItems(menuData.items);
      if (pastryData.success) setPastryInventory(pastryData.items);
      if (ordersData.success) setOrders(ordersData.orders);
      if (customersData.success) setCustomers(customersData.customers);
      if (tablesData.success) setTables(tablesData.tables);
      if (resData.success) setReservations(resData.reservations);
      if (chatData.success) setChatMessages(chatData.messages);
      if (usersData?.success) setUsersList(usersData.users);
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

  // Active Outlet Info & Branch Isolation Helpers
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId);
  const isSoulmate = activeOutlet?.code === "SOULMATE_CAFE";
  const isAbuAdel = activeOutlet?.code === "ABU_ADEL_PATISSERIE";

  const isOwner = currentUser?.role === "owner";
  const isBranchManager = currentUser?.role === "branch_manager";
  const userOutlet = outlets.find((o) => o.id === currentUser?.outletId);
  const isUserSoulmate = userOutlet?.code === "SOULMATE_CAFE";
  const isUserAbuAdel = userOutlet?.code === "ABU_ADEL_PATISSERIE";

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

  // ImgBB Upload Handler
  const handleUploadImgBB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setPastryForm((prev) => ({ ...prev, image: data.url }));
        setMenuItemForm((prev) => ({ ...prev, image: data.url }));
        addToast("success", "تم رفع الصورة بنجاح عبر ImgBB 📸");
      } else {
        addToast("error", data.error || "فشل رفع الصورة");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };

  // User Management Handlers (Maestro & GM)
  const handleToggleUserStatus = async (user: any) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          `تم ${!user.isActive ? "تفعيل" : "تعطيل"} حساب (${user.name}) بنجاح 👍`
        );
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تحديث حالة المستخدم");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userModalMode === "ADD") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userForm.name,
            username: userForm.username,
            password: userForm.password,
            pin: userForm.pin,
            role: userForm.role,
            outletId: userForm.outletId || null,
            phone: userForm.phone,
          }),
        });
        const data = await res.json();
        if (data.success) {
          addToast("success", "تم إضافة المستخدم الجديد بنجاح 🎉");
          setShowUserModal(false);
          fetchDashboardData();
        } else {
          addToast("error", data.error || "فشل إنشاء المستخدم");
        }
      } else {
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userForm.id,
            name: userForm.name,
            username: userForm.username,
            ...(userForm.password && { password: userForm.password }),
            pin: userForm.pin,
            role: userForm.role,
            outletId: userForm.outletId || null,
            phone: userForm.phone,
          }),
        });
        const data = await res.json();
        if (data.success) {
          addToast("success", "تم تعديل بيانات وصلاحيات المستخدم بنجاح 👍");
          setShowUserModal(false);
          fetchDashboardData();
        } else {
          addToast("error", data.error || "فشل تحديث المستخدم");
        }
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

  // Emergency System Lock Handler (Maestro Exclusive)
  const handleToggleSystemLock = async (isLocked: boolean) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemLocked: isLocked }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        addToast(
          isLocked ? "error" : "success",
          isLocked
            ? "⚠️ تم تفعيل قفل الطوارئ للمنظومة بالكامل!"
            : "✅ تم فك قفل المنظومة بنجاح، النظام متاح للعمل الآن."
        );
      } else {
        addToast("error", data.error || "فشل تحديث حالة قفل المنظومة");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

  // Menu Items Management Handlers
  const handleToggleItemAvailability = async (item: any) => {
    try {
      const res = await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isAvailable: !item.isAvailable,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          `تم ${!item.isAvailable ? "إتاحة" : "تعطيل"} صنف (${item.nameAr}) بنجاح`
        );
        setMenuItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, isAvailable: !item.isAvailable } : it
          )
        );
      } else {
        addToast("error", data.error || "فشل تحديث حالة الصنف");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

  const handleDeleteMenuItem = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الصنف (${name}) نهائياً من القائمة؟`)) return;
    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("success", `تم حذف الصنف (${name}) بنجاح`);
        setMenuItems((prev) => prev.filter((it) => it.id !== id));
      } else {
        addToast("error", data.error || "فشل حذف الصنف");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (menuItemModalMode === "ADD") {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outletId: menuItemForm.outletId || (outlets[0]?.id || ""),
            nameAr: menuItemForm.nameAr,
            nameEn: menuItemForm.nameEn,
            category: menuItemForm.category,
            price: menuItemForm.price,
            costPrice: menuItemForm.costPrice,
            stockQty: menuItemForm.stockQty,
            minStockAlert: menuItemForm.minStockAlert,
            unitType: menuItemForm.unitType,
            itemType: menuItemForm.itemType,
            image: menuItemForm.image,
            description: menuItemForm.description,
          }),
        });
        const data = await res.json();
        if (data.success) {
          addToast("success", "تم إضافة الصنف الجديد بنجاح 🎉");
          setShowMenuItemModal(false);
          fetchDashboardData();
        } else {
          addToast("error", data.error || "فشل إضافة الصنف");
        }
      } else {
        const res = await fetch("/api/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: menuItemForm.id,
            nameAr: menuItemForm.nameAr,
            nameEn: menuItemForm.nameEn,
            category: menuItemForm.category,
            price: menuItemForm.price,
            costPrice: menuItemForm.costPrice,
            stockQty: menuItemForm.stockQty,
            minStockAlert: menuItemForm.minStockAlert,
            unitType: menuItemForm.unitType,
            itemType: menuItemForm.itemType,
            image: menuItemForm.image,
            description: menuItemForm.description,
          }),
        });
        const data = await res.json();
        if (data.success) {
          addToast("success", "تم حفظ وتعديل الصنف بنجاح 👍");
          setShowMenuItemModal(false);
          fetchDashboardData();
        } else {
          addToast("error", data.error || "فشل تعديل الصنف");
        }
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

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

  // Add New Raw Material (ERP Item Card)
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
          openingStock: parseFloat(rawForm.openingStock) || 0,
          minStockAlert: parseFloat(rawForm.minStockAlert) || 200,
          costPerUnit: parseFloat(rawForm.costPerUnit) || 0.5,
          supplierName: rawForm.supplierName,
          notes: rawForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم إنشاء كارت صنف الخامة بنجاح");
        setShowRawMaterialModal(false);
        setRawForm({
          nameAr: "",
          unit: "GRAM",
          openingStock: "1000",
          minStockAlert: "200",
          costPerUnit: "0.5",
          supplierName: "",
          notes: "",
          outletId: "",
        });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل حفظ كارت صنف الخامة");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ الخامة");
    }
  };

  // Record Separate Inbound Stock Movement (توريد خامات منفصلة)
  const handleRecordInboundMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRawForInbound) return;
    const qty = parseFloat(inboundForm.quantity);
    if (!qty || qty <= 0) {
      addToast("error", "يرجى إدخال كمية توريد صحيحة أكبر من صفر");
      return;
    }

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_MOVEMENT",
          rawMaterialId: selectedRawForInbound.id,
          quantity: qty,
          costPerUnit: inboundForm.costPerUnit ? parseFloat(inboundForm.costPerUnit) : undefined,
          supplierName: inboundForm.supplierName,
          invoiceNumber: inboundForm.invoiceNumber,
          recordedBy: currentUser?.name || "المايسترو",
          notes: inboundForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم تسجيل حركة التوريد بنجاح 📦");
        setShowInboundModal(false);
        setSelectedRawForInbound(null);
        setInboundForm({
          quantity: "",
          costPerUnit: "",
          supplierName: "",
          invoiceNumber: "",
          notes: "",
        });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تسجيل حركة التوريد");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // Set / Edit Raw Material Opening Stock Directly (تعديل رصيد أول المدة للخامة)
  const handleSetRawOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRawForOpening) return;
    const val = parseFloat(rawOpeningValue);
    if (isNaN(val) || val < 0) {
      addToast("error", "يرجى إدخال رصيد أول مدة صحيح");
      return;
    }

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_OPENING_STOCK",
          rawMaterialId: selectedRawForOpening.id,
          openingStock: val,
          recordedBy: currentUser?.name || "المايسترو",
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم تثبيت رصيد أول المدة بنجاح 🎯");
        setShowRawOpeningModal(false);
        setSelectedRawForOpening(null);
        setRawOpeningValue("");
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تثبيت رصيد أول المدة");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء تثبيت الرصيد");
    }
  };

  // Submit Raw Material Inventory Audit (اعتماد وتسوية الجرد أو تثبيته كرصيد أول المدة)
  const handleSaveInventoryAudit = async (asOpeningStock: boolean = false) => {
    const targetOutlet =
      outlets.find((o) => o.code === "SOULMATE_CAFE")?.id ||
      (selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id);

    try {
      setIsSubmittingAudit(true);
      const auditItems = rawMaterials.map((r) => {
        const enteredVal = auditCounts[r.id];
        const actual = enteredVal !== undefined && enteredVal !== "" ? parseFloat(enteredVal) : (r.expectedStock ?? r.currentStock);
        return {
          rawMaterialId: r.id,
          actualStock: actual,
          expectedStock: r.expectedStock ?? r.currentStock,
          totalInbound: r.totalInbound || 0,
          totalConsumed: r.totalConsumed || 0,
        };
      });

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_AUDIT",
          outletId: targetOutlet,
          auditorName: currentUser?.name || "المايسترو",
          setAsOpeningStock: asOpeningStock,
          notes: asOpeningStock ? "جرد تأسيسي وتثبيت رصيد أول المدة" : "محضر جرد فعلي وتسوية دفتري وسحابي",
          auditItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم اعتماد محضر الجرد وتسوية الأرصدة بنجاح 📋✅");
        setAuditCounts({});
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل اعتماد محضر الجرد");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ محضر الجرد");
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  // --- ABU ADEL PASTRY ERP HANDLERS ---

  // Set / Edit Pastry Opening Stock Directly (تعديل رصيد أول المدة لصنف حلويات)
  const handleSetPastryOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPastryForOpening) return;
    const val = parseFloat(pastryOpeningValue);
    if (isNaN(val) || val < 0) {
      addToast("error", "يرجى إدخال رصيد أول مدة صحيح");
      return;
    }

    try {
      const res = await fetch("/api/pastry-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_OPENING_STOCK",
          menuItemId: selectedPastryForOpening.id,
          openingStock: val,
          recordedBy: currentUser?.name || "المايسترو",
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم تثبيت رصيد أول المدة بنجاح 🎯");
        setShowPastryOpeningModal(false);
        setSelectedPastryForOpening(null);
        setPastryOpeningValue("");
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تثبيت رصيد أول المدة");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء تثبيت الرصيد");
    }
  };

  // Record Pastry Inbound Movement from Workshop (توريد حلويات من المعمل)
  const handleRecordPastryInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPastryForInbound) return;
    const qty = parseFloat(pastryInboundForm.quantity);
    if (!qty || qty <= 0) {
      addToast("error", "يرجى إدخال كمية توريد صحيحة أكبر من صفر");
      return;
    }

    try {
      const res = await fetch("/api/pastry-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_INBOUND_MOVEMENT",
          menuItemId: selectedPastryForInbound.id,
          quantity: qty,
          unitCost: pastryInboundForm.unitCost ? parseFloat(pastryInboundForm.unitCost) : undefined,
          supplierName: pastryInboundForm.supplierName || "معمل حلواني أبو عادل",
          invoiceNumber: pastryInboundForm.invoiceNumber,
          recordedBy: currentUser?.name || "المايسترو",
          notes: pastryInboundForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم تسجيل حركة التوريد بنجاح 📦");
        setShowPastryInboundModal(false);
        setSelectedPastryForInbound(null);
        setPastryInboundForm({
          quantity: "",
          unitCost: "",
          supplierName: "",
          invoiceNumber: "",
          notes: "",
        });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تسجيل حركة التوريد");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // Submit Pastry Inventory Audit (اعتماد وتسوية جرد حلويات أبو عادل أو تثبيته كرصيد أول المدة)
  const handleSavePastryAudit = async (asOpeningStock: boolean = false) => {
    const targetOutlet =
      outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id ||
      (selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id);

    try {
      setIsSubmittingPastryAudit(true);
      const auditItems = (pastryInventory.length > 0 ? pastryInventory : menuItems.filter((m) => m.itemType === "READY_PASTRY")).map((p) => {
        const enteredVal = pastryAuditCounts[p.id];
        const actual = enteredVal !== undefined && enteredVal !== "" ? parseFloat(enteredVal) : (p.expectedStock ?? p.stockQty ?? 0);
        return {
          menuItemId: p.id,
          actualStock: actual,
          expectedStock: p.expectedStock ?? p.stockQty ?? 0,
          totalInbound: p.totalInbound || 0,
          totalSold: p.totalSold || 0,
        };
      });

      const res = await fetch("/api/pastry-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_AUDIT",
          outletId: targetOutlet,
          auditorName: currentUser?.name || "المايسترو",
          setAsOpeningStock: asOpeningStock,
          notes: asOpeningStock ? "جرد تأسيسي وتثبيت رصيد أول المدة لحلويات أبو عادل" : "محضر جرد فعلي وتسوية دفتري لحلويات أبو عادل",
          auditItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم اعتماد محضر الجرد بنجاح 📋✅");
        setPastryAuditCounts({});
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل اعتماد محضر الجرد");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء حفظ محضر الجرد");
    } finally {
      setIsSubmittingPastryAudit(false);
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
          action: "SAVE_RECIPE",
          menuItemId: selectedMenuItemForRecipe.id,
          ingredients: recipeFormItems.filter((i) => i.qtyRequired > 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم حفظ ريسيبي الصنف وتحديث تكلفة الكوب بدقة");
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
          image: pastryForm.image,
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
          image: "",
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

  // Update Reservation Status
  const handleUpdateReservationStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/reservations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          `تم تحديث حالة الحجز إلى: ${
            status === "CONFIRMED" ? "مؤكد" : status === "CANCELLED" ? "ملغي" : "مكتمل"
          }`
        );
        fetchDashboardData();
      }
    } catch {
      addToast("error", "فشل تحديث حالة الحجز");
    }
  };

  // Send Staff Reply to Customer / Table Chat
  const handleSendStaffChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReplyText.trim()) return;

    try {
      const targetOutlet =
        selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutlet,
          senderType: "STAFF",
          senderName: currentUser?.name || "كابتن الإدارة / الباريستا",
          tableNumber: selectedChatTable !== "ALL" ? selectedChatTable : null,
          message: chatReplyText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatReplyText("");
        addToast("success", "تم إرسال الرد المباشر للزبون بنجاح 👍");
        fetchDashboardData();
      }
    } catch {
      addToast("error", "فشل إرسال الرد");
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
    localStorage.removeItem("abuadel_soulmate_user");
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
          سول ميت كافيه VIP & حلواني أبو عادل
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
                    ? "👑 المالك العام (Maestro)"
                    : isUserSoulmate
                    ? "☕ مدير فرع سول ميت كافيه VIP"
                    : "🍰 مدير فرع حلواني أبو عادل"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentUser?.role === "owner"
                  ? "مجموعة حلواني أبو عادل & سول ميت كافيه VIP"
                  : isUserSoulmate
                  ? "إدارة وتشغيل سول ميت كافيه VIP (حدايق القبة)"
                  : "إدارة وتشغيل حلواني أبو عادل (أصل الحلويات)"}
              </p>
            </div>
          </div>

          {/* Outlet Switcher (Maestro Owner only) */}
          <div className="flex items-center gap-3">
            {currentUser?.role === "owner" ? (
              <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 px-2 font-medium">الفرع:</span>
                <select
                  value={selectedOutletId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedOutletId(val);
                    setMenuOutletFilter(val);
                  }}
                  className="bg-slate-900 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">🌟 كافة الفروع (إدارة مركزية شاملة)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code === "SOULMATE_CAFE" ? "☕ سول ميت كافيه VIP" : "🍰 حلواني أبو عادل"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-black text-amber-300 flex items-center gap-2 shadow-sm">
                {isUserSoulmate ? (
                  <>
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>فرع سول ميت كافيه VIP (تشغيل وإدارة منفصلة)</span>
                  </>
                ) : (
                  <>
                    <Cake className="w-4 h-4 text-rose-400" />
                    <span>فرع حلواني أبو عادل (تشغيل وإدارة منفصلة)</span>
                  </>
                )}
              </div>
            )}

            {/* Quick Navigation Buttons */}
            <Link
              href="/"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 transition"
              title="زيارة الصفحة الرئيسية للموقع"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>الرئيسية 🏠</span>
            </Link>

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
              <span>كارت الـ 3 QR</span>
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
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "menu"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>قائمة الأصناف والتعديل الشامل ({menuItems.length} صنف)</span>
            </button>

            {/* Recipes Tab (Soulmate only) */}
            {(isOwner || isUserSoulmate) && (
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
            )}

            {/* Pastry Tab (Abu Adel only) */}
            {(isOwner || isUserAbuAdel) && (
              <button
                onClick={() => setActiveTab("pastry")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === "pastry"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Cake className="w-4 h-4" />
                <span>مخزن حلويات أبو عادل ({pastryInventory.length > 0 ? pastryInventory.length : 230} صنف)</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "orders"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>سجل الطلبات والدليفري</span>
            </button>

            {/* Reservations Tab (Soulmate only) */}
            {(isOwner || isUserSoulmate) && (
              <button
                onClick={() => setActiveTab("reservations")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === "reservations"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>حجوزات الترابيزات والحفلات ({reservations.length})</span>
              </button>
            )}

            {/* Chat Tab (Soulmate only) */}
            {(isOwner || isUserSoulmate) && (
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === "chat"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>شات الزبائن والباريستا ({chatMessages.length})</span>
              </button>
            )}

            {/* Loyalty Tab (Soulmate only) */}
            {(isOwner || isUserSoulmate) && (
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
            )}

            {/* Users & Permissions Tab (Maestro Exclusive!) */}
            {isOwner && (
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === "users"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>إدارة المستخدمين والصلاحيات 👑</span>
              </button>
            )}

            {/* Settings Tab (Maestro Exclusive!) */}
            {isOwner && (
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
            )}
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
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

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
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

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
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

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
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
                          صفحة طلب الزبون من الترابيزة / دليفري
                        </div>
                        <div className="text-[10px] text-slate-400">/order</div>
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
                    <span>آخر الطلبات والشيكات والدليفري</span>
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
                                  : order.orderType === "DELIVERY"
                                  ? "توصيل دليفري 🛵"
                                  : "تيك أواي"}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {order.outlet?.name} • {itemsCount} أصناف
                              {order.deliveryAddress && ` • عنوان: ${order.deliveryAddress}`}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-bold text-amber-400 font-mono">
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
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MENU & PRODUCTS CATALOG (DYNAMIC PRICING & IMAGES) */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <span>قائمة الأصناف والمنتجات والتسعير المباشر</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    إدارة وتعديل أسعار وتكاليف ومخزون كافة الأصناف وصورها لكلا المنفذين مع إمكانية الرفع المباشر.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMenuItemModalMode("ADD");
                    setMenuItemForm({
                      id: "",
                      outletId: isUserAbuAdel
                        ? outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id || ""
                        : isUserSoulmate
                        ? outlets.find((o) => o.code === "SOULMATE_CAFE")?.id || ""
                        : outlets[0]?.id || "",
                      nameAr: "",
                      nameEn: "",
                      category: isUserAbuAdel ? "ORIENTAL_SWEETS" : "HOT_DRINKS",
                      price: "",
                      costPrice: "",
                      stockQty: "100",
                      minStockAlert: "10",
                      unitType: "PIECE",
                      itemType: isUserAbuAdel ? "READY_PASTRY" : "PREPARED_BEVERAGE",
                      image: "",
                      isAvailable: true,
                      description: "",
                    });
                    setShowMenuItemModal(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black px-4 py-2.5 rounded-xl text-xs shadow-lg transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة صنف جديد للقائمة 🍰☕</span>
                </button>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم العربي أو الإنجليزي..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {isOwner && (
                  <select
                    value={menuOutletFilter}
                    onChange={(e) => setMenuOutletFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="ALL">🌟 كل المنافذ (أبو عادل & سول ميت)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code === "SOULMATE_CAFE" ? "☕ سول ميت كافيه VIP" : "🍰 حلواني أبو عادل"}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={menuCategoryFilter}
                  onChange={(e) => setMenuCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">📂 كافة التصنيفات</option>
                  <optgroup label="☕ سول ميت كافيه">
                    {SOULMATE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.nameAr} ({c.nameEn})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🍰 حلواني أبو عادل">
                    {ABU_ADEL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.nameAr} ({c.nameEn})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">الصورة</th>
                      <th className="py-3 px-3">اسم الصنف</th>
                      <th className="py-3 px-3">المنفذ / الفرع</th>
                      <th className="py-3 px-3">التصنيف</th>
                      <th className="py-3 px-3">سعر البيع</th>
                      <th className="py-3 px-3">سعر التكلفة</th>
                      <th className="py-3 px-3">المخزون</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                      <th className="py-3 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(() => {
                      const filteredItems = menuItems.filter((it) => {
                        if (isUserSoulmate && it.outlet?.code !== "SOULMATE_CAFE") return false;
                        if (isUserAbuAdel && it.outlet?.code !== "ABU_ADEL_PATISSERIE") return false;
                        if (menuOutletFilter !== "ALL" && it.outletId !== menuOutletFilter) return false;
                        if (menuCategoryFilter !== "ALL" && it.category !== menuCategoryFilter) return false;
                        if (menuSearch.trim()) {
                          const q = menuSearch.toLowerCase();
                          return (
                            it.nameAr?.toLowerCase().includes(q) ||
                            it.nameEn?.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      });

                      if (filteredItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-500">
                              <Package className="w-10 h-10 mx-auto text-slate-600 opacity-40 mb-2" />
                              <p className="text-sm font-bold text-slate-400">لا توجد أصناف مطابقة للبحث أو الفلتر المحدد</p>
                              <p className="text-xs text-slate-500 mt-1">جرّب اختيار تصنيف آخر أو مسح كلمة البحث</p>
                            </td>
                          </tr>
                        );
                      }

                      return filteredItems.map((item) => {
                        const fallbackImage =
                          item.itemType === "READY_PASTRY"
                            ? "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600"
                            : "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600";
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.image || fallbackImage}
                                  alt={item.nameAr}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as any).src = fallbackImage;
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white text-sm">{item.nameAr}</div>
                              {item.nameEn && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {item.nameEn}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.outlet?.code === "SOULMATE_CAFE"
                                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                }`}
                              >
                                {item.outlet?.code === "SOULMATE_CAFE"
                                  ? "☕ سول ميت كافيه"
                                  : "🍰 حلواني أبو عادل"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[11px] text-slate-300 font-medium">
                                {getCategoryLabel(item.category)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400 text-sm">
                              {item.price} ج.م
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {item.calculatedCost || item.costPrice || 0} ج.م
                              {item.profitMarginPercent !== undefined && (
                                <span className="text-[10px] text-emerald-400 block">
                                  هامش: {item.profitMarginPercent}%
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {item.stockQty} {item.unitType === "KG" ? "كجم" : "قطعة"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleToggleItemAvailability(item)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition cursor-pointer ${
                                  item.isAvailable
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {item.isAvailable ? "متاح للطلب ✓" : "معطل ✕"}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setMenuItemModalMode("EDIT");
                                    setMenuItemForm({
                                      id: item.id,
                                      outletId: item.outletId,
                                      nameAr: item.nameAr,
                                      nameEn: item.nameEn || "",
                                      category: item.category,
                                      price: String(item.price),
                                      costPrice: String(item.costPrice || ""),
                                      stockQty: String(item.stockQty),
                                      minStockAlert: String(item.minStockAlert || 10),
                                      unitType: item.unitType || "PIECE",
                                      itemType: item.itemType || "PREPARED_BEVERAGE",
                                      image: item.image || "",
                                      isAvailable: item.isAvailable,
                                      description: item.description || "",
                                    });
                                    setShowMenuItemModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[11px] transition cursor-pointer"
                                  title="تعديل بيانات الصنف والصورة"
                                >
                                  تعديل ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item.id, item.nameAr)}
                                  className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] transition cursor-pointer"
                                  title="حذف الصنف نهائياً"
                                >
                                  حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECIPES & BARISTA COSTING ENGINE & INVENTORY AUDIT */}
        {activeTab === "recipes" && (
          <div className="space-y-6">
            {/* Top Sub-Navigation Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRecipeSubTab("cards")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    recipeSubTab === "cards"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>كروت أصناف الخامات والمخزن</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipeSubTab("audit")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    recipeSubTab === "audit"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>الجرد المقارن الفوري والتسوية السحابية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipeSubTab("bom")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    recipeSubTab === "bom"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  <span>ريسيبي المشروبات وحساب تكلفة الكوب</span>
                </button>
              </div>

              {recipeSubTab === "cards" && (
                <button
                  onClick={() => setShowRawMaterialModal(true)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة كارت صنف خامة جديدة</span>
                </button>
              )}

              {recipeSubTab === "audit" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveInventoryAudit(true)}
                    disabled={isSubmittingAudit}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                    title="تثبيت كافة الأرصدة المعدودة كرصيد أول المدة التأسيسي"
                  >
                    <Award className="w-4 h-4" />
                    <span>اعتماد الجرد كرصيد أول المدة 🎯</span>
                  </button>

                  <button
                    onClick={() => handleSaveInventoryAudit(false)}
                    disabled={isSubmittingAudit}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>{isSubmittingAudit ? "جاري التسوية والاعتماد..." : "اعتماد وتسوية محضر الجرد 📋✅"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* SUB-TAB 1: ERP RAW MATERIAL ITEM CARDS */}
            {recipeSubTab === "cards" && (
              <div className="space-y-4">
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <Flame className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-amber-300 mb-1">
                      كروت أصناف خامات البار (ERP Raw Material Ledger)
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      كل كارت صنف يحتوي على سعر الوحدة، رصيد بداية المدة، إجمالي الوارد بحركات توريد منفصلة، والمستهلك الفعلي تلقائياً بناءً على مبيعات الريسيبي.
                      لتحديد أو تعديل رصيد بداية المدة، اضغط على <strong>تعديل رصيد أول المدة ✏️</strong>، ولتزويد رصيد خامة اضغط على <strong>توريد كمية جديدة</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rawMaterials.map((raw) => {
                    const isLow = raw.currentStock <= raw.minStockAlert;
                    const unitLabel =
                      raw.unit === "GRAM"
                        ? "جرام"
                        : raw.unit === "ML"
                        ? "مل"
                        : raw.unit === "KG"
                        ? "كجم"
                        : raw.unit === "LITER"
                        ? "لتر"
                        : "قطعة";

                    return (
                      <div
                        key={raw.id}
                        className={`p-4 rounded-2xl border transition shadow-lg flex flex-col justify-between ${
                          isLow
                            ? "bg-rose-950/20 border-rose-600/40 hover:border-rose-500/60"
                            : "bg-slate-900 border-slate-800 hover:border-amber-500/40"
                        }`}
                      >
                        {/* Header & Badges */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                                <span>{raw.nameAr}</span>
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                وحدة القياس: {unitLabel}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isLow ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>نواقص</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                                  متوفر
                                </span>
                              )}
                              <span className="text-[10px] text-amber-400 font-mono font-bold">
                                {raw.costPerUnit} ج.م / {unitLabel}
                              </span>
                            </div>
                          </div>

                          {/* 4-Stat ERP Ledger Matrix */}
                          <div className="grid grid-cols-2 gap-2 my-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">رصيد بداية المدة:</span>
                              <span className="font-mono font-bold text-slate-200">
                                {(raw.openingStock || 0).toLocaleString()} {unitLabel}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">إجمالي الوارد:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                +{(raw.totalInbound || 0).toLocaleString()} {unitLabel}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">مستهلك الريسيبي:</span>
                              <span className="font-mono font-bold text-rose-400">
                                -{(raw.totalConsumed || 0).toLocaleString()} {unitLabel}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">الرصيد الدفتري المتوقع:</span>
                              <span className="font-mono font-black text-amber-400">
                                {(raw.expectedStock ?? raw.currentStock).toLocaleString()} {unitLabel}
                              </span>
                            </div>
                          </div>

                          {/* Main Current Stock Number */}
                          <div className="flex items-baseline justify-between pt-1 pb-3">
                            <span className="text-xs text-slate-400 font-bold">الرصيد الفعلي الحالي:</span>
                            <span className="text-xl font-black text-white font-mono">
                              {raw.currentStock.toLocaleString()}{" "}
                              <span className="text-xs font-normal text-amber-400 font-sans">{unitLabel}</span>
                            </span>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRawForOpening(raw);
                              setRawOpeningValue(String(raw.openingStock ?? ""));
                              setShowRawOpeningModal(true);
                            }}
                            className="w-full py-1 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>تعديل رصيد أول المدة ✏️</span>
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRawForInbound(raw);
                                setInboundForm({
                                  quantity: "",
                                  costPerUnit: String(raw.costPerUnit || ""),
                                  supplierName: raw.supplierName || "",
                                  invoiceNumber: "",
                                  notes: "",
                                });
                                setShowInboundModal(true);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[11px] border border-amber-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>توريد كمية ➕</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRawForMovements(raw);
                                setShowMovementsModal(true);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>سجل الحركات</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: LIVE INVENTORY AUDIT & RECONCILIATION */}
            {recipeSubTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <Scale className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <h4 className="font-bold text-emerald-300 mb-1">
                        شاشة الجرد المقارن الفوري والتسوية السحابية (Instant Stock Reconciliation)
                      </h4>
                      <p className="text-slate-300 leading-relaxed">
                        تقارن هذه الشاشة بين <strong>الرصيد الدفتري المتوقع</strong> (رصيد بداية المدة + إجمالي الوارد - المستهلك من الريسيبي)
                        وبين <strong>الرصيد الفعلي</strong> الذي تقوم بعدّه على الرف.
                        يمكنك اعتماد هذا الجرد كـ <strong>رصيد أول المدة التأسيسي 🎯</strong>، أو اعتماده لتسوية الفروقات رسمياً.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveInventoryAudit(true)}
                      disabled={isSubmittingAudit}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                      title="تثبيت كافة الأرصدة المعدودة كرصيد أول المدة التأسيسي"
                    >
                      <Award className="w-4 h-4" />
                      <span>اعتماد الجرد كرصيد أول المدة 🎯</span>
                    </button>

                    <button
                      onClick={() => handleSaveInventoryAudit(false)}
                      disabled={isSubmittingAudit}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{isSubmittingAudit ? "جاري التسوية..." : "اعتماد وتسوية المحضر 📋✅"}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                        <tr>
                          <th className="py-3 px-3">الخامة</th>
                          <th className="py-3 px-2">الوحدة</th>
                          <th className="py-3 px-2">سعر الوحدة</th>
                          <th className="py-3 px-2">رصيد البداية</th>
                          <th className="py-3 px-2 text-emerald-400">+ إجمالي الوارد</th>
                          <th className="py-3 px-2 text-rose-400">- مستهلك الريسيبي</th>
                          <th className="py-3 px-3 text-amber-400 font-black">الرصيد الدفتري</th>
                          <th className="py-3 px-3 text-white font-black bg-slate-800/60">
                            الرصيد الفعلي (العدّ)
                          </th>
                          <th className="py-3 px-3 text-center">الفارق (عجز / زيادة)</th>
                          <th className="py-3 px-3">القيمة المالية للفارق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {rawMaterials.map((raw) => {
                          const unitLabel =
                            raw.unit === "GRAM"
                              ? "جرام"
                              : raw.unit === "ML"
                              ? "مل"
                              : raw.unit === "KG"
                              ? "كجم"
                              : raw.unit === "LITER"
                              ? "لتر"
                              : "قطعة";

                          const expected = raw.expectedStock ?? raw.currentStock;
                          const entered = auditCounts[raw.id];
                          const actual = entered !== undefined && entered !== "" ? parseFloat(entered) : expected;
                          const variance = actual - expected;
                          const varianceCost = variance * (raw.costPerUnit || 0);

                          return (
                            <tr key={raw.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-3 font-bold text-white font-sans flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                                <span>{raw.nameAr}</span>
                              </td>
                              <td className="py-3 px-2 text-slate-400 font-sans text-[11px]">{unitLabel}</td>
                              <td className="py-3 px-2 text-amber-400">{raw.costPerUnit} ج.م</td>
                              <td className="py-3 px-2 text-slate-300">{(raw.openingStock || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-emerald-400 font-bold">+{(raw.totalInbound || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-rose-400 font-bold">-{(raw.totalConsumed || 0).toLocaleString()}</td>
                              <td className="py-3 px-3 font-black text-amber-300 bg-amber-500/5">
                                {expected.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 bg-slate-800/40">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={String(expected)}
                                  value={auditCounts[raw.id] !== undefined ? auditCounts[raw.id] : ""}
                                  onChange={(e) =>
                                    setAuditCounts({ ...auditCounts, [raw.id]: e.target.value })
                                  }
                                  className="w-28 bg-black/80 border border-amber-500/40 rounded-lg px-2.5 py-1 text-center font-mono font-black text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </td>
                              <td className="py-3 px-3 text-center">
                                {variance === 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                                    مطابق وسليم ✅
                                  </span>
                                ) : variance < 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-sans flex items-center justify-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>عجز ({variance.toLocaleString()})</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-sans">
                                    زيادة (+{variance.toLocaleString()})
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {variance === 0 ? (
                                  <span className="text-slate-500 text-[11px]">0.00 ج.م</span>
                                ) : variance < 0 ? (
                                  <span className="font-bold text-rose-400">
                                    {varianceCost.toFixed(2)} ج.م
                                  </span>
                                ) : (
                                  <span className="font-bold text-blue-400">
                                    +{varianceCost.toFixed(2)} ج.م
                                  </span>
                                )}
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

            {/* SUB-TAB 3: BEVERAGE RECIPE BOM TABLE */}
            {recipeSubTab === "bom" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>قائمة المشروبات وتكلفة الكوب وهامش الربح الفعلي</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    إجمالي المشروبات: {menuItems.filter((m) => m.itemType === "PREPARED_BEVERAGE").length} صنف
                  </span>
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
                                <div>
                                  <span>{item.nameAr}</span>
                                  {item.nameEn && (
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      {item.nameEn}
                                    </span>
                                  )}
                                </div>
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
                                  {(item.recipes || []).length > 0 ? (
                                    (item.recipes || []).map((r: any) => (
                                      <span
                                        key={r.id || r.rawMaterialId}
                                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                                      >
                                        {r.rawMaterial?.nameAr || "خامة"}: {r.qtyRequired}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500 text-[11px] italic">
                                      لم يتم ربط ريسيبي بعد
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
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
                                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black text-xs font-bold border border-amber-500/40 transition cursor-pointer"
                                >
                                  تعديل الريسيبي ⚙️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINISHED PASTRY INVENTORY (ABU ADEL ERP) */}
        {activeTab === "pastry" && (
          <div className="space-y-6">
            {/* Top Sub-Navigation Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPastrySubTab("cards")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    pastrySubTab === "cards"
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Cake className="w-4 h-4" />
                  <span>كروت أصناف حلويات أبو عادل والمخزن</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPastrySubTab("audit")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    pastrySubTab === "audit"
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>الجرد المقارن الفوري لحلويات أبو عادل</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {pastrySubTab === "cards" && (
                  <button
                    onClick={() => setShowPastryModal(true)}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-rose-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة صنف حلويات جديد (مع صورة)</span>
                  </button>
                )}

                {pastrySubTab === "audit" && (
                  <>
                    <button
                      onClick={() => handleSavePastryAudit(true)}
                      disabled={isSubmittingPastryAudit}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                      title="تثبيت كافة الأرصدة المعدودة كرصيد أول المدة لحلويات أبو عادل"
                    >
                      <Award className="w-4 h-4" />
                      <span>اعتماد الجرد كرصيد أول المدة 🎯</span>
                    </button>

                    <button
                      onClick={() => handleSavePastryAudit(false)}
                      disabled={isSubmittingPastryAudit}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{isSubmittingPastryAudit ? "جاري التسوية..." : "اعتماد وتسوية محضر الجرد 📋✅"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* SUB-TAB 1: PASTRY ERP ITEM CARDS */}
            {pastrySubTab === "cards" && (
              <div className="space-y-4">
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <Cake className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-rose-300 mb-1">
                      مخزن أصناف حلواني أبو عادل (Finished Goods ERP Ledger)
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      نظام حركة وجرد متكامل لكل صنف: رصيد بداية المدة، إجمالي الوارد من معمل الحلواني، المسحوب والمباع عبر الكاشير، والرصيد الدفتري والفعلي.
                      لتثبيت رصيد بداية المدة اضغط <strong>تعديل رصيد أول المدة ✏️</strong>، ولإضافة إنتاج جديد اضغط <strong>توريد من المعمل 📦➕</strong>.
                    </p>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="بحث في حلويات أبو عادل (الاسم أو الكود)..."
                      value={pastrySearchQuery}
                      onChange={(e) => setPastrySearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                    {[
                      { id: "ALL", label: "كافة الأصناف" },
                      { id: "ORIENTAL_SWEETS", label: "الشرقيات" },
                      { id: "CAKES_TORTES", label: "التورت والمناسبات" },
                      { id: "WESTERN_PASTRY", label: "الجاتوهات والغربيات" },
                      { id: "BAKERY_FETEER", label: "المخبوزات والفطير" },
                      { id: "KAHK_NOVAM", label: "الكحك والنواعم" },
                      { id: "CHOCOLATE_SWEETS", label: "الشوكولاتة" },
                      { id: "GIFT_BOXES", label: "بوكسات الهدايا" },
                    ].map((cat) => {
                      const sourceList =
                        pastryInventory.length > 0
                          ? pastryInventory
                          : menuItems.filter((m) => m.itemType === "READY_PASTRY" || m.outlet?.code === "ABU_ADEL_PATISSERIE");
                      const count =
                        cat.id === "ALL"
                          ? sourceList.length
                          : sourceList.filter((item) => {
                              if (cat.id === "BAKERY_FETEER") return item.category === "BAKERY_FETEER" || item.category === "BAKERY" || item.category === "FETEER";
                              if (cat.id === "KAHK_NOVAM") return item.category === "KAHK_NOVAM" || item.category === "NOVO_SWEETS" || item.category === "NOVAM";
                              if (cat.id === "CHOCOLATE_SWEETS") return item.category === "CHOCOLATE_SWEETS" || item.category === "CHOCOLATE";
                              return item.category === cat.id;
                            }).length;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPastryCategoryFilter(cat.id)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                            pastryCategoryFilter === cat.id
                              ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              pastryCategoryFilter === cat.id ? "bg-white/20 text-white" : "bg-black/40 text-slate-400"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid of Pastry Cards */}
                {(() => {
                  const source = pastryInventory.length > 0 ? pastryInventory : menuItems.filter((m) => m.itemType === "READY_PASTRY" || m.outlet?.code === "ABU_ADEL_PATISSERIE");
                  const filtered = source.filter((item) => {
                    const matchQuery =
                      !pastrySearchQuery ||
                      item.nameAr?.toLowerCase().includes(pastrySearchQuery.toLowerCase()) ||
                      item.nameEn?.toLowerCase().includes(pastrySearchQuery.toLowerCase());
                    const matchCategory =
                      pastryCategoryFilter === "ALL" ||
                      item.category === pastryCategoryFilter ||
                      (pastryCategoryFilter === "BAKERY_FETEER" && (item.category === "BAKERY_FETEER" || item.category === "BAKERY" || item.category === "FETEER")) ||
                      (pastryCategoryFilter === "KAHK_NOVAM" && (item.category === "KAHK_NOVAM" || item.category === "NOVO_SWEETS" || item.category === "NOVAM")) ||
                      (pastryCategoryFilter === "CHOCOLATE_SWEETS" && (item.category === "CHOCOLATE_SWEETS" || item.category === "CHOCOLATE"));
                    return matchQuery && matchCategory;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-16 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-2">
                        <Cake className="w-12 h-12 mx-auto text-rose-500/40 animate-pulse" />
                        <p className="text-sm font-bold text-slate-300">لا توجد أصناف تطابق هذا البحث أو التصنيف</p>
                        <p className="text-xs text-slate-500">جرب اختيار تصنيف آخر أو مسح كلمة البحث</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filtered.map((item) => {
                        const isLow = (item.stockQty ?? 0) <= (item.minStockAlert || 10);
                        const unitLabel =
                          item.unitType === "KG"
                            ? "كجم"
                            : item.unitType === "BOX"
                            ? "علبة / بوكس"
                            : item.unitType === "PORTION"
                            ? "طبق"
                            : "قطعة";

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition shadow-lg flex flex-col justify-between ${
                              isLow
                                ? "bg-rose-950/20 border-rose-600/40 hover:border-rose-500/60"
                                : "bg-slate-900 border-slate-800 hover:border-rose-500/40"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                                    <span>{item.nameAr}</span>
                                  </h4>
                                  <span className="text-[10px] text-slate-400">
                                    الوحدة: {unitLabel} • {getCategoryLabel(item.category)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {isLow ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>نواقص</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                                      متوفر
                                    </span>
                                  )}
                                  <span className="text-xs text-amber-400 font-mono font-black">
                                    {item.price} ج.م
                                  </span>
                                </div>
                              </div>

                              {/* 4-Stat ERP Ledger Matrix */}
                              <div className="grid grid-cols-2 gap-2 my-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">رصيد بداية المدة:</span>
                                  <span className="font-mono font-bold text-slate-200">
                                    {(item.openingStock || 0).toLocaleString()} {unitLabel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">وارد من المعمل:</span>
                                  <span className="font-mono font-bold text-emerald-400">
                                    +{(item.totalInbound || 0).toLocaleString()} {unitLabel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">مبيعات الفواتير:</span>
                                  <span className="font-mono font-bold text-rose-400">
                                    -{(item.totalSold || 0).toLocaleString()} {unitLabel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">الرصيد الدفتري المتوقع:</span>
                                  <span className="font-mono font-black text-amber-400">
                                    {(item.expectedStock ?? item.stockQty ?? 0).toLocaleString()} {unitLabel}
                                  </span>
                                </div>
                              </div>

                              {/* Main Actual Stock Number */}
                              <div className="flex items-baseline justify-between pt-1 pb-3">
                                <span className="text-xs text-slate-400 font-bold">الرصيد الفعلي الحالي:</span>
                                <span className="text-xl font-black text-white font-mono">
                                  {(item.stockQty ?? 0).toLocaleString()}{" "}
                                  <span className="text-xs font-normal text-rose-400 font-sans">{unitLabel}</span>
                                </span>
                              </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPastryForOpening(item);
                                  setPastryOpeningValue(String(item.openingStock ?? ""));
                                  setShowPastryOpeningModal(true);
                                }}
                                className="w-full py-1 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>تعديل رصيد أول المدة ✏️</span>
                              </button>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPastryForInbound(item);
                                    setPastryInboundForm({
                                      quantity: "",
                                      unitCost: String(item.costPrice || ""),
                                      supplierName: "معمل حلواني أبو عادل",
                                      invoiceNumber: "",
                                      notes: "",
                                    });
                                    setShowPastryInboundModal(true);
                                  }}
                                  className="py-1.5 px-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white font-bold text-[11px] border border-rose-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>توريد معمل ➕</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPastryForMovements(item);
                                    setShowPastryMovementsModal(true);
                                  }}
                                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>سجل الحركات</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUB-TAB 2: LIVE PASTRY AUDIT & RECONCILIATION */}
            {pastrySubTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <Scale className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <h4 className="font-bold text-rose-300 mb-1">
                        شاشة الجرد المقارن الفوري لحلويات أبو عادل (Pastry Stock Reconciliation)
                      </h4>
                      <p className="text-slate-300 leading-relaxed">
                        مقارنة الرصيد الدفتري المتوقع (بداية المدة + الوارد من المعمل - مبيعات الكاشير والدليفري) مع الرصيد الفعلي المعدود على الرف.
                        يمكنك اعتماد هذا الجرد كـ <strong>رصيد أول المدة التأسيسي 🎯</strong> لجميع أصناف الحلويات، أو اعتماده لتسوية الفروقات والعجز تلقائياً.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSavePastryAudit(true)}
                      disabled={isSubmittingPastryAudit}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                      title="تثبيت كافة الأرصدة المعدودة كرصيد أول المدة التأسيسي لحلويات أبو عادل"
                    >
                      <Award className="w-4 h-4" />
                      <span>اعتماد الجرد كرصيد أول المدة 🎯</span>
                    </button>

                    <button
                      onClick={() => handleSavePastryAudit(false)}
                      disabled={isSubmittingPastryAudit}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{isSubmittingPastryAudit ? "جاري التسوية..." : "اعتماد وتسوية المحضر 📋✅"}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                        <tr>
                          <th className="py-3 px-3">صنف الحلويات</th>
                          <th className="py-3 px-2">الوحدة</th>
                          <th className="py-3 px-2">سعر البيع</th>
                          <th className="py-3 px-2">رصيد البداية</th>
                          <th className="py-3 px-2 text-emerald-400">+ وارد المعمل</th>
                          <th className="py-3 px-2 text-rose-400">- المبيعات</th>
                          <th className="py-3 px-3 text-amber-400 font-black">الرصيد الدفتري</th>
                          <th className="py-3 px-3 text-white font-black bg-slate-800/60">
                            الرصيد الفعلي (العدّ)
                          </th>
                          <th className="py-3 px-3 text-center">الفارق (عجز / زيادة)</th>
                          <th className="py-3 px-3">القيمة المالية للفارق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {(pastryInventory.length > 0 ? pastryInventory : menuItems.filter((m) => m.itemType === "READY_PASTRY" || m.outlet?.code === "ABU_ADEL_PATISSERIE")).map((item) => {
                          const unitLabel =
                            item.unitType === "KG"
                              ? "كجم"
                              : item.unitType === "BOX"
                              ? "علبة"
                              : item.unitType === "PORTION"
                              ? "طبق"
                              : "قطعة";

                          const expected = item.expectedStock ?? item.stockQty ?? 0;
                          const entered = pastryAuditCounts[item.id];
                          const actual = entered !== undefined && entered !== "" ? parseFloat(entered) : expected;
                          const variance = actual - expected;
                          const varianceCost = variance * (item.price || 0);

                          return (
                            <tr key={item.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-3 font-bold text-white font-sans flex items-center gap-1.5">
                                <Cake className="w-3.5 h-3.5 text-rose-400" />
                                <span>{item.nameAr}</span>
                              </td>
                              <td className="py-3 px-2 text-slate-400 font-sans text-[11px]">{unitLabel}</td>
                              <td className="py-3 px-2 text-amber-400">{item.price} ج.م</td>
                              <td className="py-3 px-2 text-slate-300">{(item.openingStock || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-emerald-400 font-bold">+{(item.totalInbound || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-rose-400 font-bold">-{(item.totalSold || 0).toLocaleString()}</td>
                              <td className="py-3 px-3 font-black text-amber-300 bg-amber-500/5">
                                {expected.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 bg-slate-800/40">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={String(expected)}
                                  value={pastryAuditCounts[item.id] !== undefined ? pastryAuditCounts[item.id] : ""}
                                  onChange={(e) =>
                                    setPastryAuditCounts({ ...pastryAuditCounts, [item.id]: e.target.value })
                                  }
                                  className="w-28 bg-black/80 border border-rose-500/40 rounded-lg px-2.5 py-1 text-center font-mono font-black text-xs text-white focus:outline-none focus:border-rose-400"
                                />
                              </td>
                              <td className="py-3 px-3 text-center">
                                {variance === 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                                    مطابق وسليم ✅
                                  </span>
                                ) : variance < 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-sans flex items-center justify-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>عجز ({variance.toLocaleString()})</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-sans">
                                    زيادة (+{variance.toLocaleString()})
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {variance === 0 ? (
                                  <span className="text-slate-500 text-[11px]">0.00 ج.م</span>
                                ) : variance < 0 ? (
                                  <span className="font-bold text-rose-400">
                                    {varianceCost.toFixed(2)} ج.م
                                  </span>
                                ) : (
                                  <span className="font-bold text-blue-400">
                                    +{varianceCost.toFixed(2)} ج.م
                                  </span>
                                )}
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
          </div>
        )}

        {/* TAB 5: ORDERS & DELIVERY HISTORY */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>سجل الطلبات والدليفري والفواتير الحرارية الصادرة</span>
                </h3>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث برقم الشيك أو العنوان أو الترابيزة..."
                    className="bg-slate-950 border border-slate-700 text-xs rounded-xl pr-9 pl-3 py-2 text-white focus:outline-none focus:border-amber-500 w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">رقم الشيك</th>
                      <th className="py-2.5 px-3">الفرع</th>
                      <th className="py-2.5 px-3">النوع / المكان</th>
                      <th className="py-2.5 px-3">بيانات العميل والتوصيل</th>
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
                          (o.tableNumber && o.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()))
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
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  o.orderType === "DELIVERY"
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {o.orderType === "DINE_IN"
                                  ? `ترابيزة ${o.tableNumber || "1"}`
                                  : o.orderType === "DELIVERY"
                                  ? "دليفري للمنزل 🛵"
                                  : "تيك أواي"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div>{o.customerName || "-"}</div>
                              {o.deliveryAddress && (
                                <div className="text-[10px] text-amber-300">
                                  {o.deliveryAddress} • {o.deliveryPhone || o.customerPhone}
                                </div>
                              )}
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

        {/* TAB 6: RESERVATIONS & PARTY BOOKINGS */}
        {activeTab === "reservations" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>سجل طلبات حجز الترابيزات وإقامة الحفلات</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">نوع الحجز</th>
                      <th className="py-2.5 px-3">اسم العميل</th>
                      <th className="py-2.5 px-3">رقم الهاتف</th>
                      <th className="py-2.5 px-3">تاريخ ووقت الحجز</th>
                      <th className="py-2.5 px-3">العدد والمنطقة</th>
                      <th className="py-2.5 px-3">طلبات خاصة</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              res.reservationType === "PARTY"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {res.reservationType === "PARTY" ? "🎉 حفلة / مناسبة" : "🥂 ترابيزة VIP"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{res.customerName}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{res.customerPhone}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {new Date(res.bookingDate).toLocaleDateString("ar-EG")} • {res.timeSlot}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {res.guestCount} أفراد ({res.zonePreference})
                        </td>
                        <td className="py-3 px-3 text-slate-400">{res.specialRequests || "-"}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              res.status === "CONFIRMED"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : res.status === "CANCELLED"
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {res.status === "CONFIRMED"
                              ? "مؤكد"
                              : res.status === "CANCELLED"
                              ? "ملغي"
                              : "قيد المراجعة"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "CONFIRMED")}
                              className="px-2 py-1 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 text-[10px] font-bold"
                            >
                              تأكيد
                            </button>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "CANCELLED")}
                              className="px-2 py-1 rounded bg-rose-600/30 text-rose-300 hover:bg-rose-600/50 text-[10px] font-bold"
                            >
                              إلغاء
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reservations.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-slate-500">
                          لا توجد طلبات حجز مسجلة بعد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: LIVE CUSTOMER & BARISTA CHAT */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-amber-400" />
                  <span>الشات المباشر مع الزبائن والترابيزات (Customer Live Chat)</span>
                </h3>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">تصفية حسب الترابيزة:</span>
                  <select
                    value={selectedChatTable}
                    onChange={(e) => setSelectedChatTable(e.target.value)}
                    className="bg-slate-950 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
                  >
                    <option value="ALL">جميع المحادثات</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.tableNumber}>
                        ترابيزة {t.tableNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                {chatMessages
                  .filter((m) =>
                    selectedChatTable === "ALL" ? true : m.tableNumber === selectedChatTable
                  )
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.senderType === "STAFF" ? "items-start" : "items-end"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl ${
                          msg.senderType === "STAFF"
                            ? "bg-amber-500 text-black font-medium"
                            : "bg-slate-800 text-white border border-slate-700"
                        }`}
                      >
                        <div className="text-[10px] opacity-75 mb-0.5">
                          {msg.senderType === "STAFF"
                            ? `${msg.senderName} (طاقم العمل)`
                            : `${msg.senderName} • ${
                                msg.tableNumber ? `ترابيزة ${msg.tableNumber}` : "دليفري"
                              }`}
                        </div>
                        <div>{msg.message}</div>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG")}
                      </span>
                    </div>
                  ))}

                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    لا توجد رسائل شات مسجلة حتى الآن
                  </div>
                )}
              </div>

              {/* Staff Reply Form */}
              <form onSubmit={handleSendStaffChatReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder="اكتب رداً رسمياً للزبون / الترابيزة المحددة..."
                  value={chatReplyText}
                  onChange={(e) => setChatReplyText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!chatReplyText.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition disabled:opacity-50"
                >
                  إرسال الرد 💬
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: LOYALTY PROGRAM & POINTS */}
        {activeTab === "loyalty" && (
          <div className="space-y-6">
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
            </div>

            {/* Customers Loyalty CRM Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>قاعدة بيانات العملاء المسجلين والتحقق بالجي ميل</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">اسم العميل</th>
                      <th className="py-2.5 px-3">رقم الهاتف</th>
                      <th className="py-2.5 px-3">البريد الإلكتروني</th>
                      <th className="py-2.5 px-3">حالة التحقق</th>
                      <th className="py-2.5 px-3">رصيد النقاط</th>
                      <th className="py-2.5 px-3">عدد الزيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-white">{c.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{c.phone}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{c.email || "-"}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.isVerified
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {c.isVerified ? "مفعّل بالجي ميل ✓" : "غير مفعل"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {c.loyaltyPoints} نقطة
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{c.visitCount} زيارة</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: USERS & ROLES MANAGEMENT (MAESTRO & GM EXCLUSIVE) */}
        {activeTab === "users" && isOwner && (
          <div className="space-y-6">
            {/* Maestro Emergency System Lock Card */}
            <div className="bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border-2 border-rose-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-2xl flex-shrink-0">
                    🚨
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">
                        مركز التحكم الشامل - قفل الطوارئ للمنظومة
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          settings?.systemLocked
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        }`}
                      >
                        {settings?.systemLocked ? "قفل الطوارئ مفعل ⚠️" : "المنظومة تعمل بكفاءة 🟢"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      صلاحية حصرية للمالك (المايسترو). في حالات الطوارئ أو أعمال الجرد والصيانة،
                      يمكن إيقاف المنظومة والموقع فوراً لمنع دخول الطلبات أو الحجوزات.
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleToggleSystemLock(!settings?.systemLocked)}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition shadow-lg cursor-pointer flex items-center gap-2 ${
                      settings?.systemLocked
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                        : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>
                      {settings?.systemLocked
                        ? "فك قفل المنظومة وتشغيل العمل ✅"
                        : "تفعيل قفل الطوارئ وإيقاف النظام ⛔"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span>طاقم العمل والمستخدمين ورموز الدخول السريع (PIN)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    إدارة حسابات المديرين، الكاشيرات، والباريستا وتفعيل أو تعطيل الحسابات وتغيير كلمات السر.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setUserModalMode("ADD");
                    setUserForm({
                      id: "",
                      name: "",
                      username: "",
                      password: "",
                      pin: "159920",
                      role: "cashier",
                      outletId: outlets[0]?.id || "",
                      phone: "",
                      isActive: true,
                    });
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-2.5 rounded-xl text-xs shadow-lg transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مستخدم جديد 👤</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">الاسم واسم المستخدم</th>
                      <th className="py-3 px-3">الدور / الصلاحية</th>
                      <th className="py-3 px-3">الفرع المعتمد</th>
                      <th className="py-3 px-3">الهاتف</th>
                      <th className="py-3 px-3">رمز الـ PIN</th>
                      <th className="py-3 px-3 text-center">الحالة</th>
                      <th className="py-3 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => {
                      const isOwnerUser = u.username === "maestro" || u.role === "owner";
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{u.name}</span>
                              {isOwnerUser && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-500 text-black">
                                  👑 المايسترو
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-amber-400/80 font-mono">
                              @{u.username}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                u.role === "owner"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : u.role === "general_manager"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : u.role === "branch_manager"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : u.role === "barista"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {u.role === "owner"
                                ? "👑 المالك (Owner)"
                                : u.role === "general_manager"
                                ? "⭐ المدير العام"
                                : u.role === "branch_manager"
                                ? "🏢 مدير فرع"
                                : u.role === "barista"
                                ? "☕ باريستا (KDS)"
                                : "💳 كاشير"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-300">
                            {u.outletName || "الإدارة المركزية العامة"}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            {u.phone || "-"}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-300">
                            {u.pin || "******"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => !isOwnerUser && handleToggleUserStatus(u)}
                              disabled={isOwnerUser}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition ${
                                isOwnerUser
                                  ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                                  : u.isActive
                                  ? "bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 cursor-pointer"
                                  : "bg-rose-500/20 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border border-rose-500/30 cursor-pointer"
                              }`}
                              title={isOwnerUser ? "حساب المالك نشط دائماً" : "اضغط لتبديل حالة الحساب"}
                            >
                              {u.isActive ? "نشط ومفعل ✓" : "معطل ✕"}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setUserModalMode("EDIT");
                                setUserForm({
                                  id: u.id,
                                  name: u.name,
                                  username: u.username,
                                  password: "",
                                  pin: u.pin || "",
                                  role: u.role,
                                  outletId: u.outletId || "",
                                  phone: u.phone || "",
                                  isActive: u.isActive,
                                });
                                setShowUserModal(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[11px] transition cursor-pointer"
                            >
                              تعديل وبيانات الدخول ⚙️
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

        {/* TAB 9: SETTINGS & BRAND IDENTITY */}
        {activeTab === "settings" && settings && (
          <div className="space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
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

                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
                    <span className="text-amber-400 text-base">🍰</span>
                    <div>
                      <div className="text-xs font-bold text-amber-300">
                        حلواني أبو عادل (كيان مستقل معتمد)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        تشغيل حر ومستقل بذاته تماماً مع نفس معايير الجودة، وليس منفذ بيع لأي موقع خارجي.
                      </p>
                    </div>
                  </div>
                </div>
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
        {/* Orca Tech Developer Signature */}
        <footer className="mt-16 mb-4 text-center border-t border-slate-800/80 pt-6 pb-2">
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

      {/* 4. MODALS */}

      {/* USER MODAL (ADD / EDIT) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setShowUserModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>{userModalMode === "ADD" ? "إضافة مستخدم / موظف جديد" : "تعديل بيانات وصلاحيات المستخدم"}</span>
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله (كاشير)"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">اسم المستخدم (Login) *</label>
                  <input
                    type="text"
                    required
                    placeholder="cashier-soul2"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">رقم الموبايل</label>
                  <input
                    type="tel"
                    placeholder="010XXXXXXXX"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {userModalMode === "ADD" ? "كلمة المرور *" : "كلمة المرور الجديدة (اختياري)"}
                  </label>
                  <input
                    type="password"
                    required={userModalMode === "ADD"}
                    placeholder={userModalMode === "EDIT" ? "اتركها فارغة للإبقاء عليها" : "••••••••"}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">رمز الـ PIN السريع (للكاشير) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="159920"
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">الدور / الصلاحية *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="branch_manager">🏢 مدير فرع مستقل</option>
                    <option value="cashier">💳 كاشير (POS)</option>
                    <option value="barista">☕ باريستا (KDS)</option>
                    <option value="chef">👨‍🍳 شيف حلويات ومخبوزات</option>
                    <option value="owner">👑 المالك العام (Maestro فقط)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الفرع التابع له *</label>
                  <select
                    value={userForm.outletId}
                    onChange={(e) => setUserForm({ ...userForm, outletId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">الإدارة المركزية العامة</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code === "SOULMATE_CAFE" ? "☕ سول ميت كافيه VIP" : "🍰 حلواني أبو عادل"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition shadow"
                >
                  {userModalMode === "ADD" ? "إضافة المستخدم" : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU ITEM MODAL (ADD / EDIT WITH IMGBB UPLOAD) */}
      {showMenuItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-right max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowMenuItemModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <span>{menuItemModalMode === "ADD" ? "إضافة صنف جديد للقائمة" : "تعديل بيانات الصنف والصورة"}</span>
            </h3>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">اسم الصنف (عربي) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: سبانش لاتيه مثلج"
                    value={menuItemForm.nameAr}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, nameAr: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الاسم بالإنجليزي (اختياري)</label>
                  <input
                    type="text"
                    placeholder="Iced Spanish Latte"
                    value={menuItemForm.nameEn}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, nameEn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">المنفذ / الفرع التابع له *</label>
                  <select
                    value={menuItemForm.outletId}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, outletId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code === "SOULMATE_CAFE" ? "☕ سول ميت كافيه VIP" : "🍰 حلواني أبو عادل"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">التصنيف *</label>
                  <select
                    value={menuItemForm.category}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <optgroup label="☕ سول ميت كافيه">
                      {SOULMATE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.nameAr} ({c.nameEn})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🍰 حلواني أبو عادل">
                      {ABU_ADEL_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.nameAr} ({c.nameEn})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="75"
                    value={menuItemForm.price}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">سعر التكلفة (ج.م)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="25"
                    value={menuItemForm.costPrice}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, costPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المخزون الحالي</label>
                  <input
                    type="number"
                    value={menuItemForm.stockQty}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, stockQty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Image with Direct ImgBB Upload */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-400 font-bold">صورة الصنف (رابط مباشر أو رفع جديد)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={menuItemForm.image}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, image: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                  <label className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? "جاري الرفع..." : "رفع صوره"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleUploadImgBB}
                      className="hidden"
                    />
                  </label>
                </div>
                {menuItemForm.image && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={menuItemForm.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">وصف الصنف والمكونات</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لمكونات وطعم الصنف..."
                  value={menuItemForm.description}
                  onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMenuItemModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition shadow"
                >
                  {menuItemModalMode === "ADD" ? "إضافة الصنف" : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  </select>
                </div>
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

      {/* PASTRY MODAL (WITH IMGBB UPLOAD) */}
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
              </div>

              {/* ImgBB Image Upload */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  صورة الصنف (رفع فوري عبر ImgBB)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold cursor-pointer border border-slate-700 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? "جارٍ الرفع..." : "اختر صورة للرفع"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImgBB}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="أو الصق رابط الصورة هنا..."
                    value={pastryForm.image}
                    onChange={(e) =>
                      setPastryForm({ ...pastryForm, image: e.target.value })
                    }
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
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

      {/* 1. RAW MATERIAL ITEM CARD MODAL */}
      {showRawMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setShowRawMaterialModal(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-400" />
              <span>إضافة كارت صنف خامة بار جديدة (Soulmate Cafe)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              تسجيل خامة جديدة وتحديد رصيد بداية المدة وسعر الوحدة لخصم الريسيبي تلقائياً.
            </p>

            <form onSubmit={handleAddRawMaterial} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم الخامة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بن إسبريسو كولومبي، حليب كامل الدسم، صوص بستاشيو..."
                  value={rawForm.nameAr}
                  onChange={(e) => setRawForm({ ...rawForm, nameAr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">وحدة القياس *</label>
                  <select
                    value={rawForm.unit}
                    onChange={(e) => setRawForm({ ...rawForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="GRAM">جرام (GRAM)</option>
                    <option value="ML">مل (ML)</option>
                    <option value="PIECE">قطعة (PIECE)</option>
                    <option value="KG">كيلو جرام (KG)</option>
                    <option value="LITER">لتر (LITER)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر تكلفة الوحدة (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.5"
                    value={rawForm.costPerUnit}
                    onChange={(e) => setRawForm({ ...rawForm, costPerUnit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">رصيد بداية المدة (الافتتاحي) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="1000"
                    value={rawForm.openingStock}
                    onChange={(e) => setRawForm({ ...rawForm, openingStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">حد الأمان (تنبيه النواقص)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="200"
                    value={rawForm.minStockAlert}
                    onChange={(e) => setRawForm({ ...rawForm, minStockAlert: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم المورد الافتراضي</label>
                  <input
                    type="text"
                    placeholder="مثال: شركة البن البرازيلي"
                    value={rawForm.supplierName}
                    onChange={(e) => setRawForm({ ...rawForm, supplierName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">ملاحظات إضافية</label>
                  <input
                    type="text"
                    placeholder="ملاحظات الحفظ أو التخزين..."
                    value={rawForm.notes}
                    onChange={(e) => setRawForm({ ...rawForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRawMaterialModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-lg shadow-amber-500/20"
                >
                  حفظ كارت الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. INBOUND STOCK MOVEMENT MODAL (حركة توريد منفصلة) */}
      {showInboundModal && selectedRawForInbound && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right">
            <button
              onClick={() => {
                setShowInboundModal(false);
                setSelectedRawForInbound(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>تسجيل حركة توريد بضاعة جديدة (شحنة خامات)</span>
            </h3>
            <p className="text-xs text-amber-300 font-bold mb-4">
              خامة: {selectedRawForInbound.nameAr} • الرصيد الحالي: {selectedRawForInbound.currentStock.toLocaleString()} {selectedRawForInbound.unit}
            </p>

            <form onSubmit={handleRecordInboundMovement} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    كمية التوريد ({selectedRawForInbound.unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="500"
                    value={inboundForm.quantity}
                    onChange={(e) => setInboundForm({ ...inboundForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر الشراء للوحدة (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(selectedRawForInbound.costPerUnit || "")}
                    value={inboundForm.costPerUnit}
                    onChange={(e) => setInboundForm({ ...inboundForm, costPerUnit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Total Invoice Value Calculation */}
              {Number(inboundForm.quantity) > 0 && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span>إجمالي قيمة فاتورة التوريد:</span>
                  <span className="font-mono text-sm">
                    {(
                      Number(inboundForm.quantity) *
                      (Number(inboundForm.costPerUnit) || selectedRawForInbound.costPerUnit || 0)
                    ).toFixed(2)}{" "}
                    ج.م
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم المورد</label>
                  <input
                    type="text"
                    placeholder="اسم المورد أو الشركة..."
                    value={inboundForm.supplierName}
                    onChange={(e) => setInboundForm({ ...inboundForm, supplierName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الفاتورة / إذن الاستلام</label>
                  <input
                    type="text"
                    placeholder="INV-9921"
                    value={inboundForm.invoiceNumber}
                    onChange={(e) => setInboundForm({ ...inboundForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات التوريد</label>
                <input
                  type="text"
                  placeholder="ملاحظات الشحنة أو تاريخ الصلاحية..."
                  value={inboundForm.notes}
                  onChange={(e) => setInboundForm({ ...inboundForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowInboundModal(false);
                    setSelectedRawForInbound(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition shadow-lg shadow-emerald-500/20"
                >
                  تأكيد حركة التوريد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MOVEMENTS HISTORY MODAL (سجل حركات الخامة) */}
      {showMovementsModal && selectedRawForMovements && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-right max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setShowMovementsModal(false);
                setSelectedRawForMovements(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>سجل حركات كارت الصنف (Movements Audit Ledger)</span>
              </h3>
              <p className="text-xs text-amber-300 font-bold">
                خامة: {selectedRawForMovements.nameAr} ({selectedRawForMovements.unit})
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-4 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">رصيد البداية:</span>
                <span className="font-mono font-bold text-white">{(selectedRawForMovements.openingStock || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">إجمالي الوارد:</span>
                <span className="font-mono font-bold text-emerald-400">+{(selectedRawForMovements.totalInbound || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">مستهلك الريسيبي:</span>
                <span className="font-mono font-bold text-rose-400">-{(selectedRawForMovements.totalConsumed || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">الرصيد الفعلي:</span>
                <span className="font-mono font-black text-amber-400">{selectedRawForMovements.currentStock.toLocaleString()}</span>
              </div>
            </div>

            {/* Movements List Table */}
            <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">نوع الحركة</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">التكلفة</th>
                    <th className="py-2.5 px-3">المستند / البيان</th>
                    <th className="py-2.5 px-3">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {(selectedRawForMovements.movements || []).length > 0 ? (
                    selectedRawForMovements.movements.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {new Date(m.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {m.type === "INBOUND" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              وارد 📥
                            </span>
                          ) : m.type === "CONSUMPTION" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              استهلاك ريسيبي ☕
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              تسوية جردية ⚖️
                            </span>
                          )}
                        </td>
                        <td className={`py-2 px-3 font-bold ${m.quantity > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {selectedRawForMovements.unit}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {m.totalCost ? `${m.totalCost.toFixed(2)} ج.م` : "-"}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-300 text-[11px]">
                          {m.invoiceNumber ? `فاتورة: ${m.invoiceNumber}` : m.orderNumber ? `طلب #${m.orderNumber}` : m.notes || "-"}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                          {m.recordedBy || "المايسترو"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                        لا توجد حركات مسجلة حتى الآن
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowMovementsModal(false);
                  setSelectedRawForMovements(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. RECIPE BOM EDIT MODAL (تعديل ريسيبي المشروب) */}
      {showRecipeModal && selectedMenuItemForRecipe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-right">
            <button
              onClick={() => {
                setShowRecipeModal(false);
                setSelectedMenuItemForRecipe(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-400" />
              <span>تعديل ريسيبي المشروب وحساب تكلفة الكوب (BOM)</span>
            </h3>
            <p className="text-xs text-amber-300 font-bold mb-3">
              الصنف: {selectedMenuItemForRecipe.nameAr} • سعر البيع للزبون: {selectedMenuItemForRecipe.price} ج.م
            </p>

            {/* Live Cost & Margin Calculator */}
            {(() => {
              const liveCost = recipeFormItems.reduce((sum, item) => {
                const raw = rawMaterials.find((r) => r.id === item.rawMaterialId);
                return sum + (Number(item.qtyRequired) || 0) * (raw?.costPerUnit || 0);
              }, 0);
              const margin =
                selectedMenuItemForRecipe.price > 0
                  ? Math.round(((selectedMenuItemForRecipe.price - liveCost) / selectedMenuItemForRecipe.price) * 100)
                  : 0;

              return (
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-amber-500/20 mb-4 text-xs font-bold">
                  <div>
                    <span className="text-slate-400 block text-[10px]">تكلفة الكوب المباشرة (Food Cost):</span>
                    <span className="font-mono text-emerald-400 text-sm font-black">{liveCost.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">هامش الربح المتوقع:</span>
                    <span className="font-mono text-amber-400 text-sm font-black">{margin}% ربح</span>
                  </div>
                </div>
              );
            })()}

            {/* List of Ingredients */}
            <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                المكونات المحددة بالريسيبي:
              </label>
              {recipeFormItems.map((item, idx) => {
                const raw = rawMaterials.find((r) => r.id === item.rawMaterialId);
                const itemCost = (Number(item.qtyRequired) || 0) * (raw?.costPerUnit || 0);

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-xl text-xs"
                  >
                    <select
                      value={item.rawMaterialId}
                      onChange={(e) => {
                        const updated = [...recipeFormItems];
                        updated[idx].rawMaterialId = e.target.value;
                        setRecipeFormItems(updated);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold"
                    >
                      {rawMaterials.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nameAr} ({r.costPerUnit} ج.م / {r.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.qtyRequired}
                      onChange={(e) => {
                        const updated = [...recipeFormItems];
                        updated[idx].qtyRequired = parseFloat(e.target.value) || 0;
                        setRecipeFormItems(updated);
                      }}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center text-xs font-bold"
                    />

                    <span className="text-slate-400 text-[11px] w-10 font-sans">
                      {raw?.unit === "GRAM" ? "جرام" : raw?.unit === "ML" ? "مل" : "قطعة"}
                    </span>

                    <span className="font-mono text-emerald-400 text-xs w-16 text-left">
                      {itemCost.toFixed(2)} ج.م
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setRecipeFormItems(recipeFormItems.filter((_, i) => i !== idx));
                      }}
                      className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  if (rawMaterials.length > 0) {
                    setRecipeFormItems([
                      ...recipeFormItems,
                      { rawMaterialId: rawMaterials[0].id, qtyRequired: 10 },
                    ]);
                  }
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مكون خام جديد للريسيبي</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowRecipeModal(false);
                  setSelectedMenuItemForRecipe(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveRecipeBOM}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-lg shadow-amber-500/20"
              >
                حفظ الريسيبي وتحديث تكلفة الكوب 📋☕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RAW OPENING STOCK MODAL */}
      {showRawOpeningModal && selectedRawForOpening && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-right">
            <button
              onClick={() => {
                setShowRawOpeningModal(false);
                setSelectedRawForOpening(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-400" />
              <span>تعديل رصيد أول المدة التأسيسي</span>
            </h3>
            <p className="text-xs text-amber-300 font-bold mb-4">
              خامة: {selectedRawForOpening.nameAr} ({selectedRawForOpening.unit})
            </p>

            <form onSubmit={handleSetRawOpeningStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  رصيد أول المدة الفعلي بعد الجرد ({selectedRawForOpening.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="أدخل الرصيد الفعلي الذي تم جرده..."
                  value={rawOpeningValue}
                  onChange={(e) => setRawOpeningValue(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  سيتم تعيين هذا الرقم كرصيد بداية المدة التأسيسي لكارت الصنف وبدء احتساب الوارد والمنصرف عليه.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowRawOpeningModal(false);
                    setSelectedRawForOpening(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-lg shadow-amber-500/20"
                >
                  تثبيت الرصيد 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PASTRY OPENING STOCK MODAL */}
      {showPastryOpeningModal && selectedPastryForOpening && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-right">
            <button
              onClick={() => {
                setShowPastryOpeningModal(false);
                setSelectedPastryForOpening(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Cake className="w-5 h-5 text-rose-400" />
              <span>تعديل رصيد أول المدة لحلويات أبو عادل</span>
            </h3>
            <p className="text-xs text-rose-300 font-bold mb-4">
              صنف: {selectedPastryForOpening.nameAr} ({selectedPastryForOpening.unitType})
            </p>

            <form onSubmit={handleSetPastryOpeningStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  رصيد أول المدة الفعلي بالمحل بعد الجرد ({selectedPastryForOpening.unitType}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="أدخل عدد القطع أو الكيلوات الفعلية..."
                  value={pastryOpeningValue}
                  onChange={(e) => setPastryOpeningValue(e.target.value)}
                  className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-rose-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  سيتم تعيين هذا الرقم كرصيد بداية المدة لكارت حركة هذا الصنف.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPastryOpeningModal(false);
                    setSelectedPastryForOpening(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black transition shadow-lg shadow-rose-500/20"
                >
                  تثبيت الرصيد 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PASTRY INBOUND MOVEMENT MODAL */}
      {showPastryInboundModal && selectedPastryForInbound && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right">
            <button
              onClick={() => {
                setShowPastryInboundModal(false);
                setSelectedPastryForInbound(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-400" />
              <span>توريد حلويات جديد من المعمل (شحنة واردة)</span>
            </h3>
            <p className="text-xs text-rose-300 font-bold mb-4">
              صنف: {selectedPastryForInbound.nameAr} • الرصيد الحالي: {(selectedPastryForInbound.stockQty ?? 0).toLocaleString()} {selectedPastryForInbound.unitType}
            </p>

            <form onSubmit={handleRecordPastryInbound} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    الكمية الواردة ({selectedPastryForInbound.unitType}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="25"
                    value={pastryInboundForm.quantity}
                    onChange={(e) => setPastryInboundForm({ ...pastryInboundForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر تكلفة القطعة (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(selectedPastryForInbound.costPrice || "")}
                    value={pastryInboundForm.unitCost}
                    onChange={(e) => setPastryInboundForm({ ...pastryInboundForm, unitCost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الشيف / المعمل المورد</label>
                  <input
                    type="text"
                    placeholder="معمل حلواني أبو عادل الرئيسي"
                    value={pastryInboundForm.supplierName}
                    onChange={(e) => setPastryInboundForm({ ...pastryInboundForm, supplierName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم إذن التشغيل / الدفعة</label>
                  <input
                    type="text"
                    placeholder="BATCH-104"
                    value={pastryInboundForm.invoiceNumber}
                    onChange={(e) => setPastryInboundForm({ ...pastryInboundForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات الدفعة</label>
                <input
                  type="text"
                  placeholder="ملاحظات الإنتاج أو التغليف..."
                  value={pastryInboundForm.notes}
                  onChange={(e) => setPastryInboundForm({ ...pastryInboundForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPastryInboundModal(false);
                    setSelectedPastryForInbound(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black transition shadow-lg shadow-rose-600/20"
                >
                  تأكيد استلام التوريد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. PASTRY MOVEMENTS AUDIT LEDGER MODAL */}
      {showPastryMovementsModal && selectedPastryForMovements && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-right max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setShowPastryMovementsModal(false);
                setSelectedPastryForMovements(null);
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-rose-400" />
                <span>سجل حركات كارت الصنف (حلواني أبو عادل)</span>
              </h3>
              <p className="text-xs text-rose-300 font-bold">
                صنف: {selectedPastryForMovements.nameAr} ({selectedPastryForMovements.unitType})
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-4 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">رصيد البداية:</span>
                <span className="font-mono font-bold text-white">{(selectedPastryForMovements.openingStock || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">وارد المعمل:</span>
                <span className="font-mono font-bold text-emerald-400">+{(selectedPastryForMovements.totalInbound || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">المبيعات:</span>
                <span className="font-mono font-bold text-rose-400">-{(selectedPastryForMovements.totalSold || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">الرصيد الفعلي:</span>
                <span className="font-mono font-black text-amber-400">{(selectedPastryForMovements.stockQty ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Movements List Table */}
            <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">نوع الحركة</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">المستند / الفاتورة</th>
                    <th className="py-2.5 px-3">المسؤول والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {(selectedPastryForMovements.movements || []).length > 0 ? (
                    selectedPastryForMovements.movements.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {new Date(m.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {m.type === "INBOUND" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              وارد معمل 📥
                            </span>
                          ) : m.type === "SALE" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              مبيعات فاتورة 🧾
                            </span>
                          ) : m.type === "INITIAL" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              رصيد تأسيسي 🎯
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              تسوية جردية ⚖️
                            </span>
                          )}
                        </td>
                        <td className={`py-2 px-3 font-bold ${m.quantity > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {selectedPastryForMovements.unitType}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-300 text-[11px]">
                          {m.invoiceNumber ? `إذن: ${m.invoiceNumber}` : m.orderNumber ? `فاتورة #${m.orderNumber}` : "-"}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                          {m.notes || m.recordedBy || "المايسترو"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        لا توجد حركات مسجلة حتى الآن
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPastryMovementsModal(false);
                  setSelectedPastryForMovements(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                إغلاق
              </button>
            </div>
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
                    : selectedOrderForPrint.orderType === "DELIVERY"
                    ? "دليفري للمنزل"
                    : "تيك أواي"}
                </div>
                {selectedOrderForPrint.deliveryAddress && (
                  <div className="text-[10px] text-slate-700">
                    العنوان: {selectedOrderForPrint.deliveryAddress}
                  </div>
                )}
                <div className="text-[10px]">
                  {new Date(selectedOrderForPrint.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>

              <div className="border-t border-black pt-2 mt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                  <span>الإجمالي المدفوع:</span>
                  <span>{selectedOrderForPrint.finalAmount} ج.م</span>
                </div>
                <div className="text-[10px] text-center pt-2">
                  طريقة السداد: {selectedOrderForPrint.paymentMethod}
                </div>
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
