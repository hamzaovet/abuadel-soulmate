import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotifications } from "@/lib/push";
import {
  calculateEarnedPoints,
  extractLoyaltyConfig,
  getLoyaltyProgress,
  isLoyaltyActiveForOutlet,
} from "@/lib/loyalty";

export const dynamic = "force-dynamic";

// Helper: Server-side deterministic snapshot of MenuItem unit cost (frozen inside Order.items so future factory invoices never mutate historical P&L)
async function snapshotItemsWithCost(rawItems: any[]): Promise<any[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];
  const menuIds = new Set<string>();
  for (const it of rawItems) {
    if (it.menuItemId && !String(it.menuItemId).startsWith("custom-")) {
      menuIds.add(String(it.menuItemId));
    }
    if (it.isCustomBox && Array.isArray(it.boxComponents)) {
      for (const c of it.boxComponents) {
        if (c.id && !String(c.id).startsWith("custom-")) menuIds.add(String(c.id));
      }
    }
  }

  const menuRows =
    menuIds.size > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: Array.from(menuIds) } },
          include: { recipes: { include: { rawMaterial: true } } },
        })
      : [];

  const costMap = new Map<string, number>();
  for (const m of menuRows) {
    if (m.itemType === "PREPARED_BEVERAGE" && m.recipes.length > 0) {
      const recipeCost = m.recipes.reduce(
        (s, r) => s + Number(r.qtyRequired || 0) * Number(r.rawMaterial?.costPerUnit || 0),
        0
      );
      costMap.set(m.id, Number((recipeCost > 0 ? recipeCost : m.costPrice || 0).toFixed(4)));
    } else {
      costMap.set(m.id, Number((m.costPrice || 0).toFixed(4)));
    }
  }

  return rawItems.map((it: any) => {
    if (it.costSnapshotted === true && it.costPrice !== undefined && it.costPrice !== null) {
      return { ...it, costPrice: Number(it.costPrice) || 0, costSnapshotted: true };
    }
    if (it.isCustomBox && Array.isArray(it.boxComponents)) {
      const enrichedComps = it.boxComponents.map((comp: any) => {
        const wKg = Number(comp.weightKg) || Number(comp.grams) / 1000 || 0.25;
        const unitCost =
          comp.unitCost !== undefined && Number(comp.unitCost) > 0
            ? Number(comp.unitCost)
            : costMap.get(comp.id) ?? 0;
        return { ...comp, unitCost, weightKg: wKg };
      });
      const boxCost = enrichedComps.reduce(
        (s: number, c: any) => s + (Number(c.weightKg) || 0) * (Number(c.unitCost) || 0),
        0
      );
      return {
        ...it,
        boxComponents: enrichedComps,
        costPrice: Number(boxCost.toFixed(4)),
        costSnapshotted: true,
      };
    }
    const dbCost = it.menuItemId ? costMap.get(String(it.menuItemId)) : undefined;
    const resolvedCost =
      dbCost !== undefined
        ? dbCost
        : it.costPrice !== undefined && it.costPrice !== null
        ? Number(it.costPrice)
        : 0;
    return {
      ...it,
      costPrice: Number((resolvedCost || 0).toFixed(4)),
      costSnapshotted: true,
    };
  });
}

// Helper: FIFO track sales of Soulmate consignment stock held at Abu Adel (أمانة بيع)
async function consumeOpenConsignmentsFIFO(
  abuAdelMenuItemId: string,
  qtySold: number,
  unitSellPrice: number
) {
  if (!abuAdelMenuItemId || qtySold <= 0) return;
  try {
    const openBatches = await prisma.consignmentBatch.findMany({
      where: {
        abuAdelMenuItemId,
        remainingQty: { gt: 0 },
        status: { in: ["OPEN", "PARTIAL"] },
      },
      orderBy: { createdAt: "asc" },
    });
    let remainingToAllocate = qtySold;
    for (const batch of openBatches) {
      if (remainingToAllocate <= 0.0001) break;
      const take = Math.min(remainingToAllocate, batch.remainingQty);
      const effectivePrice = unitSellPrice > 0 ? unitSellPrice : batch.sellingPrice;
      const newSold = Number((batch.soldQty + take).toFixed(3));
      const newRemaining = Number(Math.max(0, batch.remainingQty - take).toFixed(3));
      const newSoldRev = Number((batch.soldRevenue + take * effectivePrice).toFixed(2));
      await prisma.consignmentBatch.update({
        where: { id: batch.id },
        data: {
          soldQty: newSold,
          remainingQty: newRemaining,
          soldRevenue: newSoldRev,
          status: "PARTIAL",
        },
      });
      remainingToAllocate = Number((remainingToAllocate - take).toFixed(3));
    }
  } catch (e) {
    console.error("Consignment FIFO allocation note:", e);
  }
}

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

      // FIFO consume any Soulmate->Abu Adel consignment stock held for sale
      await consumeOpenConsignmentsFIFO(it.menuItemId, qty, Number(it.price) || 0);
    }
  }
}

function getPaymentMethodLabelAr(method?: string | null) {
  switch (method) {
    case "CASH":
      return "كاش (نقدي)";
    case "CARD":
      return "فيزا / بطاقة بنكية";
    case "INSTAPAY":
      return "إنستاباي (InstaPay)";
    case "VODAFONE_CASH":
      return "فودافون كاش";
    case "TALABAT":
      return "طلبات (Talabat)";
    default:
      return method || "كاش";
  }
}

function computeTalabatFinancials(storeNet: number, method: string, orderType: string, settings: any) {
  const isTalabat = method === "TALABAT" || orderType === "TALABAT";
  if (!isTalabat) {
    return { commissionPercent: 0, commissionAmount: 0, platformNetAmount: 0 };
  }
  const commissionPercent = Number(settings?.talabatCommissionPercent ?? 25) || 25;
  const commissionAmount = Number(((Math.max(0, storeNet) * commissionPercent) / 100).toFixed(2));
  const platformNetAmount = Number(Math.max(0, storeNet - commissionAmount).toFixed(2));
  return { commissionPercent, commissionAmount, platformNetAmount };
}

function buildShiftMethodIncrement(method: string, delta: number, talabatCommissionDelta = 0) {
  const cleanDelta = Number(delta.toFixed(2));
  const cleanComm = Number(talabatCommissionDelta.toFixed(2));
  if (!cleanDelta && !cleanComm) return {};
  if (method === "CASH") {
    return {
      cashCollected: { increment: cleanDelta },
      expectedCash: { increment: cleanDelta },
    };
  }
  if (method === "CARD") return { visaCollected: { increment: cleanDelta } };
  if (method === "INSTAPAY") return { instapayCollected: { increment: cleanDelta } };
  if (method === "VODAFONE_CASH") return { vodafoneCollected: { increment: cleanDelta } };
  if (method === "TALABAT") {
    return {
      talabatCollected: { increment: cleanDelta },
      talabatCommission: { increment: cleanComm },
    };
  }
  return {};
}

