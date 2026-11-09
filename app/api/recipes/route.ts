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

    const [rawMaterials, recipes] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        orderBy: { nameAr: "asc" },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          _count: { select: { recipeUsage: true } },
        },
      }),
      prisma.recipeItem.findMany({
        include: {
          menuItem: { select: { id: true, nameAr: true, price: true, category: true, outletId: true } },
          rawMaterial: { select: { id: true, nameAr: true, unit: true, costPerUnit: true } },
        },
      }),
    ]);

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
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, outletId, nameAr, unit, currentStock, minStockAlert, costPerUnit, supplierName, notes, menuItemId, rawMaterialId, qtyRequired, ingredients } = body;

    // Action: Create Raw Material
    if (action === "CREATE_RAW" || (!action && nameAr)) {
      if (!outletId || !nameAr) {
        return NextResponse.json({ success: false, error: "اسم الخامة والفرع مطلوبين" }, { status: 400 });
      }

      const raw = await prisma.rawMaterial.create({
        data: {
          outletId,
          nameAr: nameAr.trim(),
          unit: unit || "GRAM",
          currentStock: Number(currentStock) || 1000,
          minStockAlert: Number(minStockAlert) || 200,
          costPerUnit: Number(costPerUnit) || 0.5,
          supplierName: supplierName?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      return NextResponse.json({ success: true, rawMaterial: raw });
    }

    // Action: Save Full Recipe for a Menu Item
    if (action === "SAVE_RECIPE" && menuItemId) {
      // ingredients: array of { rawMaterialId, qtyRequired }
      if (!Array.isArray(ingredients)) {
        return NextResponse.json({ success: false, error: "قائمة المكونات مطلوبة" }, { status: 400 });
      }

      // Delete old recipe items
      await prisma.recipeItem.deleteMany({
        where: { menuItemId },
      });

      // Insert new recipe items
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

      // Recalculate cost for menuItem
      const freshRecipes = await prisma.recipeItem.findMany({
        where: { menuItemId },
        include: { rawMaterial: true },
      });

      const totalCost = freshRecipes.reduce((sum, r) => sum + r.qtyRequired * (r.rawMaterial?.costPerUnit || 0), 0);
      await prisma.menuItem.update({
        where: { id: menuItemId },
        data: { costPrice: Number(totalCost.toFixed(2)) },
      });

      return NextResponse.json({ success: true, message: "تم حفظ ريسيبي الصنف وتحديث تكلفة التصنيع بنجاح 📋☕" });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, id, addedStock, newCostPerUnit, supplierName, notes, nameAr, unit, minStockAlert } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف الخامة مطلوب" }, { status: 400 });
    }

    // Action: Restock Inbound Shipment (توريد خامات إضافية وتحديث التكلفة)
    if (action === "RESTOCK") {
      const existing = await prisma.rawMaterial.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "الخامة غير موجودة" }, { status: 404 });
      }

      const updated = await prisma.rawMaterial.update({
        where: { id },
        data: {
          currentStock: existing.currentStock + Number(addedStock || 0),
          ...(newCostPerUnit && { costPerUnit: Number(newCostPerUnit) }),
          ...(supplierName && { supplierName }),
          ...(notes && { notes }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم توريد (+${addedStock} ${existing.unit}) لخامة (${existing.nameAr}) بنجاح 📦`,
        rawMaterial: updated,
      });
    }

    // Action: Direct Update
    const raw = await prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(nameAr && { nameAr: nameAr.trim() }),
        ...(unit && { unit }),
        ...(minStockAlert !== undefined && { minStockAlert: Number(minStockAlert) }),
        ...(newCostPerUnit !== undefined && { costPerUnit: Number(newCostPerUnit) }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, rawMaterial: raw });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
