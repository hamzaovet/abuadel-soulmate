import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");
    const tableId = searchParams.get("tableId");
    const limit = Number(searchParams.get("limit")) || 50;

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (orderType && orderType !== "ALL") {
      where.orderType = orderType;
    }
    if (tableId) {
      where.tableId = tableId;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        table: { select: { id: true, tableNumber: true, zone: true } },
        kdsTickets: true,
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      orderType,
      tableId,
      tableNumber,
      items, // array of { menuItemId, nameAr, price, qty, notes, itemType, category }
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryPhone,
      deliveryNotes,
      cashierName,
      waiterName,
      discountAmount,
      tipAmount,
      notes,
    } = body;

    if (!outletId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "بيانات الطلب والأصناف مطلوبة" }, { status: 400 });
    }

    // Load Settings
    const settings = await prisma.systemSettings.findFirst();

    // Calculate Financials
    const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.price) * Number(it.qty || 1), 0);
    const serviceCharge = settings?.isServiceChargeEnabled
      ? (subtotal * (settings.serviceChargePercent || 12)) / 100
      : 0;
    const taxAmount = settings?.isTaxEnabled ? (subtotal * (settings.taxPercent || 14)) / 100 : 0;
    const discount = Number(discountAmount) || 0;
    const tip = Number(tipAmount) || 0;
    const finalAmount = Math.max(0, subtotal + serviceCharge + taxAmount - discount + tip);

    // Generate Order Number
    const count = await prisma.order.count();
    const prefix = orderType === "DINE_IN" ? "DINE" : orderType === "DELIVERY" ? "DELV" : "TAKE";
    const orderNumber = `${prefix}-${1000 + count + 1}`;

    // Handle Customer & Loyalty
    let customerId: string | null = null;
    let pointsEarned = 0;
    if (customerPhone?.trim()) {
      const cleanPhone = customerPhone.trim();
      let cust = await prisma.customer.findUnique({ where: { phone: cleanPhone } });
      if (settings?.isLoyaltyEnabled) {
        pointsEarned = Math.floor(finalAmount * (settings.pointsPerPoundSpent || 0.1));
      }

      if (cust) {
        cust = await prisma.customer.update({
          where: { id: cust.id },
          data: {
            name: customerName?.trim() || cust.name,
            totalSpent: cust.totalSpent + finalAmount,
            visitCount: cust.visitCount + 1,
            loyaltyPoints: cust.loyaltyPoints + pointsEarned,
          },
        });
      } else {
        cust = await prisma.customer.create({
          data: {
            phone: cleanPhone,
            name: customerName?.trim() || "عميل VIP",
            totalSpent: finalAmount,
            visitCount: 1,
            loyaltyPoints: pointsEarned,
          },
        });
      }
      customerId = cust.id;
    }

    // 1. Create the Order
    const order = await prisma.order.create({
      data: {
        outletId,
        orderNumber,
        orderType: orderType || "DINE_IN",
        tableId: tableId || null,
        tableNumber: tableNumber || null,
        deliveryAddress: deliveryAddress?.trim() || null,
        deliveryPhone: deliveryPhone?.trim() || null,
        deliveryNotes: deliveryNotes?.trim() || null,
        status: "NEW_PENDING",
        paymentStatus: "PENDING",
        subtotal: Number(subtotal.toFixed(2)),
        serviceCharge: Number(serviceCharge.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        discountAmount: Number(discount.toFixed(2)),
        tipAmount: Number(tip.toFixed(2)),
        finalAmount: Number(finalAmount.toFixed(2)),
        cashierName: cashierName || null,
        waiterName: waiterName || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerId,
        pointsEarned,
        notes: notes?.trim() || null,
        items: JSON.stringify(items),
      },
    });

    // 2. Occupy Dining Table if DINE_IN
    if (tableId) {
      await prisma.diningTable.update({
        where: { id: tableId },
        data: {
          status: "OCCUPIED",
          activeOrderId: order.id,
        },
      });
    }

    // 3. Automated Inventory & Recipe Depletion (سحب الخامات والقطع فورياً)
    for (const it of items) {
      const qty = Number(it.qty) || 1;

      // If Prepared Beverage (Coffee / Drinks) -> Deduct Raw Materials via BOM & Record Movement
      if (it.itemType === "PREPARED_BEVERAGE" && it.menuItemId) {
        const recipes = await prisma.recipeItem.findMany({
          where: { menuItemId: it.menuItemId },
          include: { rawMaterial: true },
        });

        for (const r of recipes) {
          const totalDepletion = r.qtyRequired * qty;
          await prisma.rawMaterial.update({
            where: { id: r.rawMaterialId },
            data: { currentStock: { decrement: totalDepletion } },
          });

          // Log movement for ERP audit tracking
          try {
            await prisma.rawMaterialMovement.create({
              data: {
                rawMaterialId: r.rawMaterialId,
                type: "CONSUMPTION",
                quantity: -totalDepletion,
                costPerUnit: r.rawMaterial?.costPerUnit || 0,
                totalCost: (r.rawMaterial?.costPerUnit || 0) * totalDepletion,
                orderNumber: order.orderNumber,
                recordedBy: "نظام الريسيبي الآلي (Soulmate BOM)",
                notes: `خصم ريسيبي طلب #${order.orderNumber} - صنف: ${it.nameAr || it.name || "مشروب"} (${qty} كوب)`,
              },
            });
          } catch (e) {
            console.error("Failed to log raw material consumption movement:", e);
          }
        }
      }

      // If Ready-Made Pastry (Abu Adel sweets / Cakes) -> Deduct stockQty directly
      if (it.itemType === "READY_PASTRY" && it.menuItemId) {
        await prisma.menuItem.update({
          where: { id: it.menuItemId },
          data: { stockQty: { decrement: qty } },
        });
      }
    }

    // 4. Create KDS Tickets for Barista / Kitchen Stations
    const baristaItems = items.filter((i: any) =>
      i.category?.includes("COFFEE") || i.category?.includes("BEVERAGES") || i.itemType === "PREPARED_BEVERAGE"
    );
    const kitchenItems = items.filter((i: any) =>
      i.category?.includes("WAFFLES") || i.category?.includes("PANCAKES")
    );
    const pastryItems = items.filter((i: any) =>
      i.category?.includes("ORIENTAL") || i.category?.includes("WESTERN") || i.category?.includes("CAKES")
    );

    if (baristaItems.length > 0) {
      await prisma.kdsTicket.create({
        data: {
          orderId: order.id,
          station: "BARISTA",
          status: "QUEUED",
          itemsSummary: JSON.stringify(baristaItems),
        },
      });
    }
    if (kitchenItems.length > 0) {
      await prisma.kdsTicket.create({
        data: {
          orderId: order.id,
          station: "KITCHEN",
          status: "QUEUED",
          itemsSummary: JSON.stringify(kitchenItems),
        },
      });
    }
    if (pastryItems.length > 0) {
      await prisma.kdsTicket.create({
        data: {
          orderId: order.id,
          station: "PASTRY_COUNTER",
          status: "QUEUED",
          itemsSummary: JSON.stringify(pastryItems),
        },
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      action,
      paymentMethod,
      discountAmount,
      tipAmount,
      cashierName,
      status,
    } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "معرف الطلب مطلوب" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
    }

    // Action: Settle & Collect Cashier Payment (تقفيل الحساب ودفع الفاتورة)
    if (action === "SETTLE") {
      const discount = discountAmount !== undefined ? Number(discountAmount) : order.discountAmount;
      const tip = tipAmount !== undefined ? Number(tipAmount) : order.tipAmount;
      const newFinal = Math.max(0, order.subtotal + order.serviceCharge + order.taxAmount - discount + tip);

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          status: "COMPLETED",
          paymentMethod: paymentMethod || "CASH",
          discountAmount: discount,
          tipAmount: tip,
          finalAmount: Number(newFinal.toFixed(2)),
          cashierName: cashierName || order.cashierName || "كاشير المنظومة",
          settledAt: new Date(),
        },
        include: {
          outlet: true,
          table: true,
        },
      });

      // Free dining table if was DINE_IN
      if (order.tableId) {
        await prisma.diningTable.update({
          where: { id: order.tableId },
          data: {
            status: "AVAILABLE",
            activeOrderId: null,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم تحصيل الشيك (${order.orderNumber}) بنجاح بمبلغ ${newFinal} ج.م 💵`,
        order: updatedOrder,
      });
    }

    // Action: Cancel Order
    if (action === "CANCEL") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      if (order.tableId) {
        await prisma.diningTable.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE", activeOrderId: null },
        });
      }

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // Action: Direct Status Update (e.g. from KDS or Waiter)
    if (status) {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });
      return NextResponse.json({ success: true, order: updatedOrder });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
