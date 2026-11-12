import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [outlets, consignments, internalSupplier, menuItems] = await Promise.all([
      prisma.outlet.findMany(),
      prisma.consignmentBatch.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.supplier.findFirst({
        where: { isInternalSupply: true },
        include: {
          transactions: {
            orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
            take: 60,
          },
        },
      }),
      prisma.menuItem.findMany({
        include: { outlet: { select: { id: true, code: true, name: true } } },
        orderBy: [{ category: "asc" }, { nameAr: "asc" }],
      }),
    ]);

    const abuAdelOutlet = outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE");
    const soulmateOutlet = outlets.find((o) => o.code === "SOULMATE_CAFE");

    const abuAdelItems = menuItems.filter((m) => m.outletId === abuAdelOutlet?.id);
    const soulmateReadyItems = menuItems.filter(
      (m) => m.outletId === soulmateOutlet?.id && m.itemType === "READY_PASTRY"
    );

    return NextResponse.json({
      success: true,
      consignments,
      transferHistory: internalSupplier?.transactions || [],
      abuAdelItems,
      soulmateReadyItems,
      internalSupplierId: internalSupplier?.id || null,
    });
  } catch (error: any) {
    console.error("[CONSIGNMENTS_GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const [outlets, settings] = await Promise.all([
      prisma.outlet.findMany(),
      prisma.systemSettings.findFirst(),
    ]);
    const abuAdelOutlet = outlets.find((o) => o.code === "ABU_ADEL_PATISSERIE");
    const soulmateOutlet = outlets.find((o) => o.code === "SOULMATE_CAFE");

    if (!abuAdelOutlet || !soulmateOutlet) {
      return NextResponse.json(
        { success: false, error: "تعذر العثور على فرعي حلواني أبو عادل وسول ميت كافيه" },
        { status: 400 }
      );
    }

    // Ensure internal inter-brand ledger supplier exists
    let internalSupplier = await prisma.supplier.findFirst({ where: { isInternalSupply: true } });
    if (!internalSupplier) {
      internalSupplier = await prisma.supplier.create({
        data: {
          outletId: soulmateOutlet.id,
          code: "ABU_ADEL_INTERNAL",
          name: "توريدات حلواني أبو عادل إلى سول ميت (حساب بيني بالتكلفة)",
          supplierType: "INTERNAL_ABU_ADEL",
          isInternalSupply: true,
          deductFromSourceOutlet: true,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ABU ADEL -> SOULMATE INTER-BRANCH TRANSFER AT COST
    // ─────────────────────────────────────────────────────────────
    if (action === "TRANSFER_ABU_ADEL_TO_SOULMATE") {
      const {
        items = [],
        recordedBy = "المايسترو",
        notes = "",
        deductFromAbuAdel = true,
      } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: "يرجى اختيار صنف واحد على الأقل للتحويل" }, { status: 400 });
      }

      const markupFactor =
        settings?.internalSupplyMarkupEnabled && settings.internalSupplyMarkupPercent > 0
          ? 1 + settings.internalSupplyMarkupPercent / 100
          : 1;

      let totalTransferCost = 0;
      const voucherNo = `TRF-${Date.now().toString().slice(-6)}`;
      const voucherRows: any[] = [];

      for (const row of items) {
        const qty = Number(row.quantity || 0);
        if (qty <= 0) continue;

        const src = row.abuAdelMenuItemId
          ? await prisma.menuItem.findUnique({ where: { id: row.abuAdelMenuItemId } })
          : null;
        if (!src) continue;

        const baseCost = Number(row.unitCost !== undefined && row.unitCost !== "" ? row.unitCost : src.costPrice || 0);
        const transferUnitCost = Number((baseCost * markupFactor).toFixed(2));
        const lineTotal = Number((qty * transferUnitCost).toFixed(2));
        totalTransferCost += lineTotal;

        // Deduct from Abu Adel stock (WITHOUT generating fake retail POS revenue)
        if (deductFromAbuAdel) {
          await prisma.menuItem.update({
            where: { id: src.id },
            data: { stockQty: Math.max(0, Number(((src.stockQty || 0) - qty).toFixed(3))) },
          });
          await prisma.productMovement.create({
            data: {
              menuItemId: src.id,
              type: "TRANSFER_OUT",
              quantity: -Number(qty.toFixed(3)),
              unitCost: baseCost,
              totalCost: Number((qty * baseCost).toFixed(2)),
              supplierName: "سول ميت كافيه VIP (تحويل بيني)",
              invoiceNumber: voucherNo,
              recordedBy,
              notes: notes || `تحويل مخزني بالتكلفة إلى سول ميت كافيه (${voucherNo})`,
            },
          });
        }

        // Find or create matching Ready Pastry item in Soulmate
        let dest = row.soulmateMenuItemId
          ? await prisma.menuItem.findUnique({ where: { id: row.soulmateMenuItemId } })
          : null;
        if (!dest) {
          dest = await prisma.menuItem.findFirst({
            where: { outletId: soulmateOutlet.id, nameAr: src.nameAr },
          });
        }
        if (!dest) {
          const cleanCat =
            src.category === "ORIENTAL_SWEETS" || src.category === "KAHK_NOVAM" || src.category === "WESTERN_PASTRY"
              ? "DESSERT"
              : src.category === "ICE_CREAM"
              ? "ICE_CREAM"
              : "PASTRY";
          dest = await prisma.menuItem.create({
            data: {
              outletId: soulmateOutlet.id,
              nameAr: src.nameAr,
              nameEn: src.nameEn,
              category: cleanCat,
              price: src.price,
              costPrice: transferUnitCost,
              image: src.image,
              itemType: "READY_PASTRY",
              unitType: src.unitType || "PIECE",
              openingStock: 0,
              stockQty: Number(qty.toFixed(3)),
              minStockAlert: 3,
              defaultSupplierId: internalSupplier.id,
            },
          });
        } else {
          await prisma.menuItem.update({
            where: { id: dest.id },
            data: {
              stockQty: { increment: Number(qty.toFixed(3)) },
              ...(transferUnitCost > 0 ? { costPrice: transferUnitCost } : {}),
              defaultSupplierId: internalSupplier.id,
            },
          });
        }

        await prisma.productMovement.create({
          data: {
            menuItemId: dest.id,
            type: "INBOUND",
            quantity: Number(qty.toFixed(3)),
            unitCost: transferUnitCost,
            totalCost: lineTotal,
            supplierName: "حلواني أبو عادل (تحويل بيني)",
            invoiceNumber: voucherNo,
            recordedBy,
            notes: notes || `استلام تحويل بيني بالتكلفة من حلواني أبو عادل (${voucherNo})`,
          },
        });

        voucherRows.push({
          name: src.nameAr,
          quantity: qty,
          unit: src.unitType,
          unitCost: transferUnitCost,
          total: lineTotal,
        });
      }

      if (voucherRows.length === 0) {
        return NextResponse.json({ success: false, error: "لم يتم العثور على أصناف صالحة للتحويل" }, { status: 400 });
      }

      // Debit Soulmate <-> Abu Adel internal ledger at cost
      const cleanTotal = Number(totalTransferCost.toFixed(2));
      const tx = await prisma.supplierTransaction.create({
        data: {
          supplierId: internalSupplier.id,
          outletId: soulmateOutlet.id,
          type: "INVOICE",
          invoiceNumber: voucherNo,
          totalAmount: cleanTotal,
          paidAmount: 0,
          remainingAmount: cleanTotal,
          paymentStatus: "CREDIT",
          paymentMethod: "CREDIT",
          paymentSource: "OWNER_CURRENT_ACCOUNT",
          itemsJson: JSON.stringify(voucherRows),
          aiConfidence: "MANUAL",
          recordedBy,
          notes:
            notes ||
            `إذن تحويل بيني بالتكلفة (${voucherNo}) — من حلواني أبو عادل إلى سول ميت (${voucherRows.length} صنف)`,
        },
      });

      return NextResponse.json({
        success: true,
        transaction: tx,
        voucherNo,
        message: `تم تحويل ${voucherRows.length} صنف من أبو عادل إلى سول ميت بالتكلفة (${cleanTotal.toLocaleString()} ج.م) بإذن ${voucherNo} 🔄✅`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SOULMATE -> ABU ADEL CONSIGNMENT RETURN ("أمانة بيع لحساب سول ميت")
    // ─────────────────────────────────────────────────────────────
    if (action === "SEND_CONSIGNMENT_TO_ABU_ADEL") {
      const {
        soulmateMenuItemId,
        abuAdelMenuItemId,
        quantity,
        unitCost: explicitCost,
        sellingPrice: explicitPrice,
        notes = "",
        recordedBy = "المايسترو",
      } = body;

      const qty = Number(quantity || 0);
      if (!soulmateMenuItemId || qty <= 0) {
        return NextResponse.json(
          { success: false, error: "يرجى اختيار الصنف في سول ميت وإدخال كمية صحيحة أكبر من صفر" },
          { status: 400 }
        );
      }

      const src = await prisma.menuItem.findUnique({ where: { id: soulmateMenuItemId } });
      if (!src) {
        return NextResponse.json({ success: false, error: "الصنف غير موجود في سول ميت" }, { status: 404 });
      }

      let dest = abuAdelMenuItemId
        ? await prisma.menuItem.findUnique({ where: { id: abuAdelMenuItemId } })
        : null;
      if (!dest) {
        dest = await prisma.menuItem.findFirst({
          where: { outletId: abuAdelOutlet.id, nameAr: src.nameAr },
        });
      }
      if (!dest) {
        dest = await prisma.menuItem.create({
          data: {
            outletId: abuAdelOutlet.id,
            nameAr: src.nameAr,
            nameEn: src.nameEn,
            category: src.category === "PASTRY" ? "BAKERY_FETEER" : "WESTERN_PASTRY",
            price: Number(explicitPrice || src.price || 0),
            costPrice: Number(explicitCost || src.costPrice || 0),
            image: src.image,
            itemType: "READY_PASTRY",
            unitType: src.unitType || "PIECE",
            openingStock: 0,
            stockQty: 0,
            minStockAlert: 5,
          },
        });
      }

      const unitCost = Number(explicitCost !== undefined && explicitCost !== "" ? explicitCost : src.costPrice || 0);
      const sellingPrice = Number(
        explicitPrice !== undefined && explicitPrice !== "" ? explicitPrice : dest.price || src.price || 0
      );

      // Move stock cleanly from Soulmate -> Abu Adel (NO revenue or debt mutation!)
      await prisma.menuItem.update({
        where: { id: src.id },
        data: { stockQty: Math.max(0, Number(((src.stockQty || 0) - qty).toFixed(3))) },
      });
      await prisma.productMovement.create({
        data: {
          menuItemId: src.id,
          type: "TRANSFER_OUT",
          quantity: -Number(qty.toFixed(3)),
          unitCost,
          totalCost: Number((qty * unitCost).toFixed(2)),
          supplierName: "حلواني أبو عادل (أمانة بيع)",
          recordedBy,
          notes: notes || `إرسال أمانة بيع لحلواني أبو عادل (${qty} ${src.unitType}) لحساب سول ميت`,
        },
      });

      await prisma.menuItem.update({
        where: { id: dest.id },
        data: { stockQty: { increment: Number(qty.toFixed(3)) } },
      });
      await prisma.productMovement.create({
        data: {
          menuItemId: dest.id,
          type: "INBOUND",
          quantity: Number(qty.toFixed(3)),
          unitCost,
          totalCost: Number((qty * unitCost).toFixed(2)),
          supplierName: "سول ميت كافيه (أمانة بيع)",
          recordedBy,
          notes: notes || `استلام أمانة بيع لحساب سول ميت كافيه (${qty} ${dest.unitType})`,
        },
      });

      const batch = await prisma.consignmentBatch.create({
        data: {
          outletSourceCode: "SOULMATE_CAFE",
          outletDestCode: "ABU_ADEL_PATISSERIE",
          soulmateMenuItemId: src.id,
          abuAdelMenuItemId: dest.id,
          itemName: src.nameAr,
          unitType: src.unitType || "PIECE",
          unitCost,
          sellingPrice,
          sentQty: Number(qty.toFixed(3)),
          soldQty: 0,
          returnedQty: 0,
          remainingQty: Number(qty.toFixed(3)),
          soldRevenue: 0,
          settledAmount: 0,
          settlementMode: "PENDING",
          status: "OPEN",
          notes: notes || null,
          recordedBy,
        },
      });

      return NextResponse.json({
        success: true,
        batch,
        message: `تم قيد ${qty} من "${src.nameAr}" كـ [أمانة بيع لحساب سول ميت] عند حلواني أبو عادل بنجاح 🤝✅`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. MANUAL SOLD RECORDING ON CONSIGNMENT (in case sold outside POS)
    // ─────────────────────────────────────────────────────────────
    if (action === "RECORD_CONSIGNMENT_SOLD") {
      const { batchId, soldQty, deductAbuAdelStock = true, recordedBy = "المايسترو" } = body;
      const batch = await prisma.consignmentBatch.findUnique({ where: { id: batchId } });
      if (!batch) {
        return NextResponse.json({ success: false, error: "دفعة الأمانة غير موجودة" }, { status: 404 });
      }
      const q = Number(soldQty || 0);
      if (q <= 0 || q > batch.remainingQty + 0.0001) {
        return NextResponse.json(
          { success: false, error: `الكمية المباعة يجب أن تكون بين 0 و المتبقي (${batch.remainingQty})` },
          { status: 400 }
        );
      }
      const actualQ = Math.min(q, batch.remainingQty);
      const addRevenue = Number((actualQ * batch.sellingPrice).toFixed(2));
      const newRemaining = Number(Math.max(0, batch.remainingQty - actualQ).toFixed(3));

      if (deductAbuAdelStock && batch.abuAdelMenuItemId) {
        const dest = await prisma.menuItem.findUnique({ where: { id: batch.abuAdelMenuItemId } });
        if (dest) {
          await prisma.menuItem.update({
            where: { id: dest.id },
            data: { stockQty: Math.max(0, Number(((dest.stockQty || 0) - actualQ).toFixed(3))) },
          });
          await prisma.productMovement.create({
            data: {
              menuItemId: dest.id,
              type: "SALE",
              quantity: -actualQ,
              unitCost: batch.unitCost,
              totalCost: Number((actualQ * batch.unitCost).toFixed(2)),
              recordedBy,
              notes: `قيد مبيعات أمانة بيع لحساب سول ميت (${batch.itemName})`,
            },
          });
        }
      }

      const updated = await prisma.consignmentBatch.update({
        where: { id: batch.id },
        data: {
          soldQty: Number((batch.soldQty + actualQ).toFixed(3)),
          remainingQty: newRemaining,
          soldRevenue: Number((batch.soldRevenue + addRevenue).toFixed(2)),
          status: "PARTIAL",
        },
      });

      return NextResponse.json({
        success: true,
        batch: updated,
        message: `تم تسجيل بيع ${actualQ} من الأمانة بمبلغ ${addRevenue.toLocaleString()} ج.م لحساب سول ميت ✅`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. SETTLE SOLD CONSIGNMENT PROCEEDS (OFFSET_DEBT OR CASH_PAYOUT)
    // ─────────────────────────────────────────────────────────────
    if (action === "SETTLE_CONSIGNMENT_SOLD") {
      const {
        batchId,
        settlementMode, // "OFFSET_DEBT" | "CASH_PAYOUT"
        amount,
        paymentSource = "DRAWER",
        recordedBy = "المايسترو",
        notes = "",
      } = body;

      const batch = await prisma.consignmentBatch.findUnique({ where: { id: batchId } });
      if (!batch) {
        return NextResponse.json({ success: false, error: "دفعة الأمانة غير موجودة" }, { status: 404 });
      }

      const unsettled = Number(Math.max(0, batch.soldRevenue - batch.settledAmount).toFixed(2));
      if (unsettled <= 0.01) {
        return NextResponse.json({ success: false, error: "لا توجد حصيلة مبيعات معلقة للتسوية في هذه الدفعة" }, { status: 400 });
      }

      const settleAmt = Number(
        Math.min(unsettled, amount !== undefined && amount !== "" ? Number(amount) : unsettled).toFixed(2)
      );
      if (settleAmt <= 0) {
        return NextResponse.json({ success: false, error: "مبلغ التسوية غير صالح" }, { status: 400 });
      }

      if (settlementMode === "OFFSET_DEBT") {
        await prisma.supplierTransaction.create({
          data: {
            supplierId: internalSupplier.id,
            outletId: soulmateOutlet.id,
            type: "RETURN",
            totalAmount: settleAmt,
            paidAmount: settleAmt,
            remainingAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "CASH",
            paymentSource: "OWNER_CURRENT_ACCOUNT",
            aiConfidence: "MANUAL",
            recordedBy,
            notes:
              notes ||
              `خصم عائد مبيعات أمانة البيع (${batch.itemName}) من مديونية سول ميت لأبو عادل ♻️`,
          },
        });
      } else if (settlementMode === "CASH_PAYOUT") {
        if (paymentSource === "DRAWER") {
          await prisma.expense.create({
            data: {
              outletId: abuAdelOutlet.id,
              title: `تسليم عهدة نقدية مبيعات أمانة لسول ميت (${batch.itemName})`,
              amount: settleAmt,
              category: "SUPPLIES",
              recordedBy,
              notes: notes || `صرف من درج أبو عادل لتسليم قيمة مبيعات أمانة سول ميت`,
            },
          });
        }
      } else {
        return NextResponse.json({ success: false, error: "اختر آلية التسوية الصحيحة (خصم من الدين أو صرف كاش)" }, { status: 400 });
      }

      const newSettled = Number((batch.settledAmount + settleAmt).toFixed(2));
      const fullySettled = batch.remainingQty <= 0.0001 && newSettled >= batch.soldRevenue - 0.01;

      const updated = await prisma.consignmentBatch.update({
        where: { id: batch.id },
        data: {
          settledAmount: newSettled,
          settlementMode,
          status: fullySettled ? "SETTLED" : "PARTIAL",
        },
      });

      return NextResponse.json({
        success: true,
        batch: updated,
        message:
          settlementMode === "OFFSET_DEBT"
            ? `تم خصم ${settleAmt.toLocaleString()} ج.م من مديونية سول ميت لأبو عادل بنجاح ♻️✅`
            : `تم صرف ${settleAmt.toLocaleString()} ج.م نقدياً لحساب سول ميت (${paymentSource === "DRAWER" ? "وخصمها من درج أبو عادل" : "من الخزنة الرئيسية"}) 💵✅`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. RETURN UNSOLD CONSIGNMENT BACK TO SOULMATE AT SAME COST
    // ─────────────────────────────────────────────────────────────
    if (action === "RETURN_CONSIGNMENT_UNSOLD") {
      const { batchId, returnQty, recordedBy = "المايسترو", notes = "" } = body;
      const batch = await prisma.consignmentBatch.findUnique({ where: { id: batchId } });
      if (!batch) {
        return NextResponse.json({ success: false, error: "دفعة الأمانة غير موجودة" }, { status: 404 });
      }

      const q = Number(returnQty ?? batch.remainingQty);
      if (q <= 0 || q > batch.remainingQty + 0.0001) {
        return NextResponse.json(
          { success: false, error: `الكمية المرتجعة يجب أن تكون بين 0 و المتبقي (${batch.remainingQty})` },
          { status: 400 }
        );
      }
      const actualQ = Math.min(q, batch.remainingQty);
      const costValue = Number((actualQ * batch.unitCost).toFixed(2));

      // Remove from Abu Adel shelf
      if (batch.abuAdelMenuItemId) {
        const abuItem = await prisma.menuItem.findUnique({ where: { id: batch.abuAdelMenuItemId } });
        if (abuItem) {
          await prisma.menuItem.update({
            where: { id: abuItem.id },
            data: { stockQty: Math.max(0, Number(((abuItem.stockQty || 0) - actualQ).toFixed(3))) },
          });
          await prisma.productMovement.create({
            data: {
              menuItemId: abuItem.id,
              type: "TRANSFER_OUT",
              quantity: -actualQ,
              unitCost: batch.unitCost,
              totalCost: costValue,
              supplierName: "سول ميت كافيه (رد أمانة لم تُبع)",
              recordedBy,
              notes: notes || `رد أمانة بيع غير مباعة إلى سول ميت بنفس التكلفة (${batch.itemName})`,
            },
          });
        }
      }

      // Restore to Soulmate shelf at original cost
      await prisma.menuItem.update({
        where: { id: batch.soulmateMenuItemId },
        data: { stockQty: { increment: Number(actualQ.toFixed(3)) } },
      });
      await prisma.productMovement.create({
        data: {
          menuItemId: batch.soulmateMenuItemId,
          type: "RETURN",
          quantity: Number(actualQ.toFixed(3)),
          unitCost: batch.unitCost,
          totalCost: costValue,
          supplierName: "حلواني أبو عادل (رد أمانة بيع)",
          recordedBy,
          notes: notes || `استرداد أمانة بيع لم تُبع من أبو عادل بنفس التكلفة (${batch.itemName})`,
        },
      });

      const newRemaining = Number(Math.max(0, batch.remainingQty - actualQ).toFixed(3));
      const newReturned = Number((batch.returnedQty + actualQ).toFixed(3));
      const fullyClosed = newRemaining <= 0.0001 && batch.soldRevenue - batch.settledAmount <= 0.01;

      const updated = await prisma.consignmentBatch.update({
        where: { id: batch.id },
        data: {
          returnedQty: newReturned,
          remainingQty: newRemaining,
          status: fullyClosed ? "SETTLED" : "PARTIAL",
        },
      });

      return NextResponse.json({
        success: true,
        batch: updated,
        message: `تم إرجاع ${actualQ} من "${batch.itemName}" إلى مخزن سول ميت بنفس التكلفة بدون أي مبيعات وهمية 🔄✅`,
      });
    }

    return NextResponse.json({ success: false, error: "أمر غير معروف في نظام التحويلات والأمانات" }, { status: 400 });
  } catch (error: any) {
    console.error("[CONSIGNMENTS_POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