// Helper: Reconcile inventory deltas cleanly when an already-created order is edited
async function applyInventoryDelta(
  oldItems: any[],
  newItems: any[],
  orderNumber: string,
  reason: string,
  actor: string
) {
  const productDelta = new Map<string, { delta: number; name: string; cost: number; unit: string }>();
  const rawDelta = new Map<string, { delta: number; name: string; costPerUnit: number }>();

  const accumulateProduct = (menuId: string, delta: number, name: string, cost: number, unit: string) => {
    if (!menuId || menuId.startsWith("custom-")) return;
    const prev = productDelta.get(menuId) || { delta: 0, name, cost, unit };
    prev.delta += delta;
    productDelta.set(menuId, prev);
  };

  const processSide = async (items: any[], sign: 1 | -1) => {
    for (const it of items) {
      const qty = Number(it.qty) || 1;
      if (it.isCustomBox && Array.isArray(it.boxComponents)) {
        for (const comp of it.boxComponents) {
          const weightKg = Number(comp.weightKg) || Number(comp.grams) / 1000 || 0.25;
          accumulateProduct(
            comp.id,
            sign * weightKg,
            comp.nameAr || "صنف علبة مشكل",
            Number(comp.pricePerKg) || 0,
            "KG"
          );
        }
        continue;
      }
      if (it.itemType === "READY_PASTRY" && it.menuItemId) {
        accumulateProduct(
          it.menuItemId,
          sign * qty,
          it.nameAr || it.name || "منتج",
          Number(it.costPrice) || 0,
          it.unitType || "PIECE"
        );
      }
      if (it.itemType === "PREPARED_BEVERAGE" && it.menuItemId) {
        const recipes = await prisma.recipeItem.findMany({
          where: { menuItemId: it.menuItemId },
          include: { rawMaterial: true },
        });
        for (const r of recipes) {
          const prev = rawDelta.get(r.rawMaterialId) || {
            delta: 0,
            name: r.rawMaterial?.nameAr || "خامة",
            costPerUnit: Number(r.rawMaterial?.costPerUnit) || 0,
          };
          prev.delta += sign * r.qtyRequired * qty;
          rawDelta.set(r.rawMaterialId, prev);
        }
      }
    }
  };

  await processSide(oldItems, -1);
  await processSide(newItems, 1);

  for (const [menuItemId, info] of productDelta.entries()) {
    if (Math.abs(info.delta) < 0.0001) continue;
    try {
      await prisma.menuItem.update({
        where: { id: menuItemId },
        data: { stockQty: { decrement: info.delta } },
      });
      await prisma.productMovement.create({
        data: {
          menuItemId,
          type: info.delta > 0 ? "SALE" : "RETURN",
          quantity: -info.delta,
          unitCost: info.cost,
          totalCost: Math.abs(info.cost * info.delta),
          orderNumber,
          recordedBy: actor,
          notes: `تسوية مخزون فاتورة معدلة #${orderNumber} (${info.name}) - السبب: ${reason}`,
        },
      });
    } catch (e) {
      console.error("Failed product delta during invoice edit:", e);
    }
  }

  for (const [rawMaterialId, info] of rawDelta.entries()) {
    if (Math.abs(info.delta) < 0.0001) continue;
    try {
      await prisma.rawMaterial.update({
        where: { id: rawMaterialId },
        data: { currentStock: { decrement: info.delta } },
      });
      await prisma.rawMaterialMovement.create({
        data: {
          rawMaterialId,
          type: info.delta > 0 ? "CONSUMPTION" : "ADJUSTMENT",
          quantity: -info.delta,
          costPerUnit: info.costPerUnit,
          totalCost: Math.abs(info.costPerUnit * info.delta),
          orderNumber,
          recordedBy: actor,
          notes: `تسوية ريسيبي فاتورة معدلة #${orderNumber} - السبب: ${reason}`,
        },
      });
    } catch (e) {
      console.error("Failed raw delta during invoice edit:", e);
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
    const deliveryZoneId = searchParams.get("deliveryZoneId");
    const isScheduledParam = searchParams.get("isScheduled");
    const orderId = searchParams.get("orderId");
    const orderNumber = searchParams.get("orderNumber");
    const customerPhone = searchParams.get("customerPhone");
    const limit = Number(searchParams.get("limit")) || 80;

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
    if (deliveryZoneId && deliveryZoneId !== "ALL") {
      where.deliveryZoneId = deliveryZoneId;
    }
    if (isScheduledParam === "true") {
      where.isScheduled = true;
    } else if (isScheduledParam === "false") {
      where.isScheduled = false;
    }
    if (orderId) {
      where.id = orderId;
    }
    if (orderNumber) {
      where.orderNumber = orderNumber;
    }
    if (customerPhone) {
      where.customerPhone = customerPhone;
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
        deliveryZone: { select: { id: true, nameAr: true, fee: true, estimatedTime: true } },
        driver: { select: { id: true, name: true, phone: true } },
        kdsTickets: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
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
      items: rawItems, // array of { menuItemId, nameAr, price, qty, notes, itemType, category }
      customerName,
      customerPhone,
      deliveryZoneId,
      deliveryZoneName,
      deliveryFee: explicitDeliveryFee,
      deliveryAddress,
      deliveryPhone,
      deliveryNotes,
      paymentMethod,
      isScheduled,
      scheduledFor,
      depositRequired: explicitDepositRequired,
      depositPaid: explicitDepositPaid,
      depositStatus: explicitDepositStatus,
      depositReceiptUrl,
      cashierName,
      waiterName,
      discountAmount,
      tipAmount,
      pointsRedeemed,
      redeemRewardGift,
      notes,
    } = body;

    if (!outletId || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ success: false, error: "بيانات الطلب والأصناف مطلوبة" }, { status: 400 });
    }

    // Load Settings & Outlet & freeze historical unit cost snapshot onto items
    const [settings, targetOutletObj, items] = await Promise.all([
      prisma.systemSettings.findFirst(),
      prisma.outlet.findUnique({ where: { id: outletId } }),
      snapshotItemsWithCost(rawItems),
    ]);

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

        const addedPoints = calculateEarnedPoints(addedSubtotal, targetOutletObj?.code, settings);
        let customerSnapshot: any = null;
        const targetCustPhone = activeOrder.customerPhone || customerPhone?.trim() || null;

        if (activeOrder.customerId || targetCustPhone) {
          const existingCust = activeOrder.customerId
            ? await prisma.customer.findUnique({ where: { id: activeOrder.customerId } })
            : await prisma.customer.findUnique({ where: { phone: targetCustPhone! } });
          if (existingCust) {
            customerSnapshot = await prisma.customer.update({
              where: { id: existingCust.id },
              data: {
                loyaltyPoints: { increment: addedPoints },
                totalSpent: { increment: addedSubtotal },
                lastVisitAt: new Date(),
              },
            });
          }
        }

        const updatedOrder = await prisma.order.update({
          where: { id: activeOrder.id },
          data: {
            items: JSON.stringify(combinedItems),
            subtotal: Number(newSubtotal.toFixed(2)),
            serviceCharge: Number(newService.toFixed(2)),
            taxAmount: Number(newTax.toFixed(2)),
            finalAmount: Number(newFinal.toFixed(2)),
            pointsEarned: { increment: addedPoints },
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
          pointsEarned: addedPoints,
          customer: customerSnapshot,
          loyaltyProgress: customerSnapshot
            ? getLoyaltyProgress(customerSnapshot.loyaltyPoints, settings)
            : null,
          message: `تمت إضافة المشروبات والأصناف الجديدة لشيك ترابيزة #${targetTable.tableNumber} بنجاح، وجاري تحضيرها فوراً ☕✨`,
        });
      }
    }

    // Resolve Dynamic Delivery Zone & Fee
    let resolvedZoneId: string | null = deliveryZoneId || null;
    let resolvedZoneName: string | null = deliveryZoneName?.trim() || null;
    let deliveryFee = 0;

    if (orderType === "DELIVERY") {
      if (deliveryZoneId) {
        const zone = await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
        if (zone) {
          resolvedZoneId = zone.id;
          resolvedZoneName = zone.nameAr;
          deliveryFee = zone.fee;
        } else {
          deliveryFee = explicitDeliveryFee !== undefined ? Number(explicitDeliveryFee) : (settings?.deliveryFee || 20);
        }
      } else {
        deliveryFee = explicitDeliveryFee !== undefined ? Number(explicitDeliveryFee) : (settings?.deliveryFee || 20);
      }
    }

    // Calculate Financials for New Order
    const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.price) * Number(it.qty || 1), 0);
    const serviceCharge =
      orderType === "DINE_IN" && settings?.isServiceChargeEnabled
        ? (subtotal * (settings.serviceChargePercent || 12)) / 100
        : 0;
    const taxAmount = settings?.isTaxEnabled ? (subtotal * (settings.taxPercent || 14)) / 100 : 0;
    const manualDiscount = Number(discountAmount) || 0;
    const tip = Number(tipAmount) || 0;

    // Generate Order Number (Brand-aware prefix!)
    const count = await prisma.order.count();
    const prefix =
      orderType === "DINE_IN"
        ? "DINE"
        : orderType === "DELIVERY"
        ? "DELV"
        : orderType === "TALABAT"
        ? "TAL"
        : "TAKE";
    const orderNumber = `${prefix}-${1000 + count + 1}`;

    // Handle Customer CRM & Dynamic Multi-Brand Loyalty (Abu Adel & Soulmate)
    let customerId: string | null = null;
    let pointsEarned = 0;
    let actualPointsRedeemed = 0;
    let loyaltyDiscountEgp = 0;
    let updatedCustomer: any = null;

    const cleanPhone = customerPhone?.trim() || deliveryPhone?.trim() || "";
    const loyaltyCfg = extractLoyaltyConfig(settings);
    const loyaltyActiveHere = isLoyaltyActiveForOutlet(targetOutletObj?.code, loyaltyCfg);

    let existingCust = cleanPhone
      ? await prisma.customer.findUnique({ where: { phone: cleanPhone } })
      : null;

    if (existingCust && loyaltyActiveHere) {
      const maxRedeemableStoreNet = Math.max(0, subtotal + serviceCharge + taxAmount - manualDiscount);
      if (redeemRewardGift && existingCust.loyaltyPoints >= loyaltyCfg.loyaltyRewardThreshold) {
        actualPointsRedeemed = loyaltyCfg.loyaltyRewardThreshold;
        loyaltyDiscountEgp = Math.min(maxRedeemableStoreNet, loyaltyCfg.loyaltyRewardValue);
      } else if (Number(pointsRedeemed) > 0 && existingCust.loyaltyPoints > 0) {
        actualPointsRedeemed = Math.min(existingCust.loyaltyPoints, Math.floor(Number(pointsRedeemed)));
        loyaltyDiscountEgp = Math.min(
          maxRedeemableStoreNet,
          Number((actualPointsRedeemed * loyaltyCfg.poundValuePerPoint).toFixed(2))
        );
      }
    }

    const discount = manualDiscount + loyaltyDiscountEgp;
    const finalAmount = Math.max(0, subtotal + serviceCharge + taxAmount + deliveryFee - discount + tip);
    const storeSpendForPoints = Math.max(0, finalAmount - deliveryFee - tip);

    if (cleanPhone) {
      pointsEarned = calculateEarnedPoints(storeSpendForPoints, targetOutletObj?.code, settings);

      if (existingCust) {
        updatedCustomer = await prisma.customer.update({
          where: { id: existingCust.id },
          data: {
            name: customerName?.trim() || existingCust.name,
            address: deliveryAddress?.trim() || existingCust.address,
            city: resolvedZoneName || existingCust.city,
            totalSpent: existingCust.totalSpent + storeSpendForPoints,
            visitCount: existingCust.visitCount + 1,
            lastVisitAt: new Date(),
            loyaltyPoints: Math.max(0, existingCust.loyaltyPoints - actualPointsRedeemed + pointsEarned),
          },
        });
      } else {
        updatedCustomer = await prisma.customer.create({
          data: {
            phone: cleanPhone,
            name: customerName?.trim() || "عميل VIP",
            address: deliveryAddress?.trim() || null,
            city: resolvedZoneName || null,
            totalSpent: storeSpendForPoints,
            visitCount: 1,
            lastVisitAt: new Date(),
            loyaltyPoints: pointsEarned,
          },
        });
      }
      customerId = updatedCustomer.id;
    }

    const scheduledFlag = Boolean(isScheduled && scheduledFor);
    const depositPercent = settings?.preOrderDepositPercent || 30;
    const goodsNet = Math.max(0, subtotal - discount);
    const computedDepositRequired = scheduledFlag
      ? explicitDepositRequired !== undefined
        ? Number(explicitDepositRequired)
        : Number(((goodsNet * depositPercent) / 100).toFixed(2))
      : 0;
    const computedDepositPaid = scheduledFlag ? Number(explicitDepositPaid) || 0 : 0;
    const computedDepositStatus = scheduledFlag
      ? explicitDepositStatus ||
        (depositReceiptUrl
          ? "PENDING_VERIFICATION"
          : computedDepositPaid >= computedDepositRequired && computedDepositRequired > 0
          ? "CONFIRMED"
          : "NONE")
      : "NONE";

    const effectiveCreateMethod = orderType === "TALABAT" ? "TALABAT" : paymentMethod || "CASH";
    const storeNetCreate = Math.max(0, finalAmount - deliveryFee);
    const talabatCreateFin = computeTalabatFinancials(storeNetCreate, effectiveCreateMethod, orderType || "DINE_IN", settings);

    // 2. Create the Order
    const order = await prisma.order.create({
      data: {
        outletId,
        orderNumber,
        orderType: orderType || "DINE_IN",
        tableId: targetTable?.id || tableId || null,
        tableNumber: cleanTableNumber,
        deliveryZoneId: resolvedZoneId,
        deliveryZoneName: resolvedZoneName,
        deliveryAddress: deliveryAddress?.trim() || null,
        deliveryPhone: deliveryPhone?.trim() || null,
        deliveryNotes: deliveryNotes?.trim() || null,
        isScheduled: scheduledFlag,
        scheduledFor: scheduledFlag && scheduledFor ? new Date(scheduledFor) : null,
        depositRequired: computedDepositRequired,
        depositPaid: computedDepositPaid,
        depositStatus: computedDepositStatus,
        depositReceiptUrl: depositReceiptUrl || null,
        status: "NEW_PENDING",
        paymentStatus: "PENDING",
        paymentMethod: effectiveCreateMethod,
        subtotal: Number(subtotal.toFixed(2)),
        serviceCharge: Number(serviceCharge.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
        discountAmount: Number(discount.toFixed(2)),
        tipAmount: Number(tip.toFixed(2)),
        finalAmount: Number(finalAmount.toFixed(2)),
        commissionPercent: talabatCreateFin.commissionPercent,
        commissionAmount: talabatCreateFin.commissionAmount,
        platformNetAmount: talabatCreateFin.platformNetAmount,
        cashierName: cashierName || null,
        waiterName: waiterName || null,
        customerName: customerName || null,
        customerPhone: cleanPhone || null,
        customerId,
        pointsEarned,
        pointsRedeemed: actualPointsRedeemed,
        notes: notes?.trim() || null,
        items: JSON.stringify(items),
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        deliveryZone: { select: { id: true, nameAr: true, fee: true, estimatedTime: true } },
        driver: { select: { id: true, name: true, phone: true } },
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

    // 4. Automated Inventory & Recipe Depletion (deferred for future scheduled pre-orders until preparation/completion)
    if (!scheduledFlag) {
      await depleteInventory(items, order.orderNumber);
    }

    // 5. Create KDS Tickets strictly for Soulmate Cafe (immediate non-scheduled or ready orders)
    if (targetOutletObj?.code === "SOULMATE_CAFE" && !scheduledFlag) {
      await createKdsTickets(items, order.id);
    }

    // 6. Real-Time Background Web Push Notification (wakes up mobile/desktop even when closed)
    await sendPushNotifications(
      {
        roles: targetOutletObj?.code === "SOULMATE_CAFE" ? ["OWNER", "ADMIN", "POS", "KDS"] : ["OWNER", "ADMIN", "POS"],
        outletId: order.outletId,
      },
      {
        title: `🛎️ طلب جديد #${order.orderNumber} — ${targetOutletObj?.name || "النظام"}`,
        body: `${order.customerName || "عميل"} • الإجمالي: ${order.finalAmount} ج.م${
          order.orderType === "DELIVERY"
            ? " 🛵 (دليفري)"
            : order.orderType === "TALABAT"
            ? " 🟠 (طلبات)"
            : order.orderType === "DINE_IN"
            ? " ☕ (صالة)"
            : " 🛍️ (تيك أواي)"
        }`,
        url: targetOutletObj?.code === "SOULMATE_CAFE" ? "/kds" : "/pos",
        tag: `new-order-${order.id}`,
        requireInteraction: true,
      }
    );

    return NextResponse.json({
      success: true,
      order,
      isAppended: false,
      pointsEarned,
      pointsRedeemed: actualPointsRedeemed,
      customer: updatedCustomer
        ? {
            id: updatedCustomer.id,
            name: updatedCustomer.name,
            phone: updatedCustomer.phone,
            email: updatedCustomer.email,
            loyaltyPoints: updatedCustomer.loyaltyPoints,
            totalSpent: updatedCustomer.totalSpent,
            visitCount: updatedCustomer.visitCount,
            address: updatedCustomer.address,
            city: updatedCustomer.city,
          }
        : null,
      loyaltyProgress: updatedCustomer
        ? getLoyaltyProgress(updatedCustomer.loyaltyPoints, settings)
        : null,
    });
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
      paymentStatus,
      discountAmount,
      tipAmount,
      cashierName,
      driverId,
      driverName,
      driverPhone,
      depositPaid,
      depositStatus,
      depositReceiptUrl,
      scheduledFor,
      alertSent48h,
      alertSent24h,
      status,
      customerName,
      customerPhone,
      pointsRedeemed,
      redeemRewardGift,
    } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "معرف الطلب مطلوب" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
    }

    // Helper: Ensure deferred inventory depletion runs at most once per orderNumber
    const ensureDepletedOnce = async () => {
      const [existingProdMov, existingRawMov] = await Promise.all([
        prisma.productMovement.findFirst({ where: { orderNumber: order.orderNumber } }),
        prisma.rawMaterialMovement.findFirst({ where: { orderNumber: order.orderNumber } }),
      ]);
      if (!existingProdMov && !existingRawMov) {
        let parsedItems: any[] = [];
        try {
          parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
        } catch {
          parsedItems = [];
        }
        if (parsedItems.length > 0) {
          await depleteInventory(parsedItems, order.orderNumber);
        }
      }
    };

    // Action: DISPATCH_DRIVER (تسليم الطلب للطيار مع اسمه ورقمه وخروج للتوصيل)
    if (action === "DISPATCH_DRIVER") {
      let resolvedDriverId: string | null = driverId || null;
      let resolvedDriverName = driverName?.trim() || "";
      let resolvedDriverPhone = driverPhone?.trim() || "";

      if (resolvedDriverId) {
        const drv = await prisma.deliveryDriver.findUnique({ where: { id: resolvedDriverId } });
        if (drv) {
          resolvedDriverName = resolvedDriverName || drv.name;
          resolvedDriverPhone = resolvedDriverPhone || drv.phone;
        }
      }

      if (order.isScheduled) {
        await ensureDepletedOnce();
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "OUT_FOR_DELIVERY",
          driverId: resolvedDriverId,
          driverName: resolvedDriverName || "طيار التوصيل السريع",
          driverPhone: resolvedDriverPhone || null,
          dispatchedAt: new Date(),
        },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          deliveryZone: { select: { id: true, nameAr: true, fee: true } },
          driver: { select: { id: true, name: true, phone: true } },
        },
      });
      if (updatedOrder.customerPhone) {
        await sendPushNotifications(
          { customerPhone: updatedOrder.customerPhone },
          {
            title: `🛵 طلبك #${updatedOrder.orderNumber} في الطريق إليك!`,
            body: `خرج الطلب للتوصيل مع الكابتن ${updatedOrder.driverName || "التوصيل"}${
              updatedOrder.driverPhone ? ` (${updatedOrder.driverPhone})` : ""
            }`,
            url: "/order",
            tag: `order-driver-${updatedOrder.id}`,
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: `تم تسليم الطلب (${order.orderNumber}) للطيار: ${updatedOrder.driverName}${updatedOrder.driverPhone ? ` (${updatedOrder.driverPhone})` : ""} وخرج للتوصيل 🛵`,
        order: updatedOrder,
      });
    }

    // Action: CONFIRM_DEPOSIT (تأكيد أو تسجيل عربون الحجز المسبق)
    if (action === "CONFIRM_DEPOSIT") {
      const resolvedPaid =
        depositPaid !== undefined ? Number(depositPaid) : order.depositRequired || order.depositPaid;
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          depositPaid: Number(resolvedPaid.toFixed(2)),
          depositStatus: depositStatus || "CONFIRMED",
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(depositReceiptUrl !== undefined ? { depositReceiptUrl } : {}),
          ...(resolvedPaid >= order.finalAmount && order.finalAmount > 0
            ? { paymentStatus: "PAID", settledAt: new Date() }
            : {}),
        },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          deliveryZone: { select: { id: true, nameAr: true, fee: true } },
          driver: { select: { id: true, name: true, phone: true } },
        },
      });
      return NextResponse.json({
        success: true,
        message: `تم تأكيد عربون الحجز (${updatedOrder.orderNumber}) بمبلغ ${updatedOrder.depositPaid} ج.م بنجاح ✅`,
        order: updatedOrder,
      });
    }

    // Action: EDIT_INVOICE (تعديل أصناف وكميات فاتورة قائمة ➔ فاتورة معدلة + تسوية مخزون/شيفت + تنبيه فوري للإدارة)
    if (action === "EDIT_INVOICE") {
      if (order.status === "CANCELLED") {
        return NextResponse.json({ success: false, error: "لا يمكن تعديل فاتورة ملغاة" }, { status: 400 });
      }
      const nextItems = Array.isArray(body.items) ? body.items : [];
      if (nextItems.length === 0) {
        return NextResponse.json({ success: false, error: "يجب أن تحتوي الفاتورة على صنف واحد على الأقل" }, { status: 400 });
      }
      const cleanReason = String(body.reason || "").trim();
      if (!cleanReason) {
        return NextResponse.json({ success: false, error: "يرجى كتابة سبب تعديل الفاتورة لإثباته في سجل الرقابة" }, { status: 400 });
      }
      const actor = String(body.performedBy || cashierName || order.cashierName || "كاشير الفرع").trim();

      let oldItems: any[] = [];
      try {
        oldItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch {
        oldItems = [];
      }

      const [settings, outletObj] = await Promise.all([
        prisma.systemSettings.findFirst(),
        prisma.outlet.findUnique({ where: { id: order.outletId } }),
      ]);

      const rawNormalized = nextItems.map((it: any) => ({
        ...it,
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 0,
      })).filter((it: any) => it.qty > 0);
      const normalizedItems = await snapshotItemsWithCost(rawNormalized);

      if (normalizedItems.length === 0) {
        return NextResponse.json({ success: false, error: "الكميات المعدلة يجب أن تكون أكبر من صفر" }, { status: 400 });
      }

      const newSubtotal = normalizedItems.reduce((sum: number, it: any) => sum + it.price * it.qty, 0);
      const newService =
        order.orderType === "DINE_IN" && settings?.isServiceChargeEnabled
          ? (newSubtotal * (settings.serviceChargePercent || 12)) / 100
          : 0;
      const newTax = settings?.isTaxEnabled ? (newSubtotal * (settings.taxPercent || 14)) / 100 : 0;
      const effectiveDiscount = discountAmount !== undefined ? Number(discountAmount) : Number(order.discountAmount || 0);
      const effectiveDeliveryFee =
        body.deliveryFee !== undefined ? Number(body.deliveryFee) : Number(order.deliveryFee || 0);
      const effectiveTip = tipAmount !== undefined ? Number(tipAmount) : Number(order.tipAmount || 0);
      const newFinalAmount = Math.max(
        0,
        Number((newSubtotal + newService + newTax + effectiveDeliveryFee - effectiveDiscount + effectiveTip).toFixed(2))
      );

      const oldFinalAmount = Number(order.finalAmount || 0);
      const finalDiff = Number((newFinalAmount - oldFinalAmount).toFixed(2));
      const oldStoreNet = Math.max(0, oldFinalAmount - (order.deliveryFee || 0));
      const newStoreNet = Math.max(0, newFinalAmount - effectiveDeliveryFee);
      const storeNetDiff = Number((newStoreNet - oldStoreNet).toFixed(2));
      const deliveryFeeDiff = Number((effectiveDeliveryFee - (order.deliveryFee || 0)).toFixed(2));

      // Reconcile inventory only if order already depleted stock
      const [existingProdMov, existingRawMov] = await Promise.all([
        prisma.productMovement.findFirst({ where: { orderNumber: order.orderNumber } }),
        prisma.rawMaterialMovement.findFirst({ where: { orderNumber: order.orderNumber } }),
      ]);
      if (!order.isScheduled || existingProdMov || existingRawMov) {
        await applyInventoryDelta(oldItems, normalizedItems, order.orderNumber, cleanReason, actor);
      }

      // Update customer spend & loyalty delta
      let newPointsEarned = order.pointsEarned || 0;
      if (order.customerId) {
        try {
          const cust = await prisma.customer.findUnique({ where: { id: order.customerId } });
          if (cust) {
            const newSpendForPts = Math.max(0, newFinalAmount - effectiveDeliveryFee - effectiveTip);
            const oldSpendForPts = Math.max(0, oldFinalAmount - (order.deliveryFee || 0) - (order.tipAmount || 0));
            newPointsEarned = calculateEarnedPoints(newSpendForPts, outletObj?.code, settings);
            const ptsDiff = newPointsEarned - (order.pointsEarned || 0);
            const spendDiff = newSpendForPts - oldSpendForPts;
            await prisma.customer.update({
              where: { id: cust.id },
              data: {
                loyaltyPoints: Math.max(0, cust.loyaltyPoints + ptsDiff),
                totalSpent: Math.max(0, cust.totalSpent + spendDiff),
              },
            });
          }
        } catch (e) {
          console.error("Failed customer loyalty adjustment during invoice edit:", e);
        }
      }

      const oldCommAmount = Number(order.commissionAmount || 0);
      const newTalabatFin = computeTalabatFinancials(newStoreNet, order.paymentMethod, order.orderType, settings);
      const commDiff = Number((newTalabatFin.commissionAmount - oldCommAmount).toFixed(2));

      // Adjust open Shift if already paid
      if (order.paymentStatus === "PAID") {
        try {
          const activeShift = await prisma.shift.findFirst({
            where: { outletId: order.outletId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
          });
          if (activeShift && (storeNetDiff !== 0 || deliveryFeeDiff !== 0 || commDiff !== 0)) {
            await prisma.shift.update({
              where: { id: activeShift.id },
              data: {
                totalRevenue: { increment: storeNetDiff },
                deliveryFeesTotal: { increment: deliveryFeeDiff },
                ...buildShiftMethodIncrement(order.paymentMethod, storeNetDiff, commDiff),
              },
            });
          }
        } catch (e) {
          console.error("Failed shift adjustment during invoice edit:", e);
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          items: JSON.stringify(normalizedItems),
          subtotal: Number(newSubtotal.toFixed(2)),
          serviceCharge: Number(newService.toFixed(2)),
          taxAmount: Number(newTax.toFixed(2)),
          deliveryFee: Number(effectiveDeliveryFee.toFixed(2)),
          discountAmount: Number(effectiveDiscount.toFixed(2)),
          tipAmount: Number(effectiveTip.toFixed(2)),
          finalAmount: newFinalAmount,
          commissionPercent: newTalabatFin.commissionPercent,
          commissionAmount: newTalabatFin.commissionAmount,
          platformNetAmount: newTalabatFin.platformNetAmount,
          pointsEarned: newPointsEarned,
          isEdited: true,
          revisionCount: { increment: 1 },
          lastEditReason: cleanReason,
          lastEditedBy: actor,
          lastEditedAt: new Date(),
        },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          table: { select: { id: true, tableNumber: true, zone: true } },
          deliveryZone: { select: { id: true, nameAr: true, fee: true, estimatedTime: true } },
          driver: { select: { id: true, name: true, phone: true } },
          auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });

      const outletLabel = outletObj?.name || "الفرع";
      const auditLog = await prisma.orderAuditLog.create({
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          outletId: order.outletId,
          outletName: outletLabel,
          actionType: "INVOICE_EDIT",
          performedBy: actor,
          reason: cleanReason,
          oldFinalAmount,
          newFinalAmount,
          amountDiff: finalDiff,
          oldItemsJson: JSON.stringify(oldItems),
          newItemsJson: JSON.stringify(normalizedItems),
        },
      });

      const diffDesc =
        finalDiff > 0
          ? `زيادة +${finalDiff} ج.م`
          : finalDiff < 0
          ? `تخفيض/مرتجع ${finalDiff} ج.م`
          : "نفس القيمة الإجمالية";

      await prisma.adminNotification.create({
        data: {
          outletId: order.outletId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          category: "INVOICE_EDITED",
          severity: "HIGH",
          actorName: actor,
          title: `✏️ فاتورة معدلة: ${order.orderNumber} (${outletLabel})`,
          message: `تم تعديل الفاتورة #${order.orderNumber} من ${oldFinalAmount} ج.م إلى ${newFinalAmount} ج.م (${diffDesc}) بواسطة ${actor} — السبب: ${cleanReason}`,
          metadataJson: JSON.stringify({
            oldFinalAmount,
            newFinalAmount,
            amountDiff: finalDiff,
            reason: cleanReason,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            auditLogId: auditLog.id,
          }),
        },
      });

      await sendPushNotifications(
        { roles: ["OWNER", "ADMIN"] },
        {
          title: `🚨 فاتورة معدلة: ${order.orderNumber} (${outletLabel})`,
          body: `تعديل من ${oldFinalAmount} إلى ${newFinalAmount} ج.م (${diffDesc}) بواسطة ${actor} — ${cleanReason}`,
          url: "/admin",
          tag: `admin-alert-${auditLog.id}`,
          requireInteraction: true,
        }
      );

      return NextResponse.json({
        success: true,
        message: `تم حفظ التعديل وختم الفاتورة (${order.orderNumber}) بعلامة [فاتورة معدلة] وإرسال تنبيه فوري للإدارة 🚨✅`,
        order: updatedOrder,
        auditLog,
      });
    }

    // Action: CHANGE_PAYMENT_METHOD (تعديل وسيلة الدفع ➔ تحويل الدرج + ختم تعديل دفع + تنبيه فوري للإدارة)
    if (action === "CHANGE_PAYMENT_METHOD") {
      const targetMethod = String(body.newPaymentMethod || paymentMethod || "").trim();
      if (!targetMethod) {
        return NextResponse.json({ success: false, error: "يرجى اختيار وسيلة الدفع الجديدة" }, { status: 400 });
      }
      const oldMethod = order.paymentMethod || "CASH";
      if (targetMethod === oldMethod) {
        return NextResponse.json({ success: false, error: "وسيلة الدفع الجديدة مطابقة للوسيلة الحالية" }, { status: 400 });
      }
      const cleanReason = String(body.reason || "").trim();
      if (!cleanReason) {
        return NextResponse.json({ success: false, error: "يرجى كتابة سبب تعديل وسيلة الدفع لإرساله في تنبيه الإدارة" }, { status: 400 });
      }
      const actor = String(body.performedBy || cashierName || order.cashierName || "كاشير الفرع").trim();
      const storeRevenuePortion = Number(
        Math.max(0, Number(order.finalAmount || 0) - Number(order.deliveryFee || 0)).toFixed(2)
      );
      const sysSettings = await prisma.systemSettings.findFirst();
      const oldCommAmount = Number(order.commissionAmount || 0);
      const nextTalabatFin = computeTalabatFinancials(storeRevenuePortion, targetMethod, targetMethod === "TALABAT" ? "TALABAT" : order.orderType, sysSettings);

      // Move paid amount between payment buckets in open shift
      if (order.paymentStatus === "PAID" && storeRevenuePortion > 0) {
        try {
          const activeShift = await prisma.shift.findFirst({
            where: { outletId: order.outletId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
          });
          if (activeShift) {
            await prisma.shift.update({
              where: { id: activeShift.id },
              data: {
                ...buildShiftMethodIncrement(oldMethod, -storeRevenuePortion, -oldCommAmount),
                ...buildShiftMethodIncrement(targetMethod, storeRevenuePortion, nextTalabatFin.commissionAmount),
              },
            });
          }
        } catch (e) {
          console.error("Failed shift transfer during payment edit:", e);
        }
      }

      const [outletObj, updatedOrder] = await Promise.all([
        prisma.outlet.findUnique({ where: { id: order.outletId } }),
        prisma.order.update({
          where: { id: orderId },
          data: {
            paymentMethod: targetMethod,
            commissionPercent: nextTalabatFin.commissionPercent,
            commissionAmount: nextTalabatFin.commissionAmount,
            platformNetAmount: nextTalabatFin.platformNetAmount,
            paymentModified: true,
            lastEditReason: cleanReason,
            lastEditedBy: actor,
            lastEditedAt: new Date(),
          },
          include: {
            outlet: { select: { id: true, name: true, code: true } },
            table: { select: { id: true, tableNumber: true, zone: true } },
            deliveryZone: { select: { id: true, nameAr: true, fee: true, estimatedTime: true } },
            driver: { select: { id: true, name: true, phone: true } },
            auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        }),
      ]);

      const outletLabel = outletObj?.name || "الفرع";
      const auditLog = await prisma.orderAuditLog.create({
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          outletId: order.outletId,
          outletName: outletLabel,
          actionType: "PAYMENT_EDIT",
          performedBy: actor,
          reason: cleanReason,
          oldPaymentMethod: oldMethod,
          newPaymentMethod: targetMethod,
          oldFinalAmount: order.finalAmount,
          newFinalAmount: order.finalAmount,
          amountDiff: 0,
        },
      });

      await prisma.adminNotification.create({
        data: {
          outletId: order.outletId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          category: "PAYMENT_EDITED",
          severity: "HIGH",
          actorName: actor,
          title: `💳 تعديل دفع: ${order.orderNumber} (${outletLabel})`,
          message: `تم تغيير طريقة سداد الفاتورة #${order.orderNumber} (${order.finalAmount} ج.م) من [${getPaymentMethodLabelAr(oldMethod)}] إلى [${getPaymentMethodLabelAr(targetMethod)}] بواسطة ${actor} — السبب: ${cleanReason}`,
          metadataJson: JSON.stringify({
            oldPaymentMethod: oldMethod,
            newPaymentMethod: targetMethod,
            finalAmount: order.finalAmount,
            storeRevenuePortion,
            reason: cleanReason,
            paymentStatus: order.paymentStatus,
            auditLogId: auditLog.id,
          }),
        },
      });

      await sendPushNotifications(
        { roles: ["OWNER", "ADMIN"] },
        {
          title: `💳 تعديل وسيلة الدفع: ${order.orderNumber} (${outletLabel})`,
          body: `تم التغيير من ${getPaymentMethodLabelAr(oldMethod)} إلى ${getPaymentMethodLabelAr(targetMethod)} بواسطة ${actor} — ${cleanReason}`,
          url: "/admin",
          tag: `admin-pay-${auditLog.id}`,
          requireInteraction: true,
        }
      );

      return NextResponse.json({
        success: true,
        message: `تم تحويل وسيلة الدفع إلى ${getPaymentMethodLabelAr(targetMethod)} وختم الفاتورة [تعديل دفع] مع إخطار الإدارة 🚨💳`,
        order: updatedOrder,
        auditLog,
      });
    }

    // Action: UPDATE_PAYMENT (تعديل طريقة الدفع أو إرسال إيصال عربون بعد الطلب)
    if (action === "UPDATE_PAYMENT") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(paymentMethod !== undefined ? { paymentMethod } : {}),
          ...(paymentStatus !== undefined ? { paymentStatus } : {}),
          ...(depositReceiptUrl !== undefined ? { depositReceiptUrl } : {}),
          ...(depositStatus !== undefined ? { depositStatus } : {}),
          ...(depositPaid !== undefined ? { depositPaid: Number(depositPaid) } : {}),
          ...(scheduledFor ? { scheduledFor: new Date(scheduledFor) } : {}),
          ...(driverId !== undefined ? { driverId } : {}),
          ...(driverName !== undefined ? { driverName: driverName?.trim() || null } : {}),
          ...(driverPhone !== undefined ? { driverPhone: driverPhone?.trim() || null } : {}),
        },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          deliveryZone: { select: { id: true, nameAr: true, fee: true } },
          driver: { select: { id: true, name: true, phone: true } },
        },
      });
      return NextResponse.json({
        success: true,
        message: `تم تحديث بيانات الدفع/التوصيل للطلب (${updatedOrder.orderNumber}) بنجاح ✅`,
        order: updatedOrder,
      });
    }

    // Action: MARK_ALERT_SENT (تسجيل إرسال تنبيه 48 أو 24 ساعة)
    if (action === "MARK_ALERT_SENT") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(alertSent48h !== undefined ? { alertSent48h: Boolean(alertSent48h) } : {}),
          ...(alertSent24h !== undefined ? { alertSent24h: Boolean(alertSent24h) } : {}),
        },
      });
      return NextResponse.json({ success: true, order: updatedOrder });
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

    // Action: Settle & Collect Cashier Payment (تقفيل الحساب ودفع الفاتورة مع فصل رسوم التوصيل عن إيراد المحل!)
    if (action === "SETTLE") {
      const [settings, orderOutlet] = await Promise.all([
        prisma.systemSettings.findFirst(),
        prisma.outlet.findUnique({ where: { id: order.outletId } }),
      ]);
      const loyaltyCfg = extractLoyaltyConfig(settings);
      const loyaltyActiveHere = isLoyaltyActiveForOutlet(orderOutlet?.code, loyaltyCfg);

      const baseDiscount =
        discountAmount !== undefined
          ? Math.max(order.pointsRedeemed > 0 ? order.discountAmount : 0, Number(discountAmount))
          : order.discountAmount;
      const tip = tipAmount !== undefined ? Number(tipAmount) : order.tipAmount;

      const cleanSettlePhone = customerPhone?.trim() || order.customerPhone || "";
      let settleCust = order.customerId
        ? await prisma.customer.findUnique({ where: { id: order.customerId } })
        : cleanSettlePhone
        ? await prisma.customer.findUnique({ where: { phone: cleanSettlePhone } })
        : null;

      let extraRedeemedPts = 0;
      let extraLoyaltyDiscount = 0;

      if (settleCust && loyaltyActiveHere && order.pointsRedeemed === 0) {
        const maxRedeemable = Math.max(
          0,
          order.subtotal + order.serviceCharge + order.taxAmount - baseDiscount
        );
        if (redeemRewardGift && settleCust.loyaltyPoints >= loyaltyCfg.loyaltyRewardThreshold) {
          extraRedeemedPts = loyaltyCfg.loyaltyRewardThreshold;
          extraLoyaltyDiscount = Math.min(maxRedeemable, loyaltyCfg.loyaltyRewardValue);
        } else if (Number(pointsRedeemed) > 0 && settleCust.loyaltyPoints > 0) {
          extraRedeemedPts = Math.min(settleCust.loyaltyPoints, Math.floor(Number(pointsRedeemed)));
          extraLoyaltyDiscount = Math.min(
            maxRedeemable,
            Number((extraRedeemedPts * loyaltyCfg.poundValuePerPoint).toFixed(2))
          );
        }
      }

      const discount = baseDiscount + extraLoyaltyDiscount;
      const newFinal = Math.max(
        0,
        order.subtotal + order.serviceCharge + order.taxAmount + (order.deliveryFee || 0) - discount + tip
      );
      const effectiveMethod = paymentMethod || order.paymentMethod || "CASH";

      if (order.isScheduled) {
        await ensureDepletedOnce();
      }

      const storeNetSettled = Math.max(0, newFinal - (order.deliveryFee || 0) - tip);
      const prevStoreNet = Math.max(0, order.finalAmount - (order.deliveryFee || 0) - (order.tipAmount || 0));
      const computedPointsEarned = cleanSettlePhone
        ? calculateEarnedPoints(storeNetSettled, orderOutlet?.code, settings)
        : order.pointsEarned;

      let updatedCustomerSnapshot: any = null;
      let linkedCustomerId = order.customerId;

      if (cleanSettlePhone) {
        if (!order.customerId) {
          if (settleCust) {
            updatedCustomerSnapshot = await prisma.customer.update({
              where: { id: settleCust.id },
              data: {
                name: customerName?.trim() || settleCust.name,
                totalSpent: settleCust.totalSpent + storeNetSettled,
                visitCount: settleCust.visitCount + 1,
                lastVisitAt: new Date(),
                loyaltyPoints: Math.max(0, settleCust.loyaltyPoints - extraRedeemedPts + computedPointsEarned),
              },
            });
          } else {
            updatedCustomerSnapshot = await prisma.customer.create({
              data: {
                phone: cleanSettlePhone,
                name: customerName?.trim() || order.customerName || "عميل VIP",
                totalSpent: storeNetSettled,
                visitCount: 1,
                lastVisitAt: new Date(),
                loyaltyPoints: computedPointsEarned,
              },
            });
          }
          linkedCustomerId = updatedCustomerSnapshot.id;
        } else if (settleCust && order.paymentStatus !== "PAID") {
          const ptsDelta = (computedPointsEarned - order.pointsEarned) - extraRedeemedPts;
          const spendDelta = storeNetSettled - prevStoreNet;
          if (ptsDelta !== 0 || Math.abs(spendDelta) > 0.01 || extraRedeemedPts > 0) {
            updatedCustomerSnapshot = await prisma.customer.update({
              where: { id: settleCust.id },
              data: {
                loyaltyPoints: Math.max(0, settleCust.loyaltyPoints + ptsDelta),
                totalSpent: Math.max(0, settleCust.totalSpent + spendDelta),
                lastVisitAt: new Date(),
              },
            });
          } else {
            updatedCustomerSnapshot = settleCust;
          }
        } else {
          updatedCustomerSnapshot = settleCust;
        }
      }

      const storeRevenueForSettle = Number(Math.max(0, newFinal - (order.deliveryFee || 0)).toFixed(2));
      const settleTalabatFin = computeTalabatFinancials(storeRevenueForSettle, effectiveMethod, order.orderType, settings);

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          status: "COMPLETED",
          paymentMethod: effectiveMethod,
          discountAmount: discount,
          tipAmount: tip,
          finalAmount: Number(newFinal.toFixed(2)),
          commissionPercent: settleTalabatFin.commissionPercent,
          commissionAmount: settleTalabatFin.commissionAmount,
          platformNetAmount: settleTalabatFin.platformNetAmount,
          cashierName: cashierName || order.cashierName || "كاشير المنظومة",
          customerId: linkedCustomerId,
          customerPhone: cleanSettlePhone || order.customerPhone,
          customerName: customerName?.trim() || order.customerName,
          pointsEarned: computedPointsEarned,
          pointsRedeemed: order.pointsRedeemed + extraRedeemedPts,
          settledAt: new Date(),
        },
        include: {
          outlet: true,
          table: true,
          deliveryZone: true,
          driver: true,
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

      // Update active Shift if one exists (CRITICAL: Keep deliveryFee OUT of Store Revenue & Talabat OUT of Cash Drawer!)
      try {
        const activeShift = await prisma.shift.findFirst({
          where: { outletId: order.outletId, status: "OPEN" },
          orderBy: { openedAt: "desc" },
        });

        if (activeShift && order.paymentStatus !== "PAID") {
          const deliveryPortion = Number(order.deliveryFee || 0);
          const storeRevenuePortion = Number(Math.max(0, newFinal - deliveryPortion).toFixed(2));
          await prisma.shift.update({
            where: { id: activeShift.id },
            data: {
              totalRevenue: { increment: storeRevenuePortion },
              deliveryFeesTotal: { increment: deliveryPortion },
              ticketsCount: { increment: 1 },
              ...buildShiftMethodIncrement(effectiveMethod, storeRevenuePortion, settleTalabatFin.commissionAmount),
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
        customer: updatedCustomerSnapshot,
        pointsEarned: computedPointsEarned,
        pointsRedeemed: order.pointsRedeemed + extraRedeemedPts,
        loyaltyProgress: updatedCustomerSnapshot
          ? getLoyaltyProgress(updatedCustomerSnapshot.loyaltyPoints, settings)
          : null,
      });
    }

    // Action: Cancel Order
    if (action === "CANCEL") {
      if (order.status !== "CANCELLED" && order.customerId) {
        try {
          const cust = await prisma.customer.findUnique({ where: { id: order.customerId } });
          if (cust) {
            const storeSpend = Math.max(0, order.finalAmount - (order.deliveryFee || 0) - (order.tipAmount || 0));
            const revertedPts = Math.max(0, cust.loyaltyPoints - (order.pointsEarned || 0) + (order.pointsRedeemed || 0));
            await prisma.customer.update({
              where: { id: cust.id },
              data: {
                loyaltyPoints: revertedPts,
                totalSpent: Math.max(0, cust.totalSpent - storeSpend),
              },
            });
          }
        } catch {
          // Non-fatal
        }
      }

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

    // Action: Direct Status Update (e.g. from KDS or Waiter or Driver or Prep Station)
    if (status) {
      if (order.isScheduled && (status === "PREPARING" || status === "READY_TO_SERVE" || status === "COMPLETED")) {
        await ensureDepletedOnce();
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(driverId !== undefined && { driverId }),
          ...(driverName && { driverName: driverName.trim() }),
          ...(driverPhone !== undefined && { driverPhone: driverPhone?.trim() || null }),
          ...(paymentMethod && { paymentMethod }),
          ...(status === "OUT_FOR_DELIVERY" && { dispatchedAt: new Date() }),
          ...(status === "COMPLETED" && { settledAt: new Date() }),
        },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          deliveryZone: { select: { id: true, nameAr: true, fee: true } },
          driver: { select: { id: true, name: true, phone: true } },
        },
      });

      if (status === "COMPLETED" && order.tableId) {
        await prisma.diningTable.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE", activeOrderId: null },
        });
      }

      if (status === "READY_TO_SERVE") {
        await sendPushNotifications(
          { roles: ["POS"], outletId: updatedOrder.outletId },
          {
            title: `✅ الطلب #${updatedOrder.orderNumber} جاهز للتسليم`,
            body: `أنهى المطبخ/البار تجهيز طلب ${updatedOrder.customerName || "العميل"} (${updatedOrder.outlet?.name || ""})`,
            url: "/pos",
            tag: `ready-pos-${updatedOrder.id}`,
          }
        );
        if (updatedOrder.customerPhone) {
          await sendPushNotifications(
            { customerPhone: updatedOrder.customerPhone },
            {
              title: `✅ طلبك #${updatedOrder.orderNumber} جاهز الآن!`,
              body: `طلبك جاهز في ${updatedOrder.outlet?.name || "أبو عادل & سول ميت"} 🎉`,
              url: "/order",
              tag: `ready-cust-${updatedOrder.id}`,
            }
          );
        }
      } else if (status === "OUT_FOR_DELIVERY" && updatedOrder.customerPhone) {
        await sendPushNotifications(
          { customerPhone: updatedOrder.customerPhone },
          {
            title: `🛵 طلبك #${updatedOrder.orderNumber} في الطريق!`,
            body: `خرج الطلب للتوصيل إليك الآن${updatedOrder.driverName ? ` مع ${updatedOrder.driverName}` : ""}.`,
            url: "/order",
            tag: `delivery-cust-${updatedOrder.id}`,
          }
        );
      }

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
