import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper: Deplete inventory and log ERP movements
async function depleteInventory(items: any[], orderNumber: string) {
  for (const it of items) {
    const qty = Number(it.qty) || 1;

    // 1. Prepared Beverage (Coffee / Drinks) -> Deduct Raw Materials via BOM & Record Movement
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
              orderNumber,
              recordedBy: "نظام الريسيبي الآلي (Soulmate BOM)",
              notes: `خصم ريسيبي طلب #${orderNumber} - صنف: ${it.nameAr || it.name || "مشروب"} (${qty} كوب)`,
            },
          });
        } catch (e) {
          console.error("Failed to log raw material consumption movement:", e);
        }
      }
    }

    // 2. Custom Mixed Sweet Box (علبة حلويات مشكل بالوزن حسب ورقة الميزان)
    if (it.isCustomBox && it.boxComponents && Array.isArray(it.boxComponents)) {
      for (const comp of it.boxComponents) {
        const weightKg = Number(comp.weightKg) || (Number(comp.grams) / 1000) || 0.25;
        if (comp.id && !comp.id.startsWith("custom-")) {
          try {
            await prisma.menuItem.update({
              where: { id: comp.id },
              data: { stockQty: { decrement: weightKg } },
            });
            await prisma.productMovement.create({
              data: {
                menuItemId: comp.id,
                type: "SALE",
                quantity: -weightKg,
                unitCost: comp.pricePerKg || 0,
                totalCost: comp.subtotal || 0,
                orderNumber,
                recordedBy: "كاشير ونظام مبيعات حلواني أبو عادل",
                notes: `مبيعات علبة مشكل #${orderNumber} - صنف: ${comp.nameAr || "حلويات"} (وزن: ${comp.grams || (weightKg * 1000)} جم)`,
              },
            });
          } catch (e) {
            console.error("Failed to deduct custom box component stock:", e);
          }
        }
      }
      continue;
    }

    // 3. Ready-Made Pastry (Abu Adel sweets / Cakes) -> Deduct stockQty directly & Log Sale Movement
    if (it.itemType === "READY_PASTRY" && it.menuItemId && !it.menuItemId.startsWith("custom-")) {
      await prisma.menuItem.update({
        where: { id: it.menuItemId },
        data: { stockQty: { decrement: qty } },
      });

      try {
        await prisma.productMovement.create({
          data: {
            menuItemId: it.menuItemId,
            type: "SALE",
            quantity: -qty,
            unitCost: it.costPrice || 0,
            totalCost: (it.costPrice || 0) * qty,
            orderNumber,
            recordedBy: "كاشير ونظام مبيعات حلواني أبو عادل",
            notes: `مبيعات فاتورة #${orderNumber} - صنف: ${it.nameAr || it.name || "حلويات"} (${qty} ${it.unitType || "قطعة"})`,
          },
        });
      } catch (e) {
        console.error("Failed to log product sale movement:", e);
      }
    }
  }
}

