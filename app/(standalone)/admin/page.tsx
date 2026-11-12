"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardQRModal from "@/components/CardQRModal";
import AdminLoyaltyCrmOffersPanel from "@/components/AdminLoyaltyCrmOffersPanel";
import AdminDailyAlertAndBriefModal from "@/components/AdminDailyAlertAndBriefModal";
import AdminSuppliersAndAiPanel from "@/components/AdminSuppliersAndAiPanel";
import AdminAuditAlertsDrawer from "@/components/AdminAuditAlertsDrawer";
import AdminBulkRawPriceEditor from "@/components/AdminBulkRawPriceEditor";
import OrderRevisionModals, { RevisionModalMode } from "@/components/OrderRevisionModals";
import { PushOptInButton } from "@/components/PwaBootAndPushButton";
import { ThemeToggle } from "@/components/ThemeProviderAndToggle";
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
  BarChart3,
  PieChart,
  CreditCard,
  Download,
  Landmark,
  Percent,
  ArrowUpDown,
  RotateCcw,
  Plus,
  Lock,
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
  MapPin,
  Trash2,
  Edit2,
  Phone,
  Send,
  Bell,
  Factory,
} from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقدي (كاش)",
  CARD: "فيزا / بطاقة",
  INSTAPAY: "إنستاباي",
  VODAFONE_CASH: "فودافون كاش",
  TALABAT: "طلبات (Talabat)",
};

function getStoreNet(o: any): number {
  return Math.max(0, (Number(o?.finalAmount) || 0) - (Number(o?.deliveryFee) || 0));
}

function formatAdminQty(qty: any, unitType?: string): string {
  const n = Math.round((Number(qty) || 0) * 1000) / 1000;
  if (unitType === "KG") {
    if (n === 0.25) return "ربع كيلو";
    if (n === 0.5) return "نص كيلو";
    if (n === 0.75) return "¾ كيلو";
    return `${n} كجم`;
  }
  if (unitType === "BOX") return `${n} علبة`;
  if (unitType === "PORTION") return `${n} طبق`;
  return `${n} قطعة`;
}

function getTomorrowCairoISO(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(
      new Date(Date.now() + 86400000)
    );
  } catch {
    return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  }
}

function getHoursUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return ms / 3600000;
}

