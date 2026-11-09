import { prisma } from "../lib/prisma";

async function main() {
  console.log("Enriching Menu Items for Abu Adel & Soulmate Cafe...");

  const soulmate = await prisma.outlet.findFirst({ where: { code: "SOULMATE_CAFE" } });
  const abuAdel = await prisma.outlet.findFirst({ where: { code: "ABU_ADEL_PATISSERIE" } });

  if (!soulmate || !abuAdel) {
    console.error("Outlets not found!");
    return;
  }

  // 1. ABU ADEL PATISSERIE ITEMS (Finished Units: Piece, KG, Box)
  const abuAdelItems = [
    // الشرقيلت
    {
      nameAr: "بسبوسة سادة ملوكي بالسمن البلدي",
      category: "ORIENTAL_SWEETS",
      price: 120,
      costPrice: 65,
      unitType: "KG",
      stockQty: 40,
      description: "بسبوسة مصرية دايبة مرملة بالسمن البلدي الطبيعي والشربات الخفيف.",
      image: "https://i.ibb.co/3s8sV9W/basbousa.jpg",
    },
    {
      nameAr: "بسبوسة بالمكسرات الفاخرة (لوز وبندق)",
      category: "ORIENTAL_SWEETS",
      price: 160,
      costPrice: 90,
      unitType: "KG",
      stockQty: 35,
      description: "مرملة بالسمن البلدي ومغطاة باللوز والبندق المحمص المقرمش.",
      image: "https://i.ibb.co/3s8sV9W/basbousa.jpg",
    },
    {
      nameAr: "كنافة نابلسية بالجبنة العكاري السايحة",
      category: "ORIENTAL_SWEETS",
      price: 150,
      costPrice: 85,
      unitType: "PIECE",
      stockQty: 25,
      description: "كنافة برتقالية كلاسيكية محشوة جبنة نابلسية تمط بسخونة لا تقاوم مع الفستق.",
      image: "https://i.ibb.co/L5hY0Z4/kunafa-nabulsia.jpg",
    },
    {
      nameAr: "كنافة أساور نوتيلا وبستاشيو",
      category: "ORIENTAL_SWEETS",
      price: 180,
      costPrice: 105,
      unitType: "KG",
      stockQty: 30,
      description: "أساور كنافة مقرمشة محشوة شوكولاتة نوتيلا أصلية وزبدة الفستق الإيطالية.",
      image: "https://i.ibb.co/L5hY0Z4/kunafa-nabulsia.jpg",
    },
    {
      nameAr: "كنافة مانجو وسوبر كريمة",
      category: "ORIENTAL_SWEETS",
      price: 190,
      costPrice: 110,
      unitType: "BOX",
      stockQty: 20,
      description: "طبقات الكنافة الذهبية المقرمشة مع قطع مانجو فريش وكريمة أبو عادل الخاصة.",
      image: "https://i.ibb.co/L5hY0Z4/kunafa-nabulsia.jpg",
    },
    {
      nameAr: "بقلاوة تركي بالفستق الحلبي",
      category: "ORIENTAL_SWEETS",
      price: 240,
      costPrice: 140,
      unitType: "KG",
      stockQty: 25,
      description: "رقائق الجلاش الهشة محشوة بأجود أنواع الفستق الحلبي الأخضر.",
      image: "https://i.ibb.co/L5hY0Z4/kunafa-nabulsia.jpg",
    },
    {
      nameAr: "بلح الشام المقرمش بالكريمة والفستق",
      category: "ORIENTAL_SWEETS",
      price: 140,
      costPrice: 75,
      unitType: "KG",
      stockQty: 30,
      description: "مقرمش من الخارج وطري من الداخل محشو كريمة غنية ورشة فستق.",
      image: "https://i.ibb.co/3s8sV9W/basbousa.jpg",
    },
    {
      nameAr: "صوابع زينب بالسمن البلدي",
      category: "ORIENTAL_SWEETS",
      price: 95,
      costPrice: 50,
      unitType: "KG",
      stockQty: 40,
      description: "حلوى مصرية أصيلة مقرمشة ومغموسة بالشربات المعقود اللذيذ.",
      image: "https://i.ibb.co/3s8sV9W/basbousa.jpg",
    },
    {
      nameAr: "رموش الست الملكية دايبة بالسمنة",
      category: "ORIENTAL_SWEETS",
      price: 135,
      costPrice: 70,
      unitType: "KG",
      stockQty: 25,
      description: "حبيبات مرملة ناعمة تذوب في الفم فورا مع فنجان القهوة.",
      image: "https://i.ibb.co/3s8sV9W/basbousa.jpg",
    },
    // التورت والكيك
    {
      nameAr: "تورتة فور سيزون ملكية (4 فصول)",
      category: "CAKES_TORTES",
      price: 380,
      costPrice: 210,
      unitType: "PIECE",
      stockQty: 15,
      description: "4 أرباع: نوتيلا كيندر، لوتس كرانش، مانجو وفراولة طبيعية، ومكسرات محمصة.",
      image: "https://i.ibb.co/Fk6vjrt/torte-fourseasons.jpg",
    },
    {
      nameAr: "تورتة شوكولاتة كيندر ونوتيلا",
      category: "CAKES_TORTES",
      price: 420,
      costPrice: 240,
      unitType: "PIECE",
      stockQty: 12,
      description: "عشاق الشوكولاتة: سبونج شوكولاتة غني بكريمة النوتيلا وقطع شوكولاتة كيندر وبوينو.",
      image: "https://i.ibb.co/Fk6vjrt/torte-fourseasons.jpg",
    },
    {
      nameAr: "تورتة لوتس كرانشي سبيشال",
      category: "CAKES_TORTES",
      price: 390,
      costPrice: 220,
      unitType: "PIECE",
      stockQty: 10,
      description: "كريمة زبدة اللوتس الأصلية مع بسكويت لوتس بلجيكي كرانشي.",
      image: "https://i.ibb.co/Fk6vjrt/torte-fourseasons.jpg",
    },
    {
      nameAr: "تورتة ريد فيلفت هارت للمناسبات",
      category: "CAKES_TORTES",
      price: 360,
      costPrice: 200,
      unitType: "PIECE",
      stockQty: 10,
      description: "مخملية حمراء فاخرة محشوة بكريمة التشيز السويسرية الغنية.",
      image: "https://i.ibb.co/Fk6vjrt/torte-fourseasons.jpg",
    },
    {
      nameAr: "كيكة التريليتشا التركية (كيكة الحليب والكراميل)",
      category: "CAKES_TORTES",
      price: 120,
      costPrice: 65,
      unitType: "PIECE",
      stockQty: 20,
      description: "كيكة مسقية بثلاثة أنواع حليب غنية مع طبقة كراميل ذهبي فاخر.",
      image: "https://i.ibb.co/Fk6vjrt/torte-fourseasons.jpg",
    },
    // الجاتوه والغربي
    {
      nameAr: "دستة جاتوه سواريه مشكل فاخر (12 قطعة)",
      category: "WESTERN_PASTRY",
      price: 280,
      costPrice: 160,
      unitType: "BOX",
      stockQty: 25,
      description: "تشكيلة من الجاتوه السواريه: ميلفيه، إكلير، شوكولاتة، كراميل، وفواكه.",
      image: "https://i.ibb.co/mS2Qf8v/gateau.jpg",
    },
    {
      nameAr: "تشيز كيك نيويورك بالتوت الأزرق (Blueberry)",
      category: "WESTERN_PASTRY",
      price: 65,
      costPrice: 35,
      unitType: "PIECE",
      stockQty: 30,
      description: "قطعة تشيز كيك كريمية مخبوزة على طبقة بسكويت مقرمش مع صوص التوت البري.",
      image: "https://i.ibb.co/mS2Qf8v/gateau.jpg",
    },
    {
      nameAr: "إكلير فرنسي بصوص الشوكولاتة والباستري كريم",
      category: "WESTERN_PASTRY",
      price: 45,
      costPrice: 22,
      unitType: "PIECE",
      stockQty: 35,
      description: "عجينة شو هشة محشوة كاسترد كريم فانيليا وغطاء شوكولاتة جناش.",
      image: "https://i.ibb.co/mS2Qf8v/gateau.jpg",
    },
    // البوكسات والهدايا
    {
      nameAr: "بوكس ميكس شرقي ملوكي 1 كجم",
      category: "GIFT_BOXES",
      price: 195,
      costPrice: 110,
      unitType: "BOX",
      stockQty: 50,
      description: "علبة هدايا أنيقة تجمع أفخر تشكيلة من البسبوسة، الكنافة، البقلاوة، والرموش.",
      image: "https://i.ibb.co/Qk0GzVp/gift-box.jpg",
    },
    {
      nameAr: "بوكس الضيافة الماسي 2 كجم مع شريط هدايا",
      category: "GIFT_BOXES",
      price: 370,
      costPrice: 210,
      unitType: "BOX",
      stockQty: 30,
      description: "تشكيلة مضاعفة لكبرى العزائم والمناسبات السعيدة لرفع رأسك أمام ضيوفك.",
      image: "https://i.ibb.co/Qk0GzVp/gift-box.jpg",
    },
    {
      nameAr: "علبة كعك وبسكويت بالسمن البلدي المشكل",
      category: "GIFT_BOXES",
      price: 220,
      costPrice: 125,
      unitType: "BOX",
      stockQty: 40,
      description: "كعك سادة وبعين الجمل، بسكويت برتقال ونشادر، وبيتي فور مشكل ناعم.",
      image: "https://i.ibb.co/Qk0GzVp/gift-box.jpg",
    },
  ];

  for (const item of abuAdelItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { outletId: abuAdel.id, nameAr: item.nameAr },
    });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          outletId: abuAdel.id,
          nameAr: item.nameAr,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          itemType: "READY_PASTRY",
          unitType: item.unitType,
          stockQty: item.stockQty,
          description: item.description,
          image: item.image,
          loyaltyPointsEarned: 0,
        },
      });
    }
  }

  // 2. SOULMATE CAFE BEVERAGES & RECIPES
  const soulmateItems = [
    // قهوة ساخنة
    {
      nameAr: "إسبريسو سينجل إيطالي كلاسيك",
      category: "HOT_COFFEE",
      price: 35,
      costPrice: 9,
      durationMinutes: 2,
      description: "شوت إسبريسو مركز ومستخلص بأعلى معايير الإتقان مع كريما ذهبية غنية.",
      image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500",
      beans: 9,
      milk: 0,
    },
    {
      nameAr: "إسبريسو دبل إيطالي (Double Espresso)",
      category: "HOT_COFFEE",
      price: 50,
      costPrice: 18,
      durationMinutes: 3,
      description: "دبل شوت إسبريسو قوي ومكثف لمحبي الطاقة والنكهة الإيطالية الصريحة.",
      image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500",
      beans: 18,
      milk: 0,
    },
    {
      nameAr: "أمريكانو ساخن كلاسيك (Americano)",
      category: "HOT_COFFEE",
      price: 55,
      costPrice: 19,
      durationMinutes: 3,
      description: "دبل إسبريسو ممزوج بالماء الساخن بنقاء فائق وتوازن استثنائي.",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500",
      beans: 18,
      milk: 0,
    },
    {
      nameAr: "فلات وايت أسترالي (Flat White)",
      category: "HOT_COFFEE",
      price: 65,
      costPrice: 24,
      durationMinutes: 4,
      description: "ريستريتو إسبريسو مع طبقة ميكروفوم حليب مخملية ناعمة جداً ورسمة لاتي آرت.",
      image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=500",
      beans: 18,
      milk: 140,
    },
    {
      nameAr: "كورتادو إسباني كلاسيك (Cortado)",
      category: "HOT_COFFEE",
      price: 60,
      costPrice: 22,
      durationMinutes: 3,
      description: "توازن متساوٍ بين الإسبريسو والحليب المبخر في كوب زجاجي أنيق.",
      image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=500",
      beans: 18,
      milk: 90,
    },
    {
      nameAr: "كابتشينو برغوة الحليب الغنية (Cappuccino)",
      category: "HOT_COFFEE",
      price: 65,
      costPrice: 25,
      durationMinutes: 4,
      description: "إسبريسو متوازن مع حليب مبخر ورغوة حليب كثيفة غنية مع رشة كاكاو.",
      image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=500",
      beans: 18,
      milk: 160,
    },
    {
      nameAr: "كافيه لاتيه كلاسيك (Cafe Latte)",
      category: "HOT_COFFEE",
      price: 70,
      costPrice: 27,
      durationMinutes: 4,
      description: "مشروبك اليومي المفضل: إسبريسو مع حليب طازج مبخر بنعومة فائقة.",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500",
      beans: 18,
      milk: 220,
    },
    {
      nameAr: "سبانش لاتيه ساخن مكرمل (Spanish Latte)",
      category: "HOT_COFFEE",
      price: 80,
      costPrice: 32,
      durationMinutes: 4,
      description: "المزيج الإسباني الساحر بين الحليب المكثف المحلى والإسبريسو المركز.",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500",
      beans: 18,
      milk: 180,
    },
    {
      nameAr: "سول ميت سيجنتشر لاتيه بالبندق المحمص",
      category: "HOT_COFFEE",
      price: 85,
      costPrice: 35,
      durationMinutes: 4,
      description: "الوصفة الخاصة بكافيه سول ميت: نكهة البندق المحمص مع دبل شوت إسبريسو وكريمة.",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500",
      beans: 18,
      milk: 190,
    },
    {
      nameAr: "موكا بلجيكية بالشوكولاتة الداكنة (Dark Mocha)",
      category: "HOT_COFFEE",
      price: 75,
      costPrice: 31,
      durationMinutes: 4,
      description: "تناغم الشوكولاتة البلجيكية الغنية مع الإسبريسو والحليب والكريمة المخفوقة.",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500",
      beans: 18,
      milk: 180,
    },
    {
      nameAr: "وايت موكا بالكريمة (White Mocha)",
      category: "HOT_COFFEE",
      price: 80,
      costPrice: 33,
      durationMinutes: 4,
      description: "شوكولاتة بيضاء ناعمة مع إسبريسو وحليب ساخن ومذاق كريمي يداعب الحواس.",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500",
      beans: 18,
      milk: 180,
    },
    {
      nameAr: "كراميل ماكياتو ساخن (Caramel Macchiato)",
      category: "HOT_COFFEE",
      price: 75,
      costPrice: 30,
      durationMinutes: 4,
      description: "حليب فانيليا مع طبقة إسبريسو وخطوط صوص الكراميل اللذيذ.",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500",
      beans: 18,
      milk: 180,
    },
    {
      nameAr: "قهوة تركي دوبل بالحبهان والوش المظبوط",
      category: "HOT_COFFEE",
      price: 40,
      costPrice: 12,
      durationMinutes: 5,
      description: "بن محوج فاخر مع حبهان ومستكة مطبوخ على الرمالة بوش سميك ومثالي.",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500",
      beans: 15,
      milk: 0,
    },
    {
      nameAr: "قهوة فرنساوي بالحليب الطبيعي (French Coffee)",
      category: "HOT_COFFEE",
      price: 50,
      costPrice: 18,
      durationMinutes: 5,
      description: "بن تركي فاتح مطبوخ مع الحليب الطازج لنكهة ناعمة وقوام كريمي.",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500",
      beans: 15,
      milk: 120,
    },
    {
      nameAr: "هوت شوكليت مارشميلو (Hot Chocolate)",
      category: "HOT_COFFEE",
      price: 65,
      costPrice: 26,
      durationMinutes: 4,
      description: "كاكاو هولندي فاخر وحليب مبخر ومزين بقطع المارشميلو السايحة.",
      image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500",
      beans: 0,
      milk: 220,
    },
    // المشروبات الباردة والفرابيه
    {
      nameAr: "آيس سبانش لاتيه منعش (Iced Spanish Latte)",
      category: "COLD_COFFEE",
      price: 85,
      costPrice: 34,
      durationMinutes: 3,
      description: "المشروب الأكثر طلباً في الصيف: إسبريسو مثلج مع حليب محلى ومكعبات ثلج.",
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
      beans: 18,
      milk: 180,
    },
    {
      nameAr: "بيستاشيو فرابيه مثلج بالكريمة (Pistachio Frappe)",
      category: "COLD_COFFEE",
      price: 95,
      costPrice: 40,
      durationMinutes: 4,
      description: "زبدة الفستق الطبيعي المخفوقة مع الآيس كريم والإسبريسو ومزينة بالفستق.",
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500",
      beans: 18,
      milk: 160,
    },
    {
      nameAr: "لوتس كرانش ميلك شيك (Lotus Milkshake)",
      category: "COLD_COFFEE",
      price: 90,
      costPrice: 38,
      durationMinutes: 4,
      description: "آيس كريم فانيليا غني مع زبدة بسكويت لوتس البلجيكية وصوص كراميل.",
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500",
      beans: 0,
      milk: 200,
    },
    {
      nameAr: "موهيتو بلو أوشن المنعش (Blue Ocean Mojito)",
      category: "COLD_COFFEE",
      price: 70,
      costPrice: 22,
      durationMinutes: 3,
      description: "ليمون فريش، نعناع طازج، بلو كوراكاو، وصودا مثلجة لانتعاش فوري.",
      image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500",
      beans: 0,
      milk: 0,
    },
    {
      nameAr: "موهيتo باشن فروت وفريز (Passion Fruit Mojito)",
      category: "COLD_COFFEE",
      price: 75,
      costPrice: 25,
      durationMinutes: 3,
      description: "باشن فروت استوائي مع نعناع وليمون فريش وصودا منعشة.",
      image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500",
      beans: 0,
      milk: 0,
    },
    {
      nameAr: "سموذي مانجو وباشن فروت طبيعي 100%",
      category: "COLD_COFFEE",
      price: 75,
      costPrice: 28,
      durationMinutes: 3,
      description: "سموذي مثلج مصنوع من الفاكهة الطبيعية بدون أي مواد حافظة.",
      image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500",
      beans: 0,
      milk: 0,
    },
    // وافل وبان كيك
    {
      nameAr: "وافل نوتيلا وموز بلجيكي أصلي",
      category: "WAFFLES_PANCAKES",
      price: 85,
      costPrice: 36,
      durationMinutes: 8,
      description: "وافل مقرمش ذهبي مغطى بصوص النوتيلا وشرائح الموز ورشة مكسرات.",
      image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=500",
      beans: 0,
      milk: 0,
    },
    {
      nameAr: "وافل لوتس بستاشيو ميكس سوبريم",
      category: "WAFFLES_PANCAKES",
      price: 95,
      costPrice: 42,
      durationMinutes: 8,
      description: "نصفين من المتعة: نصف صوص لوتس وبسكويت ونصف زبدة فستق فاخرة.",
      image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=500",
      beans: 0,
      milk: 0,
    },
    {
      nameAr: "بان كيك ثلاثي بالكراميل والشوكولاتة (Pancakes)",
      category: "WAFFLES_PANCAKES",
      price: 80,
      costPrice: 32,
      durationMinutes: 7,
      description: "ثلاث طبقات هشة وخفيفة من البان كيك مع زبدة وعسل وخطوط صوص الشوكولاتة.",
      image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500",
      beans: 0,
      milk: 0,
    },
    {
      nameAr: "مولتن كيك شوكولاتة مع بولة آيس كريم فانيليا",
      category: "WAFFLES_PANCAKES",
      price: 90,
      costPrice: 38,
      durationMinutes: 8,
      description: "كيكة الشوكولاتة البركانية تفيض بالشوكولاتة الساخنة مع برودة الآيس كريم.",
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500",
      beans: 0,
      milk: 0,
    },
  ];

  // Raw materials
  const beansRaw = await prisma.rawMaterial.findFirst({
    where: { outletId: soulmate.id, nameAr: { contains: "إسبريسو" } },
  });
  const milkRaw = await prisma.rawMaterial.findFirst({
    where: { outletId: soulmate.id, nameAr: { contains: "حليب" } },
  });

  for (const item of soulmateItems) {
    let menuItem = await prisma.menuItem.findFirst({
      where: { outletId: soulmate.id, nameAr: item.nameAr },
    });
    if (!menuItem) {
      menuItem = await prisma.menuItem.create({
        data: {
          outletId: soulmate.id,
          nameAr: item.nameAr,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          durationMinutes: item.durationMinutes,
          itemType: "PREPARED_BEVERAGE",
          description: item.description,
          image: item.image,
          loyaltyPointsEarned: Math.max(5, Math.floor(item.price * 0.1)),
        },
      });

      // Link recipes if applicable
      if (item.beans > 0 && beansRaw) {
        await prisma.recipeItem.create({
          data: {
            menuItemId: menuItem.id,
            rawMaterialId: beansRaw.id,
            qtyRequired: item.beans,
          },
        });
      }
      if (item.milk > 0 && milkRaw) {
        await prisma.recipeItem.create({
          data: {
            menuItemId: menuItem.id,
            rawMaterialId: milkRaw.id,
            qtyRequired: item.milk,
          },
        });
      }
    }
  }

  console.log("Menu enrichment complete!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
