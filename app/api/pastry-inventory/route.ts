import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const category = searchParams.get("category");

    const where: any = {
      OR: [
        { itemType: "READY_PASTRY" },
        { outlet: { code: "ABU_ADEL_PATISSERIE" } },
      ],
    };

    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }

    const [itemsRaw, audits] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: [{ category: "asc" }, { nameAr: "asc" }],
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          movements: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      prisma.pastryAudit.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: true,
          outlet: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Calculate ERP metrics for each pastry item
    const items = itemsRaw.map((it) => {
      const movements = it.movements || [];
      const totalInbound = movements
        .filter((m) => m.type === "INBOUND")
        .reduce((sum, m) => sum + m.quantity, 0);

      const totalSold = movements
        .filter((m) => m.type === "SALE")
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

      const openingStock = it.openingStock || 0;
      const expectedStock = openingStock + totalInbound - totalSold;

      return {
        ...it,
        openingStock,
        totalInbound,
        totalSold,
        expectedStock,
        currentStock: it.stockQty,
      };
    });

    return NextResponse.json({
      success: true,
      items,
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
      menuItemId,
      openingStock,
      quantity,
      unitCost,
      supplierName,
      invoiceNumber,
      recordedBy,
      notes,
      auditorName,
      outletId,
      auditItems,
      setAsOpeningStock,
    } = body;

    // 1. ACTION: SET_OPENING_STOCK (تعيين / تعديل رصيد أول المدة لصنف حلويات)
    if (action === "SET_OPENING_STOCK") {
      if (!menuItemId || openingStock === undefined) {
        return NextResponse.json({ success: false, error: "معرف الصنف ورصيد أول المدة مطلوبين" }, { status: 400 });
      }

      const initialVal = Number(openingStock);
      const existing = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "الصنف غير موجود" }, { status: 404 });
      }

      const updated = await prisma.menuItem.update({
        where: { id: menuItemId },
        data: {
          openingStock: initialVal,
          stockQty: Math.round(initialVal),
        },
      });

      // Log movement
      await prisma.productMovement.create({
        data: {
          menuItemId,
          type: "INITIAL",
          quantity: initialVal,
          unitCost: existing.costPrice,
          totalCost: initialVal * existing.costPrice,
          recordedBy: recordedBy || "المايسترو",
          notes: notes || `تعيين رصيد أول المدة التأسيسي بعد الجرد: ${initialVal} ${existing.unitType}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم تثبيت رصيد أول المدة لصنف (${existing.nameAr}) بـ ${initialVal} ${existing.unitType} بنجاح 🎯`,
        item: updated,
      });
    }

    // 2. ACTION: ADD_INBOUND_MOVEMENT (توريد شحنة جديدة من معمل حلواني أبو عادل)
    if (action === "ADD_INBOUND_MOVEMENT") {
      const inboundQty = Number(quantity);
      if (!menuItemId || !inboundQty || inboundQty <= 0) {
        return NextResponse.json({ success: false, error: "يرجى تحديد الصنف وكمية التوريد بشكل صحيح" }, { status: 400 });
      }

      const existing = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "الصنف غير موجود" }, { status: 404 });
      }

      const effectiveCost = unitCost !== undefined && Number(unitCost) > 0 ? Number(unitCost) : existing.costPrice;

      // Log inbound movement
      const movement = await prisma.productMovement.create({
        data: {
          menuItemId: existing.id,
          type: "INBOUND",
          quantity: inboundQty,
          unitCost: effectiveCost,
          totalCost: inboundQty * effectiveCost,
          supplierName: supplierName?.trim() || "معمل حلواني أبو عادل",
          invoiceNumber: invoiceNumber?.trim() || null,
          recordedBy: recordedBy || "المايسترو",
          notes: notes?.trim() || null,
        },
      });

      // Increment actual stock
      const updated = await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          stockQty: { increment: Math.round(inboundQty) },
          ...(unitCost ? { costPrice: effectiveCost } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم تسجيل حركة توريد (+${inboundQty} ${existing.unitType}) لصنف (${existing.nameAr}) بنجاح 📦`,
        item: updated,
        movement,
      });
    }

    // 3. ACTION: RECORD_AUDIT (محضر الجرد الفعلي لحلويات أبو عادل)
    if (action === "RECORD_AUDIT") {
      let resolvedOutletId = outletId;
      if (!resolvedOutletId || resolvedOutletId === "ALL") {
        const abuAdel = await prisma.outlet.findFirst({
          where: { code: "ABU_ADEL_PATISSERIE" },
        });
        resolvedOutletId = abuAdel ? abuAdel.id : (await prisma.outlet.findFirst())?.id;
      }

      if (!resolvedOutletId || !Array.isArray(auditItems) || auditItems.length === 0) {
        return NextResponse.json({ success: false, error: "بيانات محضر الجرد غير مكتملة" }, { status: 400 });
      }

      const audit = await prisma.pastryAudit.create({
        data: {
          outletId: resolvedOutletId,
          auditorName: auditorName || "المايسترو",
          notes: notes || (setAsOpeningStock ? "جرد تأسيسي وتعيين رصيد أول المدة" : "جرد دوري فعلي لحلويات أبو عادل"),
        },
      });

      for (const item of auditItems) {
        const product = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        if (!product) continue;

        const actual = Number(item.actualStock) || 0;
        const expected = Number(item.expectedStock) || product.stockQty;
        const variance = actual - expected;
        const varianceCost = variance * product.price;
        const status = variance === 0 ? "MATCH" : variance < 0 ? "DEFICIT" : "SURPLUS";

        // Save audit item
        await prisma.pastryAuditItem.create({
          data: {
            auditId: audit.id,
            menuItemId: product.id,
            menuItemName: product.nameAr,
            unitType: product.unitType,
            price: product.price,
            costPrice: product.costPrice,
            openingStock: product.openingStock,
            totalInbound: item.totalInbound || 0,
            totalSold: item.totalSold || 0,
            expectedStock: expected,
            actualStock: actual,
            variance,
            varianceCost,
            status,
          },
        });

        // Reconcile stock
        await prisma.menuItem.update({
          where: { id: product.id },
          data: {
            stockQty: Math.round(actual),
            ...(setAsOpeningStock ? { openingStock: actual } : {}),
          },
        });

        // Record adjustment movement
        if (variance !== 0 || setAsOpeningStock) {
          await prisma.productMovement.create({
            data: {
              menuItemId: product.id,
              type: setAsOpeningStock ? "INITIAL" : "ADJUSTMENT",
              quantity: setAsOpeningStock ? actual : variance,
              unitCost: product.costPrice,
              totalCost: Math.abs(variance * product.costPrice),
              recordedBy: auditorName || "المايسترو",
              notes: setAsOpeningStock
                ? `تعيين رصيد أول المدة التأسيسي بالجرد: ${actual} ${product.unitType}`
                : `تسوية جردية (محضر #${audit.id.slice(-6)}): ${variance < 0 ? "عجز" : "زيادة"} ${variance} ${product.unitType}`,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: setAsOpeningStock
          ? "تم اعتماد الجرد الفعلي وتثبيته كرصيد أول المدة التأسيسي لجميع الأصناف بنجاح 🎯"
          : "تم اعتماد محضر الجرد وتسوية الأرصدة الفعلية لحلويات أبو عادل بنجاح 📋✅",
        auditId: audit.id,
      });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
