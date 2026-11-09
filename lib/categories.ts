export interface CategoryDef {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
}

export const SOULMATE_CATEGORIES: CategoryDef[] = [
  { id: "HOT_DRINKS", nameAr: "مشروبات ساخنة", nameEn: "Hot Drinks", icon: "☕" },
  { id: "ICE_COFFEE", nameAr: "قهوة مثلجة", nameEn: "Ice Coffee", icon: "🧊" },
  { id: "FRAPPE", nameAr: "فرابيه مثلج", nameEn: "Frappe", icon: "🥤" },
  { id: "MOJITO", nameAr: "موهيتو منعش", nameEn: "Mojito", icon: "🍋" },
  { id: "SMOOTHIE", nameAr: "سموذي فواكه", nameEn: "Smoothie", icon: "🍑" },
  { id: "SOFT_DRINKS", nameAr: "مشروبات غازية ومياه", nameEn: "Soft Drinks", icon: "⚡" },
  { id: "PANCAKE", nameAr: "بان كيك", nameEn: "Pancake", icon: "🥞" },
  { id: "PASTRY", nameAr: "مخبوزات وكرواسون", nameEn: "Pastry", icon: "🥐" },
  { id: "DESSERT", nameAr: "حلويات غربية وتورت", nameEn: "Dessert", icon: "🍰" },
  { id: "ICE_CREAM", nameAr: "آيس كريم", nameEn: "Ice Cream", icon: "🍨" },
  { id: "EXTRA", nameAr: "إضافات ومكونات", nameEn: "Extras", icon: "🌟" },
];

export const ABU_ADEL_CATEGORIES: CategoryDef[] = [
  { id: "ORIENTAL_SWEETS", nameAr: "شرقيات ملكية", nameEn: "Oriental Sweets", icon: "🍯" },
  { id: "CAKES_TORTES", nameAr: "تورت وكيك مناسبات", nameEn: "Cakes & Tortes", icon: "🎂" },
  { id: "WESTERN_PASTRY", nameAr: "جاتوه وغربي فاخر", nameEn: "Western Pastry", icon: "🍰" },
  { id: "GIFT_BOXES", nameAr: "علب وبوكسات هدايا", nameEn: "Gift Boxes", icon: "🎁" },
];

export const ALL_CATEGORIES: CategoryDef[] = [
  ...SOULMATE_CATEGORIES,
  ...ABU_ADEL_CATEGORIES,
];

const categoryMap = new Map<string, CategoryDef>(
  ALL_CATEGORIES.map((cat) => [cat.id, cat])
);

export function getCategoryLabel(categoryKey?: string | null): string {
  if (!categoryKey) return "";
  const found = categoryMap.get(categoryKey);
  if (found) {
    return `${found.nameAr} ${found.icon}`;
  }
  return categoryKey;
}

export function getCategoryEn(categoryKey?: string | null): string {
  if (!categoryKey) return "";
  const found = categoryMap.get(categoryKey);
  return found ? found.nameEn : categoryKey;
}