// Helper: Create KDS Tickets for Barista / Kitchen Stations
async function createKdsTickets(items: any[], orderId: string) {
  const baristaItems = items.filter(
    (i: any) =>
      i.category?.includes("COFFEE") ||
      i.category?.includes("BEVERAGES") ||
      i.itemType === "PREPARED_BEVERAGE"
  );
  const kitchenItems = items.filter(
    (i: any) => i.category?.includes("WAFFLES") || i.category?.includes("PANCAKES")
  );
  const pastryItems = items.filter(
    (i: any) =>
      i.category?.includes("ORIENTAL") ||
      i.category?.includes("WESTERN") ||
      i.category?.includes("CAKES")
  );

  if (baristaItems.length > 0) {
    await prisma.kdsTicket.create({
      data: {
        orderId,
        station: "BARISTA",
        status: "QUEUED",
        itemsSummary: JSON.stringify(baristaItems),
      },
    });
  }
  if (kitchenItems.length > 0) {
    await prisma.kdsTicket.create({
      data: {
        orderId,
        station: "KITCHEN",
        status: "QUEUED",
        itemsSummary: JSON.stringify(kitchenItems),
      },
    });
  }
  if (pastryItems.length > 0) {
    await prisma.kdsTicket.create({
      data: {
        orderId,
        station: "PASTRY_COUNTER",
        status: "QUEUED",
        itemsSummary: JSON.stringify(pastryItems),
      },
    });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");
    const tableId = searchParams.get("tableId");
    const tableNumber = searchParams.get("tableNumber");
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
    if (tableNumber) {
      const cleanNum = String(tableNumber).trim().replace(/^[^\d]*/, "") || String(tableNumber).trim();
      where.OR = [
        { tableNumber: String(tableNumber).trim() },
        { tableNumber: cleanNum },
      ];
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

    // 0. Resolve Table if DINE_IN
    let targetTable = null;
    let cleanTableNumber = tableNumber ? String(tableNumber).trim() : null;

    if (orderType === "DINE_IN") {
      if (tableId) {
        targetTable = await prisma.diningTable.findUnique({ where: { id: tableId } });
        if (targetTable) cleanTableNumber = targetTable.tableNumber;
      } else if (tableNumber) {
        const rawNum = String(tableNumber).trim();
        const numOnly = rawNum.replace(/^[^\d]*/, "") || rawNum;
        targetTable = await prisma.diningTable.findFirst({
          where: {
            outletId,
            OR: [
              { tableNumber: rawNum },
              { tableNumber: numOnly },
              { tableNumber: `T-${numOnly.padStart(2, "0")}` },
            ],
          },
        });
        if (targetTable) cleanTableNumber = targetTable.tableNumber;
      }
    }

    // 1. OPEN CHECK / CONTINUOUS TAB: Check if table already has an active open order
    if (orderType === "DINE_IN" && targetTable && targetTable.activeOrderId) {
      const activeOrder = await prisma.order.findUnique({
        where: { id: targetTable.activeOrderId },
      });

      if (
        activeOrder &&
        activeOrder.status !== "COMPLETED" &&
        activeOrder.status !== "CANCELLED"
      ) {
        // APPEND TO EXISTING OPEN ORDER!
        let existingItems: any[] = [];
        try {
          existingItems = typeof activeOrder.items === "string" ? JSON.parse(activeOrder.items) : activeOrder.items;
        } catch {
          existingItems = [];
        }

        const combinedItems = [...existingItems, ...items];
        const addedSubtotal = items.reduce(
          (sum: number, it: any) => sum + Number(it.price) * Number(it.qty || 1),
          0
        );
        const newSubtotal = activeOrder.subtotal + addedSubtotal;
        const newService = settings?.isServiceChargeEnabled
          ? (newSubtotal * (settings.serviceChargePercent || 12)) / 100
          : 0;
        const newTax = settings?.isTaxEnabled ? (newSubtotal * (settings.taxPercent || 14)) / 100 : 0;
        const newFinal = Math.max(
          0,
          newSubtotal + newService + newTax - activeOrder.discountAmount + activeOrder.tipAmount
        );

        const updatedOrder = await prisma.order.update({
          where: { id: activeOrder.id },
          data: {
            items: JSON.stringify(combinedItems),
            subtotal: Number(newSubtotal.toFixed(2)),
            serviceCharge: Number(newService.toFixed(2)),
            taxAmount: Number(newTax.toFixed(2)),
            finalAmount: Number(newFinal.toFixed(2)),
            status: "PREPARING", // Preparing round 2 / round 3
          },
        });

        // Deplete inventory for new items
        await depleteInventory(items, updatedOrder.orderNumber);

        // Create KDS ticket specifically for the newly added items
        await createKdsTickets(items, updatedOrder.id);

        return NextResponse.json({
          success: true,
          order: updatedOrder,
          isAppended: true,
          message: `تمت إضافة المشروبات والأصناف الجديدة لشيك ترابيزة #${targetTable.tableNumber} بنجاح، وجاري تحضيرها فوراً ☕✨`,
        });
      }
    }

    // Calculate Financials for New Order
    const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.price) * Number(it.qty || 1), 0);
    const serviceCharge =
      orderType === "DINE_IN" && settings?.isServiceChargeEnabled
        ? (subtotal * (settings.serviceChargePercent || 12)) / 100
        : 0;
    const taxAmount = settings?.isTaxEnabled ? (subtotal * (settings.taxPercent || 14)) / 100 : 0;
    const deliveryFee = orderType === "DELIVERY" ? (settings?.deliveryFee || 20) : 0;
    const discount = Number(discountAmount) || 0;
    const tip = Number(tipAmount) || 0;
    const finalAmount = Math.max(0, subtotal + serviceCharge + taxAmount + deliveryFee - discount + tip);

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

    // 2. Create the Order
    const order = await prisma.order.create({
      data: {
        outletId,
        orderNumber,
        orderType: orderType || "DINE_IN",
        tableId: targetTable?.id || tableId || null,
        tableNumber: cleanTableNumber,
        deliveryAddress: deliveryAddress?.trim() || null,
        deliveryPhone: deliveryPhone?.trim() || null,
        deliveryNotes: deliveryNotes?.trim() || null,
        status: "NEW_PENDING",
        paymentStatus: "PENDING",
        subtotal: Number(subtotal.toFixed(2)),
        serviceCharge: Number(serviceCharge.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
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

    // 3. Occupy Dining Table if DINE_IN
    if (targetTable) {
      await prisma.diningTable.update({
        where: { id: targetTable.id },
        data: {
          status: "OCCUPIED",
          activeOrderId: order.id,
        },
      });
    }

    // 4. Automated Inventory & Recipe Depletion
    await depleteInventory(items, order.orderNumber);

    // 5. Create KDS Tickets
    await createKdsTickets(items, order.id);

    return NextResponse.json({ success: true, order, isAppended: false });
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

    // Action: REQUEST_BILL (طلب الحساب / شيك أوت من الزبون)
    if (action === "REQUEST_BILL") {
      if (order.tableId) {
        await prisma.diningTable.update({
          where: { id: order.tableId },
          data: { status: "BILL_REQUESTED" },
        });
      }
      return NextResponse.json({
        success: true,
        message: "تم إخطار الكاشير والويتر بطلب الحساب، لحظات والويتر عندك بالفاتورة 🧾😊",
      });
    }

    // Action: Settle & Collect Cashier Payment (تقفيل الحساب ودفع الفاتورة)
    if (action === "SETTLE") {
      const discount = discountAmount !== undefined ? Number(discountAmount) : order.discountAmount;
      const tip = tipAmount !== undefined ? Number(tipAmount) : order.tipAmount;
      const newFinal = Math.max(
        0,
        order.subtotal + order.serviceCharge + order.taxAmount + (order.deliveryFee || 0) - discount + tip
      );

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

      // Update active Shift if one exists
      try {
        const activeShift = await prisma.shift.findFirst({
          where: { outletId: order.outletId, status: "OPEN" },
          orderBy: { openedAt: "desc" },
        });

        if (activeShift) {
          const method = paymentMethod || "CASH";
          const amount = Number(newFinal.toFixed(2));
          await prisma.shift.update({
            where: { id: activeShift.id },
            data: {
              totalRevenue: { increment: amount },
              ticketsCount: { increment: 1 },
              ...(method === "CASH"
                ? { cashCollected: { increment: amount }, expectedCash: { increment: amount } }
                : {}),
              ...(method === "CARD" ? { visaCollected: { increment: amount } } : {}),
              ...(method === "INSTAPAY" ? { instapayCollected: { increment: amount } } : {}),
              ...(method === "VODAFONE_CASH" ? { vodafoneCollected: { increment: amount } } : {}),
            },
          });
        }
      } catch (e) {
        console.error("Failed to update active shift:", e);
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

    // Action: Direct Status Update (e.g. from KDS or Waiter or Driver)
    if (status) {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === "COMPLETED" && { settledAt: new Date() }),
        },
      });

      if (status === "COMPLETED" && order.tableId) {
        await prisma.diningTable.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE", activeOrderId: null },
        });
      }

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
