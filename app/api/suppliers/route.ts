import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGroupDebtSplit } from "@/lib/procurement";

export const dynamic = "force-dynamic";

async function ensureCoreSuppliers() {
  const [abuAdel, soulmate] = await Promise.all([
    prisma.outlet.findFirst({ where: { code: "ABU_ADEL_PATISSERIE" } }),
    prisma.outlet.findFirst({ where: { code: "SOULMATE_CAFE" } }),
  ]);

  if (abuAdel) {
    const hasFactory = await prisma.supplier.findFirst({
      where: { outletId: abuAdel.id, code: "MAIN_FACTORY" },
    });
    if (!hasFactory) {
      await prisma.supplier.create({
        data: {
          outletId: abuAdel.id,
          code: "MAIN_FACTORY",
          name: "مصنع حلواني أبو عادل الرئيسي",
          supplierType: "FACTORY",
          isInternalSupply: false,
          notes: "المصنع الرئيسي المورد لمنتجات وحلويات حلواني أبو عادل يومياً",
        },
      });
    } else if (hasFactory.name.includes("??") || hasFactory.notes?.includes("??")) {
      await prisma.supplier.update({
        where: { id: hasFactory.id },
        data: {
          name: "مصنع حلواني أبو عادل الرئيسي",
          notes: "المصنع الرئيسي المورد لمنتجات وحلويات حلواني أبو عادل يومياً",
        },
      });
    }
  }

  if (soulmate) {
    const hasInternal = await prisma.supplier.findFirst({
      where: { outletId: soulmate.id, code: "ABU_ADEL_INTERNAL" },
    });
    if (!hasInternal) {
      await prisma.supplier.create({
        data: {
          outletId: soulmate.id,
          code: "ABU_ADEL_INTERNAL",
          name: "حلواني أبو عادل (توريد حلويات لسول ميت)",
          supplierType: "INTERNAL_ABU_ADEL",
          isInternalSupply: true,
          deductFromSourceOutlet: true,
          notes: "حساب توريد الحلويات من أبو عادل إلى سول ميت كافيه بنفس التكلفة أو بهامش بسيط",
        },
      });
    } else if (hasInternal.name.includes("??") || hasInternal.notes?.includes("??")) {
      await prisma.supplier.update({
        where: { id: hasInternal.id },
        data: {
          name: "حلواني أبو عادل (توريد حلويات لسول ميت)",
          notes: "حساب توريد الحلويات من أبو عادل إلى سول ميت كافيه بنفس التكلفة أو بهامش بسيط",
        },
      });
    }

    const hasCups = await prisma.supplier.findFirst({
      where: { outletId: soulmate.id, code: "CUPS_PACKAGING" },
    });
    if (!hasCups) {
      await prisma.supplier.create({
        data: {
          outletId: soulmate.id,
          code: "CUPS_PACKAGING",
          name: "مورد الأكواب الكرتون والتغليف (مهلة 3 أسابيع)",
          supplierType: "RAW_MATERIALS",
          isInternalSupply: false,
          notes: "مورد الأكواب الكرتون ومستلزمات التغليف لكافيه سول ميت — يحتاج الطلب قبلها بـ 21 يوم",
        },
      });
    } else if (hasCups.name.includes("??") || hasCups.notes?.includes("??")) {
      await prisma.supplier.update({
        where: { id: hasCups.id },
        data: {
          name: "مورد الأكواب الكرتون والتغليف (مهلة 3 أسابيع)",
          notes: "مورد الأكواب الكرتون ومستلزمات التغليف لكافيه سول ميت — يحتاج الطلب قبلها بـ 21 يوم",
        },
      });
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const supplierId = searchParams.get("supplierId");

    await ensureCoreSuppliers();

    // If statement for a specific supplier is requested
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          transactions: {
            orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!supplier) {
        return NextResponse.json({ success: false, error: "المورد غير موجود" }, { status: 404 });
      }

      let running = Number(supplier.openingBalance || 0);
      const ledgerRows = supplier.transactions.map((tx) => {
        const amt = Number(tx.totalAmount || 0);
        let debitEffect = 0; // reduces our debt (payment/return)
        let creditEffect = 0; // increases our debt (invoice/adjustment+)

        if (tx.type === "INVOICE") {
          creditEffect = amt;
          running += amt;
        } else if (tx.type === "PAYMENT" || tx.type === "RETURN") {
          debitEffect = amt;
          running -= amt;
        } else if (tx.type === "ADJUSTMENT") {
          if (amt >= 0) {
            creditEffect = amt;
            running += amt;
          } else {
            debitEffect = Math.abs(amt);
            running += amt;
          }
        }

        return {
          ...tx,
          creditEffect: Number(creditEffect.toFixed(2)),
          debitEffect: Number(debitEffect.toFixed(2)),
          runningBalance: Number(running.toFixed(2)),
        };
      });

      return NextResponse.json({
        success: true,
        supplier: {
          ...supplier,
          currentBalance: Number(running.toFixed(2)),
        },
        statement: ledgerRows,
      });
    }

    const allSuppliers = await prisma.supplier.findMany({
      orderBy: [{ isInternalSupply: "asc" }, { createdAt: "asc" }],
      include: {
        outlet: { select: { id: true, name: true, code: true } },
        transactions: {
          orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
          take: 100,
        },
      },
    });

    let factoryDebtTotal = 0;
    let rawSuppliersDebtTotal = 0;
    let soulmateToAbuAdelDebtTotal = 0;

    const computedSuppliers = allSuppliers.map((sup) => {
      const opening = Number(sup.openingBalance || 0);
      let invoicesSum = 0;
      let paymentsSum = 0;
      let returnsSum = 0;
      let adjustmentsSum = 0;

      for (const tx of sup.transactions) {
        const amt = Number(tx.totalAmount || 0);
        if (tx.type === "INVOICE") invoicesSum += amt;
        else if (tx.type === "PAYMENT") paymentsSum += amt;
        else if (tx.type === "RETURN") returnsSum += amt;
        else if (tx.type === "ADJUSTMENT") adjustmentsSum += amt;
      }

      const currentBalance = Number(
        (opening + invoicesSum - paymentsSum - returnsSum + adjustmentsSum).toFixed(2)
      );

      if (sup.isInternalSupply || sup.supplierType === "INTERNAL_ABU_ADEL") {
        soulmateToAbuAdelDebtTotal += Math.max(0, currentBalance);
      } else if (sup.supplierType === "FACTORY") {
        factoryDebtTotal += Math.max(0, currentBalance);
      } else {
        rawSuppliersDebtTotal += Math.max(0, currentBalance);
      }

      return {
        ...sup,
        invoicesSum: Number(invoicesSum.toFixed(2)),
        paymentsSum: Number(paymentsSum.toFixed(2)),
        returnsSum: Number(returnsSum.toFixed(2)),
        currentBalance,
        lastTransaction: sup.transactions[0] || null,
      };
    });

    const filteredSuppliers =
      outletId && outletId !== "ALL"
        ? computedSuppliers.filter((s) => s.outletId === outletId)
        : computedSuppliers;

    const debtSplit = calculateGroupDebtSplit({
      factoryDebt: factoryDebtTotal,
      rawSuppliersDebt: rawSuppliersDebtTotal,
      soulmateToAbuAdelDebt: soulmateToAbuAdelDebtTotal,
    });

    const settings = await prisma.systemSettings.findFirst();

    return NextResponse.json({
      success: true,
      suppliers: filteredSuppliers,
      allSuppliers: computedSuppliers,
      debtSplit,
      internalSupplySettings: {
        enabled: Boolean(settings?.internalSupplyMarkupEnabled),
        markupPercent: Number(settings?.internalSupplyMarkupPercent || 0),
      },
    });
  } catch (error: any) {
    console.error("[SUPPLIERS_GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. CREATE OR UPDATE SUPPLIER
    if (action === "CREATE_SUPPLIER" || action === "UPDATE_SUPPLIER") {
      const {
        id,
        outletId,
        name,
        supplierType = "FACTORY",
        phone,
        contactPerson,
        address,
        openingBalance = 0,
        isInternalSupply = false,
        deductFromSourceOutlet = true,
        notes,
        isActive = true,
      } = body;

      if (!name || !String(name).trim()) {
        return NextResponse.json({ success: false, error: "اسم المورد مطلوب" }, { status: 400 });
      }

      if (action === "UPDATE_SUPPLIER" && id) {
        const updated = await prisma.supplier.update({
          where: { id },
          data: {
            name: String(name).trim(),
            supplierType,
            phone: phone || null,
            contactPerson: contactPerson || null,
            address: address || null,
            openingBalance: Number(openingBalance) || 0,
            isInternalSupply: Boolean(isInternalSupply),
            deductFromSourceOutlet: Boolean(deductFromSourceOutlet),
            notes: notes || null,
            isActive: Boolean(isActive),
          },
        });
        return NextResponse.json({
          success: true,
          supplier: updated,
          message: `تم تحديث بيانات المورد (${updated.name}) بنجاح ✅`,
        });
      }

      let resolvedOutletId = outletId;
      if (!resolvedOutletId || resolvedOutletId === "ALL") {
        const targetCode =
          supplierType === "RAW_MATERIALS" || supplierType === "INTERNAL_ABU_ADEL" || isInternalSupply
            ? "SOULMATE_CAFE"
            : "ABU_ADEL_PATISSERIE";
        const o = await prisma.outlet.findFirst({ where: { code: targetCode } });
        resolvedOutletId = o?.id || (await prisma.outlet.findFirst())?.id;
      }

      if (!resolvedOutletId) {
        return NextResponse.json({ success: false, error: "الفرع غير موجود" }, { status: 404 });
      }

      const created = await prisma.supplier.create({
        data: {
          outletId: resolvedOutletId,
          name: String(name).trim(),
          supplierType,
          phone: phone || null,
          contactPerson: contactPerson || null,
          address: address || null,
          openingBalance: Number(openingBalance) || 0,
          isInternalSupply: Boolean(isInternalSupply || supplierType === "INTERNAL_ABU_ADEL"),
          deductFromSourceOutlet: Boolean(deductFromSourceOutlet),
          notes: notes || null,
        },
      });

      return NextResponse.json({
        success: true,
        supplier: created,
        message: `تم إضافة المورد (${created.name}) برصيد أول مدة ${Number(openingBalance || 0)} ج.م ✅`,
      });
    }

    // 2. RECORD INVOICE (Manual or AI-Digested Factory / Raw Material / Internal Abu Adel -> Soulmate)
    if (action === "RECORD_INVOICE") {
      const {
        supplierId,
        invoiceNumber,
        transactionDate,
        items = [],
        totalAmount,
        paidAmount = 0,
        paymentMethod = "CASH",
        paymentSource = "OWNER_CURRENT_ACCOUNT",
        deductFromSourceOutlet,
        updateCostPrices = true,
        imageUrl,
        aiConfidence = "MANUAL",
        recordedBy = "المايسترو",
        notes = "",
      } = body;

      if (!supplierId) {
        return NextResponse.json({ success: false, error: "يرجى اختيار المورد أولاً" }, { status: 400 });
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: { outlet: true },
      });
      if (!supplier) {
        return NextResponse.json({ success: false, error: "المورد غير موجود" }, { status: 404 });
      }

      const settings = await prisma.systemSettings.findFirst();
      const markupPct =
        supplier.isInternalSupply && settings?.internalSupplyMarkupEnabled
          ? Math.max(0, Number(settings.internalSupplyMarkupPercent || 0))
          : 0;
      const shouldDeductSource =
        supplier.isInternalSupply &&
        (deductFromSourceOutlet !== undefined
          ? Boolean(deductFromSourceOutlet)
          : Boolean(supplier.deductFromSourceOutlet));

      const cleanItems: any[] = [];
      let itemsSubtotal = 0;

      const [abuAdelOutlet, soulmateOutlet] = await Promise.all([
        prisma.outlet.findFirst({ where: { code: "ABU_ADEL_PATISSERIE" } }),
        prisma.outlet.findFirst({ where: { code: "SOULMATE_CAFE" } }),
      ]);

      for (const row of Array.isArray(items) ? items : []) {
        const qty = Number(row.quantity || row.qty || 0);
        if (qty <= 0) continue;

        const baseCost = Math.max(0, Number(row.unitCost || row.costPrice || 0));
        const effectiveCost = supplier.isInternalSupply
          ? Number((baseCost * (1 + markupPct / 100)).toFixed(2))
          : baseCost;
        const rowTotal = Number((qty * effectiveCost).toFixed(2));
        itemsSubtotal += rowTotal;

        let targetType: "MENU_ITEM" | "RAW_MATERIAL" =
          row.targetType === "RAW_MATERIAL" ? "RAW_MATERIAL" : "MENU_ITEM";
        let targetId = row.id || row.matchedId || "";
        let itemName = String(row.name || row.matchedName || row.extractedName || "").trim();

        // A) Handle Raw Material inbound (e.g., Soulmate Carton Cups / Bar ingredients)
        if (targetType === "RAW_MATERIAL") {
          let raw = targetId
            ? await prisma.rawMaterial.findUnique({ where: { id: targetId } })
            : null;

          if (!raw && itemName) {
            raw = await prisma.rawMaterial.create({
              data: {
                outletId: supplier.outletId,
                nameAr: itemName,
                unit: row.unit || "PIECE",
                openingStock: 0,
                currentStock: 0,
                minStockAlert: Number(row.minStockAlert || 200),
                leadTimeDays: supplier.code === "CUPS_PACKAGING" ? 21 : Number(row.leadTimeDays || 3),
                costPerUnit: effectiveCost,
                supplierName: supplier.name,
                defaultSupplierId: supplier.id,
              },
            });
          }

          if (raw) {
            await prisma.rawMaterial.update({
              where: { id: raw.id },
              data: {
                currentStock: { increment: Number(qty.toFixed(3)) },
                ...(updateCostPrices && effectiveCost > 0 ? { costPerUnit: effectiveCost } : {}),
                supplierName: supplier.name,
                defaultSupplierId: supplier.id,
              },
            });

            await prisma.rawMaterialMovement.create({
              data: {
                rawMaterialId: raw.id,
                type: "INBOUND",
                quantity: Number(qty.toFixed(3)),
                costPerUnit: effectiveCost,
                totalCost: rowTotal,
                supplierName: supplier.name,
                invoiceNumber: invoiceNumber || null,
                recordedBy,
                notes: notes || `فاتورة مورد: ${supplier.name}`,
              },
            });

            targetId = raw.id;
            itemName = raw.nameAr;
          }
        } else {
          // B) Handle MenuItem (Abu Adel Finished Pastry OR Internal Supply Abu Adel -> Soulmate)
          let product = targetId
            ? await prisma.menuItem.findUnique({ where: { id: targetId } })
            : null;

          if (supplier.isInternalSupply && soulmateOutlet) {
            // Internal Transfer / Supply from Abu Adel -> Soulmate Cafe!
            let sourceAbuAdelItem =
              product && product.outletId === abuAdelOutlet?.id
                ? product
                : product
                ? await prisma.menuItem.findFirst({
                    where: {
                      outletId: abuAdelOutlet?.id,
                      nameAr: product.nameAr,
                    },
                  })
                : itemName && abuAdelOutlet
                ? await prisma.menuItem.findFirst({
                    where: {
                      outletId: abuAdelOutlet.id,
                      nameAr: { contains: itemName },
                    },
                  })
                : null;

            const resolvedName = product?.nameAr || sourceAbuAdelItem?.nameAr || itemName;
            const transferCost =
              effectiveCost > 0
                ? effectiveCost
                : Number(
                    ((sourceAbuAdelItem?.costPrice || product?.costPrice || 0) * (1 + markupPct / 100)).toFixed(2)
                  );

            // Find or create matching item inside Soulmate outlet
            let destSoulmateItem =
              product && product.outletId === soulmateOutlet.id
                ? product
                : await prisma.menuItem.findFirst({
                    where: {
                      outletId: soulmateOutlet.id,
                      nameAr: resolvedName,
                    },
                  });

            if (!destSoulmateItem && resolvedName) {
              destSoulmateItem = await prisma.menuItem.create({
                data: {
                  outletId: soulmateOutlet.id,
                  nameAr: resolvedName,
                  nameEn: sourceAbuAdelItem?.nameEn || null,
                  category: sourceAbuAdelItem?.category || "WESTERN_PASTRY",
                  price: sourceAbuAdelItem?.price || Number((transferCost * 1.4).toFixed(0)) || 50,
                  costPrice: transferCost,
                  image: sourceAbuAdelItem?.image || null,
                  itemType: "READY_PASTRY",
                  unitType: sourceAbuAdelItem?.unitType || row.unit || "PIECE",
                  openingStock: 0,
                  stockQty: 0,
                  minStockAlert: 5,
                },
              });
            }

            if (destSoulmateItem) {
              await prisma.menuItem.update({
                where: { id: destSoulmateItem.id },
                data: {
                  stockQty: { increment: Number(qty.toFixed(3)) },
                  ...(updateCostPrices && transferCost > 0 ? { costPrice: transferCost } : {}),
                },
              });

              await prisma.productMovement.create({
                data: {
                  menuItemId: destSoulmateItem.id,
                  type: "INBOUND",
                  quantity: Number(qty.toFixed(3)),
                  unitCost: transferCost,
                  totalCost: Number((qty * transferCost).toFixed(2)),
                  supplierName: supplier.name,
                  invoiceNumber: invoiceNumber || null,
                  recordedBy,
                  notes: `توريد بيني من أبو عادل (هامش ${markupPct}%)`,
                },
              });

              targetId = destSoulmateItem.id;
              itemName = destSoulmateItem.nameAr;
            }

            // Deduct from Abu Adel stock if enabled
            if (shouldDeductSource && sourceAbuAdelItem) {
              await prisma.menuItem.update({
                where: { id: sourceAbuAdelItem.id },
                data: {
                  stockQty: Math.max(0, Number(((sourceAbuAdelItem.stockQty || 0) - qty).toFixed(3))),
                },
              });

              await prisma.productMovement.create({
                data: {
                  menuItemId: sourceAbuAdelItem.id,
                  type: "TRANSFER_OUT",
                  quantity: -Number(qty.toFixed(3)),
                  unitCost: baseCost || sourceAbuAdelItem.costPrice || 0,
                  totalCost: Number((qty * (baseCost || sourceAbuAdelItem.costPrice || 0)).toFixed(2)),
                  supplierName: "سول ميت كافيه VIP (تحويل بيني)",
                  invoiceNumber: invoiceNumber || null,
                  recordedBy,
                  notes: `صرف/توريد حلويات لسول ميت كافيه (${invoiceNumber || "بدون رقم"})`,
                },
              });
            }
          } else {
            // Regular Factory / Bakery product inbound
            if (!product && itemName) {
              product = await prisma.menuItem.create({
                data: {
                  outletId: supplier.outletId,
                  nameAr: itemName,
                  category: row.category || "ORIENTAL_SWEETS",
                  price: Number(row.price || effectiveCost * 1.35 || 100),
                  costPrice: effectiveCost,
                  image: row.image || null,
                  itemType: "READY_PASTRY",
                  unitType: row.unit || "PIECE",
                  openingStock: 0,
                  stockQty: 0,
                  minStockAlert: Number(row.dailyLimit || 10),
                  defaultSupplierId: supplier.id,
                },
              });
            }

            if (product) {
              await prisma.menuItem.update({
                where: { id: product.id },
                data: {
                  stockQty: { increment: Number(qty.toFixed(3)) },
                  ...(updateCostPrices && effectiveCost > 0 ? { costPrice: effectiveCost } : {}),
                  defaultSupplierId: supplier.id,
                },
              });

              await prisma.productMovement.create({
                data: {
                  menuItemId: product.id,
                  type: "INBOUND",
                  quantity: Number(qty.toFixed(3)),
                  unitCost: effectiveCost,
                  totalCost: rowTotal,
                  supplierName: supplier.name,
                  invoiceNumber: invoiceNumber || null,
                  recordedBy,
                  notes: notes || `توريد فاتورة: ${supplier.name}`,
                },
              });

              targetId = product.id;
              itemName = product.nameAr;
            }
          }
        }

        cleanItems.push({
          targetType,
          id: targetId,
          name: itemName,
          qty,
          unit: row.unit || "PIECE",
          unitCost: effectiveCost,
          subtotal: rowTotal,
        });
      }

      const effectiveTotal = Number(totalAmount) > 0 ? Number(totalAmount) : Number(itemsSubtotal.toFixed(2));
      if (effectiveTotal <= 0 && cleanItems.length === 0) {
        return NextResponse.json(
          { success: false, error: "يرجى إدخال أصناف أو مبلغ صحيح للفاتورة" },
          { status: 400 }
        );
      }

      const paidNow = Math.max(0, Math.min(effectiveTotal, Number(paidAmount) || 0));
      const remaining = Math.max(0, Number((effectiveTotal - paidNow).toFixed(2)));
      const paymentStatus = paidNow <= 0 ? "CREDIT" : remaining <= 0 ? "PAID" : "PARTIAL";
      const txDate = transactionDate ? new Date(transactionDate) : new Date();

      const invoiceTx = await prisma.supplierTransaction.create({
        data: {
          supplierId: supplier.id,
          outletId: supplier.outletId,
          type: "INVOICE",
          invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
          transactionDate: txDate,
          totalAmount: effectiveTotal,
          paidAmount: paidNow,
          remainingAmount: remaining,
          paymentStatus,
          paymentMethod: paidNow > 0 ? paymentMethod : "CREDIT",
          paymentSource: paidNow > 0 ? paymentSource : "OWNER_CURRENT_ACCOUNT",
          itemsJson: JSON.stringify(cleanItems),
          imageUrl: imageUrl || null,
          aiConfidence,
          recordedBy,
          notes:
            notes ||
            `فاتورة توريد (${cleanItems.length} صنف)${
              remaining > 0 ? ` • متبقي آجل: ${remaining} ج.م` : " • مسددة بالكامل"
            }`,
        },
      });

      // Record linked PAYMENT entry + cash drawer Expense if paid partially or fully from DRAWER
      let linkedExpenseId: string | null = null;
      if (paidNow > 0) {
        if (paymentSource === "DRAWER" && paymentMethod === "CASH") {
          const exp = await prisma.expense.create({
            data: {
              outletId: supplier.outletId,
              title: `سداد فاتورة مورد من الدرج: ${supplier.name} (${invoiceTx.invoiceNumber})`,
              amount: paidNow,
              category: "SUPPLIER_PAYMENT",
              recordedBy,
              notes: `سداد فوري عند استلام الفاتورة رقم ${invoiceTx.invoiceNumber}`,
            },
          });
          linkedExpenseId = exp.id;
        }

        await prisma.supplierTransaction.create({
          data: {
            supplierId: supplier.id,
            outletId: supplier.outletId,
            type: "PAYMENT",
            invoiceNumber: invoiceTx.invoiceNumber,
            transactionDate: txDate,
            totalAmount: paidNow,
            paidAmount: paidNow,
            remainingAmount: 0,
            paymentStatus: "PAID",
            paymentMethod,
            paymentSource,
            expenseId: linkedExpenseId,
            recordedBy,
            notes: `دفعة سداد فورية على الفاتورة ${invoiceTx.invoiceNumber} (${
              paymentSource === "DRAWER"
                ? "من درج الكاشير"
                : paymentSource === "OWNER_CURRENT_ACCOUNT"
                ? "من حساب جاري المالك"
                : "من الخزينة/البنك"
            })`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        invoiceTx,
        itemsCount: cleanItems.length,
        message: `تم ترحيل الفاتورة (${invoiceTx.invoiceNumber}) للمخزن وكشف حساب ${supplier.name} بنجاح ✅${
          paidNow > 0 ? ` | مسدد: ${paidNow} ج` : ""
        }${remaining > 0 ? ` | آجل: ${remaining} ج` : ""}`,
      });
    }

    // 3. RECORD SUPPLIER PAYMENT (دفعة سداد مستقلة - من الدرج أو جاري المالك أو البنك)
    if (action === "RECORD_PAYMENT") {
      const {
        supplierId,
        amount,
        paymentMethod = "CASH",
        paymentSource = "OWNER_CURRENT_ACCOUNT",
        invoiceNumber,
        transactionDate,
        recordedBy = "المايسترو",
        notes = "",
      } = body;

      const payVal = Number(amount || 0);
      if (!supplierId || payVal <= 0) {
        return NextResponse.json(
          { success: false, error: "يرجى اختيار المورد وإدخال مبلغ السداد الصحيح" },
          { status: 400 }
        );
      }

      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return NextResponse.json({ success: false, error: "المورد غير موجود" }, { status: 404 });
      }

      let linkedExpenseId: string | null = null;
      if (paymentSource === "DRAWER" && paymentMethod === "CASH") {
        const exp = await prisma.expense.create({
          data: {
            outletId: supplier.outletId,
            title: `دفعة سداد مورد من الدرج: ${supplier.name}`,
            amount: payVal,
            category: "SUPPLIER_PAYMENT",
            recordedBy,
            notes: notes || `دفعة سداد مسحوبة من الدرج لحساب ${supplier.name}`,
          },
        });
        linkedExpenseId = exp.id;
      }

      const tx = await prisma.supplierTransaction.create({
        data: {
          supplierId: supplier.id,
          outletId: supplier.outletId,
          type: "PAYMENT",
          invoiceNumber: invoiceNumber || `PAY-${Date.now().toString().slice(-6)}`,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          totalAmount: payVal,
          paidAmount: payVal,
          remainingAmount: 0,
          paymentStatus: "PAID",
          paymentMethod,
          paymentSource,
          expenseId: linkedExpenseId,
          recordedBy,
          notes:
            notes ||
            `سداد للمورد (${
              paymentSource === "DRAWER"
                ? "من درج الكاشير"
                : paymentSource === "OWNER_CURRENT_ACCOUNT"
                ? "من حساب جاري المالك"
                : "من الخزينة/البنك"
            })`,
        },
      });

      return NextResponse.json({
        success: true,
        transaction: tx,
        message: `تم تسجيل دفعة سداد بقيمة ${payVal.toLocaleString()} ج.م لحساب (${supplier.name})${
          linkedExpenseId ? " وخصمها من درج الكاشير اليومي ✅" : " من خارج الدرج ✅"
        }`,
      });
    }

    // 4. APPLY OPENING STOCK FROM GEMINI AI DIGEST
    if (action === "APPLY_OPENING_STOCK_AI") {
      const {
        outletId,
        items = [],
        recordedBy = "المايسترو (Gemini AI)",
        notes = "اعتماد رصيد أول المدة المهضوم بالذكاء الاصطناعي",
      } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: "لا توجد أصناف للاعتماد" }, { status: 400 });
      }

      const abuAdel = await prisma.outlet.findFirst({ where: { code: "ABU_ADEL_PATISSERIE" } });
      const soulmate = await prisma.outlet.findFirst({ where: { code: "SOULMATE_CAFE" } });

      let appliedCount = 0;

      for (const row of items) {
        const qty = Math.max(0, Number(row.quantity ?? row.qty ?? 0));
        const unitCost = Math.max(0, Number(row.unitCost || 0));
        const dailyLimit =
          row.dailyLimit !== null && row.dailyLimit !== undefined && Number(row.dailyLimit) > 0
            ? Number(row.dailyLimit)
            : undefined;
        const targetType = row.targetType === "RAW_MATERIAL" ? "RAW_MATERIAL" : "MENU_ITEM";
        const targetId = row.id || row.matchedId;
        const itemName = String(row.name || row.extractedName || "").trim();

        if (targetType === "RAW_MATERIAL") {
          let raw = targetId ? await prisma.rawMaterial.findUnique({ where: { id: targetId } }) : null;
          if (!raw && itemName && (outletId || soulmate?.id)) {
            raw = await prisma.rawMaterial.create({
              data: {
                outletId: outletId && outletId !== "ALL" ? outletId : soulmate!.id,
                nameAr: itemName,
                unit: row.unit || "PIECE",
                openingStock: qty,
                currentStock: qty,
                minStockAlert: dailyLimit || 200,
                costPerUnit: unitCost,
              },
            });
          } else if (raw) {
            await prisma.rawMaterial.update({
              where: { id: raw.id },
              data: {
                openingStock: Number(qty.toFixed(3)),
                currentStock: Number(qty.toFixed(3)),
                ...(dailyLimit !== undefined ? { minStockAlert: dailyLimit } : {}),
                ...(unitCost > 0 ? { costPerUnit: unitCost } : {}),
              },
            });
          }

          if (raw) {
            await prisma.rawMaterialMovement.create({
              data: {
                rawMaterialId: raw.id,
                type: "INITIAL",
                quantity: Number(qty.toFixed(3)),
                costPerUnit: unitCost || raw.costPerUnit,
                totalCost: Number((qty * (unitCost || raw.costPerUnit)).toFixed(2)),
                recordedBy,
                notes,
              },
            });
            appliedCount += 1;
          }
        } else {
          let product = targetId ? await prisma.menuItem.findUnique({ where: { id: targetId } }) : null;
          if (!product && itemName && (outletId || abuAdel?.id)) {
            product = await prisma.menuItem.create({
              data: {
                outletId: outletId && outletId !== "ALL" ? outletId : abuAdel!.id,
                nameAr: itemName,
                category: row.category || "ORIENTAL_SWEETS",
                price: Number(row.price || unitCost * 1.35 || 100),
                costPrice: unitCost,
                image: row.image || null,
                itemType: "READY_PASTRY",
                unitType: row.unit || "PIECE",
                openingStock: qty,
                stockQty: qty,
                minStockAlert: dailyLimit || 10,
              },
            });
          } else if (product) {
            await prisma.menuItem.update({
              where: { id: product.id },
              data: {
                openingStock: Number(qty.toFixed(3)),
                stockQty: Number(qty.toFixed(3)),
                ...(dailyLimit !== undefined ? { minStockAlert: dailyLimit } : {}),
                ...(unitCost > 0 ? { costPrice: unitCost } : {}),
              },
            });
          }

          if (product) {
            await prisma.productMovement.create({
              data: {
                menuItemId: product.id,
                type: "INITIAL",
                quantity: Number(qty.toFixed(3)),
                unitCost: unitCost || product.costPrice,
                totalCost: Number((qty * (unitCost || product.costPrice)).toFixed(2)),
                recordedBy,
                notes,
              },
            });
            appliedCount += 1;
          }
        }
      }

      return NextResponse.json({
        success: true,
        appliedCount,
        message: `تم تثبيت رصيد أول المدة لـ ${appliedCount} صنف من كشف الجرد بالذكاء الاصطناعي بنجاح 🎯🤖`,
      });
    }

    return NextResponse.json({ success: false, error: "إجراء غير مدعوم" }, { status: 400 });
  } catch (error: any) {
    console.error("[SUPPLIERS_POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
