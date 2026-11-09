import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("🌱 Starting Database Seed for Abu Adel Patisserie & Soulmate Cafe...");

  // 1. System Settings
  await prisma.systemSettings.upsert({
    where: { id: "default-settings" },
    update: {
      brandNameAr: "مجموعة أبو عادل وسول ميت كافيه (حلواني & كافيه عصري)",
      brandNameEn: "ABU ADEL PATISSERIE & SOULMATE CAFE",
      soulmatePhone: "01099887766",
      abuAdelPhone: "15992",
      hotline: "15992",
      whatsapp: "01099887766",
      haliyomakUrl: "https://haliyomak.com/",
      facebookUrl: "https://www.facebook.com/hashtag/soulmate_cafe",
      serviceChargePercent: 12.0,
      taxPercent: 14.0,
      isServiceChargeEnabled: false,
      isTaxEnabled: false,
      isLoyaltyEnabled: true,
      pointsPerPoundSpent: 0.1,
      poundValuePerPoint: 0.5,
      receiptFooterNotes: "شكراً لزيارتكم حلواني أبو عادل وسول ميت كافيه • حلي يومك واستمتع بأرقى فنجان قهوة ☕🍰",
    },
    create: {
      id: "default-settings",
      brandNameAr: "مجموعة أبو عادل وسول ميت كافيه (حلواني & كافيه عصري)",
      brandNameEn: "ABU ADEL PATISSERIE & SOULMATE CAFE",
      soulmatePhone: "01099887766",
      abuAdelPhone: "15992",
      hotline: "15992",
      whatsapp: "01099887766",
      haliyomakUrl: "https://haliyomak.com/",
      facebookUrl: "https://www.facebook.com/hashtag/soulmate_cafe",
      serviceChargePercent: 12.0,
      taxPercent: 14.0,
      isServiceChargeEnabled: false,
      isTaxEnabled: false,
      isLoyaltyEnabled: true,
      pointsPerPoundSpent: 0.1,
      poundValuePerPoint: 0.5,
      receiptFooterNotes: "شكراً لزيارتكم حلواني أبو عادل وسول ميت كافيه • حلي يومك واستمتع بأرقى فنجان قهوة ☕🍰",
    },
  });

  // 2. Outlets
  const soulmateOutlet = await prisma.outlet.upsert({
    where: { code: "SOULMATE_CAFE" },
    update: {
      name: "سول ميت كافيه (Soulmate Cafe VIP)",
      type: "CAFE",
      address: "شارع ترعة الجبل، كينج بارك، حدائق القبة، القاهرة",
      phone: "01099887766",
      whatsapp: "01099887766",
      logoUrl: "/soulmate-logo.png",
      isActive: true,
    },
    create: {
      code: "SOULMATE_CAFE",
      name: "سول ميت كافيه (Soulmate Cafe VIP)",
      type: "CAFE",
      address: "شارع ترعة الجبل، كينج بارك، حدائق القبة، القاهرة",
      phone: "01099887766",
      whatsapp: "01099887766",
      logoUrl: "/soulmate-logo.png",
      isActive: true,
    },
  });

  const abuAdelOutlet = await prisma.outlet.upsert({
    where: { code: "ABU_ADEL_PATISSERIE" },
    update: {
      name: "حلواني أبو عادل المستقل (Abu Adel Patisserie)",
      type: "PASTRY_SHOP",
      address: "شارع ترعة الجبل، حدائق القبة، القاهرة (الخط الساخن: 15992)",
      phone: "15992",
      whatsapp: "01099887766",
      logoUrl: "/abuadel-logo.png",
      isActive: true,
    },
    create: {
      code: "ABU_ADEL_PATISSERIE",
      name: "حلواني أبو عادل المستقل (Abu Adel Patisserie)",
      type: "PASTRY_SHOP",
      address: "شارع ترعة الجبل، حدائق القبة، القاهرة (الخط الساخن: 15992)",
      phone: "15992",
      whatsapp: "01099887766",
      logoUrl: "/abuadel-logo.png",
      isActive: true,
    },
  });

  console.log("✅ Outlets created:", soulmateOutlet.name, "&", abuAdelOutlet.name);

  // 3. Staff & Users
  const usersToSeed = [
    {
      username: "maestro",
      passwordHash: "123456789",
      pin: "159920",
      name: "أ / حمزة عباس (المايسترو - المالك)",
      role: "owner",
      outletId: null,
      phone: "01099887766",
    },
    {
      username: "gm",
      passwordHash: "123456789",
      pin: "159920",
      name: "كابتن الإدارة (المدير العام للمجموعة)",
      role: "general_manager",
      outletId: null,
      phone: "01099887766",
    },
    {
      username: "manager-soulmate",
      passwordHash: "123456789",
      pin: "159920",
      name: "م / تامر فؤاد (مدير كافيه سول ميت)",
      role: "branch_manager",
      outletId: soulmateOutlet.id,
      phone: "01099887766",
    },
    {
      username: "manager-abuadel",
      passwordHash: "123456789",
      pin: "159920",
      name: "حاج / سامي عادل (مدير حلواني أبو عادل)",
      role: "branch_manager",
      outletId: abuAdelOutlet.id,
      phone: "15992",
    },
    {
      username: "cashier-soulmate",
      passwordHash: "123456789",
      pin: "159920",
      name: "كاشير صالة الكافيه (Soulmate POS)",
      role: "cashier",
      outletId: soulmateOutlet.id,
      phone: "01099887766",
    },
    {
      username: "cashier-abuadel",
      passwordHash: "123456789",
      pin: "159920",
      name: "كاشير معرض حلواني أبو عادل",
      role: "cashier",
      outletId: abuAdelOutlet.id,
      phone: "15992",
    },
    {
      username: "barista-soulmate",
      passwordHash: "123456789",
      pin: "159920",
      name: "كابتن الباريستا والبار (KDS)",
      role: "barista",
      outletId: soulmateOutlet.id,
      phone: "01099887766",
    },
  ];

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: u,
      create: u,
    });
  }
  console.log("✅ Users and roles created successfully.");

  // 4. Dining Tables for Soulmate Cafe
  const tables = [
    { tableNumber: "T-01", zone: "INDOOR", capacity: 4 },
    { tableNumber: "T-02", zone: "INDOOR", capacity: 4 },
    { tableNumber: "T-03", zone: "INDOOR", capacity: 2 },
    { tableNumber: "T-04", zone: "INDOOR", capacity: 6 },
    { tableNumber: "T-05", zone: "INDOOR", capacity: 4 },
    { tableNumber: "T-06", zone: "INDOOR", capacity: 2 },
    { tableNumber: "TERRACE-01", zone: "OUTDOOR", capacity: 4 },
    { tableNumber: "TERRACE-02", zone: "OUTDOOR", capacity: 4 },
    { tableNumber: "TERRACE-03", zone: "OUTDOOR", capacity: 6 },
    { tableNumber: "TERRACE-04", zone: "OUTDOOR", capacity: 4 },
    { tableNumber: "VIP-COUPLE-01", zone: "VIP_LOUNGE", capacity: 2 },
    { tableNumber: "VIP-COUPLE-02", zone: "VIP_LOUNGE", capacity: 2 },
  ];

  for (const t of tables) {
    const existing = await prisma.diningTable.findFirst({
      where: { outletId: soulmateOutlet.id, tableNumber: t.tableNumber },
    });
    if (!existing) {
      await prisma.diningTable.create({
        data: {
          outletId: soulmateOutlet.id,
          tableNumber: t.tableNumber,
          zone: t.zone,
          capacity: t.capacity,
          status: "AVAILABLE",
          qrCodeUrl: `/order?table=${encodeURIComponent(t.tableNumber)}`,
        },
      });
    }
  }
  console.log("✅ 12 Dining Tables created for Soulmate Cafe.");

  // 5. Raw Materials for Bar & Recipe Engine (سول ميت كافيه)
  const rawMaterialsData = [
    { nameAr: "بن إسبريسو كولومبي حبوب فاخر", unit: "GRAM", currentStock: 5000, minStockAlert: 1000, costPerUnit: 0.8 }, // 800 EGP / kg
    { nameAr: "حليب طازج مبستر كامل الدسم", unit: "ML", currentStock: 30000, minStockAlert: 5000, costPerUnit: 0.04 }, // 40 EGP / Liter
    { nameAr: "صوص لوتس بلجيكي أصلي", unit: "GRAM", currentStock: 4000, minStockAlert: 800, costPerUnit: 0.25 },
    { nameAr: "سيرب فانيليا فرنسي مركز", unit: "ML", currentStock: 2500, minStockAlert: 500, costPerUnit: 0.2 },
    { nameAr: "سيرب كراميل مملح غني", unit: "ML", currentStock: 2500, minStockAlert: 500, costPerUnit: 0.2 },
    { nameAr: "بودرة كاكاو وشوكولاتة بلجيكي", unit: "GRAM", currentStock: 3000, minStockAlert: 500, costPerUnit: 0.35 },
    { nameAr: "أكواب ورقية دبل مع أغطية حرارية", unit: "PIECE", currentStock: 1000, minStockAlert: 150, costPerUnit: 2.5 },
    { nameAr: "شاليموه كوشيه معقم مع مناديل", unit: "PIECE", currentStock: 1500, minStockAlert: 200, costPerUnit: 0.5 },
  ];

  const rawMap: Record<string, string> = {};
  for (const rm of rawMaterialsData) {
    const existing = await prisma.rawMaterial.findFirst({
      where: { outletId: soulmateOutlet.id, nameAr: rm.nameAr },
    });
    if (existing) {
      rawMap[rm.nameAr] = existing.id;
    } else {
      const created = await prisma.rawMaterial.create({
        data: {
          outletId: soulmateOutlet.id,
          ...rm,
        },
      });
      rawMap[rm.nameAr] = created.id;
    }
  }
  console.log("✅ Raw Materials created for Bar Recipe Engine.");

  // 6. Menu Items for Soulmate Cafe (With Recipe BOM)
  const soulmateMenuItems = [
    {
      nameAr: "كابتشينو سول ميت الملكي (Soulmate Cappuccino)",
      nameEn: "Soulmate Royal Cappuccino",
      category: "HOT_COFFEE",
      price: 65,
      costPrice: 21.3,
      itemType: "PREPARED_BEVERAGE",
      description: "دبل شوت إسبريسو كولومبي مع حليب كريمي وفوم حريري ورشة كاكاو بلجيكي.",
      image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80",
      recipes: [
        { rawName: "بن إسبريسو كولومبي حبوب فاخر", qty: 18 }, // 18g * 0.8 = 14.4
        { rawName: "حليب طازج مبستر كامل الدسم", qty: 160 }, // 160ml * 0.04 = 6.4
        { rawName: "أكواب ورقية دبل مع أغطية حرارية", qty: 1 }, // 2.5
      ],
    },
    {
      nameAr: "سبانيش لاتيه مثلج (Iced Spanish Latte)",
      nameEn: "Iced Spanish Latte",
      category: "COLD_COFFEE",
      price: 80,
      costPrice: 26.7,
      itemType: "PREPARED_BEVERAGE",
      description: "إسبريسو غني مع حليب مكثف وحليب طازج يقدم مع مكعبات الثلج لإنعاش حقيقي.",
      image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
      recipes: [
        { rawName: "بن إسبريسو كولومبي حبوب فاخر", qty: 20 },
        { rawName: "حليب طازج مبستر كامل الدسم", qty: 180 },
        { rawName: "سيرب فانيليا فرنسي مركز", qty: 15 },
        { rawName: "أكواب ورقية دبل مع أغطية حرارية", qty: 1 },
        { rawName: "شاليموه كوشيه معقم مع مناديل", qty: 1 },
      ],
    },
    {
      nameAr: "فلات وايت أسترالي (Flat White)",
      nameEn: "Flat White",
      category: "HOT_COFFEE",
      price: 70,
      costPrice: 22.1,
      itemType: "PREPARED_BEVERAGE",
      description: "ريستريتو مركز بنكهة قوية مع طبقة ميكروفوم متناغمة لعشاق القهوة المختصة.",
      image: "https://images.unsplash.com/photo-1585494156145-1c60a4fe9d2b?w=600&auto=format&fit=crop&q=80",
      recipes: [
        { rawName: "بن إسبريسو كولومبي حبوب فاخر", qty: 20 },
        { rawName: "حليب طازج مبستر كامل الدسم", qty: 140 },
        { rawName: "أكواب ورقية دبل مع أغطية حرارية", qty: 1 },
      ],
    },
    {
      nameAr: "سالتد كراميل ماكياتو (Salted Caramel Macchiato)",
      nameEn: "Salted Caramel Macchiato",
      category: "HOT_COFFEE",
      price: 75,
      costPrice: 26.5,
      itemType: "PREPARED_BEVERAGE",
      description: "فوم حليب كريمي مع لمسات سيرب الكراميل المملح ودبل شوت إسبريسو على الوجه.",
      image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
      recipes: [
        { rawName: "بن إسبريسو كولومبي حبوب فاخر", qty: 18 },
        { rawName: "حليب طازج مبستر كامل الدسم", qty: 180 },
        { rawName: "سيرب كراميل مملح غني", qty: 25 },
        { rawName: "أكواب ورقية دبل مع أغطية حرارية", qty: 1 },
      ],
    },
    {
      nameAr: "هوت شوكليت بلجيكي فاخر (Hot Belgian Chocolate)",
      nameEn: "Hot Belgian Chocolate",
      category: "BEVERAGES",
      price: 75,
      costPrice: 22.8,
      itemType: "PREPARED_BEVERAGE",
      description: "حليب ساخن مخفوق مع الشوكولاتة البلجيكية الداكنة ولمسة مارشميلو.",
      image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80",
      recipes: [
        { rawName: "بودرة كاكاو وشوكولاتة بلجيكي", qty: 35 },
        { rawName: "حليب طازج مبستر كامل الدسم", qty: 200 },
        { rawName: "أكواب ورقية دبل مع أغطية حرارية", qty: 1 },
      ],
    },
    {
      nameAr: "بان كيك سول ميت نوتيلا تاور (Nutella Tower Pancake)",
      nameEn: "Nutella Tower Pancake",
      category: "WAFFLES_PANCAKES",
      price: 95,
      costPrice: 32.0,
      itemType: "PREPARED_BEVERAGE",
      description: "طبقات من البان كيك الذهبي الهش مغطاة بغزارة بالنوتيلا الإيطالية وقطع الفراولة.",
      image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=80",
      recipes: [],
    },
    {
      nameAr: "وافل لوتس كرانش ملوكي (Lotus Crunch Waffle)",
      nameEn: "Lotus Crunch Waffle",
      category: "WAFFLES_PANCAKES",
      price: 90,
      costPrice: 28.5,
      itemType: "PREPARED_BEVERAGE",
      description: "وافل بلجيكي مقرمش محشو ومغطى بسبريد اللوتس وبودرة بسكويت اللوتس المقرمش.",
      image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&auto=format&fit=crop&q=80",
      recipes: [
        { rawName: "صوص لوتس بلجيكي أصلي", qty: 50 },
      ],
    },
  ];

  for (const item of soulmateMenuItems) {
    const { recipes, ...itemData } = item;
    const existing = await prisma.menuItem.findFirst({
      where: { outletId: soulmateOutlet.id, nameAr: itemData.nameAr },
    });

    let mId: string;
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: itemData,
      });
      mId = existing.id;
    } else {
      const created = await prisma.menuItem.create({
        data: {
          outletId: soulmateOutlet.id,
          ...itemData,
        },
      });
      mId = created.id;
    }

    // Link Recipes (BOM)
    for (const r of recipes) {
      const rawId = rawMap[r.rawName];
      if (rawId) {
        await prisma.recipeItem.upsert({
          where: {
            menuItemId_rawMaterialId: {
              menuItemId: mId,
              rawMaterialId: rawId,
            },
          },
          update: { qtyRequired: r.qty },
          create: {
            menuItemId: mId,
            rawMaterialId: rawId,
            qtyRequired: r.qty,
          },
        });
      }
    }
  }
  console.log("✅ Soulmate Cafe Menu & Recipe Items Linked.");

  // 7. Menu Items for Abu Adel Patisserie (حلواني أبو عادل - Finished Goods Units)
  const abuAdelMenuItems = [
    {
      nameAr: "كيلو مشكل شرقي أبو عادل الملكي (Special Oriental Box)",
      nameEn: "Abu Adel Special Oriental Box (1 KG)",
      category: "ORIENTAL_SWEETS",
      price: 280,
      costPrice: 175,
      unitType: "KG",
      stockQty: 50,
      itemType: "READY_PASTRY",
      description: "تشكيلة فاخرة من الكنافة البورمة بالفستق، البسبوسة بالسمن البلدي، البقلاوة التركية، وعش البلبل.",
      image: "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop&q=80",
    },
    {
      nameAr: "كيلو بسبوسة بالسمن البلدي والمكسرات (Basbousa Almonds)",
      nameEn: "Pure Butter Basbousa with Almonds (1 KG)",
      category: "ORIENTAL_SWEETS",
      price: 220,
      costPrice: 135,
      unitType: "KG",
      stockQty: 40,
      itemType: "READY_PASTRY",
      description: "بسبوسة طرية ومرملة بالسمن البلدي الفلاحي مغطاة بحبات اللوز المحمص الذهبي.",
      image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80",
    },
    {
      nameAr: "تورتة لوتس سبريم مقاس 24 (Lotus Supreme Torte)",
      nameEn: "Lotus Supreme Torte Size 24",
      category: "CAKES_TORTES",
      price: 390,
      costPrice: 220,
      unitType: "PIECE",
      stockQty: 15,
      itemType: "READY_PASTRY",
      description: "طبقات كيك الفانيليا الهش مع كريمة اللوتس الغنية وجناش اللوتس البلجيكي وحبات البسكويت المقرمشة.",
      image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&auto=format&fit=crop&q=80",
    },
    {
      nameAr: "تورتة فور سيزونز الفاخرة (Four Seasons Torte)",
      nameEn: "Four Seasons Luxury Torte",
      category: "CAKES_TORTES",
      price: 420,
      costPrice: 245,
      unitType: "PIECE",
      stockQty: 12,
      itemType: "READY_PASTRY",
      description: "أربعة أقسام مميزة: ربع فواكه طبيعية، ربع شوكولاتة كندر، ربع لوتس، وربع مكسرات محمصة.",
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    },
    {
      nameAr: "دستة جاتوه سوبر لوكس مشكل (12 قطعة)",
      nameEn: "Super Luxe Gateaux Box (12 Pieces)",
      category: "WESTERN_PASTRY",
      price: 320,
      costPrice: 190,
      unitType: "BOX",
      stockQty: 25,
      itemType: "READY_PASTRY",
      description: "تشكيلة مختارة من 12 قطعة جاتوه فرنسي وسويسري (إكلير، شوكولاتة روشيه، تيراميسو، وفاكهة الموسم).",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
    },
    {
      nameAr: "قطعة تشيز كيك فراولة بلدي فاخرة",
      nameEn: "Strawberry Cheesecake Slice",
      category: "WESTERN_PASTRY",
      price: 45,
      costPrice: 24,
      unitType: "PIECE",
      stockQty: 30,
      itemType: "READY_PASTRY",
      description: "قاعدة بسكويت مقرمشة مع كريمة الجبن النيويوركي وتوبينج الفراولة الطازجة.",
      image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
    },
    {
      nameAr: "علبة نواعم وساليزون مشكل حفلات (Salizon Box)",
      nameEn: "Salizon & Mini Pastry Party Box",
      category: "GIFT_BOXES",
      price: 190,
      costPrice: 110,
      unitType: "BOX",
      stockQty: 20,
      itemType: "READY_PASTRY",
      description: "أصابع وفطائر ساليزون ميني محشوة جبن شيدر، رومي، سلامي، وتونة لحفلات الشاي والمناسبات.",
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    },
  ];

  for (const item of abuAdelMenuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { outletId: abuAdelOutlet.id, nameAr: item.nameAr },
    });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.menuItem.create({
        data: {
          outletId: abuAdelOutlet.id,
          ...item,
        },
      });
    }
  }
  console.log("✅ Abu Adel Finished Goods Menu Items Seeded.");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
