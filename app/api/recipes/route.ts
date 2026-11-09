import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }

    const [rawMaterialsRaw, recipes, audits] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        orderBy: { nameAr: "asc" },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          _count: { select: { recipeUsage: true } },
          movements: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      prisma.recipeItem.findMany({
        include: {
          menuItem: { select: { id: true, nameAr: true, price: true, category: true, outletId: true } },
          rawMaterial: { select: { id: true, nameAr: true, unit: true, costPerUnit: true } },
        },
      }),
      prisma.inventoryAudit.findMany({
        ...(outletId && outletId !== "ALL" ? { where: { outletId } } : {}),
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: true,
          outlet: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Enrich raw materials with ERP ledger summaries
    const rawMaterials = rawMaterialsRaw.map((raw) => {
      const movements = raw.movements || [];
      const totalInbound = movements
        .filter((m) => m.type === "INBOUND")
        .reduce((sum, m) => sum + m.quantity, 0);

      const totalConsumed = movements
        .filter((m) => m.type === "CONSUMPTION")
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

      const openingStock = raw.openingStock || 0;
      const expectedStock = openingStock + totalInbound - totalConsumed;

      return {
        ...raw,
        openingStock,
        totalInbound,
        totalConsumed,
        expectedStock,
        currentStock: raw.currentStock,
        costPerUnit: raw.costPerUnit,
      };
    });

    // Group recipes by menuItemId
    const recipeMap: Record<string, any[]> = {};
    for (const r of recipes) {
      if (!recipeMap[r.menuItemId]) {
        recipeMap[r.menuItemId] = [];
      }
      recipeMap[r.menuItemId].push(r);
    }

    return NextResponse.json({
      success: true,
      rawMaterials,
      recipeMap,
      audits,
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
      outletId,
      nameAr,
      unit,
      openingStock,
      currentStock,
      minStockAlert,
      costPerUnit,
      supplierName,
      invoiceNumber,
      recordedBy,
      notes,
      menuItemId,
      rawMaterialId,
      id,
      quantity,
      addStock,
      addedStock,
      ingredients,
      auditorName,
      auditItems,
    } = body;

    // 1. ACTION: CREATE_RAW (كارت صنف خامة بار جديد)
    if (action === "CREATE_RAW" || (!action && nameAr)) {
      if (!nameAr || !nameAr.trim()) {
        return NextResponse.json({ success: false, error: "اسم الخامة مطلوب" }, { status: 400 });
      }

      let resolvedOutletId = outletId;
      if (!resolvedOutletId || resolvedOutletId === "ALL") {
        const soulmate = await prisma.outlet.findFirst({
          where: { code: "SOULMATE_CAFE" },
        });
        resolvedOutletId = soulmate ? soulmate.id : (await prisma.outlet.findFirst())?.id;
      }

      if (!resolvedOutletId) {
        return NextResponse.json({ success: false, error: "لم يتم العثور على فرع كافيه سول ميت" }, { status: 400 });
      }

      const initialOpening = Number(openingStock) || Number(currentStock) || 0;
      const unitCost = Number(costPerUnit) || 0.5;

      const raw = await prisma.rawMaterial.create({
        data: {
          outletId: resolvedOutletId,
          nameAr: nameAr.trim(),
          unit: unit || "GRAM",
          openingStock: initialOpening,
          currentStock: initialOpening,
          minStockAlert: Number(minStockAlert) || 200,
          costPerUnit: unitCost,
          supplierName: supplierName?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      // Register initial opening movement
      if (initialOpening > 0) {
        await prisma.rawMaterialMovement.create({
          data: {
            rawMaterialId: raw.id,
            type: "INBOUND",
            quantity: initialOpening,
            costPerUnit: unitCost,
            totalCost: initialOpening * unitCost,
            supplierName: supplierName?.trim() || "رصيد افتتاحي",
            recordedBy: recordedBy || "المايسترو",
            notes: "رصيد بداية المدة التأسيسي لكارت الصنف",
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `تم إنشاء كارت صنف الخامة (${raw.nameAr}) برصيد افتتاحي ${initialOpening} ${raw.unit} بنجاح ✨`,
        rawMaterial: raw,
      });
    }

    // 2. ACTION: ADD_MOVEMENT / RESTOCK (حركة توريد بضاعة منفصلة)
    if (action === "ADD_MOVEMENT" || action === "RESTOCK") {
      const targetId = rawMaterialId || id;
      const inboundQty = Number(quantity || addStock || addedStock || 0);

      if (!targetId || inboundQty <= 0) {
        return NextResponse.json({ success: false, error: "يرجى تحديد الخامة وكمية التوريد بشكل صحيح" }, { status: 400 });
      }

      const existing = await prisma.rawMaterial.findUnique({ where: { id: targetId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "الخامة غير موجودة بالمنظومة" }, { status: 404 });
      }

      const effectiveCost = costPerUnit !== undefined && Number(costPerUnit) > 0 ? Number(costPerUnit) : existing.costPerUnit;
      const totalMonetaryValue = inboundQty * effectiveCost;

      // 1. Create Inbound Movement Ledger
      const movement = await prisma.rawMaterialMovement.create({
        data: {
          rawMaterialId: existing.id,
          type: "INBOUND",
          quantity: inboundQty,
          costPerUnit: effectiveCost,
          totalCost: totalMonetaryValue,
          supplierName: supplierName?.trim() || existing.supplierName || null,
          invoiceNumber: invoiceNumber?.trim() || null,
          recordedBy: recordedBy || "المايسترو",
          notes: notes?.trim() || null,
        },
      });

      // 2. Increment Current Stock
      const updated = await prisma.rawMaterial.update({
        where: { id: existing.id },
        data: {
          currentStock: { increment: inboundQty },
          costPerUnit: effectiveCost,
          ...(supplierName ? { supplierName: supplierName.trim() } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم تسجيل حركة توريد (+${inboundQty} ${existing.unit}) لخامة (${existing.nameAr}) بنجاح 📦`,
        rawMaterial: updated,
        movement,
      });
    }

    // 3. ACTION: UPDATE_RECIPE / SAVE_RECIPE (حفظ وتعديل ريسيبي المشروب)
    if ((action === "UPDATE_RECIPE" || action === "SAVE_RECIPE") && menuItemId) {
      if (!Array.isArray(ingredients)) {
        return NextResponse.json({ success: false, error: "قائمة المكونات مطلوبة" }, { status: 400 });
      }

      // Delete old recipe items for this menu item
      await prisma.recipeItem.deleteMany({
        where: { menuItemId },
      });

      // Insert fresh recipe items
      for (const ing of ingredients) {
        if (ing.rawMaterialId && Number(ing.qtyRequired) > 0) {
          await prisma.recipeItem.create({
            data: {
              menuItemId,
              rawMaterialId: ing.rawMaterialId,
              qtyRequired: Number(ing.qtyRequired),
            },
          });
        }
      }

      // Recalculate cost for menuItem based on raw material costs
      const freshRecipes = await prisma.recipeItem.findMany({
        where: { menuItemId },
        include: { rawMaterial: true },
      });

      const totalCost = freshRecipes.reduce(
        (sum, r) => sum + r.qtyRequired * (r.rawMaterial?.costPerUnit || 0),
        0
      );

      const updatedMenuItem = await prisma.menuItem.update({
        where: { id: menuItemId },
        data: { costPrice: Number(totalCost.toFixed(2)) },
      });

      return NextResponse.json({
        success: true,
        message: `تم حفظ ريسيبي (${updatedMenuItem.nameAr}) وتحديث تكلفة الكوب إلى (${totalCost.toFixed(2)} ج.م) بنجاح 📋☕`,
        costPrice: totalCost,
      });
    }

    // 4. ACTION: RECORD_AUDIT (محضر الجرد الفعلي والتسوية السحابية)
    if (action === "RECORD_AUDIT") {
      let resolvedOutletId = outletId;
      if (!resolvedOutletId || resolvedOutletId === "ALL") {
        const soulmate = await prisma.outlet.findFirst({
          where: { code: "SOULMATE_CAFE" },
        });
        resolvedOutletId = soulmate ? soulmate.id : (await prisma.outlet.findFirst())?.id;
      }

      if (!resolvedOutletId || !Array.isArray(auditItems) || auditItems.length === 0) {
        return NextResponse.json({ success: false, error: "بيانات محضر الجرد غير مكتملة" }, { status: 400 });
      }

      // Create Audit Record
      const audit = await prisma.inventoryAudit.create({
        data: {
          outletId: resolvedOutletId,
          auditorName: auditorName || "المايسترو",
          notes: notes || "جرد دوري فعلي للخامات",
        },
      });

      for (const item of auditItems) {
        const raw = await prisma.rawMaterial.findUnique({
          where: { id: item.rawMaterialId },
        });
        if (!raw) continue;

        const actual = Number(item.actualStock) || 0;
        const expected = Number(item.expectedStock) || raw.currentStock;
        const variance = actual - expected;
        const varianceCost = variance * raw.costPerUnit;
        const status = variance === 0 ? "MATCH" : variance < 0 ? "DEFICIT" : "SURPLUS";

        // Save audit item
        await prisma.inventoryAuditItem.create({
          data: {
            auditId: audit.id,
            rawMaterialId: raw.id,
            rawMaterialName: raw.nameAr,
            unit: raw.unit,
            costPerUnit: raw.costPerUnit,
            openingStock: raw.openingStock,
            totalInbound: item.totalInbound || 0,
            totalConsumed: item.totalConsumed || 0,
            expectedStock: expected,
            actualStock: actual,
            variance,
            varianceCost,
            status,
          },
        });

        // Reconcile book stock to actual
        await prisma.rawMaterial.update({
          where: { id: raw.id },
          data: { currentStock: actual },
        });

        // Record adjustment movement if there is a variance
        if (variance !== 0) {
          await prisma.rawMaterialMovement.create({
            data: {
              rawMaterialId: raw.id,
              type: "ADJUSTMENT",
              quantity: variance,
              costPerUnit: raw.costPerUnit,
              totalCost: Math.abs(varianceCost),
              recordedBy: auditorName || "المايسترو",
              notes: `تسوية جردية رسمية (محضر #${audit.id.slice(-6)}): ${variance < 0 ? "عجز" : "زيادة"} بمقدار ${variance} ${raw.unit}`,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "تم اعتماد محضر الجرد وتسوية الأرصدة الدفترية مع الفعلي بنجاح 📋✅",
        auditId: audit.id,
      });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, id, rawMaterialId, addedStock, quantity, newCostPerUnit, costPerUnit, supplierName, invoiceNumber, recordedBy, notes, nameAr, unit, minStockAlert } = body;
    const targetId = id || rawMaterialId;

    if (!targetId) {
      return NextResponse.json({ success: false, error: "معرف الخامة مطلوب" }, { status: 400 });
    }

    // Action: Restock Inbound Shipment (Redirects to movement creation)
    if (action === "RESTOCK" || action === "ADD_MOVEMENT") {
      const existing = await prisma.rawMaterial.findUnique({ where: { id: targetId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "الخامة غير موجودة" }, { status: 404 });
      }

      const inboundQty = Number(quantity || addedStock || 0);
      const effectiveCost = Number(costPerUnit || newCostPerUnit) || existing.costPerUnit;

      const movement = await prisma.rawMaterialMovement.create({
        data: {
          rawMaterialId: existing.id,
          type: "INBOUND",
          quantity: inboundQty,
          costPerUnit: effectiveCost,
          totalCost: inboundQty * effectiveCost,
          supplierName: supplierName?.trim() || existing.supplierName || null,
          invoiceNumber: invoiceNumber?.trim() || null,
          recordedBy: recordedBy || "المايسترو",
          notes: notes?.trim() || null,
        },
      });

      const updated = await prisma.rawMaterial.update({
        where: { id: targetId },
        data: {
          currentStock: existing.currentStock + inboundQty,
          costPerUnit: effectiveCost,
          ...(supplierName ? { supplierName: supplierName.trim() } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم توريد (+${inboundQty} ${existing.unit}) لخامة (${existing.nameAr}) بنجاح 📦`,
        rawMaterial: updated,
        movement,
      });
    }

    // Action: Direct Edit of Item Card details
    const raw = await prisma.rawMaterial.update({
      where: { id: targetId },
      data: {
        ...(nameAr && { nameAr: nameAr.trim() }),
        ...(unit && { unit }),
        ...(minStockAlert !== undefined && { minStockAlert: Number(minStockAlert) }),
        ...(newCostPerUnit !== undefined && { costPerUnit: Number(newCostPerUnit) }),
        ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
        ...(notes !== undefined && { notes }),
        ...(supplierName !== undefined && { supplierName }),
      },
    });

    return NextResponse.json({ success: true, rawMaterial: raw });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
