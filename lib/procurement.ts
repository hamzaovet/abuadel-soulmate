/**
 * Shared helpers for Suppliers, Inter-Brand Debt Split, Procurement Par Levels, and AI Invoice Matching.
 */

export function normalizeArabicText(text: string): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchCandidate {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  category?: string;
  unitType?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  costPerUnit?: number;
  stockQty?: number;
  currentStock?: number;
  minStockAlert?: number;
  outletId?: string;
  outletCode?: string;
  targetType: "MENU_ITEM" | "RAW_MATERIAL";
}

export function matchCatalogItemByName(
  rawName: string,
  candidates: MatchCandidate[]
): { item: MatchCandidate | null; score: number } {
  const normQuery = normalizeArabicText(rawName);
  if (!normQuery || candidates.length === 0) return { item: null, score: 0 };

  const queryTokens = normQuery.split(" ").filter((t) => t.length >= 2);
  let bestItem: MatchCandidate | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const normAr = normalizeArabicText(cand.nameAr || "");
    const normEn = normalizeArabicText(cand.nameEn || "");

    if (normAr === normQuery || (normEn && normEn === normQuery)) {
      return { item: cand, score: 1.0 };
    }

    let score = 0;
    if (normAr.includes(normQuery) || normQuery.includes(normAr)) {
      const minLen = Math.min(normAr.length, normQuery.length);
      const maxLen = Math.max(normAr.length, normQuery.length);
      score = Math.max(score, 0.72 + 0.23 * (minLen / Math.max(1, maxLen)));
    }

    if (queryTokens.length > 0 && normAr) {
      const candTokens = normAr.split(" ").filter((t) => t.length >= 2);
      let hits = 0;
      for (const qt of queryTokens) {
        if (candTokens.some((ct) => ct === qt || ct.includes(qt) || qt.includes(ct))) {
          hits += 1;
        }
      }
      const tokenScore = (hits / Math.max(queryTokens.length, candTokens.length)) * 0.9;
      if (tokenScore > score) score = tokenScore;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = cand;
    }
  }

  return bestScore >= 0.38 ? { item: bestItem, score: Number(bestScore.toFixed(2)) } : { item: null, score: 0 };
}

export interface DebtSplitMetrics {
  totalExternalFactoryDebt: number; // إجمالي مديونية أبو عادل للمصنع الخارجي
  totalRawMaterialSuppliersDebt: number; // إجمالي مديونية خامات سول ميت للموردين الخارجيين
  soulmateDebtToAbuAdel: number; // إجمالي مديونية سول ميت لحلواني أبو عادل عن مسحوبات الحلويات
  abuAdelNetShareOfFactoryDebt: number; // الصافي الفعلي على أبو عادل بعد خصم مديونية سول ميت له
  soulmateCoveredShareOfFactoryDebt: number; // نصيب سول ميت داخل دين المصنع الإجمالي
  abuAdelSharePct: number;
  soulmateSharePct: number;
  excessFromSoulmateToAbuAdel: number; // لو سول ميت عليه لأبو عادل أكتر من دين المصنع كله!
  totalGroupExternalLiability: number; // إجمالي الالتزام الخارجي للمجموعة (مصنع + خامات)
}

export function calculateGroupDebtSplit(params: {
  factoryDebt: number;
  rawSuppliersDebt: number;
  soulmateToAbuAdelDebt: number;
}): DebtSplitMetrics {
  const totalExternalFactoryDebt = Math.max(0, Number(params.factoryDebt) || 0);
  const totalRawMaterialSuppliersDebt = Math.max(0, Number(params.rawSuppliersDebt) || 0);
  const soulmateDebtToAbuAdel = Math.max(0, Number(params.soulmateToAbuAdelDebt) || 0);

  const soulmateCoveredShareOfFactoryDebt = Math.min(totalExternalFactoryDebt, soulmateDebtToAbuAdel);
  const abuAdelNetShareOfFactoryDebt = Math.max(0, Number((totalExternalFactoryDebt - soulmateCoveredShareOfFactoryDebt).toFixed(2)));
  const excessFromSoulmateToAbuAdel = Math.max(0, Number((soulmateDebtToAbuAdel - totalExternalFactoryDebt).toFixed(2)));

  const soulmateSharePct =
    totalExternalFactoryDebt > 0
      ? Math.round((soulmateCoveredShareOfFactoryDebt / totalExternalFactoryDebt) * 100)
      : soulmateDebtToAbuAdel > 0
      ? 100
      : 0;
  const abuAdelSharePct = totalExternalFactoryDebt > 0 ? Math.max(0, 100 - soulmateSharePct) : 0;

  return {
    totalExternalFactoryDebt: Number(totalExternalFactoryDebt.toFixed(2)),
    totalRawMaterialSuppliersDebt: Number(totalRawMaterialSuppliersDebt.toFixed(2)),
    soulmateDebtToAbuAdel: Number(soulmateDebtToAbuAdel.toFixed(2)),
    abuAdelNetShareOfFactoryDebt,
    soulmateCoveredShareOfFactoryDebt: Number(soulmateCoveredShareOfFactoryDebt.toFixed(2)),
    abuAdelSharePct,
    soulmateSharePct,
    excessFromSoulmateToAbuAdel,
    totalGroupExternalLiability: Number((totalExternalFactoryDebt + totalRawMaterialSuppliersDebt).toFixed(2)),
  };
}