// Fast Session Cache Reader (Zero Lag on Navigations between POS & Admin)
function getAdminDashboardSessionCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("abuadel_admin_dashboard_cache");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth User state (Synchronous read from localStorage to avoid delay)
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

  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    if (typeof window === "undefined") return "ALL";
    try {
      const saved =
        localStorage.getItem("abuadel_soulmate_user") ||
        localStorage.getItem("abuadel_auth_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === "branch_manager" && u.outletId) return u.outletId;
      }
      return "ALL";
    } catch {
      return "ALL";
    }
  });

  // Cached Data from Session
  const initialCache = getAdminDashboardSessionCache();

  const [outlets, setOutlets] = useState<any[]>(initialCache?.outlets || []);

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
    | "suppliers"
    | "users"
    | "settings"
  >("overview");
  const [dailyReportSignal, setDailyReportSignal] = useState(0);
  const [dailyAlertStatus, setDailyAlertStatus] = useState<{
    hasAlertPending: boolean;
    isRinging: boolean;
    urgentRawCount: number;
    factoryNeedsCount: number;
  }>({ hasAlertPending: false, isRinging: false, urgentRawCount: 0, factoryNeedsCount: 0 });
  const [editingRawLeadMap, setEditingRawLeadMap] = useState<
    Record<string, { leadTimeDays: string; minStockAlert: string; avgDailyUsage: string }>
  >({});

  // Users Management state (Maestro & GM)
  const [usersList, setUsersList] = useState<any[]>(initialCache?.usersList || []);
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
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<any>(initialCache?.settings || null);
  const [shiftData, setShiftData] = useState<any>(initialCache?.shiftDataRes || null);
  const [expenses, setExpenses] = useState<any[]>(initialCache?.expenses || []);
  const [rawMaterials, setRawMaterials] = useState<any[]>(initialCache?.rawMaterials || []);
  const [menuItems, setMenuItems] = useState<any[]>(initialCache?.menuItems || []);
  const [orders, setOrders] = useState<any[]>(initialCache?.orders || []);
  const [customers, setCustomers] = useState<any[]>(initialCache?.customers || []);
  const [tables, setTables] = useState<any[]>(initialCache?.tables || []);
  const [reservations, setReservations] = useState<any[]>(initialCache?.reservations || []);
  const [chatMessages, setChatMessages] = useState<any[]>(initialCache?.chatMessages || []);
  const [deliveryZones, setDeliveryZones] = useState<any[]>(initialCache?.deliveryZones || []);
  const [drivers, setDrivers] = useState<any[]>(initialCache?.drivers || []);

  // Inline Opening Cash Float Edit (Treasury Drawer)
  const [editingAdminFloat, setEditingAdminFloat] = useState(false);
  const [adminFloatInput, setAdminFloatInput] = useState("");
  const [savingAdminFloat, setSavingAdminFloat] = useState(false);

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

  // Abu Adel Pastry ERP & Daily Factory Sheet States
  const [pastryInventory, setPastryInventory] = useState<any[]>(initialCache?.pastryInventory || []);
  const [pastrySubTab, setPastrySubTab] = useState<"cards" | "audit" | "factory">("cards");
  const [factoryDate, setFactoryDate] = useState<string>(() => getTomorrowCairoISO());
  const [factoryData, setFactoryData] = useState<any>(null);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [factorySaving, setFactorySaving] = useState(false);
  const [factoryApprovedEdits, setFactoryApprovedEdits] = useState<Record<string, string>>({});
  const [factoryNotesInput, setFactoryNotesInput] = useState("");
  const [factorySearchQuery, setFactorySearchQuery] = useState("");
  const [editingMinStockMap, setEditingMinStockMap] = useState<Record<string, string>>({});
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

  // Sub-tabs & Filters for Treasury & Financial BI Reports Tab
  const [treasurySubTab, setTreasurySubTab] = useState<"drawer" | "pnl" | "menu_eng" | "payments" | "archive">("drawer");
  const [reportTimeframe, setReportTimeframe] = useState<"TODAY" | "WEEK" | "MONTH" | "ALL">("TODAY");
  const [reportOutletFilter, setReportOutletFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "ALL";
    try {
      const saved =
        localStorage.getItem("abuadel_soulmate_user") ||
        localStorage.getItem("abuadel_auth_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === "branch_manager" && u.outletId) return u.outletId;
      }
    } catch {}
    return "ALL";
  });

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
    leadTimeDays: "3",
    avgDailyUsage: "0",
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

  // Live Chat Reply Form & Image Support
  const [chatReplyText, setChatReplyText] = useState("");
  const [selectedChatTable, setSelectedChatTable] = useState<string>("ALL");
  const [selectedChatThread, setSelectedChatThread] = useState<string>("ALL");
  const [chatOutletFilter, setChatOutletFilter] = useState<string>("ALL");
  const [adminChatImage, setAdminChatImage] = useState("");
  const [uploadingAdminChatImage, setUploadingAdminChatImage] = useState(false);
  const [previewAdminImage, setPreviewAdminImage] = useState<string | null>(null);

  // Delivery Zones & Dynamic Delivery Drivers Management + Orders Filtering
  const [showZonesManager, setShowZonesManager] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    nameAr: "",
    nameEn: "",
    fee: "",
    estimatedTime: "45 - 60 دقيقة",
    sortOrder: "0",
  });
  const [showDriversManager, setShowDriversManager] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [savingDriver, setSavingDriver] = useState(false);
  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
    vehicleInfo: "موتوسيكل دليفري",
    notes: "",
  });
  const [orderZoneFilter, setOrderZoneFilter] = useState<string>("ALL");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [orderScheduledFilter, setOrderScheduledFilter] = useState<"ALL" | "SCHEDULED" | "IMMEDIATE">("ALL");
  const [dispatchDriverNames, setDispatchDriverNames] = useState<Record<string, string>>({});
  const [dispatchDriverIds, setDispatchDriverIds] = useState<Record<string, string>>({});

  // Reprint / View Order Receipt Modal & Audited Revisions
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);
  const [revisionTargetOrder, setRevisionTargetOrder] = useState<any>(null);
  const [revisionModalMode, setRevisionModalMode] = useState<RevisionModalMode>(null);

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
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(saved);
      if (
        user.role !== "owner" &&
        user.role !== "branch_manager"
      ) {
        addToast("error", "عفواً، لا تملك صلاحية دخول لوحة الإدارة");
        router.replace("/pos");
        return;
      }
      setCurrentUser(user);
      if (user.role === "branch_manager" && user.outletId) {
        setSelectedOutletId(user.outletId);
        setMenuOutletFilter(user.outletId);
        setReportOutletFilter(user.outletId);
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // 2. Fetch All Dashboard Data (Staged Fast Loading + Session Cache)
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const outletParam = selectedOutletId !== "ALL" ? `?outletId=${selectedOutletId}` : "";

      // Burst 1: Core Dashboard & Overview data (Essential for immediate render)
      const [
        outletsRes,
        settingsRes,
        shiftRes,
        expensesRes,
        ordersRes,
        tablesRes,
      ] = await Promise.all([
        fetch("/api/outlets"),
        fetch("/api/settings"),
        fetch(`/api/shifts${outletParam}`),
        fetch(`/api/expenses${outletParam}`),
        fetch(`/api/orders${outletParam}`),
        fetch(`/api/tables${outletParam}`),
      ]);

      const [outletsData, settingsData, shiftDataRes, expensesData, ordersData, tablesData] =
        await Promise.all([
          outletsRes.json(),
          settingsRes.json(),
          shiftRes.json(),
          expensesRes.json(),
          ordersRes.json(),
          tablesRes.json(),
        ]);

      if (outletsData.success) setOutlets(outletsData.outlets);
      if (settingsData.success) setSettings(settingsData.settings);
      if (shiftDataRes.success) setShiftData(shiftDataRes);
      if (expensesData.success) setExpenses(expensesData.expenses);
      if (ordersData.success) setOrders(ordersData.orders);
      if (tablesData.success) setTables(tablesData.tables);

      // Core Overview is fully ready! Unblock screen immediately!
      setLoading(false);

      // Burst 2: Catalogs, recipes, inventory & modules (Auxiliary data)
      const [
        recipesRes,
        menuRes,
        pastryRes,
        customersRes,
        reservationsRes,
        chatRes,
        usersRes,
        zonesRes,
        driversRes,
      ] = await Promise.all([
        fetch(currentUser?.role === "owner" ? "/api/recipes" : `/api/recipes${outletParam}`),
        fetch(currentUser?.role === "owner" ? "/api/menu" : `/api/menu${outletParam}`),
        fetch("/api/pastry-inventory"),
        fetch("/api/customers"),
        fetch(`/api/reservations${outletParam}`),
        fetch(`/api/chat${outletParam}`),
        fetch("/api/users"),
        fetch("/api/delivery-zones?all=true"),
        fetch("/api/drivers?includeStats=true"),
      ]);

      const [
        recipesData,
        menuData,
        pastryData,
        customersData,
        resData,
        chatData,
        usersData,
        zonesData,
        driversData,
      ] = await Promise.all([
        recipesRes.json(),
        menuRes.json(),
        pastryRes.json(),
        customersRes.json(),
        reservationsRes.json(),
        chatRes.json(),
        usersRes.json(),
        zonesRes.json(),
        driversRes.json(),
      ]);

      if (recipesData.success) setRawMaterials(recipesData.rawMaterials);
      if (menuData.success) setMenuItems(menuData.items);
      if (pastryData.success) setPastryInventory(pastryData.items);
      if (customersData.success) setCustomers(customersData.customers);
      if (resData.success) setReservations(resData.reservations);
      if (chatData.success) setChatMessages(chatData.messages);
      if (usersData?.success) setUsersList(usersData.users);
      if (zonesData?.success) setDeliveryZones(zonesData.zones);
      if (driversData?.success) setDrivers(driversData.drivers || []);

      // Save complete snapshot to sessionStorage for instant 0ms restoration next time
      try {
        sessionStorage.setItem(
          "abuadel_admin_dashboard_cache",
          JSON.stringify({
            outlets: outletsData.success ? outletsData.outlets : [],
            settings: settingsData.success ? settingsData.settings : null,
            shiftDataRes: shiftDataRes.success ? shiftDataRes : null,
            expenses: expensesData.success ? expensesData.expenses : [],
            rawMaterials: recipesData.success ? recipesData.rawMaterials : [],
            menuItems: menuData.success ? menuData.items : [],
            pastryInventory: pastryData.success ? pastryData.items : [],
            orders: ordersData.success ? ordersData.orders : [],
            customers: customersData.success ? customersData.customers : [],
            tables: tablesData.success ? tablesData.tables : [],
            reservations: resData.success ? resData.reservations : [],
            chatMessages: chatData.success ? chatData.messages : [],
            usersList: usersData?.success ? usersData.users : [],
            deliveryZones: zonesData?.success ? zonesData.zones : [],
            drivers: driversData?.success ? driversData.drivers : [],
          })
        );
      } catch {}
    } catch (err) {
      console.error(err);
      addToast("error", "فشل تحديث بيانات لوحة الإدارة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFactorySheet = async (targetDateVal = factoryDate) => {
    try {
      setFactoryLoading(true);
      const res = await fetch(`/api/factory-orders?targetDate=${encodeURIComponent(targetDateVal)}`);
      const data = await res.json();
      if (data.success) {
        setFactoryData(data);
        setFactoryNotesInput(data.savedFactoryOrder?.notes || "");
        const nextApproved: Record<string, string> = {};
        (data.rows || []).forEach((r: any) => {
          nextApproved[r.menuItemId] = String(r.approvedQty ?? r.suggestedQty ?? 0);
        });
        setFactoryApprovedEdits(nextApproved);
        setEditingMinStockMap({});
      } else {
        addToast("error", data.error || "تعذر تحميل كشف طلبية المصنع");
      }
    } catch {
      addToast("error", "تعذر الاتصال بخادم طلبية المصنع");
    } finally {
      setFactoryLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, selectedOutletId]);

  useEffect(() => {
    if (currentUser && activeTab === "pastry" && pastrySubTab === "factory") {
      fetchFactorySheet(factoryDate);
    }
  }, [currentUser, activeTab, pastrySubTab, factoryDate]);

  // Active Outlet Info & Branch Isolation Helpers
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId);
  const isSoulmate = activeOutlet?.code === "SOULMATE_CAFE";
  const isAbuAdel = activeOutlet?.code === "ABU_ADEL_PATISSERIE";

  const isOwner = currentUser?.role === "owner";
  const isBranchManager = currentUser?.role === "branch_manager";
  const userOutlet = outlets.find((o) => o.id === currentUser?.outletId) || currentUser?.outlet;
  const isUserSoulmate =
    userOutlet?.code === "SOULMATE_CAFE" ||
    currentUser?.username?.includes("soulmate");
  const isUserAbuAdel =
    userOutlet?.code === "ABU_ADEL_PATISSERIE" ||
    currentUser?.username?.includes("abuadel");

  // Multi-tier Isolation Views:
  const isViewingSoulmate = isUserSoulmate || (isOwner && isSoulmate);
  const isViewingAbuAdel = isUserAbuAdel || (isOwner && isAbuAdel);
  const isViewingAll = isOwner && (selectedOutletId === "ALL" || !selectedOutletId);

  // KPIs Calculations (Strictly Net Store Revenue: excludes Driver Delivery Fees & unpaid future scheduled bookings)
  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED");

  const totalSales = paidOrders.reduce((sum, o) => sum + getStoreNet(o), 0);

  const soulmateSales = paidOrders
    .filter((o) => o.outlet?.code === "SOULMATE_CAFE")
    .reduce((sum, o) => sum + getStoreNet(o), 0);

  const abuAdelSales = paidOrders
    .filter((o) => o.outlet?.code === "ABU_ADEL_PATISSERIE")
    .reduce((sum, o) => sum + getStoreNet(o), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const tableOccupancyRate =
    tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;

  // ─────────────────────────────────────────────────────────────
  // TREASURY & FINANCIAL INTELLIGENCE BI ENGINE
  // ─────────────────────────────────────────────────────────────
  const filteredReportData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // 1. Filter Orders by Timeframe & Outlet (separate unpaid future pre-orders)
    const timeAndOutletOrders = orders.filter((o) => {
      if (o.status === "CANCELLED") return false;
      const orderTime = new Date(o.createdAt).getTime();

      if (reportTimeframe === "TODAY" && orderTime < startOfToday) return false;
      if (reportTimeframe === "WEEK" && orderTime < sevenDaysAgo) return false;
      if (reportTimeframe === "MONTH" && orderTime < startOfMonth) return false;

      if (reportOutletFilter !== "ALL" && o.outletId !== reportOutletFilter) return false;
      return true;
    });

    const filteredOrders = timeAndOutletOrders.filter(
      (o) => !(o.isScheduled && o.paymentStatus !== "PAID")
    );
    const upcomingScheduledOrders = timeAndOutletOrders.filter(
      (o) => o.isScheduled && o.paymentStatus !== "PAID"
    );
    const confirmedDepositsCollected = upcomingScheduledOrders.reduce(
      (sum, o) => sum + (o.depositStatus === "CONFIRMED" ? Number(o.depositPaid) || 0 : 0),
      0
    );
    const upcomingPreOrdersValue = upcomingScheduledOrders.reduce(
      (sum, o) => sum + getStoreNet(o),
      0
    );

    // 2. Filter Expenses by Timeframe & Outlet
    const filteredExpenses = expenses.filter((e) => {
      const expTime = new Date(e.createdAt).getTime();
      if (reportTimeframe === "TODAY" && expTime < startOfToday) return false;
      if (reportTimeframe === "WEEK" && expTime < sevenDaysAgo) return false;
      if (reportTimeframe === "MONTH" && expTime < startOfMonth) return false;

      if (reportOutletFilter !== "ALL" && e.outletId !== reportOutletFilter) return false;
      return true;
    });

    // 3. Core Totals (Store Revenue separated cleanly from Driver Delivery Fees)
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + getStoreNet(o), 0);
    const totalSubtotal = filteredOrders.reduce((sum, o) => sum + (Number(o.subtotal || getStoreNet(o)) || 0), 0);
    const totalDiscount = filteredOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);
    const totalTips = filteredOrders.reduce((sum, o) => sum + (Number(o.tipAmount) || 0), 0);
    const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 4. Item-Level Analysis & COGS (Cost of Goods Sold)
    const itemsMap: Record<string, {
      nameAr: string;
      category: string;
      unitPrice: number;
      costPrice: number;
      qty: number;
      totalRevenue: number;
      totalCost: number;
      profit: number;
    }> = {};

    let totalCOGS = 0;

    filteredOrders.forEach((o) => {
      let orderItems: any[] = [];
      try {
        orderItems = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
      } catch {
        orderItems = [];
      }

      orderItems.forEach((it: any) => {
        const qty = Number(it.qty) || 1;
        const price = Number(it.price) || 0;
        const lineRev = price * qty;

        const catalogItem = menuItems.find((m) => m.id === it.menuItemId || m.nameAr === it.nameAr);
        // Priority 1: Historical snapshotted unit cost locked inside Order.items (so future factory invoices never mutate past P&L!)
        // Priority 2 (legacy orders before snapshotting): fallback to current catalog calculatedCost/costPrice
        const hasSnapshot =
          it.costSnapshotted === true ||
          (it.costPrice !== undefined && it.costPrice !== null && Number(it.costPrice) > 0);
        const unitCost = hasSnapshot
          ? Number(it.costPrice) || 0
          : Number(catalogItem?.calculatedCost || catalogItem?.costPrice || 0);
        const lineCost = unitCost * qty;

        totalCOGS += lineCost;

        const key = it.nameAr || it.menuItemId || "صنف غير مسمى";
        if (!itemsMap[key]) {
          itemsMap[key] = {
            nameAr: key,
            category: it.category || catalogItem?.category || "عام",
            unitPrice: price,
            costPrice: unitCost,
            qty: 0,
            totalRevenue: 0,
            totalCost: 0,
            profit: 0,
          };
        }

        itemsMap[key].qty += qty;
        itemsMap[key].totalRevenue += lineRev;
        itemsMap[key].totalCost += lineCost;
        itemsMap[key].profit += (lineRev - lineCost);
      });
    });

    const itemsList = Object.values(itemsMap);
    const topByQty = [...itemsList].sort((a, b) => b.qty - a.qty).slice(0, 8);
    const topByRevenue = [...itemsList].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 8);
    const topByProfit = [...itemsList].sort((a, b) => b.profit - a.profit).slice(0, 8);

    // 5. Payment Methods Breakdown
    const paymentMethods: Record<string, { label: string; amount: number; count: number; color: string; border: string; bg: string }> = {
      CASH: { label: "نقدي (كاش)", amount: 0, count: 0, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
      CARD: { label: "فيزا / بطاقات بنكية", amount: 0, count: 0, color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10" },
      INSTAPAY: { label: "إنستاباي (InstaPay)", amount: 0, count: 0, color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10" },
      VODAFONE_CASH: { label: "فودافون كاش ومحافظ", amount: 0, count: 0, color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" },
      TALABAT: { label: "طلبات (Talabat)", amount: 0, count: 0, color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10" },
    };

    filteredOrders.forEach((o) => {
      const pm =
        o.orderType === "TALABAT" || (o.paymentMethod || "").toUpperCase() === "TALABAT"
          ? "TALABAT"
          : (o.paymentMethod || "CASH").toUpperCase();
      const netStore = getStoreNet(o);
      if (paymentMethods[pm]) {
        paymentMethods[pm].amount += netStore;
        paymentMethods[pm].count += 1;
      } else {
        paymentMethods.CASH.amount += netStore;
        paymentMethods.CASH.count += 1;
      }
    });

    // 6. Order Types Breakdown (Net Store Revenue)
    const orderTypes: Record<string, { label: string; amount: number; count: number }> = {
      DINE_IN: { label: "صالة الكافيه 🪑", amount: 0, count: 0 },
      TAKEAWAY: { label: "تيك أواي / بيع مباشر 🛍️", amount: 0, count: 0 },
      DELIVERY: { label: "توصيل دليفري 🛵", amount: 0, count: 0 },
      TALABAT: { label: "تطبيق طلبات (Talabat) 🟠", amount: 0, count: 0 },
    };

    filteredOrders.forEach((o) => {
      const ot = (o.orderType || "DINE_IN").toUpperCase();
      if (orderTypes[ot]) {
        orderTypes[ot].amount += getStoreNet(o);
        orderTypes[ot].count += 1;
      }
    });

    const totalTalabatGross = filteredOrders
      .filter((o) => o.orderType === "TALABAT" || (o.paymentMethod || "").toUpperCase() === "TALABAT")
      .reduce((s, o) => s + getStoreNet(o), 0);
    const totalTalabatCommission = filteredOrders
      .filter((o) => o.orderType === "TALABAT" || (o.paymentMethod || "").toUpperCase() === "TALABAT")
      .reduce((s, o) => s + (Number(o.commissionAmount) || getStoreNet(o) * ((Number(settings?.talabatCommissionPercent ?? 25) || 25) / 100)), 0);
    const totalTalabatNet = Math.max(0, totalTalabatGross - totalTalabatCommission);

    // 7. Branch Comparison (Net Store Revenue)
    const soulmateOrders = filteredOrders.filter(
      (o) => o.outlet?.code === "SOULMATE_CAFE" || o.outletId === outlets.find((x) => x.code === "SOULMATE_CAFE")?.id
    );
    const abuAdelOrders = filteredOrders.filter(
      (o) => o.outlet?.code === "ABU_ADEL_PATISSERIE" || o.outletId === outlets.find((x) => x.code === "ABU_ADEL_PATISSERIE")?.id
    );

    const soulmateRevenue = soulmateOrders.reduce((s, o) => s + getStoreNet(o), 0);
    const abuAdelRevenue = abuAdelOrders.reduce((s, o) => s + getStoreNet(o), 0);

    const soulmateExpenses = filteredExpenses
      .filter((e) => e.outlet?.code === "SOULMATE_CAFE" || e.outletId === outlets.find((x) => x.code === "SOULMATE_CAFE")?.id)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const abuAdelExpenses = filteredExpenses
      .filter((e) => e.outlet?.code === "ABU_ADEL_PATISSERIE" || e.outletId === outlets.find((x) => x.code === "ABU_ADEL_PATISSERIE")?.id)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // 8. Financial Summary (P&L)
    const grossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - totalExpensesAmount - totalTalabatCommission;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const averageOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    return {
      filteredOrders,
      filteredExpenses,
      totalRevenue,
      totalSubtotal,
      totalDiscount,
      totalTips,
      totalDeliveryFees,
      totalExpensesAmount,
      totalTalabatGross,
      totalTalabatCommission,
      totalTalabatNet,
      totalCOGS,
      grossProfit,
      grossProfitMargin,
      netProfit,
      netProfitMargin,
      averageOrderValue,
      itemsList,
      topByQty,
      topByRevenue,
      topByProfit,
      paymentMethods,
      orderTypes,
      soulmateRevenue,
      abuAdelRevenue,
      soulmateExpenses,
      abuAdelExpenses,
      ordersCount: filteredOrders.length,
      upcomingScheduledCount: upcomingScheduledOrders.length,
      confirmedDepositsCollected,
      upcomingPreOrdersValue,
    };
  }, [orders, expenses, menuItems, outlets, settings?.talabatCommissionPercent, reportTimeframe, reportOutletFilter]);

  const handleExportFinancialCSV = () => {
    const data = filteredReportData;
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "تقرير الحسابات والأرباح الشامل - مجموعة حلواني أبو عادل & سول ميت كافيه VIP\n";
    csvContent += `الفترة,${reportTimeframe === "TODAY" ? "اليوم" : reportTimeframe === "WEEK" ? "آخر 7 أيام" : reportTimeframe === "MONTH" ? "هذا الشهر" : "كافة الفترات"}\n`;
    csvContent += `الفرع,${reportOutletFilter === "ALL" ? "كافة الفروع" : outlets.find((o) => o.id === reportOutletFilter)?.name || ""}\n`;
    csvContent += `تاريخ التصدير,${new Date().toLocaleString("ar-EG")}\n\n`;

    csvContent += "=== ملخص قائمة الدخل والأرباح (صافي إيراد المحل بعد فصل رسوم الدليفري) ===\n";
    csvContent += `صافي إيرادات المحل,${data.totalRevenue.toFixed(2)} ج.م\n`;
    csvContent += `رسوم التوصيل المستحقة للطيارين (خارج الإيراد),${data.totalDeliveryFees.toFixed(2)} ج.م\n`;
    if (data.totalTalabatGross > 0) {
      csvContent += `إجمالي مبيعات طلبات (Talabat),${data.totalTalabatGross.toFixed(2)} ج.م\n`;
      csvContent += `عمولة طلبات المستقطعة,${data.totalTalabatCommission.toFixed(2)} ج.م\n`;
      csvContent += `صافي المستحق من شركة طلبات,${data.totalTalabatNet.toFixed(2)} ج.م\n`;
    }
    if (data.upcomingScheduledCount > 0) {
      csvContent += `عربون مؤكد لحجوزات قادمة (${data.upcomingScheduledCount} حجز),${data.confirmedDepositsCollected.toFixed(2)} ج.م\n`;
    }
    csvContent += `تكلفة الخامات والمبيعات (COGS),${data.totalCOGS.toFixed(2)} ج.م\n`;
    csvContent += `مجمل الربح,${data.grossProfit.toFixed(2)} ج.م (${data.grossProfitMargin.toFixed(1)}%)\n`;
    csvContent += `المصروفات والنثريات,${data.totalExpensesAmount.toFixed(2)} ج.م\n`;
    if (data.totalTalabatCommission > 0) {
      csvContent += `عمولة طلبات (Talabat),${data.totalTalabatCommission.toFixed(2)} ج.م\n`;
    }
    csvContent += `صافي الربح النهائي,${data.netProfit.toFixed(2)} ج.م (${data.netProfitMargin.toFixed(1)}%)\n`;
    csvContent += `عدد الطلبات,${data.ordersCount}\n`;
    csvContent += `متوسط الفاتورة,${data.averageOrderValue.toFixed(2)} ج.م\n\n`;

    csvContent += "=== قنوات التحصيل والدفع ===\n";
    Object.values(data.paymentMethods).forEach((pm) => {
      csvContent += `${pm.label},${pm.amount.toFixed(2)} ج.م,${pm.count} طلب\n`;
    });
    csvContent += "\n";

    csvContent += "=== الأصناف الأكثر مبيعاً وتحقيقاً للإيراد ===\n";
    csvContent += "اسم الصنف,التصنيف,الكمية المباعة,سعر الوحدة,إجمالي الإيراد,التكلفة التقديرية,صافي ربح الصنف\n";
    data.topByRevenue.forEach((it) => {
      csvContent += `"${it.nameAr}","${it.category}",${it.qty},${it.unitPrice},${it.totalRevenue.toFixed(2)},${it.totalCost.toFixed(2)},${it.profit.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Financial_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", "تم تصدير ملف إكسل المالي بنجاح 📥📊");
  };

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
          leadTimeDays: Math.max(1, Math.round(parseFloat(rawForm.leadTimeDays) || 3)),
          avgDailyUsage: Math.max(0, parseFloat(rawForm.avgDailyUsage) || 0),
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
          leadTimeDays: "3",
          avgDailyUsage: "0",
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

  const handleSaveRawLeadSettings = async (rawId: string) => {
    const draft = editingRawLeadMap[rawId];
    if (!draft) return;
    try {
      const res = await fetch("/api/recipes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rawId,
          leadTimeDays: Math.max(1, Math.round(Number(draft.leadTimeDays) || 3)),
          minStockAlert: Math.max(0, Number(draft.minStockAlert) || 0),
          avgDailyUsage: Math.max(0, Number(draft.avgDailyUsage) || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم تحديث مهلة التوريد وحد الطلب بنجاح ✓");
        setEditingRawLeadMap((prev) => {
          const next = { ...prev };
          delete next[rawId];
          return next;
        });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تحديث مهلة التوريد");
      }
    } catch {
      addToast("error", "حدث خطأ في تحديث الخامة");
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
          stockQty: pastryForm.stockQty !== "" ? parseFloat(pastryForm.stockQty) : 0,
          minStockAlert: pastryForm.minStockAlert !== "" ? parseFloat(pastryForm.minStockAlert) : 10,
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

  // Save / Update Delivery Zone
  const handleSaveDeliveryZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.nameAr.trim()) {
      addToast("error", "برجاء كتابة اسم المنطقة");
      return;
    }
    try {
      setSavingZone(true);
      const method = editingZoneId ? "PATCH" : "POST";
      const payload: any = {
        nameAr: zoneForm.nameAr.trim(),
        nameEn: zoneForm.nameEn.trim() || null,
        fee: Number(zoneForm.fee || 0),
        estimatedTime: zoneForm.estimatedTime.trim() || "45 - 60 دقيقة",
        sortOrder: Number(zoneForm.sortOrder || 0),
      };
      if (editingZoneId) payload.id = editingZoneId;

      const res = await fetch("/api/delivery-zones", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", editingZoneId ? "تم تحديث بيانات المنطقة بنجاح" : "تمت إضافة المنطقة بنجاح");
        setEditingZoneId(null);
        setZoneForm({ nameAr: "", nameEn: "", fee: "", estimatedTime: "45 - 60 دقيقة", sortOrder: "0" });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل حفظ المنطقة");
      }
    } catch {
      addToast("error", "فشل الاتصال بالخادم");
    } finally {
      setSavingZone(false);
    }
  };

  const handleToggleZoneActive = async (zone: any) => {
    try {
      const res = await fetch("/api/delivery-zones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: zone.id, isActive: !zone.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", !zone.isActive ? `تم تفعيل توصيل: ${zone.nameAr}` : `تم إيقاف توصيل: ${zone.nameAr}`);
        fetchDashboardData();
      }
    } catch {
      addToast("error", "فشل تعديل حالة المنطقة");
    }
  };

  const handleDeleteDeliveryZone = async (zone: any) => {
    if (!confirm(`هل أنت متأكد من حذف منطقة "${zone.nameAr}"؟`)) return;
    try {
      const res = await fetch(`/api/delivery-zones?id=${zone.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم حذف المنطقة بنجاح");
        fetchDashboardData();
      } else {
        addToast("error", data.error || "تعذر حذف المنطقة");
      }
    } catch {
      addToast("error", "فشل حذف المنطقة");
    }
  };

  // Update Order Dispatch / Kitchen Status / Settle
  const handleUpdateOrderDispatch = async (orderId: string, payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", successMsg);
        fetchDashboardData();
      } else {
        addToast("error", data.error || "فشل تحديث الطلب");
      }
    } catch {
      addToast("error", "فشل الاتصال بالخادم");
    }
  };

  // Update Shift Opening Cash Float inline
  const handleUpdateAdminOpeningFloat = async (shiftId: string) => {
    const val = parseFloat(adminFloatInput);
    if (isNaN(val) || val < 0) {
      addToast("error", "برجاء إدخال مبلغ عهدة صحيح");
      return;
    }
    try {
      setSavingAdminFloat(true);
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_OPENING_FLOAT",
          shiftId,
          openingCashFloat: val,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", `تم تحديث عهدة بداية الوردية إلى ${val} ج.م بنجاح ✅`);
        setEditingAdminFloat(false);
        fetchDashboardData();
      } else {
        addToast("error", data.error || "تعذر تحديث العهدة");
      }
    } catch {
      addToast("error", "فشل الاتصال بالخادم");
    } finally {
      setSavingAdminFloat(false);
    }
  };

  // Dynamic Delivery Drivers CRUD
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name.trim() || !driverForm.phone.trim()) {
      addToast("error", "اسم الطيار ورقم الموبايل مطلوبان");
      return;
    }
    try {
      setSavingDriver(true);
      const abuAdelOutletId =
        outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE")?.id ||
        (selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id);
      const res = await fetch("/api/drivers", {
        method: editingDriverId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingDriverId ? { id: editingDriverId } : {}),
          name: driverForm.name.trim(),
          phone: driverForm.phone.trim(),
          vehicleInfo: driverForm.vehicleInfo.trim() || "موتوسيكل دليفري",
          notes: driverForm.notes.trim() || null,
          outletId: abuAdelOutletId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", editingDriverId ? "تم تحديث بيانات الطيار ✓" : "تمت إضافة الطيار بنجاح 🛵");
        setEditingDriverId(null);
        setDriverForm({ name: "", phone: "", vehicleInfo: "موتوسيكل دليفري", notes: "" });
        fetchDashboardData();
      } else {
        addToast("error", data.error || "تعذر حفظ بيانات الطيار");
      }
    } catch {
      addToast("error", "فشل حفظ بيانات الطيار");
    } finally {
      setSavingDriver(false);
    }
  };

  const handleToggleDriverActive = async (driver: any) => {
    try {
      const res = await fetch("/api/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id, isActive: !driver.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", `تم ${!driver.isActive ? "تفعيل" : "إيقاف"} الطيار ${driver.name}`);
        fetchDashboardData();
      }
    } catch {
      addToast("error", "فشل تحديث حالة الطيار");
    }
  };

  const handleDeleteDriver = async (driver: any) => {
    if (!window.confirm(`حذف الطيار "${driver.name}" من القائمة؟`)) return;
    try {
      const res = await fetch(`/api/drivers?id=${encodeURIComponent(driver.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم حذف الطيار بنجاح");
        fetchDashboardData();
      } else {
        addToast("error", data.error || "تعذر حذف الطيار");
      }
    } catch {
      addToast("error", "فشل حذف الطيار");
    }
  };

  // Admin Chat Image Upload
  const handleUploadAdminChatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAdminChatImage(true);
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setAdminChatImage(data.url);
        addToast("success", "تم تجهيز الصورة للإرسال في الشات 📸");
      } else {
        addToast("error", data.error || "فشل رفع الصورة");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء رفع صورة الشات");
    } finally {
      setUploadingAdminChatImage(false);
      e.target.value = "";
    }
  };

  // Send Staff Reply to Customer / Table Chat (2-way sync fix + image support)
  const handleSendStaffChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReplyText.trim() && !adminChatImage) return;

    try {
      const scopedMsgs = chatMessages.filter((m) => {
        if (isUserSoulmate && m.outlet?.code !== "SOULMATE_CAFE") return false;
        if (isUserAbuAdel && m.outlet?.code !== "ABU_ADEL_PATISSERIE") return false;
        if (!isViewingAll && selectedOutletId !== "ALL" && m.outletId !== selectedOutletId) return false;
        if (chatOutletFilter !== "ALL" && m.outletId !== chatOutletFilter) return false;
        return true;
      });

      const threadMsgs = scopedMsgs.filter((m) => {
        if (selectedChatThread === "ALL") return false;
        if (selectedChatThread.startsWith("PHONE:")) return m.senderPhone === selectedChatThread.slice(6);
        if (selectedChatThread.startsWith("GUEST:")) return m.guestId === selectedChatThread.slice(6);
        if (selectedChatThread.startsWith("TABLE:")) return m.tableNumber === selectedChatThread.slice(6);
        return false;
      });

      // If Admin is on "ALL", automatically target the latest active customer conversation so the reply reaches the customer!
      const latestCustomerMsg = [...scopedMsgs]
        .reverse()
        .find((m) => m.senderType === "CUSTOMER" && (m.senderPhone || m.guestId || m.tableNumber));

      const targetMsg = threadMsgs[threadMsgs.length - 1] || latestCustomerMsg;

      const targetOutlet =
        targetMsg?.outletId ||
        (chatOutletFilter !== "ALL" ? chatOutletFilter : null) ||
        (selectedOutletId !== "ALL" ? selectedOutletId : outlets[0]?.id);

      const senderPhone = selectedChatThread.startsWith("PHONE:")
        ? selectedChatThread.slice(6)
        : targetMsg?.senderPhone || null;

      const guestId = selectedChatThread.startsWith("GUEST:")
        ? selectedChatThread.slice(6)
        : targetMsg?.guestId || null;

      const tableNumber = selectedChatThread.startsWith("TABLE:")
        ? selectedChatThread.slice(6)
        : selectedChatTable !== "ALL"
        ? selectedChatTable
        : targetMsg?.tableNumber || null;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: targetOutlet,
          senderType: "STAFF",
          senderName: currentUser?.name || "إدارة المحل / خدمة العملاء",
          senderPhone,
          guestId,
          tableNumber,
          message: chatReplyText.trim() || "📎 مرفق صورة",
          imageUrl: adminChatImage || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatReplyText("");
        setAdminChatImage("");
        if (selectedChatThread === "ALL" && targetMsg) {
          if (targetMsg.senderPhone) setSelectedChatThread(`PHONE:${targetMsg.senderPhone}`);
          else if (targetMsg.guestId) setSelectedChatThread(`GUEST:${targetMsg.guestId}`);
          else if (targetMsg.tableNumber) setSelectedChatThread(`TABLE:${targetMsg.tableNumber}`);
        }
        addToast(
          "success",
          senderPhone
            ? `تم إرسال الرد المباشر للعميل (${senderPhone}) بنجاح 💬✅`
            : "تم إرسال الرد المباشر بنجاح 👍"
        );
        fetchDashboardData();
      }
    } catch {
      addToast("error", "فشل إرسال الرد");
    }
  };

  // Send 48h/24h Pre-Order Alert to Customer via Chat + Mark Flag
  const handleSendPreOrderAlertChat = async (order: any, hoursLeft: number) => {
    const phone = order.deliveryPhone || order.customerPhone;
    const whenText = order.scheduledFor
      ? new Date(order.scheduledFor).toLocaleString("ar-EG", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "الموعد المحدد";
    const remainingWindow = hoursLeft <= 24 ? "أقل من 24 ساعة" : "أقل من 48 ساعة";
    const depositPart =
      order.depositStatus === "CONFIRMED"
        ? `تم تأكيد عربون الحجز (${order.depositPaid || order.depositRequired} ج.م).`
        : Number(order.depositRequired) > 0
        ? `يرجى تأكيد الحجز بسداد العربون (${order.depositRequired} ج.م) عبر إنستاباي (${settings?.instapayAccount || "غير محدد"}) أو فودافون كاش (${settings?.vodafoneCashNumber || "غير محدد"}) وإرسال صورة الإيصال هنا حتى نبدأ التجهيز من المصنع.`
        : "طلبك مجدول للتجهيز في المعمل.";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: order.outletId,
          senderType: "STAFF",
          senderName: currentUser?.name || "إدارة حجوزات أبو عادل",
          senderPhone: phone || null,
          message: `🔔 تذكير حجز رقم ${order.orderNumber}: متبقي ${remainingWindow} على موعدك (${whenText}). ${depositPart}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "MARK_ALERT_SENT",
            orderId: order.id,
            ...(hoursLeft <= 24 ? { alertSent24h: true } : { alertSent48h: true }),
          }),
        });
        addToast("success", `تم إرسال تنبيه الشات للعميل للحجز ${order.orderNumber} 🔔✅`);
        fetchDashboardData();
      } else {
        addToast("error", data.error || "تعذر إرسال التنبيه");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء إرسال التنبيه");
    }
  };

  // Factory Procurement Order Handlers
  const handleSaveFactorySheet = async (status: "DRAFT" | "SENT_TO_FACTORY") => {
    if (!factoryData?.rows) return;
    try {
      setFactorySaving(true);
      const rows = factoryData.rows.map((r: any) => ({
        menuItemId: r.menuItemId,
        currentStock: r.currentStock,
        minStockLevel: r.minStockLevel,
        shortageQty: r.shortageQty,
        preOrderQty: r.confirmedPreOrderQty,
        suggestedQty: r.suggestedQty,
        approvedQty: Math.max(
          0,
          parseFloat(factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? r.suggestedQty ?? 0)) || 0
        ),
        notes: r.notes || "",
      }));
      const res = await fetch("/api/factory-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_SHEET",
          outletId: factoryData.outletId,
          targetDate: factoryDate,
          status,
          createdBy: currentUser?.name || "المدير العام",
          notes: factoryNotesInput,
          rows,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "success",
          status === "SENT_TO_FACTORY"
            ? `تم اعتماد وإرسال طلبية المصنع ليوم ${factoryDate} بنجاح 📤🏭`
            : `تم حفظ مسودة طلبية المصنع ليوم ${factoryDate} 💾`
        );
        await fetchFactorySheet(factoryDate);
      } else {
        addToast("error", data.error || "تعذر حفظ طلبية المصنع");
      }
    } catch {
      addToast("error", "فشل حفظ طلبية المصنع");
    } finally {
      setFactorySaving(false);
    }
  };

  const handleUpdateMinStock = async (menuItemId: string) => {
    const raw = editingMinStockMap[menuItemId];
    if (raw === undefined) return;
    const minVal = parseFloat(raw);
    if (isNaN(minVal) || minVal < 0) {
      addToast("error", "أدخل حد أمان صحيح (0 أو أكثر)");
      return;
    }
    try {
      const res = await fetch("/api/factory-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MIN_STOCK",
          menuItemId,
          minStockAlert: minVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم تحديث حد الأمان وإعادة حساب النواقص ✅");
        await Promise.all([fetchFactorySheet(factoryDate), fetchDashboardData()]);
      } else {
        addToast("error", data.error || "فشل التحديث");
      }
    } catch {
      addToast("error", "فشل الاتصال بالخادم");
    }
  };

  const handleReceiveFromFactory = async () => {
    if (!factoryData?.savedFactoryOrder?.id) {
      addToast("error", "احفظ أو اعتمد الطلبية أولاً قبل استلامها للمخزن");
      return;
    }
    if (
      !window.confirm(
        `هل استلمت بضاعة طلبية المصنع ليوم ${factoryDate} بالفعل؟ سيتم إضافة الكميات المعتمدة (${factoryData.savedFactoryOrder.items?.filter((i: any) => i.approvedQty > 0).length || 0} صنف) لرصيد المخزن الآن.`
      )
    ) {
      return;
    }
    try {
      setFactorySaving(true);
      const res = await fetch("/api/factory-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECEIVE_FROM_FACTORY",
          factoryOrderId: factoryData.savedFactoryOrder.id,
          createdBy: currentUser?.name || "أمين المخزن",
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", "تم استلام بضاعة المصنع وإضافتها لأرصدة المخزن بنجاح 📦🎉");
        await Promise.all([fetchFactorySheet(factoryDate), fetchDashboardData()]);
      } else {
        addToast("error", data.error || "تعذر استلام الطلبية");
      }
    } catch {
      addToast("error", "فشل استلام الطلبية");
    } finally {
      setFactorySaving(false);
    }
  };

  const handlePrintFactorySheet = () => {
    if (!factoryData?.rows) return;
    const rowsToPrint = factoryData.rows.filter((r: any) => {
      const qty = parseFloat(factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? 0)) || 0;
      return qty > 0 || r.shortageQty > 0 || r.confirmedPreOrderQty > 0;
    });
    const printWin = window.open("", "_blank", "width=850,height=900");
    if (!printWin) return;
    const tableRows = rowsToPrint
      .map((r: any, i: number) => {
        const qty = parseFloat(factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? 0)) || 0;
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${r.nameAr}</strong></td>
          <td>${r.unitType === "KG" ? "كجم" : r.unitType === "BOX" ? "علبة" : "قطعة"}</td>
          <td>${r.currentStock}</td>
          <td>${r.minStockLevel}</td>
          <td>${r.shortageQty}</td>
          <td>${r.confirmedPreOrderQty}</td>
          <td style="font-weight:bold;background:#fef3c7;">${qty}</td>
        </tr>`;
      })
      .join("");
    printWin.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>طلبية مصنع أبو عادل - ${factoryDate}</title>
      <style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}h2{margin:0 0 6px}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}th{background:#f3f4f6}</style>
      </head><body>
      <h2>كشف طلبية المعمل والمصنع — حلواني أبو عادل</h2>
      <div>التاريخ المستهدف للتسليم: <strong>${factoryDate}</strong> • مسؤول الإدارة: ${currentUser?.name || "الإدارة"}</div>
      ${factoryNotesInput ? `<p><strong>ملاحظات:</strong> ${factoryNotesInput}</p>` : ""}
      <table><thead><tr><th>#</th><th>الصنف</th><th>الوحدة</th><th>الرصيد الحالي</th><th>حد الأمان</th><th>العجز</th><th>حجوزات مؤكدة</th><th>المطلوب المعتمد</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="8">لا توجد أصناف مطلوبة</td></tr>'}</tbody></table>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    printWin.document.close();
  };

  const handleDispatchFactoryWhatsappAdmin = async () => {
    if (!factoryData?.rows) return;
    const rowsToSend = factoryData.rows.filter((r: any) => {
      const qty = parseFloat(factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? 0)) || 0;
      return qty > 0;
    });
    const unitLabel = (u: string) => (u === "KG" ? "كجم" : u === "BOX" ? "علبة" : "قطعة");
    const lines = rowsToSend.map((r: any, idx: number) => {
      const qty = parseFloat(factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? 0)) || 0;
      return `${idx + 1}. ${r.nameAr}: *${qty}* ${unitLabel(r.unitType)}`;
    });
    const text = [
      `🏭 *طلبية المصنع اليومية - حلواني أبو عادل*`,
      `📅 تاريخ التسليم المطلوب: *${factoryDate}*`,
      `👤 المعتمد: ${currentUser?.name || "الإدارة"}`,
      ...(factoryNotesInput ? [`📝 ملاحظات: ${factoryNotesInput}`] : []),
      `────────────────────`,
      ...(lines.length > 0 ? lines : ["لا توجد أصناف مطلوبة."]),
    ].join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {}
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    addToast("success", "تم نسخ نص طلبية المصنع وفتح واتساب للإرسال الفوري 📱✅");
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-black text-xl">
              {isAbuAdel ? "ع" : "S"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between sm:justify-end">
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

            {(isViewingAll || isViewingSoulmate) && (
              <Link
                href="/kds"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 transition"
              >
                <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
                <span>شاشة الباريستا (KDS)</span>
              </Link>
            )}

            {(isOwner || isBranchManager) && (
              <button
                type="button"
                onClick={() => setDailyReportSignal((n) => n + 1)}
                className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl text-xs border transition ${
                  dailyAlertStatus.isRinging
                    ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30"
                    : dailyAlertStatus.hasAlertPending || dailyAlertStatus.urgentRawCount > 0 || dailyAlertStatus.factoryNeedsCount > 0
                    ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/50"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="التقرير اليومي وجرس الإغلاق والتوريد"
              >
                <Bell className={`w-4 h-4 ${dailyAlertStatus.isRinging ? "text-white" : "text-amber-400"}`} />
                <span>التقرير اليومي وجرس الإغلاق</span>
                {(dailyAlertStatus.urgentRawCount > 0 || dailyAlertStatus.factoryNeedsCount > 0) && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                    {dailyAlertStatus.urgentRawCount + dailyAlertStatus.factoryNeedsCount}
                  </span>
                )}
              </button>
            )}

            {(isOwner || isBranchManager) && (
              <AdminAuditAlertsDrawer
                outletId={selectedOutletId || "ALL"}
                actorName={currentUser?.name || "المدير العام"}
                onToast={addToast}
              />
            )}

            <PushOptInButton
              role={isOwner ? "OWNER" : "ADMIN"}
              outletId={isOwner ? null : currentUser?.outletId || selectedOutletId || null}
              userId={currentUser?.id || null}
              userName={currentUser?.name || "المدير العام"}
              compact
            />

            <ThemeToggle compact />

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
              <span>الخزنة والتقارير المالية والورديات</span>
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
            {(isViewingAll || isViewingSoulmate) && (
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
            {(isViewingAll || isViewingAbuAdel) && (
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
            {(isViewingAll || isViewingSoulmate) && (
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

            {/* Chat Tab (Available for BOTH Soulmate & Abu Adel!) */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "chat"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {isViewingAbuAdel ? "شات عملاء حلواني أبو عادل" : "شات العملاء والمحلات"} ({chatMessages.length})
              </span>
            </button>

            {/* Loyalty, CRM & Offers Tab (Both Abu Adel & Soulmate!) */}
            <button
              onClick={() => setActiveTab("loyalty")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === "loyalty"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>الولاء والعملاء والعروض 🎁👑</span>
              {settings?.isLoyaltyEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {(isOwner || isBranchManager) && (
              <button
                onClick={() => setActiveTab("suppliers")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === "suppliers"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Factory className="w-4 h-4" />
                <span>المصنع والموردين والـ AI 🏭🤖</span>
                {dailyAlertStatus.urgentRawCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
                    {dailyAlertStatus.urgentRawCount}
                  </span>
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
            {/* KPI Cards Row - Strictly Filtered by Role & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CARD 1: Revenue Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>
                    {isViewingSoulmate && !isViewingAll
                      ? "إجمالي مبيعات كافيه سول ميت"
                      : isViewingAbuAdel && !isViewingAll
                      ? "إجمالي مبيعات حلواني أبو عادل"
                      : "إجمالي المبيعات المدفوعة (كافة الفروع)"}
                  </span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {(isViewingSoulmate && !isViewingAll
                    ? soulmateSales
                    : isViewingAbuAdel && !isViewingAll
                    ? abuAdelSales
                    : totalSales
                  ).toLocaleString()}{" "}
                  <span className="text-xs text-slate-400 font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 flex-wrap">
                  <span className="text-emerald-400 font-bold">
                    {(isViewingSoulmate && !isViewingAll
                      ? paidOrders.filter((o) => o.outlet?.code === "SOULMATE_CAFE" || o.outletId === outlets.find((x) => x.code === "SOULMATE_CAFE")?.id)
                      : isViewingAbuAdel && !isViewingAll
                      ? paidOrders.filter((o) => o.outlet?.code === "ABU_ADEL_PATISSERIE" || o.outletId === outlets.find((x) => x.code === "ABU_ADEL_PATISSERIE")?.id)
                      : paidOrders
                    ).length} طلب مسدد
                  </span>
                  <span>(صافي المحل بعد فصل الدليفري)</span>
                </div>
              </div>

              {/* CARD 2: Contextual Branch Card */}
              {isViewingAll ? (
                // Owner viewing ALL: Soulmate Revenue
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>إيرادات سول ميت كافيه VIP</span>
                    <Coffee className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-500 font-mono">
                    {soulmateSales.toLocaleString()}{" "}
                    <span className="text-xs text-slate-400 font-normal">ج.م</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    باريستا، مشروبات ساخنة وباردة
                  </div>
                </div>
              ) : isViewingSoulmate ? (
                // Soulmate Only: Table Occupancy Rate
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>إشغال ترابيزات الكافيه</span>
                    <UtensilsCrossed className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-purple-400 font-mono">
                    {tableOccupancyRate}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {occupiedTables} من {tables.length} ترابيزة مشغولة الآن
                  </div>
                </div>
              ) : (
                // Abu Adel Only: Finished Goods Inventory
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>أصناف حلويات المخزن الجاهزة</span>
                    <Cake className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {pastryInventory.length || 230}{" "}
                    <span className="text-xs text-slate-400 font-normal">صنف</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    جاهزة للبيع المباشر والوزن والدليفري
                  </div>
                </div>
              )}

              {/* CARD 3: Contextual Secondary Card */}
              {isViewingAll ? (
                // Owner viewing ALL: Abu Adel Revenue
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>إيرادات حلواني أبو عادل</span>
                    <Cake className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {abuAdelSales.toLocaleString()}{" "}
                    <span className="text-xs text-slate-400 font-normal">ج.م</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    حلويات شرقية، تورت وبوكسات هدايا
                  </div>
                </div>
              ) : isViewingSoulmate ? (
                // Soulmate Only: Orders Breakdown
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>مبيعات الصالة والدليفري</span>
                    <Receipt className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {orders.filter((o) => o.outlet?.code === "SOULMATE_CAFE" || o.outletId === outlets.find((x) => x.code === "SOULMATE_CAFE")?.id).length}{" "}
                    <span className="text-xs text-slate-400 font-normal">طلب</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    شيكات مفتوحة ومسددة بالوردية
                  </div>
                </div>
              ) : (
                // Abu Adel Only: Orders Breakdown
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>طلبات البيع المباشر والدليفري</span>
                    <Receipt className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {orders.filter((o) => o.outlet?.code === "ABU_ADEL_PATISSERIE" || o.outletId === outlets.find((x) => x.code === "ABU_ADEL_PATISSERIE")?.id).length}{" "}
                    <span className="text-xs text-slate-400 font-normal">طلب</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    بيع كاونتر مباشر + توصيل خارجي
                  </div>
                </div>
              )}

              {/* CARD 4: Contextual Fourth Card */}
              {isViewingAll ? (
                // Owner viewing ALL: Table Occupancy
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>إشغال ترابيزات الكافيه</span>
                    <UtensilsCrossed className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-purple-400 font-mono">
                    {tableOccupancyRate}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {occupiedTables} من {tables.length} ترابيزة مشغولة الآن
                  </div>
                </div>
              ) : (
                // Branch Managers (Both Soulmate & Abu Adel): Safe / Drawer Cash
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>نقدية الدرج المتوقعة للوردية</span>
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {(shiftData?.liveStats?.expectedCash ?? shiftData?.expectedCash ?? 0).toLocaleString()}{" "}
                    <span className="text-xs text-slate-400 font-normal">ج.م</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    فكة + كاش مسدد - نثريات منصرفة
                  </div>
                </div>
              )}
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

                  {(isViewingAll || isViewingSoulmate) && (
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
                  )}

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

        {/* TAB 2: TREASURY, FINANCIAL BI & BUSINESS INTELLIGENCE */}
        {activeTab === "treasury" && (
          <div className="space-y-6">
            {/* TOP CONTROLS & SUB-NAV BAR */}
            <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Sub-Tabs Navigation Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                  <button
                    onClick={() => setTreasurySubTab("drawer")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                      treasurySubTab === "drawer"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>الوردية والدرج المباشر</span>
                  </button>

                  <button
                    onClick={() => setTreasurySubTab("pnl")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                      treasurySubTab === "pnl"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>قائمة الدخل والأرباح (P&L)</span>
                  </button>

                  <button
                    onClick={() => setTreasurySubTab("menu_eng")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                      treasurySubTab === "menu_eng"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>هندسة المنيو والأكثر طلباً</span>
                  </button>

                  <button
                    onClick={() => setTreasurySubTab("payments")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                      treasurySubTab === "payments"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>قنوات التحصيل ونقاط البيع</span>
                  </button>

                  <button
                    onClick={() => setTreasurySubTab("archive")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                      treasurySubTab === "archive"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>أرشيف اليوميات Z-Report</span>
                  </button>
                </div>

                {/* Filters & Export Actions Bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Timeframe Selector */}
                  <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
                    <button
                      onClick={() => setReportTimeframe("TODAY")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        reportTimeframe === "TODAY"
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      اليوم
                    </button>
                    <button
                      onClick={() => setReportTimeframe("WEEK")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        reportTimeframe === "WEEK"
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      7 أيام
                    </button>
                    <button
                      onClick={() => setReportTimeframe("MONTH")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        reportTimeframe === "MONTH"
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      هذا الشهر
                    </button>
                    <button
                      onClick={() => setReportTimeframe("ALL")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        reportTimeframe === "ALL"
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      الكل
                    </button>
                  </div>

                  {/* Outlet Selector (Maestro has dropdown, Branch Managers are locked to their branch) */}
                  {isOwner ? (
                    <select
                      value={reportOutletFilter}
                      onChange={(e) => setReportOutletFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:border-amber-500 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">🌟 كافة الفروع (مجمّع)</option>
                      {outlets.map((ot) => (
                        <option key={ot.id} value={ot.id}>
                          {ot.code === "SOULMATE_CAFE" ? "☕ " : "🍰 "}
                          {ot.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 text-amber-400 text-xs rounded-xl px-3 py-1.5 font-black flex items-center gap-1.5">
                      {isUserSoulmate ? "☕ سول ميت كافيه VIP" : "🍰 حلواني أبو عادل"}
                    </div>
                  )}

                  {/* Export CSV Button */}
                  <button
                    onClick={handleExportFinancialCSV}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-md transition"
                    title="تصدير شيت إكسل CSV مالي متكامل مع دعم اللغة العربية"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إكسل CSV</span>
                  </button>

                  {/* Print Report Button */}
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-700 shadow-md transition"
                    title="طباعة التقرير المالي الحالي"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">طباعة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 1. SUB-TAB: DRAWER & LIVE SHIFT */}
            {treasurySubTab === "drawer" && (
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
                          (وردية #{shiftData?.openShift?.shiftNumber || shiftData?.shift?.shiftNumber || 1})
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white">
                        الكاشير المسؤول: {shiftData?.openShift?.openedBy || shiftData?.shift?.openedBy || "كاشير الوردية"}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        بدأت في: {new Date(shiftData?.openShift?.openedAt || shiftData?.shift?.openedAt || Date.now()).toLocaleTimeString("ar-EG")}
                      </p>
                    </div>

                    <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-4 px-6 text-center shadow-inner">
                      <div className="text-xs text-slate-400 font-medium mb-1">
                        صافي النقدية المتوقعة بالدرج الآن
                      </div>
                      <div className="text-3xl font-black text-amber-400 font-mono">
                        {(shiftData?.liveStats?.expectedCash ?? shiftData?.expectedCash ?? 0).toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                        <span>
                          (عهدة فكة بداية الوردية: <strong className="text-white font-mono">{shiftData?.openShift?.openingCashFloat ?? shiftData?.shift?.openingCashFloat ?? 0}</strong> ج.م + كاش مبيعات - نثريات)
                        </span>
                        {(shiftData?.openShift?.id || shiftData?.shift?.id) && !editingAdminFloat && (
                          <button
                            type="button"
                            onClick={() => {
                              setAdminFloatInput(String(shiftData?.openShift?.openingCashFloat ?? shiftData?.shift?.openingCashFloat ?? 0));
                              setEditingAdminFloat(true);
                            }}
                            className="text-amber-400 hover:text-amber-300 underline font-bold"
                          >
                            ✏️ تعديل العهدة
                          </button>
                        )}
                      </div>
                      {editingAdminFloat && (shiftData?.openShift?.id || shiftData?.shift?.id) && (
                        <div className="mt-2 flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={adminFloatInput}
                            onChange={(e) => setAdminFloatInput(e.target.value)}
                            className="w-24 bg-slate-900 border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                          />
                          <button
                            type="button"
                            disabled={savingAdminFloat}
                            onClick={() => handleUpdateAdminOpeningFloat(shiftData?.openShift?.id || shiftData?.shift?.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-black"
                          >
                            {savingAdminFloat ? "..." : "حفظ"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAdminFloat(false)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">مقبوضات كاش (المحل)</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                        {(shiftData?.liveStats?.cashCollected ?? shiftData?.cashCollected ?? 0).toLocaleString()} ج.م
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">فيزا / كروت (المحل)</div>
                      <div className="text-lg font-bold text-blue-400 font-mono mt-1">
                        {(shiftData?.liveStats?.visaCollected ?? shiftData?.visaCollected ?? 0).toLocaleString()} ج.م
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">إنستاباي (المحل)</div>
                      <div className="text-lg font-bold text-purple-400 font-mono mt-1">
                        {(shiftData?.liveStats?.instapayCollected ?? shiftData?.instapayCollected ?? 0).toLocaleString()} ج.م
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">فودافون كاش (المحل)</div>
                      <div className="text-lg font-bold text-pink-400 font-mono mt-1">
                        {(shiftData?.liveStats?.vodafoneCollected ?? shiftData?.vodafoneCollected ?? 0).toLocaleString()} ج.م
                      </div>
                    </div>

                    <div className="bg-orange-950/25 p-3 rounded-xl border border-orange-500/30">
                      <div className="text-[11px] text-orange-300 font-bold">🟠 طلبات (Talabat - خارج الدرج)</div>
                      <div className="text-lg font-black text-orange-400 font-mono mt-1">
                        {(shiftData?.liveStats?.talabatCollected ?? shiftData?.talabatCollected ?? 0).toLocaleString()} ج.م
                      </div>
                      {(shiftData?.liveStats?.talabatCommission ?? shiftData?.talabatCommission ?? 0) > 0 && (
                        <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                          عمولة: -{Number(shiftData?.liveStats?.talabatCommission ?? shiftData?.talabatCommission ?? 0).toFixed(0)} | صافي: {Number((shiftData?.liveStats?.talabatNetReceivable ?? ((shiftData?.talabatCollected || 0) - (shiftData?.talabatCommission || 0))) || 0).toFixed(0)} ج
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">المصروفات والنثريات</div>
                      <div className="text-lg font-bold text-rose-400 font-mono mt-1">
                        {(shiftData?.liveStats?.expensesTotal ?? shiftData?.expensesTotal ?? 0).toLocaleString()} ج.م
                      </div>
                    </div>

                    <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30">
                      <div className="text-[11px] text-sky-300 font-bold">🛵 رسوم الدليفري (للطيارين)</div>
                      <div className="text-lg font-black text-sky-400 font-mono mt-1">
                        {(shiftData?.liveStats?.deliveryFeesTotal ?? shiftData?.deliveryFeesTotal ?? 0).toLocaleString()} ج.م
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">مفصولة عن إيراد المحل</div>
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
                        {expenses
                          .filter((exp) => {
                            if (isUserSoulmate && exp.outlet?.code !== "SOULMATE_CAFE" && exp.outletId !== outlets.find((x) => x.code === "SOULMATE_CAFE")?.id) return false;
                            if (isUserAbuAdel && exp.outlet?.code !== "ABU_ADEL_PATISSERIE" && exp.outletId !== outlets.find((x) => x.code === "ABU_ADEL_PATISSERIE")?.id) return false;
                            if (selectedOutletId !== "ALL" && exp.outletId !== selectedOutletId) return false;
                            return true;
                          })
                          .map((exp) => (
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

            {/* 2. SUB-TAB: P&L (PROFIT & LOSS STATEMENT) */}
            {treasurySubTab === "pnl" && (
              <div className="space-y-6">
                {/* 5 Executive KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                  {/* Revenue */}
                  <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-2 left-2 text-emerald-500/20">
                      <TrendingUp className="w-12 h-12" />
                    </div>
                    <div className="text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                      <span>إجمالي المبيعات (Revenue)</span>
                    </div>
                    <div className="text-2xl font-black text-white font-mono">
                      {filteredReportData.totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {filteredReportData.ordersCount} طلب مكتمل ومسدد
                    </div>
                  </div>

                  {/* COGS */}
                  <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-2 left-2 text-amber-500/20">
                      <Boxes className="w-12 h-12" />
                    </div>
                    <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1">
                      <span>تكلفة الخامات (COGS)</span>
                    </div>
                    <div className="text-2xl font-black text-white font-mono">
                      {filteredReportData.totalCOGS.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {filteredReportData.totalRevenue > 0
                        ? ((filteredReportData.totalCOGS / filteredReportData.totalRevenue) * 100).toFixed(1)
                        : "0.0"}% من قيمة المبيعات
                    </div>
                  </div>

                  {/* Gross Profit */}
                  <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-2 left-2 text-sky-500/20">
                      <Award className="w-12 h-12" />
                    </div>
                    <div className="text-[11px] font-bold text-sky-400 mb-1 flex items-center gap-1">
                      <span>مجمل الربح (Gross Profit)</span>
                    </div>
                    <div className="text-2xl font-black text-sky-400 font-mono">
                      {filteredReportData.grossProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                    </div>
                    <div className="text-[10px] text-sky-300 font-bold mt-1">
                      هامش مجمل: {filteredReportData.grossProfitMargin.toFixed(1)}%
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-2 left-2 text-rose-500/20">
                      <ArrowDownLeft className="w-12 h-12" />
                    </div>
                    <div className="text-[11px] font-bold text-rose-400 mb-1 flex items-center gap-1">
                      <span>المصروفات والنثريات</span>
                    </div>
                    <div className="text-2xl font-black text-rose-400 font-mono">
                      {filteredReportData.totalExpensesAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {filteredReportData.filteredExpenses.length} حركة صرف مسجلة
                    </div>
                  </div>

                  {/* Net Operating Profit */}
                  <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-xl relative overflow-hidden col-span-2 md:col-span-1">
                    <div className="absolute top-2 left-2 text-emerald-400/20">
                      <Sparkles className="w-12 h-12" />
                    </div>
                    <div className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1">
                      <span>صافي الربح الفعلي (Net)</span>
                    </div>
                    <div className={`text-2xl font-black font-mono ${filteredReportData.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {filteredReportData.netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                    </div>
                    <div className="text-[10px] text-emerald-300 font-bold mt-1">
                      هامش صافي: {filteredReportData.netProfitMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* 2-Column Section: P&L Statement & Branch Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left (2 cols): Official P&L Statement */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-amber-400" />
                          <span>قائمة الدخل والأرباح التشغيلية الشاملة</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          تحليل تفصيلي لمصادر الإيرادات وتكلفة الخامات ومجمل وصافي الربح للفترة المحددة.
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 font-mono">
                        {reportTimeframe === "TODAY" ? "اليوم" : reportTimeframe === "WEEK" ? "7 أيام" : reportTimeframe === "MONTH" ? "هذا الشهر" : "الكل"}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Subtotal */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-slate-500 font-mono">1.</span>
                          <span>إجمالي مبيعات الأصناف (Gross Subtotal)</span>
                        </div>
                        <div className="font-mono font-bold text-slate-200">
                          {filteredReportData.totalSubtotal.toFixed(2)} ج.م
                        </div>
                      </div>

                      {/* Discounts */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2 text-rose-400">
                          <span className="text-slate-500 font-mono">2.</span>
                          <span>(-) الخصومات والعروض الترويجية الممنوحة</span>
                        </div>
                        <div className="font-mono font-bold text-rose-400">
                          - {filteredReportData.totalDiscount.toFixed(2)} ج.م
                        </div>
                      </div>

                      {/* Tips */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-slate-500 font-mono">3.</span>
                          <span>(+) إكراميات وتيبس الباريستا</span>
                        </div>
                        <div className="font-mono font-bold text-slate-300">
                          + {filteredReportData.totalTips.toFixed(2)} ج.م
                        </div>
                      </div>

                      {/* Net Revenue (Store Only) */}
                      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                        <div>
                          <div className="flex items-center gap-2 font-black text-emerald-400 text-sm">
                            <span>(=) صافي إيرادات مبيعات المحل الفعلية (Net Store Revenue)</span>
                          </div>
                          <div className="text-[10px] text-emerald-300/80 mt-0.5">
                            تم فصل رسوم الدليفري بالكامل لأنها مستحق مالي خاص بعمال التوصيل فقط
                          </div>
                        </div>
                        <div className="font-mono font-black text-emerald-400 text-base">
                          {filteredReportData.totalRevenue.toFixed(2)} ج.م
                        </div>
                      </div>

                      {/* Separated Driver Delivery Fees Info Row */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-sky-950/30 border border-sky-500/30">
                        <div className="flex items-center gap-2 text-sky-300">
                          <Truck className="w-3.5 h-3.5 text-sky-400" />
                          <span>مذكرة: إجمالي رسوم التوصيل المحصلة لصالح الطيارين (خارج إيراد المحل)</span>
                        </div>
                        <div className="font-mono font-bold text-sky-300">
                          {filteredReportData.totalDeliveryFees.toFixed(2)} ج.م
                        </div>
                      </div>

                      {filteredReportData.upcomingScheduledCount > 0 && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                          <div className="flex items-center gap-2 text-amber-300">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>حجوزات قادمة ({filteredReportData.upcomingScheduledCount} حجز بقيمة {filteredReportData.upcomingPreOrdersValue.toFixed(0)} ج) — عربون مؤكد:</span>
                          </div>
                          <div className="font-mono font-bold text-amber-300">
                            {filteredReportData.confirmedDepositsCollected.toFixed(2)} ج.م
                          </div>
                        </div>
                      )}

                      {/* COGS */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2 text-amber-400">
                          <span className="text-slate-500 font-mono">5.</span>
                          <span>(-) تكلفة الخامات ومكونات الإنتاج التقديرية (COGS)</span>
                        </div>
                        <div className="font-mono font-bold text-amber-400">
                          - {filteredReportData.totalCOGS.toFixed(2)} ج.م
                        </div>
                      </div>

                      {/* Gross Profit */}
                      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-sky-950/40 border border-sky-500/40">
                        <div>
                          <div className="font-black text-sky-400 text-sm">
                            (=) مجمل الربح الإجمالي للنشاط (Gross Profit)
                          </div>
                          <div className="text-[10px] text-sky-300 mt-0.5">
                            هامش مجمل ربح المبيعات: {filteredReportData.grossProfitMargin.toFixed(1)}%
                          </div>
                        </div>
                        <div className="font-mono font-black text-sky-400 text-base">
                          {filteredReportData.grossProfit.toFixed(2)} ج.م
                        </div>
                      </div>

                      {/* OPEX */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2 text-rose-400">
                          <span className="text-slate-500 font-mono">6.</span>
                          <span>(-) المصروفات والنثريات التشغيلية واليومية المنصرفة</span>
                        </div>
                        <div className="font-mono font-bold text-rose-400">
                          - {filteredReportData.totalExpensesAmount.toFixed(2)} ج.م
                        </div>
                      </div>

                      {filteredReportData.totalTalabatGross > 0 && (
                        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-orange-950/30 border border-orange-500/40">
                          <div>
                            <div className="flex items-center gap-2 text-orange-300 font-bold">
                              <span className="text-slate-500 font-mono">7.</span>
                              <span>(-) عمولة تطبيق طلبات / Talabat ({settings?.talabatCommissionPercent ?? 25}%)</span>
                            </div>
                            <div className="text-[10px] text-emerald-300 mt-0.5 font-mono">
                              إجمالي طلبات: {filteredReportData.totalTalabatGross.toFixed(2)} ج.م • صافي المستحق للتحصيل من الشركة: {filteredReportData.totalTalabatNet.toFixed(2)} ج.م (لا يدخل درج الكاشير)
                            </div>
                          </div>
                          <div className="font-mono font-bold text-orange-400">
                            - {filteredReportData.totalTalabatCommission.toFixed(2)} ج.م
                          </div>
                        </div>
                      )}

                      {/* Net Operating Profit */}
                      <div className="flex items-center justify-between py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-950 to-emerald-950/80 border-2 border-emerald-500/60 shadow-lg">
                        <div>
                          <div className="font-black text-emerald-300 text-base flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>(🏆) صافي الربح التشغيلي النهائي (Net Profit)</span>
                          </div>
                          <div className="text-xs text-emerald-400 font-bold mt-0.5">
                            هامش صافي الربح الفعلي: {filteredReportData.netProfitMargin.toFixed(1)}%
                          </div>
                        </div>
                        <div className={`font-mono font-black text-xl ${filteredReportData.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {filteredReportData.netProfit.toFixed(2)} ج.م
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right (1 col): Branch Comparison or Dedicated Branch Performance Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      {isViewingAll ? (
                        <>
                          <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
                            <PieChart className="w-5 h-5 text-purple-400" />
                            <span>مقارنة أداء ومساهمة المحلين</span>
                          </h3>
                          <p className="text-xs text-slate-400 mb-6">
                            توزيع المبيعات والمصروفات بين سول ميت كافيه وحلواني أبو عادل.
                          </p>

                          {/* Soulmate Cafe Card */}
                          <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-amber-400 text-xs flex items-center gap-1.5">
                                <span>☕ سول ميت كافيه VIP</span>
                              </span>
                              <span className="text-[11px] font-bold text-amber-300 font-mono">
                                {filteredReportData.totalRevenue > 0
                                  ? ((filteredReportData.soulmateRevenue / filteredReportData.totalRevenue) * 100).toFixed(1)
                                  : "0.0"}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
                              <div
                                className="bg-gradient-to-r from-amber-600 to-amber-400 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    filteredReportData.totalRevenue > 0
                                      ? Math.min(100, (filteredReportData.soulmateRevenue / filteredReportData.totalRevenue) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="bg-slate-900/80 p-2 rounded-lg">
                                <span className="text-slate-400 block text-[10px]">المبيعات:</span>
                                <span className="font-bold font-mono text-emerald-400">
                                  {filteredReportData.soulmateRevenue.toLocaleString()} ج.م
                                </span>
                              </div>
                              <div className="bg-slate-900/80 p-2 rounded-lg">
                                <span className="text-slate-400 block text-[10px]">المصروفات:</span>
                                <span className="font-bold font-mono text-rose-400">
                                  {filteredReportData.soulmateExpenses.toLocaleString()} ج.م
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Abu Adel Sweets Card */}
                          <div className="bg-slate-950/70 border border-rose-500/30 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-rose-400 text-xs flex items-center gap-1.5">
                                <span>🍰 حلواني أبو عادل</span>
                              </span>
                              <span className="text-[11px] font-bold text-rose-300 font-mono">
                                {filteredReportData.totalRevenue > 0
                                  ? ((filteredReportData.abuAdelRevenue / filteredReportData.totalRevenue) * 100).toFixed(1)
                                  : "0.0"}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
                              <div
                                className="bg-gradient-to-r from-rose-600 to-rose-400 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    filteredReportData.totalRevenue > 0
                                      ? Math.min(100, (filteredReportData.abuAdelRevenue / filteredReportData.totalRevenue) * 100)
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="bg-slate-900/80 p-2 rounded-lg">
                                <span className="text-slate-400 block text-[10px]">المبيعات:</span>
                                <span className="font-bold font-mono text-emerald-400">
                                  {filteredReportData.abuAdelRevenue.toLocaleString()} ج.م
                                </span>
                              </div>
                              <div className="bg-slate-900/80 p-2 rounded-lg">
                                <span className="text-slate-400 block text-[10px]">المصروفات:</span>
                                <span className="font-bold font-mono text-rose-400">
                                  {filteredReportData.abuAdelExpenses.toLocaleString()} ج.م
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
                            {isViewingSoulmate ? (
                              <Coffee className="w-5 h-5 text-amber-400" />
                            ) : (
                              <Cake className="w-5 h-5 text-rose-400" />
                            )}
                            <span>
                              {isViewingSoulmate ? "ملخص أداء سول ميت كافيه VIP" : "ملخص أداء حلواني أبو عادل"}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-400 mb-6">
                            تقرير الأداء والتحصيل المالي الحصري للفرع.
                          </p>

                          <div className="space-y-3">
                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-slate-300">مبيعات الفرع المحصلة:</span>
                              <span className="font-mono font-bold text-emerald-400 text-sm">
                                {filteredReportData.totalRevenue.toLocaleString()} ج.م
                              </span>
                            </div>

                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-slate-300">تكلفة الخامات والمبيعات:</span>
                              <span className="font-mono font-bold text-amber-400 text-sm">
                                {filteredReportData.totalCOGS.toLocaleString()} ج.م
                              </span>
                            </div>

                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-slate-300">نثريات ومصروفات الفرع:</span>
                              <span className="font-mono font-bold text-rose-400 text-sm">
                                {filteredReportData.totalExpensesAmount.toLocaleString()} ج.م
                              </span>
                            </div>

                            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs text-slate-300">صافي أرباح الفرع:</span>
                              <span className="font-mono font-black text-emerald-400 text-base">
                                {filteredReportData.netProfit.toLocaleString()} ج.م
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-6 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                      💡 <strong className="text-amber-400">ملحوظة ذكية:</strong> تم ربط تكلفة المبيعات (COGS) تلقائياً بمكونات ريسيبي البار بسول ميت وتكلفة الإنتاج والشراء بحلواني أبو عادل لتحقيق دقة محاسبية متناهية.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SUB-TAB: MENU ENGINEERING & BEST SELLERS */}
            {treasurySubTab === "menu_eng" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <span>هندسة المنيو والأصناف الأكثر طلباً وربحية (Menu Engineering)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        تحليل الأصناف الرابحة (Stars)، الأكثر طلباً بالكمية، والأعلى تحقيقاً للإيرادات وهوامش الأرباح.
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                      إجمالي الأصناف المباعة: {filteredReportData.itemsList.length} صنف
                    </span>
                  </div>
                </div>

                {filteredReportData.itemsList.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
                    <p className="font-bold text-slate-300">لم يتم تسجيل مبيعات أصناف في الفترة أو المنفذ المحدد حالياً</p>
                    <p className="text-xs mt-1 text-slate-500">قم بتوسيع نطاق الفترة إلى (كافة الفترات) أو تسجيل طلبات جديدة من شاشة الكاشير.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top by Qty */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                        <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                          <span>🔥 الأكثر طلباً ومبيعاً (بالكمية)</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">توب 8 أصناف</span>
                      </div>
                      <div className="space-y-3">
                        {filteredReportData.topByQty.map((item, idx) => {
                          const maxQty = filteredReportData.topByQty[0]?.qty || 1;
                          const pct = Math.round((item.qty / maxQty) * 100);
                          return (
                            <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    idx === 0 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-white truncate max-w-[140px]">{item.nameAr}</span>
                                </div>
                                <span className="font-mono font-bold text-amber-400">{item.qty} قطعة</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                <span>{item.category}</span>
                                <span className="font-mono text-emerald-400">{item.totalRevenue.toFixed(0)} ج.م</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top by Revenue */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                        <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                          <span>💰 الأعلى إيراداً (حجم المبيعات)</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">توب 8 أصناف</span>
                      </div>
                      <div className="space-y-3">
                        {filteredReportData.topByRevenue.map((item, idx) => {
                          const maxRev = filteredReportData.topByRevenue[0]?.totalRevenue || 1;
                          const pct = Math.round((item.totalRevenue / maxRev) * 100);
                          return (
                            <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    idx === 0 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-white truncate max-w-[140px]">{item.nameAr}</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-400">{item.totalRevenue.toFixed(0)} ج.م</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                <span>بيع: {item.unitPrice} ج.م</span>
                                <span className="font-mono text-slate-300">{item.qty} مبيعات</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top by Profit Margin */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                        <h4 className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                          <span>✨ الأعلى ربحية ومساهمة صافية</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">توب 8 أصناف</span>
                      </div>
                      <div className="space-y-3">
                        {filteredReportData.topByProfit.map((item, idx) => {
                          const maxProfit = filteredReportData.topByProfit[0]?.profit || 1;
                          const pct = Math.max(0, Math.round((item.profit / maxProfit) * 100));
                          const marginPct = item.totalRevenue > 0 ? Math.round((item.profit / item.totalRevenue) * 100) : 0;
                          return (
                            <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    idx === 0 ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-white truncate max-w-[140px]">{item.nameAr}</span>
                                </div>
                                <span className="font-mono font-bold text-sky-400">+{item.profit.toFixed(0)} ج.م</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                <span>تكلفة: {item.costPrice.toFixed(1)} ج.م</span>
                                <span className="font-bold text-sky-300">هامش {marginPct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. SUB-TAB: PAYMENTS & CHANNELS */}
            {treasurySubTab === "payments" && (
              <div className="space-y-6">
                {/* 4 Payment Methods Cards */}
                <div>
                  <h3 className="text-sm font-black text-slate-200 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>توزيع مقبوضات المبيعات حسب طريقة الدفع</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(filteredReportData.paymentMethods).map(([key, pm]) => {
                      const sharePct = filteredReportData.totalRevenue > 0
                        ? ((pm.amount / filteredReportData.totalRevenue) * 100).toFixed(1)
                        : "0.0";
                      return (
                        <div key={key} className={`rounded-2xl p-4 border bg-slate-900 ${pm.border} shadow-lg relative overflow-hidden`}>
                          <div className="text-xs font-bold text-slate-300 mb-1">{pm.label}</div>
                          <div className={`text-2xl font-black font-mono ${pm.color} my-1`}>
                            {pm.amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                            <span>{pm.count} طلب مسدد</span>
                            <span className="font-bold font-mono text-white">{sharePct}% من الإجمالي</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sales Channels & Operational Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Channels */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <h3 className="text-sm font-black text-slate-200 mb-4 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-purple-400" />
                      <span>قنوات ونوافذ البيع والتشغيل</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {Object.entries(filteredReportData.orderTypes).map(([key, ot]) => {
                        const share = filteredReportData.totalRevenue > 0
                          ? ((ot.amount / filteredReportData.totalRevenue) * 100).toFixed(1)
                          : "0.0";
                        return (
                          <div key={key} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-center">
                            <div className="text-xs font-bold text-slate-300 mb-1">{ot.label}</div>
                            <div className="text-xl font-black text-amber-400 font-mono my-1">
                              {ot.amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-2">
                              {ot.count} طلبات ({share}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Metrics */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <h3 className="text-sm font-black text-slate-200 mb-4 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-emerald-400" />
                      <span>المؤشرات التشغيلية للمبيعات</span>
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400">متوسط قيمة الفاتورة (AOV):</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {filteredReportData.averageOrderValue.toFixed(1)} ج.م
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400">إجمالي الخصومات الممنوحة:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {filteredReportData.totalDiscount.toFixed(1)} ج.م
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400">إكراميات وتيبس الباريستا:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {filteredReportData.totalTips.toFixed(1)} ج.م
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30">
                        <span className="text-sky-300 font-bold">🛵 رسوم التوصيل (مستحق الطيارين — خارج الإيراد):</span>
                        <span className="font-mono font-black text-sky-400">
                          {filteredReportData.totalDeliveryFees.toFixed(1)} ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Drivers Dues & Reconciliation Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Truck className="w-4 h-4 text-sky-400" />
                        <span>حسابات ومستحقات عمال التوصيل / الطيارين (مفصولة عن إيراد المحل)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        يوضح مستحقات كل طيار من رسوم التوصيل مقابل صافي الكاش المطلوب توريده لخزينة المحل
                      </p>
                    </div>
                  </div>
                  {drivers.length === 0 ? (
                    <div className="text-xs text-slate-500 py-6 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                      لم تتم إضافة طيارين بعد — أضف بيانات الطيارين (الاسم والموبايل) من تبويب سجل الطلبات والدليفري
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">اسم الطيار</th>
                            <th className="py-2.5 px-3">رقم الموبايل</th>
                            <th className="py-2.5 px-3">الرحلات (الكل / نشط)</th>
                            <th className="py-2.5 px-3 text-sky-400">مستحق التوصيل للطيار 🛵</th>
                            <th className="py-2.5 px-3 text-emerald-400">صافي المبيعات المطلوب للمحل 💰</th>
                            <th className="py-2.5 px-3">إجمالي التحصيل من العملاء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-mono">
                          {drivers.map((drv) => (
                            <tr key={drv.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-sans font-bold text-white">{drv.name}</td>
                              <td className="py-2.5 px-3 text-amber-300">{drv.phone}</td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {drv.stats?.totalTrips ?? 0} طلب
                                {Number(drv.stats?.activeOrdersCount) > 0 && (
                                  <span className="mr-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans">
                                    {drv.stats.activeOrdersCount} بالطريق
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-black text-sky-400">
                                {(drv.stats?.totalDeliveryFeesDue ?? 0).toLocaleString()} ج.م
                              </td>
                              <td className="py-2.5 px-3 font-black text-emerald-400">
                                {(drv.stats?.storeNetFromDriver ?? 0).toLocaleString()} ج.م
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {(drv.stats?.totalCashToCollectFromCustomer ?? 0).toLocaleString()} ج.م
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. SUB-TAB: ARCHIVE & Z-REPORTS */}
            {treasurySubTab === "archive" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span>أرشيف إقفالات اليوميات والورديات السابقة (Z-Reports Ledger)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        سجل معتمد لكافة الإقفالات اليومية وتوريدات الخزينة والتسويات المالية.
                      </p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition self-start md:self-auto"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة شيت الإقفال المالي Z-Report</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">تاريخ اليومية</th>
                          <th className="py-2.5 px-3">الفرع</th>
                          <th className="py-2.5 px-3">إجمالي المبيعات</th>
                          <th className="py-2.5 px-3">كاش الدرج</th>
                          <th className="py-2.5 px-3">كروت وإنستاباي</th>
                          <th className="py-2.5 px-3">المصروفات</th>
                          <th className="py-2.5 px-3">صافي التوريد</th>
                          <th className="py-2.5 px-3">المسؤول</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(!shiftData?.dailyCloses || shiftData.dailyCloses.length === 0) ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                              <div className="font-bold text-slate-300">لا توجد إقفالات يومية مؤرشفة مسجلة بعد</div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                يتم حفظ تقرير اليومية الشامل (Z-Report) تلقائياً عند إقفال الوردية المسائية من شاشة الكاشير.
                              </div>
                            </td>
                          </tr>
                        ) : (
                          shiftData.dailyCloses.map((dc: any) => (
                            <tr key={dc.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-bold text-white font-mono">
                                {new Date(dc.closeDate).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {dc.outlet?.name || "كافة الفروع"}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-400 font-mono">
                                {dc.totalSales?.toLocaleString() || 0} ج.م
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-200">
                                {dc.cashTotal?.toLocaleString() || 0} ج.م
                              </td>
                              <td className="py-2.5 px-3 font-mono text-blue-400">
                                {(dc.cardTotal || 0) + (dc.instapayTotal || 0)} ج.م
                              </td>
                              <td className="py-2.5 px-3 font-mono text-rose-400">
                                {dc.expensesTotal?.toLocaleString() || 0} ج.م
                              </td>
                              <td className="py-2.5 px-3 font-bold text-amber-400 font-mono">
                                {dc.netSafeDeposit?.toLocaleString() || 0} ج.م
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{dc.closedBy || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
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
                      stockQty: "0",
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
                            ? "/products/nawaem-mix-real.webp"
                            : "/products/cafe-cappuccino.webp";
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
                            <td className="py-2.5 px-3">
                              {item.itemType === "PREPARED_BEVERAGE" ||
                              ["HOT_DRINKS", "ICE_COFFEE", "FRAPPE", "MOJITO", "SMOOTHIE", "PANCAKE", "EXTRA"].includes(item.category) ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                    <Coffee className="w-3 h-3 text-amber-400" />
                                    <span>تحضير فوري (بالريسيبي)</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1 whitespace-nowrap">
                                    <span>🧪</span>
                                    <span>
                                      {item.recipes && item.recipes.length > 0
                                        ? `${item.recipes.length} خامات بالريسيبي`
                                        : "يخصم من خامات البار"}
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span
                                    className={`font-mono font-bold text-xs ${
                                      (item.stockQty ?? 0) <= (item.minStockAlert || 10)
                                        ? "text-rose-400 font-black"
                                        : "text-slate-200"
                                    }`}
                                  >
                                    {item.stockQty ?? 0}{" "}
                                    <span className="text-[10px] font-sans text-slate-400">
                                      {item.unitType === "KG"
                                        ? "كجم"
                                        : item.category === "SOFT_DRINKS"
                                        ? "كانز/زجاجة"
                                        : "قطعة"}
                                    </span>
                                  </span>
                                  {(item.stockQty ?? 0) <= (item.minStockAlert || 10) && (
                                    <span className="text-[9px] text-rose-400 font-bold flex items-center gap-0.5">
                                      ⚠️ نواقص بالمخزن
                                    </span>
                                  )}
                                </div>
                              )}
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
                                      itemType:
                                        item.itemType ||
                                        (["HOT_DRINKS", "ICE_COFFEE", "FRAPPE", "MOJITO", "SMOOTHIE", "PANCAKE", "EXTRA"].includes(item.category)
                                          ? "PREPARED_BEVERAGE"
                                          : "READY_PASTRY"),
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

                <AdminBulkRawPriceEditor
                  rawMaterials={rawMaterials}
                  onRefresh={fetchDashboardData}
                  onToast={addToast}
                />

                {rawMaterials.some((r) => r.reorderUrgent) && (
                  <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="font-black text-rose-300 mb-1">
                          تنبيه توريد مبكر لخامات المصنع (مهلة التصنيع والتوريد)!
                        </h4>
                        <p className="text-slate-200 leading-relaxed">
                          الأصناف التالية دخلت منطقة التوريد المسبق (مثل الأكواب الكرتون التي تحتاج 21 يوم / 3 أسابيع قبل نفاد الرصيد):{" "}
                          <strong className="text-amber-300">
                            {rawMaterials
                              .filter((r) => r.reorderUrgent)
                              .map((r) => `${r.nameAr} (مهلة ${r.leadTimeDays || 3} يوم)`)
                              .join(" • ")}
                          </strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("suppliers")}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black whitespace-nowrap"
                    >
                      شاشة المصنع والموردين 🏭
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rawMaterials.map((raw) => {
                    const isLow = Boolean(raw.reorderUrgent) || raw.currentStock <= raw.minStockAlert;
                    const leadDraft = editingRawLeadMap[raw.id];
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
                                وحدة: {unitLabel} • مهلة: {raw.leadTimeDays || 3} يوم
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isLow ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{raw.reorderUrgent ? "اطلب الآن!" : "نواقص"}</span>
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
                              <span className="text-slate-400 block text-[10px]">يكفي تقريباً:</span>
                              <span className={`font-mono font-black ${isLow ? "text-rose-400" : "text-amber-400"}`}>
                                {raw.daysRemaining !== null && raw.daysRemaining !== undefined
                                  ? `${raw.daysRemaining} يوم`
                                  : `حد ${(raw.minStockAlert || 0).toLocaleString()}`}
                              </span>
                            </div>
                          </div>

                          {/* Inline Lead Time & Min Alert Editor */}
                          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-2 mb-2 text-[10px] space-y-1.5">
                            {leadDraft ? (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-3 gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={leadDraft.leadTimeDays}
                                    onChange={(e) =>
                                      setEditingRawLeadMap((prev) => ({
                                        ...prev,
                                        [raw.id]: { ...leadDraft, leadTimeDays: e.target.value },
                                      }))
                                    }
                                    placeholder="مهلة (يوم)"
                                    title="مهلة التوريد (أيام)"
                                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={leadDraft.avgDailyUsage}
                                    onChange={(e) =>
                                      setEditingRawLeadMap((prev) => ({
                                        ...prev,
                                        [raw.id]: { ...leadDraft, avgDailyUsage: e.target.value },
                                      }))
                                    }
                                    placeholder="استهلاك/يوم"
                                    title="الاستهلاك اليومي التقديري"
                                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center text-white font-mono"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={leadDraft.minStockAlert}
                                    onChange={(e) =>
                                      setEditingRawLeadMap((prev) => ({
                                        ...prev,
                                        [raw.id]: { ...leadDraft, minStockAlert: e.target.value },
                                      }))
                                    }
                                    placeholder="حد الأمان"
                                    title="حد الأمان / إعادة الطلب"
                                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center text-white font-mono"
                                  />
                                </div>
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingRawLeadMap((prev) => {
                                        const next = { ...prev };
                                        delete next[raw.id];
                                        return next;
                                      })
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRawLeadSettings(raw.id)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold"
                                  >
                                    حفظ المهلة ✓
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400">
                                  حد الطلب: <strong className="text-slate-200 font-mono">{(raw.minStockAlert || 0).toLocaleString()}</strong> • مهلة: <strong className="text-amber-300 font-mono">{raw.leadTimeDays || 3} يوم</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingRawLeadMap((prev) => ({
                                      ...prev,
                                      [raw.id]: {
                                        leadTimeDays: String(raw.leadTimeDays || 3),
                                        minStockAlert: String(raw.minStockAlert || 0),
                                        avgDailyUsage: String(raw.avgDailyUsage || 0),
                                      },
                                    }))
                                  }
                                  className="text-amber-400 hover:underline font-bold"
                                >
                                  تعديل المهلة
                                </button>
                              </div>
                            )}
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
                    <span>قائمة المشروبات والبان كيك وتكلفة الكوب وهامش الربح الديناميكي</span>
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRecipeSubTab("cards")}
                      className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer"
                    >
                      💰 تعديل أسعار الخامات بالجملة ⚡
                    </button>
                    <span className="text-xs text-slate-400">
                      إجمالي الأصناف المربوطة: {menuItems.filter((m) => m.itemType === "PREPARED_BEVERAGE").length} صنف
                    </span>
                  </div>
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

                <button
                  type="button"
                  onClick={() => setPastrySubTab("factory")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    pastrySubTab === "factory"
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>طلبية المصنع اليومية (النواقص + الحجوزات) 🏭</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
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

                {pastrySubTab === "factory" && (
                  <>
                    <button
                      type="button"
                      onClick={() => fetchFactorySheet(factoryDate)}
                      disabled={factoryLoading}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700 transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${factoryLoading ? "animate-spin" : ""}`} />
                      <span>تحديث الحسبة</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintFactorySheet}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الكشف 🖨️</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDispatchFactoryWhatsappAdmin}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow transition"
                      title="نسخ كشف الطريحة وفتحه على واتساب لإرساله لإدارة المصنع مباشرة"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال واتساب للمصنع 📱</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveFactorySheet("DRAFT")}
                      disabled={factorySaving || factoryData?.savedFactoryOrder?.status === "RECEIVED"}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition"
                    >
                      <span>💾 حفظ مسودة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveFactorySheet("SENT_TO_FACTORY")}
                      disabled={factorySaving || factoryData?.savedFactoryOrder?.status === "RECEIVED"}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition"
                    >
                      <span>{factorySaving ? "جاري الحفظ..." : "اعتماد وإرسال للمصنع 📤🏭"}</span>
                    </button>
                    {factoryData?.savedFactoryOrder && factoryData.savedFactoryOrder.status !== "RECEIVED" && (
                      <button
                        type="button"
                        onClick={handleReceiveFromFactory}
                        disabled={factorySaving}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition"
                      >
                        <span>📦 استلام وإضافة للمخزن</span>
                      </button>
                    )}
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

            {/* SUB-TAB 3: DYNAMIC DAILY FACTORY PROCUREMENT SHEET (SHORTAGES + SCHEDULED PRE-ORDERS) */}
            {pastrySubTab === "factory" && (
              <div className="space-y-5">
                {/* Summary Banner & Controls */}
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="text-xs space-y-1">
                    <h4 className="font-black text-amber-300 text-sm flex items-center gap-2">
                      <span>🏭 كشف طلبية المصنع اليومية الديناميكي (النواقص + حجوزات العملاء المؤكدة)</span>
                      {factoryData?.savedFactoryOrder?.status && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            factoryData.savedFactoryOrder.status === "RECEIVED"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : factoryData.savedFactoryOrder.status === "SENT_TO_FACTORY"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          }`}
                        >
                          {factoryData.savedFactoryOrder.status === "RECEIVED"
                            ? "✔️ تم الاستلام والتوريد للمخزن"
                            : factoryData.savedFactoryOrder.status === "SENT_TO_FACTORY"
                            ? "📤 مرسلة ومعتمدة للمصنع"
                            : "💾 مسودة محفوظة"}
                        </span>
                      )}
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      يحسب تلقائياً: <strong>نواقص المخزن</strong> (`حد الأمان - الرصيد الحالي`) + <strong>كميات الحجوزات المؤكدة بعربون</strong> ليوم التسليم المحدد. يمكن للمدير تعديل أي كمية أو تعديل حد الأمان قبل الإرسال للمصنع.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">تاريخ التسليم المطلوب من المصنع</label>
                      <input
                        type="date"
                        value={factoryDate}
                        onChange={(e) => setFactoryDate(e.target.value)}
                        className="bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div className="min-w-[200px]">
                      <label className="block text-[10px] text-slate-400 mb-1">بحث في أصناف الكشف</label>
                      <input
                        type="text"
                        placeholder="ابحث باسم الصنف..."
                        value={factorySearchQuery}
                        onChange={(e) => setFactorySearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Manager Notes & Totals Strip */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs">
                  <div className="lg:col-span-6">
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">ملاحظات الإدارة للمصنع / المعمل</label>
                    <input
                      type="text"
                      placeholder="مثال: يراعى تجهيز التورت قبل الساعة 11 صباحاً..."
                      value={factoryNotesInput}
                      onChange={(e) => setFactoryNotesInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-slate-400">أصناف بها عجز</div>
                    <div className="text-lg font-black font-mono text-rose-400 mt-0.5">
                      {(factoryData?.rows || []).filter((r: any) => r.shortageQty > 0).length}
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-slate-400">حجوزات اليوم المحدد</div>
                    <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
                      {(factoryData?.scheduledOrders || []).length}
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-slate-950/70 border border-emerald-500/30 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-slate-400">أصناف مطلوبة بالكشف</div>
                    <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                      {(factoryData?.rows || []).filter((r: any) => (parseFloat(factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? 0)) || 0) > 0).length}
                    </div>
                  </div>
                </div>

                {/* Editable Procurement Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-3">الصنف والوحدة</th>
                          <th className="py-3 px-2 text-emerald-400">مباع اليوم</th>
                          <th className="py-3 px-2">الرصيد الحالي</th>
                          <th className="py-3 px-2">حد الطلب اليومي (تعديل)</th>
                          <th className="py-3 px-2 text-rose-400">العجز عن الحد</th>
                          <th className="py-3 px-2 text-amber-400">حجوزات مؤكدة 📅</th>
                          <th className="py-3 px-2 text-sky-400">المقترح الكلي</th>
                          <th className="py-3 px-3 bg-amber-500/10 text-amber-300 font-black">الكمية المعتمدة للمصنع ✏️</th>
                          <th className="py-3 px-2">تكلفة تقديرية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {factoryLoading ? (
                          <tr>
                            <td colSpan={9} className="py-10 text-center text-slate-400 font-sans">
                              جاري حساب النواقص والحجوزات ليوم {factoryDate}...
                            </td>
                          </tr>
                        ) : (
                          (factoryData?.rows || [])
                            .filter((r: any) => {
                              const q = factorySearchQuery.trim().toLowerCase();
                              if (!q) return true;
                              return r.nameAr?.toLowerCase().includes(q) || getCategoryLabel(r.category).toLowerCase().includes(q);
                            })
                            .map((r: any) => {
                              const currentMinEdit = editingMinStockMap[r.menuItemId];
                              const approvedVal = factoryApprovedEdits[r.menuItemId] ?? String(r.approvedQty ?? r.suggestedQty ?? 0);
                              const approvedNum = parseFloat(approvedVal) || 0;
                              const estCost = approvedNum * (Number(r.costPrice) || 0);
                              const hasNeed = r.suggestedQty > 0 || approvedNum > 0 || r.pendingPreOrderQty > 0;

                              return (
                                <tr
                                  key={r.menuItemId}
                                  className={`hover:bg-slate-800/40 ${hasNeed ? "bg-slate-900" : "opacity-65"}`}
                                >
                                  <td className="py-2.5 px-3 font-sans">
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      <span>{r.nameAr}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {getCategoryLabel(r.category)} • {r.unitType === "KG" ? "بالكيلو (KG)" : r.unitType === "BOX" ? "علبة" : "قطعة"}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-emerald-400 font-bold">
                                    {r.soldToday > 0 ? formatAdminQty(r.soldToday, r.unitType) : "0"}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-200 font-bold">
                                    {formatAdminQty(r.currentStock, r.unitType)}
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={currentMinEdit !== undefined ? currentMinEdit : String(r.minStockLevel ?? 0)}
                                        onChange={(e) =>
                                          setEditingMinStockMap((prev) => ({
                                            ...prev,
                                            [r.menuItemId]: e.target.value,
                                          }))
                                        }
                                        className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-white text-xs"
                                      />
                                      {currentMinEdit !== undefined && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateMinStock(r.menuItemId)}
                                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-bold"
                                          title="حفظ حد الأمان الجديد"
                                        >
                                          ✓
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 font-bold text-rose-400">
                                    {r.shortageQty > 0 ? `+${r.shortageQty}` : "0"}
                                  </td>
                                  <td className="py-2.5 px-2">
                                    <div className="font-bold text-amber-400">
                                      {r.confirmedPreOrderQty > 0 ? `+${r.confirmedPreOrderQty}` : "0"}
                                    </div>
                                    {r.pendingPreOrderQty > 0 && (
                                      <div className="text-[10px] font-sans text-rose-300">
                                        ({r.pendingPreOrderQty} بانتظار عربون)
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 font-bold text-sky-400">
                                    {r.suggestedQty}
                                  </td>
                                  <td className="py-2 px-3 bg-amber-500/5">
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        disabled={factoryData?.savedFactoryOrder?.status === "RECEIVED"}
                                        value={approvedVal}
                                        onChange={(e) =>
                                          setFactoryApprovedEdits((prev) => ({
                                            ...prev,
                                            [r.menuItemId]: e.target.value,
                                          }))
                                        }
                                        className="w-24 bg-black/80 border border-amber-500/50 rounded-lg px-2.5 py-1 text-center font-black text-amber-300 focus:outline-none focus:border-amber-400"
                                      />
                                      {Number(approvedVal) !== Number(r.suggestedQty) &&
                                        factoryData?.savedFactoryOrder?.status !== "RECEIVED" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFactoryApprovedEdits((prev) => ({
                                                ...prev,
                                                [r.menuItemId]: String(r.suggestedQty ?? 0),
                                              }))
                                            }
                                            className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-sans text-slate-300"
                                            title="إرجاع للمقترح المحسوب"
                                          >
                                            ↺
                                          </button>
                                        )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-300">
                                    {estCost > 0 ? `${estCost.toFixed(0)} ج.م` : "—"}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Linked Scheduled Pre-Orders for Selected Factory Target Date */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>الحجوزات المجدولة ليوم {factoryDate} ({(factoryData?.scheduledOrders || []).length} حجز)</span>
                  </h4>
                  {(factoryData?.scheduledOrders || []).length === 0 ? (
                    <div className="text-xs text-slate-500 py-4 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                      لا توجد حجوزات عملاء مجدولة لتاريخ {factoryDate} حتى الآن
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(factoryData?.scheduledOrders || []).map((so: any) => {
                        let parsedItems: any[] = [];
                        try {
                          parsedItems = typeof so.items === "string" ? JSON.parse(so.items) : so.items || [];
                        } catch {
                          parsedItems = [];
                        }
                        const depositConfirmed = so.depositStatus === "CONFIRMED";
                        return (
                          <div
                            key={so.id}
                            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                              depositConfirmed
                                ? "bg-emerald-950/15 border-emerald-500/30"
                                : "bg-amber-950/15 border-amber-500/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-black text-amber-400">{so.orderNumber}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  depositConfirmed
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {depositConfirmed
                                  ? `عربون مؤكد (${so.depositPaid} ج.م) — مضاف للكشف ✅`
                                  : `بانتظار العربون (${so.depositRequired} ج.م) ⏳`}
                              </span>
                            </div>
                            <div className="text-slate-200 font-bold flex items-center justify-between">
                              <span>{so.customerName || "عميل"} • {so.deliveryPhone || so.customerPhone || "بدون رقم"}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {so.scheduledFor ? new Date(so.scheduledFor).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : ""}
                              </span>
                            </div>
                            <div className="bg-slate-950/60 p-2 rounded-lg text-[11px] text-slate-300 space-y-0.5">
                              {parsedItems.map((it: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                  <span>{it.nameAr}</span>
                                  <span className="font-mono text-amber-300">{formatAdminQty(it.qty, it.unitType)}</span>
                                </div>
                              ))}
                            </div>
                            {!depositConfirmed && (
                              <div className="flex items-center justify-between pt-1">
                                {so.depositReceiptUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewAdminImage(so.depositReceiptUrl)}
                                    className="text-[11px] text-sky-400 underline font-bold"
                                  >
                                    🖼️ عرض إيصال التحويل
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500">لم يرفع إيصال بعد</span>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleUpdateOrderDispatch(
                                      so.id,
                                      {
                                        action: "CONFIRM_DEPOSIT",
                                        depositPaid: so.depositRequired || 0,
                                        depositStatus: "CONFIRMED",
                                      },
                                      `تم تأكيد عربون الحجز ${so.orderNumber} وإضافته لطلبية المصنع ✅`
                                    );
                                    fetchFactorySheet(factoryDate);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                                >
                                  ✅ تأكيد العربون الآن
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ORDERS, DELIVERY ZONES & LOGICAL DISPATCH */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Collapsible Delivery Zones Manager */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span>مناطق التوصيل (الدليفري) والتسعير الديناميكي ({deliveryZones.length} منطقة)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    عدّل رسوم كل منطقة أو أضف مناطق جديدة لأبو عادل وسول ميت — تظهر فوراً للعملاء في صفحة الطلب وللكاشير لتجميع الطيارات
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowZonesManager((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    showZonesManager
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{showZonesManager ? "إخفاء إعدادات المناطق ▲" : "إدارة مناطق التوصيل وأسعارها ▾"}</span>
                </button>
              </div>

              {showZonesManager && (
                <div className="space-y-4 pt-3 border-t border-slate-800">
                  <form onSubmit={handleSaveDeliveryZone} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">اسم المنطقة *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: مدينة نصر، التجمع..."
                        value={zoneForm.nameAr}
                        onChange={(e) => setZoneForm({ ...zoneForm, nameAr: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">تكلفة التوصيل (ج.م) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        placeholder="35"
                        value={zoneForm.fee}
                        onChange={(e) => setZoneForm({ ...zoneForm, fee: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">الوقت المتوقع</label>
                      <input
                        type="text"
                        placeholder="45 - 60 دقيقة"
                        value={zoneForm.estimatedTime}
                        onChange={(e) => setZoneForm({ ...zoneForm, estimatedTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">ترتيب الظهور</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={zoneForm.sortOrder}
                        onChange={(e) => setZoneForm({ ...zoneForm, sortOrder: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        disabled={savingZone}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50"
                      >
                        {savingZone ? "جاري الحفظ..." : editingZoneId ? "حفظ التعديل ✓" : "+ إضافة منطقة"}
                      </button>
                      {editingZoneId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingZoneId(null);
                            setZoneForm({ nameAr: "", nameEn: "", fee: "", estimatedTime: "45 - 60 دقيقة", sortOrder: "0" });
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {deliveryZones.map((zone) => (
                      <div
                        key={zone.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                          zone.isActive
                            ? "bg-slate-950 border-slate-800"
                            : "bg-slate-950/40 border-slate-800/50 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>📍 {zone.nameAr}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">{zone.fee} ج.م</span>
                            <span>• {zone.estimatedTime || "45 - 60 دقيقة"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleZoneActive(zone)}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              zone.isActive
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {zone.isActive ? "نشط" : "موقف"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingZoneId(zone.id);
                              setZoneForm({
                                nameAr: zone.nameAr,
                                nameEn: zone.nameEn || "",
                                fee: String(zone.fee ?? 0),
                                estimatedTime: zone.estimatedTime || "45 - 60 دقيقة",
                                sortOrder: String(zone.sortOrder ?? 0),
                              });
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                            title="تعديل المنطقة والسعر"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliveryZone(zone)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400"
                            title="حذف المنطقة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Dynamic Delivery Drivers Manager */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400" />
                    <span>إدارة عمال التوصيل والطيارين ({drivers.filter((d) => d.isActive).length} نشط)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    أضف أسماء وأرقام تليفونات الطيارين ليظهروا فوراً في قائمة إسناد الطلبات بالكاشير والإدارة وفواتير التوصيل
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDriversManager((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    showDriversManager
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>{showDriversManager ? "إخفاء إدارة الطيارين ▲" : "إدارة الطيارين وأرقامهم ▾"}</span>
                </button>
              </div>

              {showDriversManager && (
                <div className="space-y-4 pt-3 border-t border-slate-800">
                  <form onSubmit={handleSaveDriver} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">اسم الطيار *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: أحمد محمود"
                        value={driverForm.name}
                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">رقم الموبايل *</label>
                      <input
                        type="text"
                        required
                        placeholder="01012345678"
                        value={driverForm.phone}
                        onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">المركبة / الوسيلة</label>
                      <input
                        type="text"
                        placeholder="موتوسيكل دليفري"
                        value={driverForm.vehicleInfo}
                        onChange={(e) => setDriverForm({ ...driverForm, vehicleInfo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">ملاحظات</label>
                      <input
                        type="text"
                        placeholder="اختياري..."
                        value={driverForm.notes}
                        onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        disabled={savingDriver}
                        className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-lg transition disabled:opacity-50"
                      >
                        {savingDriver ? "جاري الحفظ..." : editingDriverId ? "حفظ التعديل ✓" : "+ إضافة طيار"}
                      </button>
                      {editingDriverId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDriverId(null);
                            setDriverForm({ name: "", phone: "", vehicleInfo: "موتوسيكل دليفري", notes: "" });
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {drivers.map((drv) => (
                      <div
                        key={drv.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                          drv.isActive ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-800/50 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>🛵 {drv.name}</span>
                            {drv.vehicleInfo && (
                              <span className="text-[10px] text-slate-400 font-normal">({drv.vehicleInfo})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-amber-300 font-mono mt-0.5 flex items-center gap-2">
                            <span>📞 {drv.phone}</span>
                            {drv.stats && (
                              <span className="text-sky-400 font-sans">• {drv.stats.totalTrips} رحلة ({drv.stats.totalDeliveryFeesDue} ج توصيل)</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleDriverActive(drv)}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              drv.isActive
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {drv.isActive ? "متاح" : "موقف"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDriverId(drv.id);
                              setDriverForm({
                                name: drv.name,
                                phone: drv.phone,
                                vehicleInfo: drv.vehicleInfo || "موتوسيكل دليفري",
                                notes: drv.notes || "",
                              });
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                            title="تعديل بيانات الطيار"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDriver(drv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400"
                            title="حذف الطيار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {drivers.length === 0 && (
                      <div className="col-span-full text-center py-4 text-slate-500 text-xs">
                        لا يوجد طيارون مسجلون حالياً — أضف أول طيار من النموذج أعلاه 🛵
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Scheduled Pre-Orders 48h/24h Alert & Deposit Review Strip */}
            {(() => {
              const urgentPreOrders = orders.filter((o) => {
                if (!o.isScheduled || o.status === "COMPLETED" || o.status === "CANCELLED") return false;
                if (isUserSoulmate && o.outlet?.code !== "SOULMATE_CAFE") return false;
                if (isUserAbuAdel && o.outlet?.code !== "ABU_ADEL_PATISSERIE") return false;
                if (selectedOutletId !== "ALL" && o.outletId !== selectedOutletId) return false;
                const hrs = getHoursUntil(o.scheduledFor);
                const needsDepositAction = o.depositStatus === "AWAITING_DEPOSIT" || Boolean(o.depositReceiptUrl && o.depositStatus !== "CONFIRMED");
                return (hrs !== null && hrs <= 48) || needsDepositAction;
              });
              if (urgentPreOrders.length === 0) return null;

              return (
                <div className="bg-amber-950/25 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-black text-amber-300 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>تنبيهات الحجوزات المسبقة والعربون (مواعيد خلال 48 / 24 ساعة أو بانتظار المراجعة — {urgentPreOrders.length} حجز)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setOrderScheduledFilter("SCHEDULED")}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                    >
                      تصفية الحجوزات المسبقة بالجدول ↓
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {urgentPreOrders.slice(0, 6).map((po) => {
                      const hrs = getHoursUntil(po.scheduledFor);
                      const is24h = hrs !== null && hrs <= 24;
                      return (
                        <div
                          key={po.id}
                          className={`p-3 rounded-xl border text-xs space-y-2 ${
                            is24h ? "bg-rose-950/30 border-rose-500/40" : "bg-slate-950/80 border-amber-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-black text-amber-400">{po.orderNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                is24h
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : hrs !== null && hrs <= 48
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                              }`}
                            >
                              {hrs !== null
                                ? hrs <= 0
                                  ? "حان موعد التسليم 🚨"
                                  : hrs <= 24
                                  ? `متبقي ${Math.ceil(hrs)} ساعة 🚨`
                                  : hrs <= 48
                                  ? `خلال ${Math.ceil(hrs)} ساعة ⏰`
                                  : "حجز مجدول"
                                : "حجز مسبق"}
                            </span>
                          </div>
                          <div className="text-slate-200 font-bold">
                            {po.customerName || "عميل"} • <span className="font-mono text-amber-300">{po.deliveryPhone || po.customerPhone || "بدون رقم"}</span>
                          </div>
                          {po.scheduledFor && (
                            <div className="text-[11px] text-slate-400">
                              📅 الموعد: <span className="text-white font-mono">{new Date(po.scheduledFor).toLocaleString("ar-EG")}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={po.depositStatus === "CONFIRMED" ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>
                              {po.depositStatus === "CONFIRMED"
                                ? `✅ عربون مؤكد (${po.depositPaid} ج)`
                                : `⏳ عربون مطلوب (${po.depositRequired || 0} ج)`}
                            </span>
                            {po.depositReceiptUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewAdminImage(po.depositReceiptUrl)}
                                className="text-sky-400 hover:text-sky-300 underline font-bold"
                              >
                                🖼️ عرض الإيصال
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {po.depositStatus !== "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateOrderDispatch(
                                    po.id,
                                    {
                                      action: "CONFIRM_DEPOSIT",
                                      depositPaid: po.depositRequired || 0,
                                      depositStatus: "CONFIRMED",
                                      paymentMethod: po.paymentMethod,
                                    },
                                    `تم تأكيد عربون الحجز ${po.orderNumber} وإدخاله لطلبية المصنع ✅`
                                  )
                                }
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                              >
                                ✅ تأكيد العربون
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSendPreOrderAlertChat(po, hrs ?? 24)}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px]"
                            >
                              🔔 تنبيه شات {((is24h && po.alertSent24h) || (!is24h && po.alertSent48h)) ? "(مرسل✓)" : ""}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Orders Filtering & Dispatch Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>سجل الطلبات والحجوزات ومتابعة الدليفري والطيارات حسب المنطقة</span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={orderScheduledFilter}
                    onChange={(e) => setOrderScheduledFilter(e.target.value as any)}
                    className="bg-slate-950 border border-amber-500/40 text-xs rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none"
                  >
                    <option value="ALL">📋 كل الطلبات والحجوزات</option>
                    <option value="SCHEDULED">📅 الحجوزات المسبقة فقط</option>
                    <option value="IMMEDIATE">⚡ الطلبات الفورية فقط</option>
                  </select>

                  <select
                    value={orderZoneFilter}
                    onChange={(e) => setOrderZoneFilter(e.target.value)}
                    className="bg-slate-950 border border-purple-500/40 text-xs rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none"
                  >
                    <option value="ALL">🗺️ كل المناطق</option>
                    <option value="NO_ZONE">بدون منطقة محددة</option>
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        📍 {z.nameAr} ({z.fee} ج.م)
                      </option>
                    ))}
                  </select>

                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">كل أنواع الطلبات</option>
                    <option value="DELIVERY">🛵 دليفري فقط</option>
                    <option value="TAKEAWAY">🛍️ تيك أواي / بيع مباشر</option>
                    <option value="DINE_IN">🪑 صالة الكافيه</option>
                  </select>

                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">كل الحالات</option>
                    <option value="NEW_PENDING">🆕 جديد وارد</option>
                    <option value="PREPARING">📦 جاري التجهيز</option>
                    <option value="READY_TO_SERVE">✅ جاهز للطيار / الاستلام</option>
                    <option value="OUT_FOR_DELIVERY">🛵 خرج مع الطيار</option>
                    <option value="COMPLETED">✔️ مكتمل / تم التسليم</option>
                  </select>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="رقم الطلب، الموبايل، الطيار، العنوان..."
                      className="bg-slate-950 border border-slate-700 text-xs rounded-xl pr-9 pl-3 py-2 text-white focus:outline-none focus:border-amber-500 w-56"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">رقم الطلب</th>
                      <th className="py-2.5 px-3">الفرع والأصناف</th>
                      <th className="py-2.5 px-3">النوع والمنطقة</th>
                      <th className="py-2.5 px-3">العميل والتوصيل</th>
                      <th className="py-2.5 px-3">الحالة والسداد</th>
                      <th className="py-2.5 px-3">الإجمالي والفصل</th>
                      <th className="py-2.5 px-3">مراحل التجهيز والطيار</th>
                      <th className="py-2.5 px-3 text-center">فاتورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders
                      .filter((o) => {
                        if (isUserSoulmate && o.outlet?.code !== "SOULMATE_CAFE" && o.outletId !== outlets.find((x) => x.code === "SOULMATE_CAFE")?.id) return false;
                        if (isUserAbuAdel && o.outlet?.code !== "ABU_ADEL_PATISSERIE" && o.outletId !== outlets.find((x) => x.code === "ABU_ADEL_PATISSERIE")?.id) return false;
                        if (selectedOutletId !== "ALL" && o.outletId !== selectedOutletId) return false;
                        if (orderScheduledFilter === "SCHEDULED" && !o.isScheduled) return false;
                        if (orderScheduledFilter === "IMMEDIATE" && o.isScheduled) return false;
                        if (orderZoneFilter === "NO_ZONE" && (o.deliveryZoneId || o.deliveryZoneName)) return false;
                        if (orderZoneFilter !== "ALL" && orderZoneFilter !== "NO_ZONE" && o.deliveryZoneId !== orderZoneFilter) return false;
                        if (orderTypeFilter !== "ALL" && o.orderType !== orderTypeFilter) return false;
                        if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;

                        const q = searchQuery.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          o.orderNumber.toLowerCase().includes(q) ||
                          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
                          (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
                          (o.deliveryPhone && o.deliveryPhone.toLowerCase().includes(q)) ||
                          (o.deliveryZoneName && o.deliveryZoneName.toLowerCase().includes(q)) ||
                          (o.driverName && o.driverName.toLowerCase().includes(q)) ||
                          (o.driverPhone && o.driverPhone.toLowerCase().includes(q)) ||
                          (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
                          (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q))
                        );
                      })
                      .map((o) => {
                        const zoneLabel = o.deliveryZone?.nameAr || o.deliveryZoneName;
                        const statusMeta: Record<string, { label: string; cls: string }> = {
                          NEW_PENDING: { label: "🆕 جديد وارد", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                          PREPARING: { label: "📦 قيد التجهيز", cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
                          READY_TO_SERVE: { label: "✅ جاهز", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                          OUT_FOR_DELIVERY: { label: `🛵 مع الطيار${o.driverName ? ` (${o.driverName})` : ""}`, cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
                          COMPLETED: { label: "✔️ تم التسليم", cls: "bg-slate-800 text-emerald-400 border-slate-700" },
                          CANCELLED: { label: "❌ ملغي", cls: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
                        };
                        const st = statusMeta[o.status] || statusMeta.COMPLETED;
                        let parsedOrderItems: any[] = [];
                        try {
                          parsedOrderItems = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
                        } catch {
                          parsedOrderItems = [];
                        }
                        const storeNetAmt = getStoreNet(o);
                        const deliveryFeeAmt = Number(o.deliveryFee) || 0;
                        const activeDriversList = drivers.filter((d) => d.isActive);
                        const selectedDrvId = dispatchDriverIds[o.id] || o.driverId || activeDriversList[0]?.id || "";
                        const selectedDrvObj = drivers.find((d) => d.id === selectedDrvId);

                        return (
                          <tr key={o.id} className="hover:bg-slate-800/40 align-top">
                            <td className="py-3 px-3">
                              <div className="font-bold text-amber-400 font-mono flex items-center gap-1 flex-wrap">
                                <span>{o.orderNumber}</span>
                                {o.isScheduled && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-sans">
                                    📅 حجز
                                  </span>
                                )}
                                {o.isEdited && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-sans font-black">
                                    ✏️ فاتورة معدلة{o.revisionCount > 1 ? ` (${o.revisionCount})` : ""}
                                  </span>
                                )}
                                {o.paymentModified && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-sans font-black">
                                    💳 تعديل دفع
                                  </span>
                                )}
                              </div>
                              {o.lastEditReason && (o.isEdited || o.paymentModified) && (
                                <div className="text-[10px] text-rose-300/90 mt-0.5 max-w-[170px] truncate" title={o.lastEditReason}>
                                  📝 {o.lastEditReason}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {new Date(o.createdAt).toLocaleString("ar-EG")}
                              </div>
                              {o.isScheduled && o.scheduledFor && (
                                <div className="text-[10px] text-amber-300 font-bold mt-1">
                                  ⏰ تسليم: {new Date(o.scheduledFor).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-300 space-y-1 max-w-[190px]">
                              <div className="font-bold">{o.outlet?.name || "الفرع الرئيسي"}</div>
                              {parsedOrderItems.length > 0 && (
                                <div className="text-[10px] text-slate-400 space-y-0.5">
                                  {parsedOrderItems.slice(0, 3).map((it: any, idx: number) => (
                                    <div key={idx} className="truncate">
                                      • {it.nameAr} <span className="text-amber-300 font-mono">({formatAdminQty(it.qty, it.unitType)})</span>
                                    </div>
                                  ))}
                                  {parsedOrderItems.length > 3 && (
                                    <div className="text-slate-500">+{parsedOrderItems.length - 3} أصناف أخرى</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 space-y-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  o.orderType === "TALABAT" || o.paymentMethod === "TALABAT"
                                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                                    : o.orderType === "DELIVERY"
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : o.orderType === "TAKEAWAY"
                                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {o.orderType === "TALABAT" || o.paymentMethod === "TALABAT"
                                  ? `🟠 طلبات (عمولة ${o.commissionPercent || 25}% = ${Number(o.commissionAmount || 0).toFixed(0)} ج)`
                                  : o.orderType === "DINE_IN"
                                  ? `🪑 صالة • ترابيزة ${o.tableNumber || "1"}`
                                  : o.orderType === "DELIVERY"
                                  ? "🛵 دليفري للمنزل"
                                  : "🛍️ تيك أواي / استلام"}
                              </span>
                              {zoneLabel && (
                                <div className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded inline-block mr-1">
                                  📍 {zoneLabel}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-300 max-w-xs">
                              <div className="font-bold text-white">{o.customerName || "عميل كاشير"}</div>
                              {(o.deliveryPhone || o.customerPhone) && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  📞 {o.deliveryPhone || o.customerPhone}
                                </div>
                              )}
                              {o.deliveryAddress && (
                                <div className="text-[10px] text-amber-300 mt-0.5 leading-snug">
                                  {o.deliveryAddress}
                                </div>
                              )}
                              {o.driverName && (
                                <div className="text-[10px] text-sky-300 font-bold mt-1 flex items-center gap-1 flex-wrap">
                                  <span>🛵 الطيار: {o.driverName}</span>
                                  {(o.driverPhone || o.driver?.phone) && (
                                    <span className="font-mono text-sky-400">({o.driverPhone || o.driver?.phone})</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 space-y-1.5">
                              <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${st.cls}`}>
                                {st.label}
                              </div>
                              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    o.paymentStatus === "PAID"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : "bg-rose-500/15 text-rose-300"
                                  }`}
                                >
                                  {o.paymentStatus === "PAID"
                                    ? `مدفوع (${PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod})`
                                    : "سداد مرن / عند الاستلام ⏳"}
                                </span>
                              </div>
                              {o.status !== "CANCELLED" && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRevisionTargetOrder(o);
                                      setRevisionModalMode("CHANGE_PAYMENT");
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/35 text-sky-300 text-[10px] font-black transition cursor-pointer"
                                    title="تعديل وسيلة الدفع (كاش ↔ فيزا / إنستاباي) مع تنبيه الإدارة"
                                  >
                                    💳 تعديل دفع
                                  </button>
                                </div>
                              )}
                              {o.isScheduled && (
                                <div className="space-y-1 pt-0.5">
                                  <div
                                    className={`text-[10px] font-bold ${
                                      o.depositStatus === "CONFIRMED" ? "text-emerald-400" : "text-amber-300"
                                    }`}
                                  >
                                    {o.depositStatus === "CONFIRMED"
                                      ? `✅ عربون مؤكد (${o.depositPaid || 0} ج)`
                                      : `⏳ عربون مطلوب (${o.depositRequired || 0} ج)`}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {o.depositReceiptUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewAdminImage(o.depositReceiptUrl)}
                                        className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-bold"
                                      >
                                        🖼️ الإيصال
                                      </button>
                                    )}
                                    {o.depositStatus !== "CONFIRMED" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateOrderDispatch(
                                            o.id,
                                            {
                                              action: "CONFIRM_DEPOSIT",
                                              depositPaid: o.depositRequired || 0,
                                              depositStatus: "CONFIRMED",
                                              paymentMethod: o.paymentMethod,
                                            },
                                            `تم تأكيد عربون الحجز ${o.orderNumber} ✅`
                                          )
                                        }
                                        className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold"
                                      >
                                        ✅ اعتماد العربون
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <div className="font-black text-emerald-400">{o.finalAmount} ج.م</div>
                              {deliveryFeeAmt > 0 && (
                                <div className="text-[10px] space-y-0.5 mt-0.5 font-sans">
                                  <div className="text-slate-300">المحل: <span className="font-mono font-bold text-emerald-300">{storeNetAmt} ج</span></div>
                                  <div className="text-sky-400">للطيار: <span className="font-mono font-bold">{deliveryFeeAmt} ج</span></div>
                                </div>
                              )}
                              {o.isScheduled && Number(o.depositPaid) > 0 && o.paymentStatus !== "PAID" && (
                                <div className="text-[10px] text-amber-300 font-sans mt-0.5">
                                  متبقي: {Math.max(0, Number(o.finalAmount) - Number(o.depositPaid))} ج
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1.5 min-w-[180px]">
                                {o.status === "NEW_PENDING" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOrderDispatch(
                                        o.id,
                                        { status: "PREPARING" },
                                        `بدأ تجهيز الطلب ${o.orderNumber} 📦`
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition"
                                  >
                                    بدء التجهيز والتعبئة 📦
                                  </button>
                                )}
                                {o.status === "PREPARING" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOrderDispatch(
                                        o.id,
                                        { status: "READY_TO_SERVE" },
                                        `الطلب ${o.orderNumber} جاهز للتسليم ✅`
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
                                  >
                                    {o.orderType === "DELIVERY" ? "جاهز للطيار ✅" : "جاهز للاستلام ✅"}
                                  </button>
                                )}
                                {o.status === "READY_TO_SERVE" && o.orderType === "DELIVERY" && (
                                  <div className="flex flex-col gap-1">
                                    {activeDriversList.length > 0 ? (
                                      <select
                                        value={selectedDrvId}
                                        onChange={(e) =>
                                          setDispatchDriverIds((prev) => ({
                                            ...prev,
                                            [o.id]: e.target.value,
                                          }))
                                        }
                                        className="w-full bg-slate-950 border border-sky-500/40 rounded-lg px-2 py-1 text-[10px] text-sky-300 font-bold"
                                      >
                                        {activeDriversList.map((d) => (
                                          <option key={d.id} value={d.id}>
                                            🛵 {d.name} ({d.phone})
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        placeholder="اسم الطيار..."
                                        value={dispatchDriverNames[o.id] || ""}
                                        onChange={(e) =>
                                          setDispatchDriverNames((prev) => ({
                                            ...prev,
                                            [o.id]: e.target.value,
                                          }))
                                        }
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white"
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderDispatch(
                                          o.id,
                                          activeDriversList.length > 0 && selectedDrvObj
                                            ? {
                                                action: "DISPATCH_DRIVER",
                                                driverId: selectedDrvObj.id,
                                                driverName: selectedDrvObj.name,
                                                driverPhone: selectedDrvObj.phone,
                                              }
                                            : {
                                                action: "DISPATCH_DRIVER",
                                                driverName: dispatchDriverNames[o.id] || "مندوب التوصيل",
                                              },
                                          `خرج الطلب ${o.orderNumber} مع الطيار 🛵`
                                        )
                                      }
                                      className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold whitespace-nowrap"
                                    >
                                      تسليم للطيار وخروج 🛵
                                    </button>
                                  </div>
                                )}
                                {(o.status === "OUT_FOR_DELIVERY" ||
                                  (o.status === "READY_TO_SERVE" && o.orderType !== "DELIVERY")) &&
                                  o.paymentStatus !== "PAID" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderDispatch(
                                          o.id,
                                          {
                                            action: "SETTLE",
                                            paymentMethod: o.paymentMethod || "CASH",
                                            cashierName: currentUser?.name || "الإدارة",
                                          },
                                          `تم تحصيل قيمة الطلب ${o.orderNumber} وإغلاقه (${PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod}) 💵`
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black transition"
                                    >
                                      تحصيل ({PAYMENT_METHOD_LABELS[o.paymentMethod] || "كاش"}) وإغلاق 💵
                                    </button>
                                  )}
                                {(o.status === "OUT_FOR_DELIVERY" ||
                                  (o.status === "READY_TO_SERVE" && o.orderType !== "DELIVERY")) &&
                                  o.paymentStatus === "PAID" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderDispatch(
                                          o.id,
                                          { status: "COMPLETED" },
                                          `تم تأكيد تسليم الطلب ${o.orderNumber} ✔️`
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition"
                                    >
                                      تأكيد التسليم النهائي ✔️
                                    </button>
                                  )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {o.status !== "CANCELLED" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRevisionTargetOrder(o);
                                      setRevisionModalMode("EDIT_INVOICE");
                                    }}
                                    className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 transition cursor-pointer"
                                    title="تعديل أصناف/أوزان الفاتورة (فاتورة معدلة)"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedOrderForPrint(o)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                                  title="طباعة الفاتورة / الإيصال"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
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

        {/* TAB 7: LIVE CUSTOMER CHAT (BOTH SOULMATE & ABU ADEL) */}
        {activeTab === "chat" && (() => {
          const branchFilteredChat = chatMessages.filter((m) => {
            if (isUserSoulmate && m.outlet?.code !== "SOULMATE_CAFE") return false;
            if (isUserAbuAdel && m.outlet?.code !== "ABU_ADEL_PATISSERIE") return false;
            if (chatOutletFilter !== "ALL" && m.outletId !== chatOutletFilter) return false;
            return true;
          });

          // Group customer conversations by Phone (online/delivery/takeaway), Guest Session ID, or Table Number
          const threadMap: Record<
            string,
            { key: string; label: string; sub: string; outletCode: string; lastMsg: any; count: number }
          > = {};

          branchFilteredChat.forEach((m) => {
            const key = m.senderPhone
              ? `PHONE:${m.senderPhone}`
              : m.guestId
              ? `GUEST:${m.guestId}`
              : m.tableNumber
              ? `TABLE:${m.tableNumber}`
              : "GENERAL";
            if (!threadMap[key]) {
              threadMap[key] = {
                key,
                label: m.senderPhone
                  ? m.senderType === "CUSTOMER"
                    ? `${m.senderName} (${m.senderPhone})`
                    : m.senderPhone
                  : m.guestId
                  ? `${m.senderType === "CUSTOMER" ? m.senderName : "زائر أونلاين"} (ضيف #${String(m.guestId).slice(-4)})`
                  : m.tableNumber
                  ? `ترابيزة ${m.tableNumber}`
                  : "استفسارات عامة",
                sub: m.outlet?.code === "ABU_ADEL_PATISSERIE" ? "🍰 حلواني أبو عادل" : "☕ سول ميت",
                outletCode: m.outlet?.code || "",
                lastMsg: m,
                count: 0,
              };
            } else if (m.senderType === "CUSTOMER" && m.senderPhone) {
              threadMap[key].label = `${m.senderName} (${m.senderPhone})`;
            }
            threadMap[key].lastMsg = m;
            threadMap[key].count += 1;
          });

          const threads = Object.values(threadMap).reverse();
          const displayedMsgs = branchFilteredChat.filter((m) => {
            if (selectedChatThread === "ALL") return true;
            if (selectedChatThread.startsWith("PHONE:")) return m.senderPhone === selectedChatThread.slice(6);
            if (selectedChatThread.startsWith("GUEST:")) return m.guestId === selectedChatThread.slice(6);
            if (selectedChatThread.startsWith("TABLE:")) return m.tableNumber === selectedChatThread.slice(6);
            return !m.senderPhone && !m.guestId && !m.tableNumber;
          });

          return (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-400" />
                    <span>الشات المباشر مع العملاء (دليفري، تيك أواي، وترابيزات)</span>
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isViewingAll && (
                      <select
                        value={chatOutletFilter}
                        onChange={(e) => {
                          setChatOutletFilter(e.target.value);
                          setSelectedChatThread("ALL");
                        }}
                        className="bg-slate-950 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
                      >
                        <option value="ALL">كلا المحلين (سول ميت + أبو عادل)</option>
                        {outlets.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.code === "SOULMATE_CAFE" ? "☕ سول ميت كافيه VIP" : "🍰 حلواني أبو عادل"}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={selectedChatThread}
                      onChange={(e) => setSelectedChatThread(e.target.value)}
                      className="bg-slate-950 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
                    >
                      <option value="ALL">جميع المحادثات ({branchFilteredChat.length})</option>
                      {threads.map((th) => (
                        <option key={th.key} value={th.key}>
                          {th.sub} • {th.label} ({th.count})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Customer Threads Sidebar */}
                  <div className="lg:col-span-4 max-h-96 overflow-y-auto space-y-2 pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedChatThread("ALL")}
                      className={`w-full text-right p-3 rounded-xl border text-xs transition ${
                        selectedChatThread === "ALL"
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      📥 عرض كل الرسائل ({branchFilteredChat.length})
                    </button>
                    {threads.map((th) => (
                      <button
                        key={th.key}
                        type="button"
                        onClick={() => setSelectedChatThread(th.key)}
                        className={`w-full text-right p-3 rounded-xl border text-xs transition ${
                          selectedChatThread === th.key
                            ? "bg-amber-500/15 border-amber-500/50 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold truncate">{th.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                            {th.sub}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-1">
                          {th.lastMsg?.message}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Active Chat Stream + Reply */}
                  <div className="lg:col-span-8 flex flex-col gap-3">
                    <div className="h-80 overflow-y-auto space-y-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                      {displayedMsgs.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.senderType === "STAFF" ? "items-start" : "items-end"
                          }`}
                        >
                          <div
                            className={`max-w-[78%] p-3 rounded-2xl ${
                              msg.senderType === "STAFF"
                                ? "bg-amber-500 text-black font-medium"
                                : "bg-slate-800 text-white border border-slate-700"
                            }`}
                          >
                            <div className="text-[10px] opacity-75 mb-0.5 flex items-center gap-1.5">
                              <span>
                                {msg.senderType === "STAFF"
                                  ? `${msg.senderName} (خدمة العملاء)`
                                  : `${msg.senderName} • ${
                                      msg.tableNumber
                                        ? `ترابيزة ${msg.tableNumber}`
                                        : msg.senderPhone
                                        ? `📱 ${msg.senderPhone}`
                                        : "طلب أونلاين"
                                    }`}
                              </span>
                              <span>•</span>
                              <span>{msg.outlet?.code === "ABU_ADEL_PATISSERIE" ? "🍰 أبو عادل" : "☕ سول ميت"}</span>
                            </div>
                            <div>{msg.message}</div>
                            {msg.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewAdminImage(msg.imageUrl)}
                                className="mt-2 block rounded-xl overflow-hidden border border-black/20 hover:opacity-90 transition"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={msg.imageUrl}
                                  alt="مرفق الشات"
                                  className="max-h-48 max-w-full object-cover"
                                />
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-EG")}
                          </span>
                        </div>
                      ))}

                      {displayedMsgs.length === 0 && (
                        <div className="text-center py-12 text-slate-500 text-xs">
                          لا توجد رسائل شات في هذا التحديد حتى الآن
                        </div>
                      )}
                    </div>

                    {adminChatImage && (
                      <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/40 rounded-xl p-2 text-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={adminChatImage} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-amber-300 font-bold flex-1">تم إرفاق صورة للرد على العميل 📸</span>
                        <button
                          type="button"
                          onClick={() => setAdminChatImage("")}
                          className="p-1 rounded-lg bg-rose-500/20 text-rose-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendStaffChatReply} className="flex gap-2 items-center">
                      <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                        <span>{uploadingAdminChatImage ? "..." : "صورة"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingAdminChatImage}
                          onChange={handleUploadAdminChatImage}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder={
                          selectedChatThread !== "ALL"
                            ? "اكتب رداً مباشراً للعميل المحدد..."
                            : "اكتب الرد هنا (سيُرسل تلقائياً لآخر عميل تواصل معك أو اختر محادثة)..."
                        }
                        value={chatReplyText}
                        onChange={(e) => setChatReplyText(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={!chatReplyText.trim() && !adminChatImage}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition disabled:opacity-50"
                      >
                        إرسال الرد 💬
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 8: LOYALTY PROGRAM, CUSTOMERS CRM & SPECIAL OFFERS MANAGER */}
        {activeTab === "loyalty" && (
          <AdminLoyaltyCrmOffersPanel
            settings={settings}
            setSettings={setSettings}
            menuItems={menuItems}
            initialCustomers={customers}
            onRefreshParent={fetchDashboardData}
            addToast={addToast}
          />
        )}

        {/* TAB 9: FACTORY, SUPPLIERS LEDGER, INTERNAL TRANSFER & AI OCR */}
        {activeTab === "suppliers" && (isOwner || isBranchManager) && (
          <AdminSuppliersAndAiPanel
            currentUser={currentUser}
            outlets={outlets}
            menuItems={menuItems}
            rawMaterials={rawMaterials}
            settings={settings}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            onDataChanged={fetchDashboardData}
          />
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

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      رسوم التوصيل الافتراضية (عند عدم اختيار منطقة) — ج.م
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.deliveryFee ?? 20}
                      onChange={(e) =>
                        setSettings({ ...settings, deliveryFee: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      نسبة عربون تأكيد الحجوزات المسبقة لأبو عادل (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={settings.preOrderDepositPercent ?? 30}
                      onChange={(e) =>
                        setSettings({ ...settings, preOrderDepositPercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      نسبة عمولة طلبات (Talabat %) — سول ميت كافيه
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={settings.talabatCommissionPercent ?? 25}
                      onChange={(e) =>
                        setSettings({ ...settings, talabatCommissionPercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-orange-400 focus:outline-none focus:border-orange-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      حساب / عنوان إنستاباي (InstaPay) لاستقبال العربون
                    </label>
                    <input
                      type="text"
                      placeholder="abuadel@instapay"
                      value={settings.instapayAccount || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, instapayAccount: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-300 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      رقم فودافون كاش لاستقبال العربون والمدفوعات
                    </label>
                    <input
                      type="text"
                      placeholder="010xxxxxxxx"
                      value={settings.vodafoneCashNumber || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, vodafoneCashNumber: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-pink-300 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 md:col-span-2">
                    <span className="text-amber-400 text-base">🍰</span>
                    <div>
                      <div className="text-xs font-bold text-amber-300">
                        حلواني أبو عادل (الفرع والإدارة المعتمدة)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        إدارة حلواني أبو عادل للحلويات الشرقية والتورت والبيع المباشر بالقطعة والكيلو والدليفري والحجوزات المسبقة بكامل الصلاحيات.
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
                    <option value="branch_manager">🏢 مدير فرع</option>
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const isPrep = ["HOT_DRINKS", "ICE_COFFEE", "FRAPPE", "MOJITO", "SMOOTHIE", "PANCAKE", "EXTRA"].includes(newCat);
                      setMenuItemForm({
                        ...menuItemForm,
                        category: newCat,
                        itemType: isPrep ? "PREPARED_BEVERAGE" : "READY_PASTRY",
                        stockQty: isPrep ? "0" : (menuItemForm.stockQty || "10"),
                      });
                    }}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                {menuItemForm.itemType === "PREPARED_BEVERAGE" ||
                ["HOT_DRINKS", "ICE_COFFEE", "FRAPPE", "MOJITO", "SMOOTHIE", "PANCAKE", "EXTRA"].includes(menuItemForm.category) ? (
                  <div className="flex flex-col justify-end">
                    <div className="py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>يخصم من ريسيبي خامات البار 🧪</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-400 mb-1">وحدة البيع (قطعة / بالكيلو)</label>
                      <select
                        value={menuItemForm.unitType || "PIECE"}
                        onChange={(e) => setMenuItemForm({ ...menuItemForm, unitType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="PIECE">قطعة / وحدة</option>
                        <option value="KG">بالكيلو (KG — يقبل أرباع وأنصاص)</option>
                        <option value="BOX">علبة / بوكس</option>
                        <option value="PORTION">طبق</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">المخزون الفعلي (بضاعة جاهزة)</label>
                      <input
                        type="number"
                        step="any"
                        value={menuItemForm.stockQty}
                        onChange={(e) => setMenuItemForm({ ...menuItemForm, stockQty: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
                    step="any"
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
                  <label className="block text-slate-300 font-bold mb-1">مهلة التوريد من المصنع (يوم)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="21 للأكواب الكرتون / 3 للعادي"
                    value={rawForm.leadTimeDays}
                    onChange={(e) => setRawForm({ ...rawForm, leadTimeDays: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الاستهلاك اليومي التقديري</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0 (يحسب تلقائياً لو 0)"
                    value={rawForm.avgDailyUsage}
                    onChange={(e) => setRawForm({ ...rawForm, avgDailyUsage: e.target.value })}
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 pb-8 overflow-y-auto">
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
                <div className="text-[10px]">فاتورة طلب / إيصال استلام</div>
                <div className="text-[10px]">
                  {selectedOrderForPrint.orderNumber} •{" "}
                  {selectedOrderForPrint.orderType === "DINE_IN"
                    ? `ترابيزة ${selectedOrderForPrint.tableNumber || "1"}`
                    : selectedOrderForPrint.orderType === "DELIVERY"
                    ? "دليفري للمنزل"
                    : "تيك أواي"}
                </div>
                {(selectedOrderForPrint.isEdited || selectedOrderForPrint.paymentModified) && (
                  <div className="mt-1 pt-1 border-t border-dashed border-black space-y-0.5 text-[10px] font-black">
                    {selectedOrderForPrint.isEdited && (
                      <div className="bg-black text-white px-2 py-0.5 inline-block">
                        *** فاتورة معدلة (تعديل #{selectedOrderForPrint.revisionCount || 1}) ***
                      </div>
                    )}
                    {selectedOrderForPrint.paymentModified && (
                      <div className="border border-black px-2 py-0.5 inline-block mr-1">
                        *** تعديل دفع ***
                      </div>
                    )}
                    {selectedOrderForPrint.lastEditReason && (
                      <div className="text-[9px] font-bold">
                        السبب: {selectedOrderForPrint.lastEditReason}
                        {selectedOrderForPrint.lastEditedBy ? ` (${selectedOrderForPrint.lastEditedBy})` : ""}
                      </div>
                    )}
                  </div>
                )}
                {selectedOrderForPrint.isScheduled && selectedOrderForPrint.scheduledFor && (
                  <div className="text-[10px] font-bold">
                    📅 موعد الحجز والتسليم: {new Date(selectedOrderForPrint.scheduledFor).toLocaleString("ar-EG")}
                  </div>
                )}
                {selectedOrderForPrint.deliveryZoneName && (
                  <div className="text-[10px] font-bold">
                    منطقة التوصيل: {selectedOrderForPrint.deliveryZoneName}
                  </div>
                )}
                {selectedOrderForPrint.driverName && (
                  <div className="text-[10px]">
                    الطيار / المندوب: {selectedOrderForPrint.driverName}
                    {(selectedOrderForPrint.driverPhone || selectedOrderForPrint.driver?.phone) &&
                      ` (${selectedOrderForPrint.driverPhone || selectedOrderForPrint.driver?.phone})`}
                  </div>
                )}
                {selectedOrderForPrint.deliveryAddress && (
                  <div className="text-[10px] text-slate-700">
                    العنوان: {selectedOrderForPrint.deliveryAddress}
                  </div>
                )}
                {(selectedOrderForPrint.deliveryPhone || selectedOrderForPrint.customerPhone) && (
                  <div className="text-[10px]">
                    موبايل العميل: {selectedOrderForPrint.deliveryPhone || selectedOrderForPrint.customerPhone}
                  </div>
                )}
                <div className="text-[10px]">
                  {new Date(selectedOrderForPrint.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>

              <div className="space-y-1 my-2 text-[10px]">
                {(() => {
                  try {
                    const its = JSON.parse(selectedOrderForPrint.items || "[]");
                    return its.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span>{formatAdminQty(it.qty, it.unitType)} × {it.nameAr}</span>
                        <span>{Math.round(Number(it.price) * Number(it.qty) * 100) / 100} ج</span>
                      </div>
                    ));
                  } catch {
                    return null;
                  }
                })()}
              </div>

              <div className="border-t border-black pt-2 mt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-[10px]">
                  <span>قيمة الأصناف (إيراد المحل):</span>
                  <span>{getStoreNet(selectedOrderForPrint)} ج.م</span>
                </div>
                {Number(selectedOrderForPrint.deliveryFee) > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span>رسوم التوصيل (مستحق الطيار):</span>
                    <span>{selectedOrderForPrint.deliveryFee} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                  <span>{selectedOrderForPrint.paymentStatus === "PAID" ? "الإجمالي المدفوع:" : "الإجمالي المستحق:"}</span>
                  <span>{selectedOrderForPrint.finalAmount} ج.م</span>
                </div>
                {selectedOrderForPrint.isScheduled && Number(selectedOrderForPrint.depositPaid) > 0 && (
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>عربون مدفوع: {selectedOrderForPrint.depositPaid} ج</span>
                    <span>المتبقي: {Math.max(0, Number(selectedOrderForPrint.finalAmount) - Number(selectedOrderForPrint.depositPaid))} ج</span>
                  </div>
                )}
                <div className="text-[10px] text-center pt-2">
                  طريقة السداد: {PAYMENT_METHOD_LABELS[selectedOrderForPrint.paymentMethod] || selectedOrderForPrint.paymentMethod}
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
                <span>طباعة الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN IMAGE PREVIEW LIGHTBOX (RECEIPTS / CHAT ATTACHMENTS) */}
      {previewAdminImage && (
        <div
          onClick={() => setPreviewAdminImage(null)}
          className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-sm flex items-start justify-center p-4 pt-8 sm:pt-12 pb-8 overflow-y-auto"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-3">
            <button
              type="button"
              onClick={() => setPreviewAdminImage(null)}
              className="absolute left-4 top-4 bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewAdminImage}
              alt="معاينة الصورة"
              className="w-full max-h-[80vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}

      {/* 2-QR CARD MODAL */}
      <CardQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        activeTable="T-01"
      />

      {/* DAILY 8PM MANAGER BRIEF & REPEATING ALARM */}
      {(isOwner || isBranchManager) && (
        <AdminDailyAlertAndBriefModal
          currentUser={currentUser}
          settings={settings}
          onSettingsUpdated={(newSettings) => setSettings(newSettings)}
          onRefreshDashboard={fetchDashboardData}
          externalOpenSignal={dailyReportSignal}
          onStatusChange={setDailyAlertStatus}
        />
      )}

      {/* ORDER REVISION & PAYMENT CHANGE MODALS */}
      <OrderRevisionModals
        mode={revisionModalMode}
        order={revisionTargetOrder}
        menuItems={menuItems}
        defaultActorName={currentUser?.name || "إدارة المنظومة"}
        onClose={() => {
          setRevisionModalMode(null);
          setRevisionTargetOrder(null);
        }}
        onSuccess={(updatedOrder, message, shouldPrint) => {
          setRevisionModalMode(null);
          setRevisionTargetOrder(null);
          setOrders((prev) => prev.map((x) => (x.id === updatedOrder.id ? updatedOrder : x)));
          if (shouldPrint || selectedOrderForPrint?.id === updatedOrder.id) {
            setSelectedOrderForPrint(updatedOrder);
          }
          addToast("success", message);
          fetchDashboardData();
        }}
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
