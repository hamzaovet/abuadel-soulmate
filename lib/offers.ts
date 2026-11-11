export interface OfferCard {
  id: string;
  title: string;
  desc: string;
  icon: "party" | "delivery" | "student" | "gift" | "star" | "fire" | "tag" | string;
}

export interface DiscountRule {
  enabled: boolean;
  title: string;
  type: "percentage" | "fixed";
  value: number;
  scope: "all" | "category" | "products";
  categoryName: string;
  productIds: string[];
  brandScope?: "ALL" | "SOULMATE_CAFE" | "ABU_ADEL_PATISSERIE";
}

export interface OfferData {
  enabled: boolean;
  badge: string;
  title: string;
  subtitle: string;
  cards: OfferCard[];
  banner: {
    badge: string;
    title: string;
    linkText: string;
    linkHref: string;
    image: string;
  };
  discount: DiscountRule;
}

export const DEFAULT_DISCOUNT: DiscountRule = {
  enabled: false,
  title: "خصم خاص لفترة محدودة على مختارات أبو عادل وسول ميت 🔥",
  type: "percentage",
  value: 15,
  scope: "all",
  categoryName: "ORIENTAL_SWEETS",
  productIds: [],
  brandScope: "ALL",
};

export const DEFAULT_OFFERS: OfferData = {
  enabled: true,
  badge: "عروض حصرية لفترة محدودة 🔥",
  title: "العروض الخاصة والخصومات",
  subtitle: "عروض متجددة كل أسبوع لأحلى حلويات شرقيه وقهوة مختصة — اطلب أونلاين أو اسأل الكاشير",
  cards: [
    {
      id: "combo",
      title: "باقة السهرة المزدوجة 🎉",
      desc: "تشكيلة حلويات شرقية فاخرة من أبو عادل + مشروبات سبيشيال من سول ميت بخصم مميز",
      icon: "party",
    },
    {
      id: "loyalty",
      title: "برنامج نقاط الولاء VIP 🎁",
      desc: "كل جنيه = نقطة ولاء، وعند الوصول للهدف استبدلها بهدية فورية تختارها بنفسك",
      icon: "gift",
    },
    {
      id: "preorders",
      title: "حجز التورت والمناسبات 🎂",
      desc: "احجز تورتة مناسبتك قبلها وادفع عربونك أونلاين مع متابعة التجهيز الطازج",
      icon: "star",
    },
  ],
  banner: {
    badge: "الأكثر طلباً هذا الأسبوع ✨",
    title: "أصالة السمن البلدي في أبو عادل × قهوة سول ميت المختصة",
    linkText: "استعرض المنيو واطلب الآن",
    linkHref: "#menu",
    image: "/products/nawaem-mix-real.webp",
  },
  discount: { ...DEFAULT_DISCOUNT },
};

export function parseOfferData(rawJson?: string | null, offersEnabled?: boolean | null): OfferData {
  let merged: OfferData = {
    ...DEFAULT_OFFERS,
    cards: [...DEFAULT_OFFERS.cards],
    banner: { ...DEFAULT_OFFERS.banner },
    discount: { ...DEFAULT_DISCOUNT },
  };

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      merged = {
        ...merged,
        ...parsed,
        cards: Array.isArray(parsed.cards) && parsed.cards.length > 0 ? parsed.cards : merged.cards,
        banner: parsed.banner ? { ...merged.banner, ...parsed.banner } : merged.banner,
        discount: parsed.discount ? { ...merged.discount, ...parsed.discount } : merged.discount,
      };
    } catch {
      // keep fallback defaults
    }
  }

  if (typeof offersEnabled === "boolean") {
    merged.enabled = offersEnabled;
  } else if (typeof merged.enabled !== "boolean") {
    merged.enabled = true;
  }

  return merged;
}

export interface PricedItemResult {
  originalPrice: number;
  finalPrice: number;
  hasDiscount: boolean;
  badgeText: string;
  savings: number;
}

/**
 * Computes live promotional pricing for any menu item across Landing, Customer Order, and POS.
 */
export function getItemDiscountPricing(
  item: {
    id: string;
    price: number;
    category: string;
    itemType?: string | null;
    outlet?: { code?: string | null } | null;
  },
  offers?: OfferData | null,
  customBasePrice?: number
): PricedItemResult {
  const base = Number(customBasePrice !== undefined ? customBasePrice : item.price) || 0;
  const d = offers?.discount;

  if (!offers || offers.enabled === false || !d || !d.enabled || !(Number(d.value) > 0)) {
    return { originalPrice: base, finalPrice: base, hasDiscount: false, badgeText: "", savings: 0 };
  }

  // Optional brand scoping for multi-brand outlets
  if (d.brandScope && d.brandScope !== "ALL") {
    const inferredCode =
      item.outlet?.code ||
      (item.itemType === "PREPARED_BEVERAGE" ? "SOULMATE_CAFE" : "ABU_ADEL_PATISSERIE");
    if (inferredCode !== d.brandScope) {
      return { originalPrice: base, finalPrice: base, hasDiscount: false, badgeText: "", savings: 0 };
    }
  }

  let applies = false;
  if (d.scope === "all") {
    applies = true;
  } else if (d.scope === "category" && d.categoryName) {
    applies = item.category === d.categoryName;
  } else if (d.scope === "products" && Array.isArray(d.productIds)) {
    applies = d.productIds.includes(item.id);
  }

  if (!applies) {
    return { originalPrice: base, finalPrice: base, hasDiscount: false, badgeText: "", savings: 0 };
  }

  const rawDiscount =
    d.type === "percentage"
      ? (base * Number(d.value)) / 100
      : Number(d.value);

  const finalPrice = Math.max(1, Number((base - rawDiscount).toFixed(2)));
  const savings = Math.max(0, Number((base - finalPrice).toFixed(2)));
  const badgeText = d.type === "percentage" ? `خصم ${d.value}% 🔥` : `وفر ${d.value} ج 🔥`;

  return {
    originalPrice: base,
    finalPrice,
    hasDiscount: finalPrice < base,
    badgeText,
    savings,
  };
}
