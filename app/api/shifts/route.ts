import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const getStoreNet = (o: { finalAmount: number; deliveryFee?: number | null }) =>
  Math.max(0, (Number(o.finalAmount) || 0) - (Number(o.deliveryFee) || 0));

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    const whereOutlet: any = {};
    if (outletId && outletId !== "ALL") {
      whereOutlet.outletId = outletId;
    }

    // Find current OPEN shift
    let openShift = await prisma.shift.findFirst({
      where: {
        ...whereOutlet,
        status: "OPEN",
      },
      orderBy: { openedAt: "desc" },
      include: { outlet: true },
    });

    // If no open shift, create one automatically with 0 opening cash float (editable anytime)
    if (!openShift) {
      const defaultOutlet = await prisma.outlet.findFirst({
        where: outletId && outletId !== "ALL" ? { id: outletId } : {},
      });

      if (defaultOutlet) {
        const count = await prisma.shift.count({ where: { outletId: defaultOutlet.id } });
        const shiftNum = (count % 2) + 1; // 1 or 2
        openShift = await prisma.shift.create({
          data: {
            outletId: defaultOutlet.id,
            shiftNumber: shiftNum,
            openedBy: "كاشير الوردية",
            openingCashFloat: 0,
            status: "OPEN",
          },
          include: { outlet: true },
        });
      }
    }

    // Calculate live statistics for orders settled during this open shift (EXCLUDING deliveryFee from store revenue)
    const shiftStartTime = openShift ? openShift.openedAt : new Date(Date.now() - 24 * 3600 * 1000);

    const shiftOrders = await prisma.order.findMany({
      where: {
        ...whereOutlet,
        paymentStatus: "PAID",
        settledAt: { gte: shiftStartTime },
      },
    });

    // Also inspect all delivery orders created/dispatched during this shift (even if still OUT_FOR_DELIVERY)
    const shiftDeliveryOrders = await prisma.order.findMany({
      where: {
        ...whereOutlet,
        orderType: "DELIVERY",
        status: { not: "CANCELLED" },
        createdAt: { gte: shiftStartTime },
      },
    });

    const shiftExpenses = await prisma.expense.findMany({
      where: {
        ...whereOutlet,
        createdAt: { gte: shiftStartTime },
      },
    });

    const cashCollected = shiftOrders
      .filter((o) => o.paymentMethod === "CASH")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const visaCollected = shiftOrders
      .filter((o) => o.paymentMethod === "CARD")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const instapayCollected = shiftOrders
      .filter((o) => o.paymentMethod === "INSTAPAY")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const vodafoneCollected = shiftOrders
      .filter((o) => o.paymentMethod === "VODAFONE_CASH")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const totalRevenue = shiftOrders.reduce((sum, o) => sum + getStoreNet(o), 0);
    const deliveryFeesTotal = shiftOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const deliveryFeesAllOrders = shiftDeliveryOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const deliveryFeesCash = shiftOrders
      .filter((o) => o.paymentMethod === "CASH")
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const deliveryFeesElectronic = Math.max(0, deliveryFeesTotal - deliveryFeesCash);

    const expensesTotal = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

    // IMPORTANT: Never coerce 0 to 500!
    const openingFloat = openShift?.openingCashFloat ?? 0;
    const expectedCash = openingFloat + cashCollected - expensesTotal;

    // Driver settlement breakdown for current shift
    const driverMap: Record<
      string,
      { driverName: string; driverPhone: string; tripsCount: number; deliveryFeesDue: number; cashFromCustomers: number; storeNetDue: number }
    > = {};
    for (const o of shiftDeliveryOrders) {
      const key = `${o.driverName || "غير محدد"}|${o.driverPhone || ""}`;
      if (!driverMap[key]) {
        driverMap[key] = {
          driverName: o.driverName || "غير محدد",
          driverPhone: o.driverPhone || "",
          tripsCount: 0,
          deliveryFeesDue: 0,
          cashFromCustomers: 0,
          storeNetDue: 0,
        };
      }
      driverMap[key].tripsCount += 1;
      driverMap[key].deliveryFeesDue += Number(o.deliveryFee) || 0;
      if (o.paymentMethod === "CASH") {
        driverMap[key].cashFromCustomers += Number(o.finalAmount) || 0;
        driverMap[key].storeNetDue += getStoreNet(o);
      }
    }

    const liveStats = {
      openingFloat: Number(openingFloat.toFixed(2)),
      cashCollected: Number(cashCollected.toFixed(2)),
      visaCollected: Number(visaCollected.toFixed(2)),
      instapayCollected: Number(instapayCollected.toFixed(2)),
      vodafoneCollected: Number(vodafoneCollected.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      deliveryFeesTotal: Number(deliveryFeesTotal.toFixed(2)),
      deliveryFeesAllOrders: Number(deliveryFeesAllOrders.toFixed(2)),
      deliveryFeesCash: Number(deliveryFeesCash.toFixed(2)),
      deliveryFeesElectronic: Number(deliveryFeesElectronic.toFixed(2)),
      expensesTotal: Number(expensesTotal.toFixed(2)),
      expectedCash: Number(expectedCash.toFixed(2)),
      ticketsCount: shiftOrders.length,
      driverBreakdown: Object.values(driverMap),
    };

    // Last closed shift for reprint
    const lastClosedShift = await prisma.shift.findFirst({
      where: {
        ...whereOutlet,
        status: "CLOSED",
      },
      orderBy: { closedAt: "desc" },
      include: { outlet: true },
    });

    // Recent Daily Closes (إقفالات اليومية)
    const dailyCloses = await prisma.dailyClose.findMany({
      where: whereOutlet,
      orderBy: { closeDate: "desc" },
      take: 10,
      include: { outlet: true },
    });

    return NextResponse.json({
      success: true,
      openShift,
      liveStats,
      lastClosedShift,
      dailyCloses,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      shiftId,
      outletId,
      shiftType, // "SHIFT_1" (صباحية) | "SHIFT_2" (مسائية)
      actualCash,
      handedTo,
      notes,
      closedBy,
    } = body;

    // ─────────────────────────────────────────────────────────────
    // 1. ACTION: DAILY CLOSE (إقفال اليومية الشاملة لكافة الشيفتات)
    // ─────────────────────────────────────────────────────────────
    if (action === "DAILY_CLOSE") {
      const targetOutletId = outletId;
      if (!targetOutletId) {
        return NextResponse.json({ success: false, error: "معرف الفرع مطلوب لإقفال اليومية" }, { status: 400 });
      }

      // Find all shifts closed today (or within last 24h)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayShifts = await prisma.shift.findMany({
        where: {
          outletId: targetOutletId,
          closedAt: { gte: startOfDay },
        },
      });

      const todayOrders = await prisma.order.findMany({
        where: {
          outletId: targetOutletId,
          paymentStatus: "PAID",
          settledAt: { gte: startOfDay },
        },
      });

      const todayExpenses = await prisma.expense.findMany({
        where: {
          outletId: targetOutletId,
          createdAt: { gte: startOfDay },
        },
      });

      const totalCash = todayOrders
        .filter((o) => o.paymentMethod === "CASH")
        .reduce((sum, o) => sum + getStoreNet(o), 0);

      const totalVisa = todayOrders
        .filter((o) => o.paymentMethod === "CARD")
        .reduce((sum, o) => sum + getStoreNet(o), 0);

      const totalInstapay = todayOrders
        .filter((o) => o.paymentMethod === "INSTAPAY")
        .reduce((sum, o) => sum + getStoreNet(o), 0);

      const totalVodafone = todayOrders
        .filter((o) => o.paymentMethod === "VODAFONE_CASH")
        .reduce((sum, o) => sum + getStoreNet(o), 0);

      const totalRevenue = todayOrders.reduce((sum, o) => sum + getStoreNet(o), 0);
      const totalDeliveryFees = todayOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
      const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netCashInSafe = Math.max(0, totalCash - totalExpenses);

      const daysOfWeek = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dayName = daysOfWeek[new Date().getDay()];

      const dailyClose = await prisma.dailyClose.create({
        data: {
          outletId: targetOutletId,
          dayName,
          shiftsCount: Math.max(1, todayShifts.length),
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCash: Number(totalCash.toFixed(2)),
          totalVisa: Number(totalVisa.toFixed(2)),
          totalInstapay: Number(totalInstapay.toFixed(2)),
          totalVodafone: Number(totalVodafone.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          netCashInSafe: Number(netCashInSafe.toFixed(2)),
          ordersCount: todayOrders.length,
          closedBy: closedBy || "المايسترو (المالك)",
          notes:
            notes?.trim() ||
            (totalDeliveryFees > 0 ? `رسوم التوصيل المنفصلة للطيارين: ${totalDeliveryFees} ج.م` : null),
        },
        include: { outlet: true },
      });

      return NextResponse.json({
        success: true,
        message: `تم اعتماد تقرير إقفال اليومية الشامل ليوم (${dayName}) بنجاح بمجموع إيراد محل ${totalRevenue} ج.م (مستقل عن ${totalDeliveryFees} ج.م رسوم طيارين) 📑✨`,
        dailyClose,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 1.5 ACTION: UPDATE OPENING CASH FLOAT (تعديل رصيد بداية الدرج 0 أو أي مبلغ)
    // ─────────────────────────────────────────────────────────────
    if (action === "UPDATE_OPENING_FLOAT") {
      if (!shiftId) {
        return NextResponse.json({ success: false, error: "معرف الوردية مطلوب" }, { status: 400 });
      }
      const nextFloat = Math.max(0, Number(body.openingCashFloat) || 0);
      const updatedShift = await prisma.shift.update({
        where: { id: shiftId },
        data: { openingCashFloat: Number(nextFloat.toFixed(2)) },
        include: { outlet: true },
      });
      return NextResponse.json({
        success: true,
        shift: updatedShift,
        message: `تم تحديث عهدة بداية الدرج إلى ${nextFloat} ج.م بنجاح 💵`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTION: SHIFT CLOSE (إقفال الوردية الحالية - صباحية / مسائية)
    // ─────────────────────────────────────────────────────────────
    if (!shiftId) {
      return NextResponse.json({ success: false, error: "معرف الوردية مطلوب" }, { status: 400 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { outlet: true },
    });

    if (!shift) {
      return NextResponse.json({ success: false, error: "الوردية غير موجودة" }, { status: 404 });
    }

    // Calculate final metrics from orders & expenses
    const shiftOrders = await prisma.order.findMany({
      where: {
        outletId: shift.outletId,
        paymentStatus: "PAID",
        settledAt: { gte: shift.openedAt },
      },
    });

    const shiftExpenses = await prisma.expense.findMany({
      where: {
        outletId: shift.outletId,
        createdAt: { gte: shift.openedAt },
      },
    });

    const cashCollected = shiftOrders
      .filter((o) => o.paymentMethod === "CASH")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const visaCollected = shiftOrders
      .filter((o) => o.paymentMethod === "CARD")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const instapayCollected = shiftOrders
      .filter((o) => o.paymentMethod === "INSTAPAY")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const vodafoneCollected = shiftOrders
      .filter((o) => o.paymentMethod === "VODAFONE_CASH")
      .reduce((sum, o) => sum + getStoreNet(o), 0);

    const totalRevenue = shiftOrders.reduce((sum, o) => sum + getStoreNet(o), 0);
    const deliveryFeesTotal = shiftOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const expensesTotal = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = shift.openingCashFloat + cashCollected - expensesTotal;
    const actual = Number(actualCash) || 0;
    const difference = actual - expectedCash;

    // Shift number naming: 1 = صباحية, 2 = مسائية
    const assignedShiftNum = shiftType === "SHIFT_2" ? 2 : shiftType === "SHIFT_1" ? 1 : shift.shiftNumber;

    const closedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        shiftNumber: assignedShiftNum,
        closedAt: new Date(),
        closedBy: closedBy || "الكاشير",
        expectedCash: Number(expectedCash.toFixed(2)),
        actualCash: Number(actual.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        cashCollected: Number(cashCollected.toFixed(2)),
        visaCollected: Number(visaCollected.toFixed(2)),
        instapayCollected: Number(instapayCollected.toFixed(2)),
        vodafoneCollected: Number(vodafoneCollected.toFixed(2)),
        deliveryFeesTotal: Number(deliveryFeesTotal.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        expensesTotal: Number(expensesTotal.toFixed(2)),
        ticketsCount: shiftOrders.length,
        handedTo: handedTo || "المايسترو (المالك) 👑",
        notes: notes?.trim() || null,
      },
      include: { outlet: true },
    });

    // Automatically open next shift with 0 opening cash float (editable anytime by cashier/admin)
    const nextShiftNum = assignedShiftNum === 1 ? 2 : 1;
    await prisma.shift.create({
      data: {
        outletId: shift.outletId,
        shiftNumber: nextShiftNum,
        openedBy: closedBy || "الكاشير",
        openingCashFloat: 0,
        status: "OPEN",
      },
    });

    const shiftLabel = assignedShiftNum === 1 ? "الصباحية (#1)" : "المسائية (#2)";

    return NextResponse.json({
      success: true,
      message: `تم إقفال وتسليم الوردية ${shiftLabel} بنجاح وطباعة تقرير Z-Report 🔒`,
      closedShift,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
