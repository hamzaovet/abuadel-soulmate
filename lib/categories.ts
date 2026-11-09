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
  { id: "ORIENTAL_SWEETS", nameAr: "شرقيات وبسبوسة وكنافة", nameEn: "Oriental Sweets", icon: "🍯" },
  { id: "CAKES_TORTES", nameAr: "تورت ومناسبات ومقاسات", nameEn: "Cakes & Occasions", icon: "🎂" },
  { id: "WESTERN_PASTRY", nameAr: "جاتوهات وطواجن وديسباسيتو", nameEn: "Gateaux & Desserts", icon: "🍰" },
  { id: "BAKERY_FETEER", nameAr: "مخبوزات وفطير وساليزون", nameEn: "Bakery & Feteer", icon: "🥐" },
  { id: "KAHK_NOVAM", nameAr: "كعك ونواعم وبيتي فور", nameEn: "Kahk & Cookies", icon: "🍪" },
  { id: "CHOCOLATE_SWEETS", nameAr: "شوكولاتة وبارات فاخرة", nameEn: "Chocolates & Bars", icon: "🍫" },
  { id: "GIFT_BOXES", nameAr: "علب وبوكسات مشكلة", nameEn: "Gift Boxes", icon: "🎁" },
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
