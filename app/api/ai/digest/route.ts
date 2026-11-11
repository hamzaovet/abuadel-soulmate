import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchCandidate, matchCatalogItemByName } from "@/lib/procurement";

export const dynamic = "force-dynamic";

// Working Gemini models verified against active API key (matching orca-wear priority order)
const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

function buildDigestPrompt(mode: "FACTORY_INVOICE" | "OPENING_STOCK", targetDomain: string) {
  if (mode === "OPENING_STOCK") {
    return `أنت نظام محاسبة وجرد مخازن ذكي متخصص في قراءة كشوف الجرد المكتوبة بخط اليد أو المطبوعة لـ حلواني أبو عادل وكافيه سول ميت (حلويات شرقية وتورت، أو خامات كافيه وأكواب كرتون).
السياق المستهدف: ${targetDomain}.

مهمتك استخراج كل سطر جرد ورصيد أول المدة بدقة بصيغة JSON فقط بدون أي نص خارجي:
{
  "sheetTitle": "عنوان الكشف أو القسم إن وجد أو null",
  "auditDate": "YYYY-MM-DD أو null",
  "auditorName": "اسم القائم بالجرد إن وجد أو null",
  "items": [
    {
      "name": "اسم الصنف أو الخامة واضحاً بالعربية",
      "quantity": 0,
      "unit": "KG أو PIECE أو BOX أو GRAM أو LITER أو ML",
      "unitCost": 0,
      "dailyLimit": null,
      "notes": "أي ملاحظة أو توضيح لو الخط غير واضح"
    }
  ],
  "confidence": "HIGH أو MEDIUM أو LOW",
  "generalNotes": "ملخص أو أي تنبيه"
}

قواعد صارمة:
- الكميات والأسعار وحد الطلب لازم تكون أرقام (numbers) وليست نصوصاً.
- لو الصنف بالكيلو اكتب unit = "KG"، لو بالقطعة/علبة/طبق اكتب "PIECE" أو "BOX"، لو جرام اكتب "GRAM"، لو مل/لتر اكتب "ML" أو "LITER".
- لو سعر التكلفة أو حد الطلب مش مكتوب حط unitCost = 0 و dailyLimit = null.
- أخرج JSON سليم 100% فقط.`;
  }

  return `أنت نظام OCR ومحاسبة متخصص في قراءة فواتير المصنع وفواتير الموردين (سواء مطبوعة أو مكتوبة بخط اليد) لـ حلواني أبو عادل وسول ميت كافيه.
السياق المستهدف: ${targetDomain}.

مهمتك استخراج بيانات الفاتورة وأصنافها وأسعارها والمدفوع والآجل بدقة في صيغة JSON فقط بدون أي نص خارجي:
{
  "supplierName": "اسم المصنع أو المورد المكتوب بالفاتورة أو null",
  "invoiceDate": "التاريخ بصيغة YYYY-MM-DD أو null",
  "invoiceNumber": "رقم الفاتورة أو الإذن أو null",
  "items": [
    {
      "name": "اسم الصنف أو الخامة",
      "quantity": 1,
      "unit": "KG أو PIECE أو BOX أو GRAM أو LITER أو ML",
      "unitCost": 0,
      "totalCost": 0,
      "notes": "أي ملاحظة عن الصنف أو لو الرقم غير واضح"
    }
  ],
  "totalAmount": 0,
  "paidAmount": 0,
  "paymentHint": "كاش / آجل / إنستاباي / فودافون كاش / مدفوع جزئي أو null",
  "confidence": "HIGH أو MEDIUM أو LOW",
  "generalNotes": "أي ملاحظات عامة أسفل الفاتورة"
}

قواعد مهمة جداً:
- جميع الأرقام (quantity, unitCost, totalCost, totalAmount, paidAmount) لازم تكون Numbers وليست نصوصاً.
- لو الفاتورة تذكر فقط إجمالي الصنف بدون سعر الوحدة، احسب unitCost = totalCost / quantity. ولو ذكرت سعر الوحدة فقط احسب totalCost = quantity * unitCost.
- لو الفاتورة مكتوب عليها (خالص / مدفوع) حط paidAmount = totalAmount. لو مكتوب (آجل / على الحساب) حط paidAmount = 0. لو مكتوب دفعة مقدمة حط قيمتها في paidAmount.
- أخرج JSON فقط بدون أي علامات markdown زائدة إن أمكن.`;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

async function analyzeWithGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  promptText: string
): Promise<any> {
  const cleanBase64 = imageBase64.includes("base64,")
    ? imageBase64.split("base64,")[1]
    : imageBase64;

  const parts: GeminiPart[] = [
    {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64,
      },
    },
    {
      text: promptText,
    },
  ];

  let lastError = "";
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `${model} -> HTTP ${response.status}: ${errText.slice(0, 180)}`;
        continue;
      }

      const data = await response.json();
      const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        return { parsed: JSON.parse(cleaned), modelUsed: model };
      } catch {
        return {
          parsed: {
            items: [],
            confidence: "LOW",
            generalNotes: `تعذر تحليل الرد كـ JSON: ${rawText.slice(0, 260)}`,
          },
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(`فشل استدعاء Gemini AI: ${lastError}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mode = "FACTORY_INVOICE", // "FACTORY_INVOICE" | "OPENING_STOCK"
      targetDomain = "AUTO", // "ABU_ADEL_PRODUCTS" | "SOULMATE_RAW_MATERIALS" | "SOULMATE_PRODUCTS" | "AUTO"
      images = [],
    } = body as {
      mode?: "FACTORY_INVOICE" | "OPENING_STOCK";
      targetDomain?: string;
      images?: Array<{ base64: string; mimeType?: string; name?: string }>;
    };

    const settings = await prisma.systemSettings.findFirst();
    const apiKey = process.env.GEMINI_API_KEY || settings?.geminiApiKey || "";

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY غير مضبوط في .env أو إعدادات المنظومة السحابية",
        },
        { status: 503 }
      );
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: "يرجى إرفاق صورة فاتورة أو ورقة جرد واحدة على الأقل" },
        { status: 400 }
      );
    }

    // Load catalog candidates from DB so we match extracted Arabic names automatically
    const [menuItems, rawMaterials] = await Promise.all([
      prisma.menuItem.findMany({
        include: { outlet: { select: { id: true, code: true, name: true } } },
      }),
      prisma.rawMaterial.findMany({
        include: { outlet: { select: { id: true, code: true, name: true } } },
      }),
    ]);

    const menuCandidates: MatchCandidate[] = menuItems.map((m) => ({
      id: m.id,
      nameAr: m.nameAr,
      nameEn: m.nameEn,
      category: m.category,
      unitType: m.unitType,
      price: m.price,
      costPrice: m.costPrice,
      stockQty: m.stockQty,
      minStockAlert: m.minStockAlert,
      outletId: m.outletId,
      outletCode: m.outlet?.code,
      targetType: "MENU_ITEM",
    }));

    const rawCandidates: MatchCandidate[] = rawMaterials.map((r) => ({
      id: r.id,
      nameAr: r.nameAr,
      unit: r.unit,
      costPerUnit: r.costPerUnit,
      currentStock: r.currentStock,
      minStockAlert: r.minStockAlert,
      outletId: r.outletId,
      outletCode: r.outlet?.code,
      targetType: "RAW_MATERIAL",
    }));

    let candidates: MatchCandidate[] = [...menuCandidates, ...rawCandidates];
    if (targetDomain === "ABU_ADEL_PRODUCTS") {
      const onlyAbu = menuCandidates.filter((c) => c.outletCode === "ABU_ADEL_PATISSERIE");
      candidates = onlyAbu.length > 0 ? onlyAbu : menuCandidates;
    } else if (targetDomain === "SOULMATE_PRODUCTS") {
      const onlySm = menuCandidates.filter((c) => c.outletCode === "SOULMATE_CAFE");
      candidates = onlySm.length > 0 ? onlySm : menuCandidates;
    } else if (targetDomain === "SOULMATE_RAW_MATERIALS") {
      candidates = rawCandidates;
    }

    const promptText = buildDigestPrompt(mode, targetDomain);
    const limited = images.slice(0, 6);
    const results: any[] = [];

    for (let idx = 0; idx < limited.length; idx++) {
      const img = limited[idx];
      if (!img?.base64) {
        results.push({ name: img?.name || `image-${idx + 1}`, error: "بيانات الصورة مفقودة", data: null });
        continue;
      }

      try {
        const { parsed, modelUsed } = await analyzeWithGemini(
          apiKey,
          img.base64,
          img.mimeType || "image/jpeg",
          promptText
        );

        const matchedItems = (Array.isArray(parsed.items) ? parsed.items : []).map((it: any, iIdx: number) => {
          const itemName = String(it.name || "").trim();
          const { item: matched, score } = matchCatalogItemByName(itemName, candidates);
          const qty = Math.max(0, Number(it.quantity) || 0);
          const unitCost =
            Number(it.unitCost) > 0
              ? Number(it.unitCost)
              : qty > 0 && Number(it.totalCost) > 0
              ? Number((Number(it.totalCost) / qty).toFixed(2))
              : matched?.targetType === "RAW_MATERIAL"
              ? Number(matched.costPerUnit || 0)
              : Number(matched?.costPrice || 0);
          const totalCost =
            Number(it.totalCost) > 0
              ? Number(it.totalCost)
              : Number((qty * unitCost).toFixed(2));

          return {
            tempId: `${Date.now()}-${idx}-${iIdx}-${Math.random().toString(36).slice(2, 6)}`,
            extractedName: itemName,
            quantity: qty,
            unit:
              it.unit ||
              matched?.unitType ||
              matched?.unit ||
              "PIECE",
            unitCost,
            totalCost,
            dailyLimit:
              it.dailyLimit !== null && it.dailyLimit !== undefined
                ? Number(it.dailyLimit)
                : matched?.minStockAlert ?? null,
            notes: it.notes || "",
            matchedTargetType: matched?.targetType || (targetDomain === "SOULMATE_RAW_MATERIALS" ? "RAW_MATERIAL" : "MENU_ITEM"),
            matchedId: matched?.id || "",
            matchedName: matched?.nameAr || "",
            matchScore: score,
          };
        });

        const computedTotal = matchedItems.reduce((s: number, x: any) => s + (Number(x.totalCost) || 0), 0);

        results.push({
          name: img.name || `صورة ${idx + 1}`,
          modelUsed,
          error: null,
          data: {
            supplierName: parsed.supplierName || null,
            invoiceDate: parsed.invoiceDate || parsed.auditDate || null,
            invoiceNumber: parsed.invoiceNumber ? String(parsed.invoiceNumber) : null,
            totalAmount: Number(parsed.totalAmount) > 0 ? Number(parsed.totalAmount) : Number(computedTotal.toFixed(2)),
            paidAmount: Number(parsed.paidAmount) > 0 ? Number(parsed.paidAmount) : 0,
            paymentHint: parsed.paymentHint || null,
            confidence: parsed.confidence || "MEDIUM",
            generalNotes: parsed.generalNotes || "",
            items: matchedItems,
          },
        });
      } catch (err: any) {
        results.push({
          name: img.name || `صورة ${idx + 1}`,
          error: err?.message || "فشل تحليل الصورة",
          data: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      results,
    });
  } catch (error: any) {
    console.error("[AI_DIGEST_POST]", error);
    return NextResponse.json(
      { success: false, error: error.message || "خطأ في خدمة الذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
