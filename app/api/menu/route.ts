import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const category = searchParams.get("category");
    const itemType = searchParams.get("itemType");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (itemType && itemType !== "ALL") {
      where.itemType = itemType;
    }

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        recipes: {
          include: {
            rawMaterial: { select: { id: true, nameAr: true, unit: true, costPerUnit: true } },
          },
        },
      },
    });

    // Calculate dynamic cost price from recipe if PREPARED_BEVERAGE
    const enrichedItems = items.map((it) => {
      let calculatedCost = it.costPrice;
      if (it.itemType === "PREPARED_BEVERAGE" && it.recipes.length > 0) {
        calculatedCost = it.recipes.reduce((sum, r) => {
          return sum + r.qtyRequired * (r.rawMaterial?.costPerUnit || 0);
        }, 0);
      }
      const margin = it.price > 0 ? ((it.price - calculatedCost) / it.price) * 100 : 0;

      return {
        ...it,
        calculatedCost: Number(calculatedCost.toFixed(2)),
        profitMarginPercent: Number(margin.toFixed(1)),
      };
    });

    return NextResponse.json({ success: true, items: enrichedItems });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      nameAr,
      nameEn,
      category,
      price,
      costPrice,
      durationMinutes,
      description,
      image,
      itemType,
      unitType,
      stockQty,
      minStockAlert,
    } = body;

    if (!outletId || !nameAr || price === undefined) {
      return NextResponse.json({ success: false, error: "اسم الصنف والسعر والفرع مطلوبين" }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        outletId,
        nameAr: nameAr.trim(),
        nameEn: nameEn?.trim() || null,
        category: category || "HOT_DRINKS",
        price: Number(price),
        costPrice: Number(costPrice) || 0,
        durationMinutes: Number(durationMinutes) || 5,
        description: description?.trim() || null,
        image: image?.trim() || null,
        itemType: itemType || "PREPARED_BEVERAGE",
        unitType: unitType || "PIECE",
        stockQty: (itemType || "PREPARED_BEVERAGE") === "PREPARED_BEVERAGE" ? 0 : Number(stockQty) || 0,
        minStockAlert: Number(minStockAlert) || 10,
        isAvailable: true,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف الصنف مطلوب" }, { status: 400 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(data.nameAr !== undefined && { nameAr: data.nameAr }),
        ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.price !== undefined && { price: Number(data.price) }),
        ...(data.costPrice !== undefined && { costPrice: Number(data.costPrice) }),
        ...(data.durationMinutes !== undefined && { durationMinutes: Number(data.durationMinutes) }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.isAvailable !== undefined && { isAvailable: Boolean(data.isAvailable) }),
        ...(data.stockQty !== undefined && { stockQty: Number(data.stockQty) }),
        ...(data.minStockAlert !== undefined && { minStockAlert: Number(data.minStockAlert) }),
        ...(data.unitType !== undefined && { unitType: data.unitType }),
        ...(data.itemType !== undefined && { itemType: data.itemType }),
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف الصنف مطلوب" }, { status: 400 });
    }

    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف الصنف بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
