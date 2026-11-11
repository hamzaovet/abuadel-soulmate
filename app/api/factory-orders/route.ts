import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getTodayCairoDateStr() {
  const now = new Date();
  const cairoMs = now.getTime() + 2 * 60 * 60 * 1000;
  const d = new Date(cairoMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTomorrowCairoDateStr() {
  const now = new Date();
  const cairoMs = now.getTime() + 2 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000;
  const d = new Date(cairoMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+02:00`);
  const end = new Date(`${dateStr}T23:59:59.999+02:00`);
  return { start, end };
}

// GET: Compute live daily factory procurement sheet (Shortages + Confirmed Scheduled Pre-Orders)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetDateStr = searchParams.get("targetDate") || getTomorrowCairoDateStr();
    const reqOutletId = searchParams.get("outletId");

    let outlet = reqOutletId
      ? await prisma.outlet.findUnique({ where: { id: reqOutletId } })
      : null;
    if (!outlet) {
      outlet = await prisma.outlet.findFirst({
        where: { code: "ABU_ADEL_PATISSERIE" },
      });
    }
    if (!outlet) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على فرع حلواني أبو عادل" },
        { status: 404 }
      );
    }

    const { start, end } = getDayBounds(targetDateStr);
    const todayBounds = getDayBounds(getTodayCairoDateStr());

    // 1. All Abu Adel menu items + today's sales movements
    const [items, todaySaleMovements] = await Promise.all([
      prisma.menuItem.findMany({
        where: { outletId: outlet.id },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { nameAr: "asc" }],
      }),
      prisma.productMovement.findMany({
        where: {
          type: "SALE",
          createdAt: { gte: todayBounds.start, lte: todayBounds.end },
          menuItem: { outletId: outlet.id },
        },
      }),
    ]);

    const soldTodayMap: Record<string, number> = {};
    for (const mv of todaySaleMovements) {
      soldTodayMap[mv.menuItemId] =
        (soldTodayMap[mv.menuItemId] || 0) + Math.abs(Number(mv.quantity || 0));
    }

    // 2. Scheduled Pre-Orders matching targetDate
    const scheduledOrders = await prisma.order.findMany({
      where: {
        outletId: outlet.id,
        isScheduled: true,
        status: { not: "CANCELLED" },
        scheduledFor: { gte: start, lte: end },
      },
      orderBy: { scheduledFor: "asc" },
    });

    // Aggregate pre-order quantities per menuItemId
    const confirmedMap: Record<string, number> = {};
    const pendingMap: Record<string, number> = {};

    for (const ord of scheduledOrders) {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof ord.items === "string" ? JSON.parse(ord.items) : ord.items || [];
      } catch {
        parsedItems = [];
      }

      const isConfirmed =
        ord.depositStatus === "CONFIRMED" || (Number(ord.depositPaid) || 0) > 0;

      for (const it of parsedItems) {
        const itemId = it.menuItemId;
        if (!itemId) continue;
        const qty = Number(it.qty) || 0;
        if (qty <= 0) continue;
        if (isConfirmed) {
          confirmedMap[itemId] = (confirmedMap[itemId] || 0) + qty;
        } else {
          pendingMap[itemId] = (pendingMap[itemId] || 0) + qty;
        }
      }
    }

    // 3. Existing saved FactoryOrder for targetDate if any
    const savedFactoryOrder = await prisma.factoryOrder.findFirst({
      where: {
        outletId: outlet.id,
        targetDate: { gte: start, lte: end },
      },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
    });

    const savedItemMap: Record<string, any> = {};
    if (savedFactoryOrder) {
      for (const si of savedFactoryOrder.items) {
        savedItemMap[si.menuItemId] = si;
      }
    }

    // 4. Build dynamic rows
    const rows = items.map((it) => {
      const currentStock = Number(it.stockQty || 0);
      const minStockLevel = Number(it.minStockAlert || 0);
      const shortageQty = Math.max(
        0,
        Number((minStockLevel - currentStock).toFixed(3))
      );
      const confirmedPreOrderQty = Number((confirmedMap[it.id] || 0).toFixed(3));
      const pendingPreOrderQty = Number((pendingMap[it.id] || 0).toFixed(3));
      const suggestedQty = Number((shortageQty + confirmedPreOrderQty).toFixed(3));
      const saved = savedItemMap[it.id];

      return {
        menuItemId: it.id,
        nameAr: it.nameAr,
        category: it.category,
        unitType: it.unitType,
        price: it.price,
        costPrice: it.costPrice,
        currentStock,
        soldToday: Number((soldTodayMap[it.id] || 0).toFixed(3)),
        minStockLevel,
        shortageQty,
        confirmedPreOrderQty,
        pendingPreOrderQty,
        suggestedQty,
        approvedQty:
          saved !== undefined ? Number(saved.approvedQty) : suggestedQty,
        notes: saved?.notes || "",
      };
    });

    // Also return recent saved factory order history (last 10)
    const history = await prisma.factoryOrder.findMany({
      where: { outletId: outlet.id },
      orderBy: { targetDate: "desc" },
      take: 10,
      include: {
        _count: { select: { items: true } },
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      outletId: outlet.id,
      targetDate: targetDateStr,
      savedFactoryOrder,
      rows,
      scheduledOrders,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في تحميل كشف المصنع" },
      { status: 500 }
    );
  }
}

// POST: Save/update editable factory sheet, update minStockAlert, or receive from factory into stock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = "SAVE_SHEET",
      outletId,
      targetDate,
      status = "DRAFT",
      createdBy = "المايسترو",
      notes = "",
      rows = [],
      menuItemId,
      minStockAlert,
      factoryOrderId,
    } = body;

    // Quick single-item minStockAlert update
    if (action === "UPDATE_MIN_STOCK") {
      if (!menuItemId) {
        return NextResponse.json(
          { success: false, error: "معرف الصنف مطلوب" },
          { status: 400 }
        );
      }
      const updated = await prisma.menuItem.update({
        where: { id: menuItemId },
        data: { minStockAlert: Math.max(0, Number(minStockAlert) || 0) },
      });
      return NextResponse.json({
        success: true,
        item: updated,
        message: `تم تحديث حد الأمان المطلوب لصنف "${updated.nameAr}" إلى ${updated.minStockAlert}`,
      });
    }

    let resolvedOutletId = outletId;
    if (!resolvedOutletId) {
      const outlet = await prisma.outlet.findFirst({
        where: { code: "ABU_ADEL_PATISSERIE" },
      });
      resolvedOutletId = outlet?.id;
    }
    if (!resolvedOutletId) {
      return NextResponse.json(
        { success: false, error: "فرع أبو عادل غير موجود" },
        { status: 404 }
      );
    }

    // Receive from Factory into Store Stock (creates INBOUND movements & increments stockQty)
    if (action === "RECEIVE_FROM_FACTORY") {
      if (!factoryOrderId) {
        return NextResponse.json(
          { success: false, error: "معرف طلبية المصنع مطلوب" },
          { status: 400 }
        );
      }
      const order = await prisma.factoryOrder.findUnique({
        where: { id: factoryOrderId },
        include: { items: true },
      });
      if (!order) {
        return NextResponse.json(
          { success: false, error: "طلبية المصنع غير موجودة" },
          { status: 404 }
        );
      }
      if (order.status === "RECEIVED") {
        return NextResponse.json(
          { success: false, error: "تم استلام هذه الطلبية وإضافتها للمخزن مسبقاً" },
          { status: 400 }
        );
      }

      const targetDateFormatted = new Date(order.targetDate)
        .toISOString()
        .slice(0, 10);

      for (const fi of order.items) {
        const qty = Number(fi.approvedQty || 0);
        if (qty <= 0) continue;

        const product = await prisma.menuItem.findUnique({
          where: { id: fi.menuItemId },
        });
        if (!product) continue;

        await prisma.menuItem.update({
          where: { id: product.id },
          data: {
            stockQty: Number(((product.stockQty || 0) + qty).toFixed(3)),
          },
        });

        await prisma.productMovement.create({
          data: {
            menuItemId: product.id,
            type: "INBOUND",
            quantity: qty,
            unitCost: product.costPrice || 0,
            totalCost: Number((qty * (product.costPrice || 0)).toFixed(2)),
            supplierName: "المصنع الرئيسي (طلبية يومية معتمدة)",
            invoiceNumber: `FAC-${targetDateFormatted}`,
            recordedBy: createdBy,
            notes: `توريد طلبية مصنع بتاريخ ${targetDateFormatted}${fi.notes ? ` — ${fi.notes}` : ""}`,
          },
        });
      }

      const updatedOrder = await prisma.factoryOrder.update({
        where: { id: order.id },
        data: { status: "RECEIVED" },
        include: { items: true },
      });

      return NextResponse.json({
        success: true,
        factoryOrder: updatedOrder,
        message: "تم استلام طلبية المصنع وإضافة جميع الكميات إلى مخزن أبو عادل بنجاح 📦✅",
      });
    }

    // SAVE_SHEET: Persist editable rows & optionally update minStockLevel
    const dateStr = targetDate || getTomorrowCairoDateStr();
    const { start, end } = getDayBounds(dateStr);

    // Sync any edited minStockLevel back to MenuItem
    for (const r of rows) {
      if (r.menuItemId && r.minStockLevel !== undefined) {
        await prisma.menuItem.update({
          where: { id: r.menuItemId },
          data: {
            minStockAlert: Math.max(0, Number(r.minStockLevel) || 0),
          },
        });
      }
    }

    const existing = await prisma.factoryOrder.findFirst({
      where: {
        outletId: resolvedOutletId,
        targetDate: { gte: start, lte: end },
      },
    });

    let savedOrder;
    const itemPayload = (Array.isArray(rows) ? rows : [])
      .filter(
        (r: any) =>
          Number(r.approvedQty || 0) > 0 ||
          Number(r.suggestedQty || 0) > 0 ||
          Number(r.confirmedPreOrderQty || r.preOrderQty || 0) > 0 ||
          (r.notes && String(r.notes).trim() !== "")
      )
      .map((r: any) => ({
        menuItemId: r.menuItemId,
        menuItemName: r.nameAr || r.menuItemName || "صنف",
        unitType: r.unitType || "PIECE",
        currentStock: Number(r.currentStock || 0),
        minStockLevel: Number(r.minStockLevel || 0),
        shortageQty: Number(r.shortageQty || 0),
        preOrderQty: Number(r.confirmedPreOrderQty ?? r.preOrderQty ?? 0),
        suggestedQty: Number(r.suggestedQty || 0),
        approvedQty: Math.max(0, Number(r.approvedQty || 0)),
        notes: r.notes || null,
      }));

    if (existing) {
      if (existing.status === "RECEIVED" && status !== "RECEIVED") {
        return NextResponse.json(
          {
            success: false,
            error: "تم استلام طلبية هذا التاريخ في المخزن بالفعل، لا يمكن إعادة فتحها",
          },
          { status: 400 }
        );
      }
      await prisma.factoryOrderItem.deleteMany({
        where: { factoryOrderId: existing.id },
      });
      savedOrder = await prisma.factoryOrder.update({
        where: { id: existing.id },
        data: {
          status: status || existing.status,
          createdBy,
          notes,
          items: { create: itemPayload },
        },
        include: { items: true },
      });
    } else {
      savedOrder = await prisma.factoryOrder.create({
        data: {
          outletId: resolvedOutletId,
          targetDate: new Date(`${dateStr}T10:00:00+02:00`),
          status: status || "DRAFT",
          createdBy,
          notes,
          items: { create: itemPayload },
        },
        include: { items: true },
      });
    }

    return NextResponse.json({
      success: true,
      factoryOrder: savedOrder,
      message:
        status === "SENT_TO_FACTORY"
          ? `تم اعتماد وإرسال كشف طلبية المصنع لتاريخ ${dateStr} (${itemPayload.length} صنف) 🏭✅`
          : `تم حفظ مسودة طلبية المصنع لتاريخ ${dateStr} (${itemPayload.length} صنف) بنجاح 💾`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في حفظ طلبية المصنع" },
      { status: 500 }
    );
  }
}
