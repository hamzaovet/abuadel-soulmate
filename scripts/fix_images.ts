import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking and updating product images...");

  const imageMap: Record<string, string> = {
    // Oriental Sweets
    "بسبوسة": "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600",
    "كنافة نابلسية": "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600",
    "كنافة أساور": "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600",
    "كنافة مانجو": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600",
    "بقلاوة": "https://images.unsplash.com/photo-1519869325930-281384150729?w=600",
    "بلح الشام": "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600",
    "صوابع زينب": "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600",
    "رموش الست": "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600",
    // Cakes & Tortes
    "تورتة فور سيزون": "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600",
    "تورتة شوكولاتة": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600",
    "تورتة لوتس": "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=600",
    "تورتة ريد فيلفت": "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=600",
    "تريليتشا": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600",
    // Western & Gateaux
    "جاتوه": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    "تشيز كيك": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600",
    "إكلير": "https://images.unsplash.com/photo-1612203985729-70726954388c?w=600",
    // Gift Boxes
    "بوكس": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
    "كعك وبسكويت": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600",
    // Soulmate Hot Coffee
    "إسبريسو": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600",
    "أمريكانو": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
    "فلات وايت": "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600",
    "كورتادو": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600",
    "كابتشينو": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600",
    "لاتيه": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600",
    "سبانش لاتيه": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600",
    "موكا": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600",
    "ماكياتو": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600",
    "تركي": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
    "فرنساوي": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
    "هوت شوكليت": "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600",
    // Cold Coffee & Mojitos
    "آيس": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600",
    "بيستاشيو": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600",
    "شيك": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600",
    "موهيتو": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600",
    "سموذي": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600",
    // Waffles & Pancakes
    "وافل": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600",
    "بان كيك": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600",
    "مولتن كيك": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600",
  };

  const items = await prisma.menuItem.findMany();
  for (const it of items) {
    let matchedImg = null;
    for (const [key, url] of Object.entries(imageMap)) {
      if (it.nameAr.includes(key)) {
        matchedImg = url;
        break;
      }
    }

    if (!matchedImg) {
      matchedImg =
        it.itemType === "READY_PASTRY"
          ? "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600"
          : "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600";
    }

    await prisma.menuItem.update({
      where: { id: it.id },
      data: { image: matchedImg },
    });
  }

  console.log(`Updated images for all ${items.length} menu items!`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
