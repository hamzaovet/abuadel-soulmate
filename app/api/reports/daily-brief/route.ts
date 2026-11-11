import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGroupDebtSplit } from "@/lib/procurement";

export const dynamic = "force-dynamic";

function getCairoTodayDateStr() {
  const now = new Date();
  const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const y = cairo.getUTCFullYear();
  const m = String(cairo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(cairo.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCairoTomorrowDateStr(baseDateStr: string) {
  const base = new Date(`${baseDateStr}T12:00:00+02:00`);
  const next = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  const cairo = new Date(next.getTime() + 2 * 60 * 60 * 1000);
  const y = cairo.getUTCFullYear();
  const m = String(cairo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(cairo.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || getCairoTodayDateStr();
    const tomorrowStr = getCairoTomorrowDateStr(dateStr);

    const start = new Date(`${dateStr}T00:00:00+02:00`);
    const end = new Date(`${dateStr}T23:59:59.999+02:00`);
    const tmrStart = new Date(`${tomorrowStr}T00:00:00+02:00`);
    const tmrEnd = new Date(`${tomorrowStr}T23:59:59.999+02:00`);
    const sevenDaysAgo = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      settings,
      outlets,
      todayOrders,
      tomorrowPreOrders,
      todayExpenses,
      openShifts,
      abuAdelProducts,
      todayMovements,
      rawMaterials,
      suppliers,
    ] = await Promise.all([
      prisma.systemSettings.findFirst(),
      prisma.outlet.findMany(),
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: "CANCELLED" },
        },
        include: { outlet: { select: { id: true, name: true, code: true } } },
      }),
      prisma.order.findMany({
        where: {
          isScheduled: true,
          status: { not: "CANCELLED" },
          scheduledFor: { gte: tmrStart, lte: tmrEnd },
        },
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { outlet: { select: { id: true, name: true, code: true } } },
      }),
      prisma.shift.findMany({
        where: { status: "OPEN" },
        include: { outlet: { select: { id: true, name: true, code: true } } },
      }),
      prisma.menuItem.findMany({
        where: { outlet: { code: "ABU_ADEL_PATISSERIE" } },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { nameAr: "asc" }],
      }),
      prisma.productMovement.findMany({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.rawMaterial.findMany({
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          movements: {
            where: { type: "CONSUMPTION", createdAt: { gte: sevenDaysAgo } },
          },
        },
        orderBy: { currentStock: "asc" },
      }),
      prisma.supplier.findMany({
        include: { transactions: true },
      }),
    ]);

    // 1. Outlet Cashier & Treasury Audit Summary
    const getStoreNet = (o: any) =>
      Math.max(0, (Number(o.finalAmount) || 0) - (Number(o.deliveryFee) || 0));

    const branchAudit = outlets.map((out) => {
      const branchOrders = todayOrders.filter((o) => o.outletId === out.id);
      const paidOrders = branchOrders.filter((o) => o.paymentStatus === "PAID");
      const branchExpenses = todayExpenses.filter((e) => e.outletId === out.id);
      const openShift = openShifts.find((s) => s.outletId === out.id);

      const storeRevenue = paidOrders.reduce((s, o) => s + getStoreNet(o), 0);
      const cashSales = paidOrders
        .filter((o) => o.paymentMethod === "CASH")
        .reduce((s, o) => s + getStoreNet(o), 0);
      const visaSales = paidOrders
        .filter((o) => o.paymentMethod === "CARD")
        .reduce((s, o) => s + getStoreNet(o), 0);
      const instapaySales = paidOrders
        .filter((o) => o.paymentMethod === "INSTAPAY")
        .reduce((s, o) => s + getStoreNet(o), 0);
      const vodafoneSales = paidOrders
        .filter((o) => o.paymentMethod === "VODAFONE_CASH")
        .reduce((s, o) => s + getStoreNet(o), 0);
      const deliveryFeesTotal = paidOrders.reduce((s, o) => s + (Number(o.deliveryFee) || 0), 0);
      const expensesTotal = branchExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const openingFloat = Number(openShift?.openingCashFloat || 0);
      const expectedCashInDrawer = openingFloat + cashSales - expensesTotal;

      return {
        outletId: out.id,
        outletName: out.name,
        outletCode: out.code,
        ordersCount: branchOrders.length,
        paidCount: paidOrders.length,
        unpaidCount: branchOrders.length - paidOrders.length,
        storeRevenue: Number(storeRevenue.toFixed(2)),
        cashSales: Number(cashSales.toFixed(2)),
        visaSales: Number(visaSales.toFixed(2)),
        instapaySales: Number(instapaySales.toFixed(2)),
        vodafoneSales: Number(vodafoneSales.toFixed(2)),
        deliveryFeesTotal: Number(deliveryFeesTotal.toFixed(2)),
        expensesTotal: Number(expensesTotal.toFixed(2)),
        openingFloat: Number(openingFloat.toFixed(2)),
        expectedCashInDrawer: Number(expectedCashInDrawer.toFixed(2)),
        activeCashier: openShift?.openedBy || "غير محدد",
      };
    });

    // 2. Abu Adel Daily Par Level & Factory Procurement Needs
    const soldTodayByItem: Record<string, number> = {};
    const inboundTodayByItem: Record<string, number> = {};

    for (const m of todayMovements) {
      if (m.type === "SALE") {
        soldTodayByItem[m.menuItemId] = (soldTodayByItem[m.menuItemId] || 0) + Math.abs(m.quantity);
      } else if (m.type === "INBOUND") {
        inboundTodayByItem[m.menuItemId] = (inboundTodayByItem[m.menuItemId] || 0) + Number(m.quantity || 0);
      }
    }

    // Also inspect today's orders in case any direct non-pastry or custom item sold
    const preOrderTomorrowMap: Record<string, number> = {};
    for (const ord of tomorrowPreOrders) {
      let parsed: any[] = [];
      try {
        parsed = typeof ord.items === "string" ? JSON.parse(ord.items) : ord.items || [];
      } catch {
        parsed = [];
      }
      const isConfirmed = ord.depositStatus === "CONFIRMED" || (Number(ord.depositPaid) || 0) > 0;
      if (!isConfirmed) continue;
      for (const it of parsed) {
        if (!it.menuItemId) continue;
        preOrderTomorrowMap[it.menuItemId] =
          (preOrderTomorrowMap[it.menuItemId] || 0) + (Number(it.qty) || 0);
      }
    }

    const abuAdelReplenishment = abuAdelProducts.map((it) => {
      const currentStock = Number(it.stockQty || 0);
      const dailyLimit = Number(it.minStockAlert || 0);
      const soldToday = Number((soldTodayByItem[it.id] || 0).toFixed(3));
      const inboundToday = Number((inboundTodayByItem[it.id] || 0).toFixed(3));
      const shortageToDailyLimit = Math.max(0, Number((dailyLimit - currentStock).toFixed(3)));
      const confirmedPreOrderTomorrow = Number((preOrderTomorrowMap[it.id] || 0).toFixed(3));
      const totalFactoryOrderSuggested = Number(
        (shortageToDailyLimit + confirmedPreOrderTomorrow).toFixed(3)
      );

      return {
        menuItemId: it.id,
        nameAr: it.nameAr,
        category: it.category,
        unitType: it.unitType,
        price: it.price,
        costPrice: it.costPrice,
        currentStock,
        dailyLimit,
        soldToday,
        inboundToday,
        shortageToDailyLimit,
        confirmedPreOrderTomorrow,
        totalFactoryOrderSuggested,
      };
    });

    // 3. Soulmate Raw Materials & Carton Cups 21-Day (3 Weeks) Lead Time Alerts
    const rawMaterialAlerts = rawMaterials
      .map((raw) => {
        const consumed7d = raw.movements.reduce((s, m) => s + Math.abs(m.quantity), 0);
        const autoDaily = consumed7d / 7;
        const dailyUsage = Math.max(Number(raw.avgDailyUsage || 0), autoDaily);
        const daysRemaining =
          dailyUsage > 0 ? Number((raw.currentStock / dailyUsage).toFixed(1)) : 999;
        const leadTimeDays = Number(raw.leadTimeDays || 3);
        const recommendedOrderQty =
          dailyUsage > 0
            ? Math.max(0, Math.ceil(dailyUsage * leadTimeDays * 1.25 - raw.currentStock))
            : Math.max(0, Math.ceil(raw.minStockAlert * 1.5 - raw.currentStock));

        const isBelowMin = raw.currentStock <= raw.minStockAlert;
        const isWithinLeadTime = dailyUsage > 0 && daysRemaining <= leadTimeDays;
        const reorderUrgent = isBelowMin || isWithinLeadTime;

        return {
          id: raw.id,
          nameAr: raw.nameAr,
          unit: raw.unit,
          outletName: raw.outlet?.name || "سول ميت كافيه",
          currentStock: raw.currentStock,
          minStockAlert: raw.minStockAlert,
          leadTimeDays,
          estimatedDailyUsage: Number(dailyUsage.toFixed(2)),
          daysRemaining,
          reorderUrgent,
          recommendedOrderQty,
          isThreeWeekCup: leadTimeDays >= 14,
        };
      })
      .sort((a, b) => Number(b.reorderUrgent) - Number(a.reorderUrgent) || b.leadTimeDays - a.leadTimeDays);

    // 4. Debt Split Snapshot
    let factoryDebt = 0;
    let rawSuppliersDebt = 0;
    let soulmateToAbuAdelDebt = 0;
    for (const sup of suppliers) {
      let bal = Number(sup.openingBalance || 0);
      for (const tx of sup.transactions) {
        if (tx.type === "INVOICE") bal += Number(tx.totalAmount || 0);
        else if (tx.type === "PAYMENT" || tx.type === "RETURN") bal -= Number(tx.totalAmount || 0);
        else if (tx.type === "ADJUSTMENT") bal += Number(tx.totalAmount || 0);
      }
      if (sup.isInternalSupply || sup.supplierType === "INTERNAL_ABU_ADEL") {
        soulmateToAbuAdelDebt += Math.max(0, bal);
      } else if (sup.supplierType === "FACTORY") {
        factoryDebt += Math.max(0, bal);
      } else {
        rawSuppliersDebt += Math.max(0, bal);
      }
    }

    const debtSplit = calculateGroupDebtSplit({
      factoryDebt,
      rawSuppliersDebt,
      soulmateToAbuAdelDebt,
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      tomorrowDate: tomorrowStr,
      alertSettings: {
        enabled: settings?.dailyReportAlertEnabled ?? true,
        alertTime: settings?.dailyReportAlertTime || "20:00",
        repeatSeconds: settings?.dailyReportRepeatSeconds || 4,
        soundEnabled: settings?.dailyReportAlertSound ?? true,
      },
      branchAudit,
      abuAdelReplenishment,
      factoryNeedsCount: abuAdelReplenishment.filter((x) => x.totalFactoryOrderSuggested > 0).length,
      rawMaterialAlerts,
      urgentRawCount: rawMaterialAlerts.filter((x) => x.reorderUrgent).length,
      debtSplit,
    });
  } catch (error: any) {
    console.error("[DAILY_BRIEF_GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
