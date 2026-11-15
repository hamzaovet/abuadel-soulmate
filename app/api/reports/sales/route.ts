import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const timeframe = (searchParams.get("timeframe") || "TODAY").toUpperCase(); // TODAY, YESTERDAY, WEEK, MONTH, ALL, CUSTOM
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const now = new Date();
    // Cairo time calculations (UTC+2)
    const cairoOffsetMs = 2 * 60 * 60 * 1000;
    const cairoNow = new Date(now.getTime() + cairoOffsetMs);

    let startDate: Date;
    let endDate: Date;

    const y = cairoNow.getUTCFullYear();
    const m = cairoNow.getUTCMonth();
    const d = cairoNow.getUTCDate();

    if (timeframe === "TODAY") {
      startDate = new Date(Date.UTC(y, m, d, 0, 0, 0) - cairoOffsetMs);
      endDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - cairoOffsetMs);
    } else if (timeframe === "YESTERDAY") {
      startDate = new Date(Date.UTC(y, m, d - 1, 0, 0, 0) - cairoOffsetMs);
      endDate = new Date(Date.UTC(y, m, d - 1, 23, 59, 59, 999) - cairoOffsetMs);
    } else if (timeframe === "WEEK") {
      startDate = new Date(Date.UTC(y, m, d - 6, 0, 0, 0) - cairoOffsetMs);
      endDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - cairoOffsetMs);
    } else if (timeframe === "MONTH") {
      startDate = new Date(Date.UTC(y, m, 1, 0, 0, 0) - cairoOffsetMs);
      endDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - cairoOffsetMs);
    } else if (timeframe === "CUSTOM" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      // ALL: past 90 days
      startDate = new Date(Date.UTC(y, m, d - 90, 0, 0, 0) - cairoOffsetMs);
      endDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - cairoOffsetMs);
    }

    // Build Prisma query where
    const orderWhere: any = {
      status: { not: "CANCELLED" },
      createdAt: { gte: startDate, lte: endDate },
    };

    if (outletId && outletId !== "ALL") {
      orderWhere.outletId = outletId;
    }

    const [orders, outlets, menuItems, expenses] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: {
          outlet: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.outlet.findMany({ select: { id: true, name: true, code: true } }),
      prisma.menuItem.findMany({
        select: {
          id: true,
          nameAr: true,
          category: true,
          unitType: true,
          price: true,
          costPrice: true,
          outletId: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(outletId && outletId !== "ALL" ? { outletId } : {}),
        },
      }),
    ]);

    // Financial totals
    let totalGrossSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalService = 0;
    let totalDeliveryFees = 0;
    let totalTips = 0;
    let totalRevenue = 0; // Net store revenue
    let totalCOGS = 0;

    const paymentMethods: Record<string, { label: string; count: number; total: number }> = {
      CASH: { label: "نقدي (كاش)", count: 0, total: 0 },
      CARD: { label: "فيزا / بطاقة", count: 0, total: 0 },
      INSTAPAY: { label: "إنستاباي", count: 0, total: 0 },
      VODAFONE_CASH: { label: "فودافون كاش", count: 0, total: 0 },
      TALABAT: { label: "طلبات (Talabat)", count: 0, total: 0 },
    };

    const orderTypes: Record<string, { label: string; count: number; total: number }> = {
      DINE_IN: { label: "صالة / ترابيزات", count: 0, total: 0 },
      TAKEAWAY: { label: "تيك أواي واستلام", count: 0, total: 0 },
      DELIVERY: { label: "دليفري منزلي", count: 0, total: 0 },
    };

    // Item-level Map
    const itemsMap: Record<
      string,
      {
        id: string;
        nameAr: string;
        category: string;
        unitType: string;
        outletId: string;
        outletName: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
        ordersCount: number;
        avgPrice: number;
      }
    > = {};

    // Categories Map
    const categoriesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    // Time Trend Map (Hourly for TODAY/YESTERDAY, Daily for WEEK/MONTH)
    const trendMap: Record<string, { period: string; ordersCount: number; revenue: number }> = {};

    // Process Orders
    for (const o of orders) {
      const finalAmt = Number(o.finalAmount) || 0;
      const delivFee = Number(o.deliveryFee) || 0;
      const storeNet = Math.max(0, finalAmt - delivFee);

      totalGrossSubtotal += Number(o.subtotal) || storeNet;
      totalDiscount += Number(o.discountAmount) || 0;
      totalTax += Number(o.taxAmount) || 0;
      totalService += Number(o.serviceCharge) || 0;
      totalDeliveryFees += delivFee;
      totalTips += Number(o.tipAmount) || 0;
      totalRevenue += storeNet;

      // Payment method tally
      const pm = (o.paymentMethod || "CASH").toUpperCase();
      if (!paymentMethods[pm]) {
        paymentMethods[pm] = { label: pm, count: 0, total: 0 };
      }
      paymentMethods[pm].count += 1;
      paymentMethods[pm].total += finalAmt;

      // Order type tally
      const ot = (o.orderType || "TAKEAWAY").toUpperCase();
      if (!orderTypes[ot]) {
        orderTypes[ot] = { label: ot, count: 0, total: 0 };
      }
      orderTypes[ot].count += 1;
      orderTypes[ot].total += storeNet;

      // Time Trend Key
      const oDate = new Date(o.createdAt);
      const cDate = new Date(oDate.getTime() + cairoOffsetMs);
      let periodKey = "";
      if (timeframe === "TODAY" || timeframe === "YESTERDAY") {
        const hour = cDate.getUTCHours();
        periodKey = `${hour}:00 - ${hour + 1}:00`;
      } else {
        const dayStr = cDate.toISOString().slice(0, 10);
        periodKey = dayStr;
      }

      if (!trendMap[periodKey]) {
        trendMap[periodKey] = { period: periodKey, ordersCount: 0, revenue: 0 };
      }
      trendMap[periodKey].ordersCount += 1;
      trendMap[periodKey].revenue += storeNet;

      // Parse Items
      let lines: any[] = [];
      try {
        lines = typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
      } catch {
        lines = [];
      }

      for (const line of lines) {
        const qty = Number(line.qty) || 1;
        const price = Number(line.price) || 0;
        const lineRev = price * qty;

        const catItem = menuItems.find(
          (m) => m.id === line.menuItemId || m.nameAr === line.nameAr
        );

        const unitCost = Number(line.costPrice) || Number(catItem?.costPrice) || 0;
        const lineCost = unitCost * qty;
        totalCOGS += lineCost;

        const itemKey = line.nameAr || line.menuItemId || "صنف غير مسمى";
        if (!itemsMap[itemKey]) {
          itemsMap[itemKey] = {
            id: line.menuItemId || itemKey,
            nameAr: itemKey,
            category: line.category || catItem?.category || "عام",
            unitType: line.unitType || catItem?.unitType || "PIECE",
            outletId: o.outletId,
            outletName: o.outlet?.name || "",
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            ordersCount: 0,
            avgPrice: price,
          };
        }

        itemsMap[itemKey].quantity += qty;
        itemsMap[itemKey].revenue += lineRev;
        itemsMap[itemKey].cost += lineCost;
        itemsMap[itemKey].profit += lineRev - lineCost;
        itemsMap[itemKey].ordersCount += 1;

        // Category tally
        const catKey = itemsMap[itemKey].category;
        if (!categoriesMap[catKey]) {
          categoriesMap[catKey] = { name: catKey, quantity: 0, revenue: 0 };
        }
        categoriesMap[catKey].quantity += qty;
        categoriesMap[catKey].revenue += lineRev;
      }
    }

    const itemsList = Object.values(itemsMap);
    // Sort items by revenue (default) and quantity
    const sortedByRevenue = [...itemsList].sort((a, b) => b.revenue - a.revenue);
    const sortedByQty = [...itemsList].sort((a, b) => b.quantity - a.quantity);
    const sortedByProfit = [...itemsList].sort((a, b) => b.profit - a.profit);

    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    const report = {
      success: true,
      timeframe,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalOrdersCount: orders.length,
        totalGrossSubtotal: Math.round(totalGrossSubtotal * 100) / 100,
        totalNetRevenue: Math.round(totalRevenue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalService: Math.round(totalService * 100) / 100,
        totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        averageTicketSize: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
      },
      items: {
        totalUniqueItemsSold: itemsList.length,
        byRevenue: sortedByRevenue,
        byQuantity: sortedByQty,
        byProfit: sortedByProfit,
        all: sortedByRevenue,
      },
      categories: Object.values(categoriesMap).sort((a, b) => b.revenue - a.revenue),
      paymentMethods: Object.values(paymentMethods).filter((p) => p.count > 0 || p.total > 0),
      orderTypes: Object.values(orderTypes).filter((t) => t.count > 0 || t.total > 0),
      timeTrend: Object.values(trendMap),
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("[Sales Report API Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
