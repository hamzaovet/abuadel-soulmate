import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    const where: any = { isActive: true };
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }

    const tables = await prisma.diningTable.findMany({
      where,
      orderBy: [{ zone: "asc" }, { tableNumber: "asc" }],
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
    });

    // Attach active order details if occupied
    const activeOrderIds = tables.map((t) => t.activeOrderId).filter(Boolean) as string[];
    let activeOrders: any[] = [];
    if (activeOrderIds.length > 0) {
      activeOrders = await prisma.order.findMany({
        where: { id: { in: activeOrderIds } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          finalAmount: true,
          subtotal: true,
          items: true,
          createdAt: true,
        },
      });
    }

    const orderMap = new Map(activeOrders.map((o) => [o.id, o]));

    const enrichedTables = tables.map((t) => ({
      ...t,
      activeOrder: t.activeOrderId ? orderMap.get(t.activeOrderId) || null : null,
    }));

    return NextResponse.json({ success: true, tables: enrichedTables });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, tableNumber, zone, capacity } = body;

    if (!outletId || !tableNumber) {
      return NextResponse.json({ success: false, error: "رقم الترابيزة والفرع مطلوبين" }, { status: 400 });
    }

    const table = await prisma.diningTable.create({
      data: {
        outletId,
        tableNumber: tableNumber.trim(),
        zone: zone || "INDOOR",
        capacity: Number(capacity) || 4,
        status: "AVAILABLE",
        qrCodeUrl: `/order?table=${encodeURIComponent(tableNumber.trim())}`,
      },
    });

    return NextResponse.json({ success: true, table });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, tableId, sourceTableId, targetTableId, status } = body;

    // Action: Transfer Table (نقل ترابيزة وترحيل الطلب بالكامل)
    if (action === "TRANSFER") {
      if (!sourceTableId || !targetTableId) {
        return NextResponse.json({ success: false, error: "الترابيزة الحالية والجديدة مطلوبتين" }, { status: 400 });
      }

      const source = await prisma.diningTable.findUnique({ where: { id: sourceTableId } });
      const target = await prisma.diningTable.findUnique({ where: { id: targetTableId } });

      if (!source || !target) {
        return NextResponse.json({ success: false, error: "إحدى الترابيزات غير موجودة" }, { status: 404 });
      }

      if (!source.activeOrderId) {
        return NextResponse.json({ success: false, error: "الترابيزة الحالية لا يوجد بها طلب نشط" }, { status: 400 });
      }

      if (target.status !== "AVAILABLE" && target.id !== source.id) {
        return NextResponse.json({ success: false, error: "الترابيزة المستهدفة مشغولة بالفعل" }, { status: 400 });
      }

      // Update Order with new table info
      await prisma.order.update({
        where: { id: source.activeOrderId },
        data: {
          tableId: target.id,
          tableNumber: target.tableNumber,
        },
      });

      // Free source table
      await prisma.diningTable.update({
        where: { id: source.id },
        data: { status: "AVAILABLE", activeOrderId: null },
      });

      // Occupy target table
      const updatedTarget = await prisma.diningTable.update({
        where: { id: target.id },
        data: { status: "OCCUPIED", activeOrderId: source.activeOrderId },
      });

      return NextResponse.json({
        success: true,
        message: `تم نقل الشيك بنجاح من ترابيزة (${source.tableNumber}) إلى ترابيزة (${target.tableNumber}) 💺✨`,
        table: updatedTarget,
      });
    }

    // Action: Clear Table
    if (action === "CLEAR") {
      const table = await prisma.diningTable.update({
        where: { id: tableId },
        data: { status: "AVAILABLE", activeOrderId: null },
      });
      return NextResponse.json({ success: true, table });
    }

    // Action: Update Status
    if (tableId && status) {
      const table = await prisma.diningTable.update({
        where: { id: tableId },
        data: { status },
      });
      return NextResponse.json({ success: true, table });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
