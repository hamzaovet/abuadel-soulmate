import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // If no open shift, create one automatically
    if (!openShift) {
      const defaultOutlet = await prisma.outlet.findFirst({
        where: outletId && outletId !== "ALL" ? { id: outletId } : {},
      });

      if (defaultOutlet) {
        const count = await prisma.shift.count({ where: { outletId: defaultOutlet.id } });
        openShift = await prisma.shift.create({
          data: {
            outletId: defaultOutlet.id,
            shiftNumber: count + 1,
            openedBy: "كاشير الوردية",
            openingCashFloat: 500,
            status: "OPEN",
          },
          include: { outlet: true },
        });
      }
    }

    // Calculate live statistics for orders created during this open shift
    const shiftStartTime = openShift ? openShift.openedAt : new Date(Date.now() - 24 * 3600 * 1000);

    const shiftOrders = await prisma.order.findMany({
      where: {
        ...whereOutlet,
        paymentStatus: "PAID",
        settledAt: { gte: shiftStartTime },
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
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const visaCollected = shiftOrders
      .filter((o) => o.paymentMethod === "CARD")
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const instapayCollected = shiftOrders
      .filter((o) => o.paymentMethod === "INSTAPAY")
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const vodafoneCollected = shiftOrders
      .filter((o) => o.paymentMethod === "VODAFONE_CASH")
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const totalRevenue = shiftOrders.reduce((sum, o) => sum + o.finalAmount, 0);
    const expensesTotal = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

    const openingFloat = openShift?.openingCashFloat || 500;
    const expectedCash = openingFloat + cashCollected - expensesTotal;

    const liveStats = {
      openingFloat,
      cashCollected,
      visaCollected,
      instapayCollected,
      vodafoneCollected,
      totalRevenue,
      expensesTotal,
      expectedCash,
      ticketsCount: shiftOrders.length,
    };

    // Also get last closed shift for receipt reprint
    const lastClosedShift = await prisma.shift.findFirst({
      where: {
        ...whereOutlet,
        status: "CLOSED",
      },
      orderBy: { closedAt: "desc" },
      include: { outlet: true },
    });

    return NextResponse.json({
      success: true,
      openShift,
      liveStats,
      lastClosedShift,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      shiftId,
      actualCash,
      handedTo,
      notes,
      closedBy,
    } = body;

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
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const visaCollected = shiftOrders
      .filter((o) => o.paymentMethod === "CARD")
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const instapayCollected = shiftOrders
      .filter((o) => o.paymentMethod === "INSTAPAY")
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const vodafoneCollected = shiftOrders
      .filter((o) => o.paymentMethod === "VODAFONE_CASH")
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const totalRevenue = shiftOrders.reduce((sum, o) => sum + o.finalAmount, 0);
    const expensesTotal = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = shift.openingCashFloat + cashCollected - expensesTotal;
    const actual = Number(actualCash) || 0;
    const difference = actual - expectedCash;

    const closedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: closedBy || "الكاشير",
        expectedCash: Number(expectedCash.toFixed(2)),
        actualCash: Number(actual.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        cashCollected: Number(cashCollected.toFixed(2)),
        visaCollected: Number(visaCollected.toFixed(2)),
        instapayCollected: Number(instapayCollected.toFixed(2)),
        vodafoneCollected: Number(vodafoneCollected.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        expensesTotal: Number(expensesTotal.toFixed(2)),
        ticketsCount: shiftOrders.length,
        handedTo: handedTo || "المايسترو (المالك) 👑",
        notes: notes?.trim() || null,
      },
      include: { outlet: true },
    });

    // Automatically open a fresh next shift
    const nextCount = await prisma.shift.count({ where: { outletId: shift.outletId } });
    await prisma.shift.create({
      data: {
        outletId: shift.outletId,
        shiftNumber: nextCount + 1,
        openedBy: closedBy || "الكاشير",
        openingCashFloat: 500,
        status: "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم إقفال وتسليم الوردية رقم #${shift.shiftNumber} بنجاح وطباعة تقرير Z-Report 🔒`,
      closedShift,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
