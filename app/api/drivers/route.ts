import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List delivery drivers + optional active/completed dispatch stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const onlyActive = searchParams.get("onlyActive") === "true";
    const includeStats = searchParams.get("includeStats") === "true";

    const where: any = {};
    if (outletId) {
      where.OR = [{ outletId }, { outletId: null }];
    }
    if (onlyActive) {
      where.isActive = true;
    }

    const drivers = await prisma.deliveryDriver.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    if (!includeStats) {
      return NextResponse.json({ success: true, drivers });
    }

    // Aggregate today's (Cairo) delivery orders per driver for driver cash & delivery fee reconciliation
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deliveryOrders = await prisma.order.findMany({
      where: {
        orderType: "DELIVERY",
        status: { not: "CANCELLED" },
        createdAt: { gte: todayStart },
        ...(outletId ? { outletId } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        driverId: true,
        driverName: true,
        driverPhone: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        deliveryFee: true,
        finalAmount: true,
        dispatchedAt: true,
      },
    });

    const enrichedDrivers = drivers.map((drv) => {
      const matchedOrders = deliveryOrders.filter(
        (o) =>
          o.driverId === drv.id ||
          (o.driverName && o.driverName.trim() === drv.name.trim())
      );
      const activeOrdersCount = matchedOrders.filter(
        (o) => o.status === "OUT_FOR_DELIVERY"
      ).length;
      const completedOrdersCount = matchedOrders.filter(
        (o) => o.status === "COMPLETED"
      ).length;
      const totalDeliveryFeesDue = matchedOrders.reduce(
        (sum, o) => sum + (Number(o.deliveryFee) || 0),
        0
      );
      const totalCashToCollectFromCustomer = matchedOrders
        .filter((o) => o.paymentMethod === "CASH")
        .reduce((sum, o) => sum + (Number(o.finalAmount) || 0), 0);
      const storeNetFromDriver = Math.max(
        0,
        totalCashToCollectFromCustomer -
          matchedOrders
            .filter((o) => o.paymentMethod === "CASH")
            .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0)
      );

      return {
        ...drv,
        stats: {
          totalTrips: matchedOrders.length,
          activeOrdersCount,
          completedOrdersCount,
          totalDeliveryFeesDue,
          totalCashToCollectFromCustomer,
          storeNetFromDriver,
        },
      };
    });

    return NextResponse.json({ success: true, drivers: enrichedDrivers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في جلب قائمة الطيارين" },
      { status: 500 }
    );
  }
}

// POST: Add a new delivery driver dynamically
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, vehicleInfo, notes, outletId } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { success: false, error: "اسم الطيار ورقم الموبايل مطلوبان" },
        { status: 400 }
      );
    }

    const driver = await prisma.deliveryDriver.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        vehicleInfo: vehicleInfo?.trim() || null,
        notes: notes?.trim() || null,
        outletId: outletId || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      driver,
      message: `تمت إضافة الطيار "${driver.name}" (${driver.phone}) بنجاح 🛵`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في إضافة الطيار" },
      { status: 500 }
    );
  }
}

// PATCH: Update delivery driver details or active state
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, phone, vehicleInfo, notes, isActive, outletId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الطيار مطلوب" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (vehicleInfo !== undefined) updateData.vehicleInfo = vehicleInfo?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (outletId !== undefined) updateData.outletId = outletId || null;

    const driver = await prisma.deliveryDriver.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      driver,
      message: `تم تحديث بيانات الطيار "${driver.name}" بنجاح`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في تعديل بيانات الطيار" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a driver from directory (historical order snapshots preserved)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الطيار مطلوب" },
        { status: 400 }
      );
    }

    await prisma.deliveryDriver.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "تم حذف الطيار من السجل (تظل الفواتير السابقة محتفظة باسمه ورقمه)",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "تعذر حذف الطيار" },
      { status: 500 }
    );
  }
}
