import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_ZONES = [
  { nameAr: "حدائق القبة والزيتون", nameEn: "Hadaeq El Kobba & Zeitoun", fee: 20, estimatedTime: "20-30 دقيقة", sortOrder: 1 },
  { nameAr: "الوايلي والعباسية وغمرة", nameEn: "Abbassia & El Wayly", fee: 25, estimatedTime: "25-35 دقيقة", sortOrder: 2 },
  { nameAr: "مصر الجديدة (روكسي / الكوربة / شيراتون)", nameEn: "Heliopolis", fee: 35, estimatedTime: "30-45 دقيقة", sortOrder: 3 },
  { nameAr: "مدينة نصر", nameEn: "Nasr City", fee: 40, estimatedTime: "35-50 دقيقة", sortOrder: 4 },
  { nameAr: "وسط البلد وجاردن سيتي", nameEn: "Downtown & Garden City", fee: 35, estimatedTime: "30-45 دقيقة", sortOrder: 5 },
  { nameAr: "شبرا مصر وروض الفرج", nameEn: "Shoubra", fee: 30, estimatedTime: "30-40 دقيقة", sortOrder: 6 },
  { nameAr: "الزمالك والمهندسين والدقي", nameEn: "Zamalek & Mohandessin", fee: 45, estimatedTime: "40-55 دقيقة", sortOrder: 7 },
  { nameAr: "المعادي والمقطم", nameEn: "Maadi & Mokattam", fee: 55, estimatedTime: "45-60 دقيقة", sortOrder: 8 },
  { nameAr: "التجمع والقاهرة الجديدة والرحاب", nameEn: "New Cairo & Tagamoa", fee: 65, estimatedTime: "50-70 دقيقة", sortOrder: 9 },
  { nameAr: "الشيخ زايد وأكتوبر والمحافظات القريبة", nameEn: "Zayed & 6th October", fee: 85, estimatedTime: "60-90 دقيقة", sortOrder: 10 },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("all") === "true";

    let zones = await prisma.deliveryZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (zones.length === 0) {
      await prisma.deliveryZone.createMany({
        data: DEFAULT_ZONES,
      });
      zones = await prisma.deliveryZone.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }

    const filtered = includeInactive ? zones : zones.filter((z) => z.isActive);
    return NextResponse.json({ success: true, zones: filtered });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nameAr, nameEn, fee, estimatedTime, isActive, sortOrder } = body;

    if (!nameAr?.trim()) {
      return NextResponse.json({ success: false, error: "اسم المنطقة مطلوب" }, { status: 400 });
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        nameAr: nameAr.trim(),
        nameEn: nameEn?.trim() || null,
        fee: Number(fee) >= 0 ? Number(fee) : 20,
        estimatedTime: estimatedTime?.trim() || "30-45 دقيقة",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: Number(sortOrder) || 99,
      },
    });

    return NextResponse.json({ success: true, zone, message: `تمت إضافة منطقة (${zone.nameAr}) بمصاريف توصيل ${zone.fee} ج.م` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, nameAr, nameEn, fee, estimatedTime, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف المنطقة مطلوب" }, { status: 400 });
    }

    const data: any = {};
    if (nameAr !== undefined) data.nameAr = nameAr.trim();
    if (nameEn !== undefined) data.nameEn = nameEn?.trim() || null;
    if (fee !== undefined) data.fee = Number(fee);
    if (estimatedTime !== undefined) data.estimatedTime = estimatedTime.trim();
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

    const zone = await prisma.deliveryZone.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, zone, message: `تم تحديث منطقة (${zone.nameAr}) بنجاح` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف المنطقة مطلوب" }, { status: 400 });
    }

    await prisma.deliveryZone.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف المنطقة بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
