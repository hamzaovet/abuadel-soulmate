import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractLoyaltyConfig, getLoyaltyProgress } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim();
    const customerId = searchParams.get("customerId")?.trim();
    const query = searchParams.get("q")?.trim();
    const filter = searchParams.get("filter")?.trim(); // "all" | "verified" | "repeat" | "reward_ready"

    const settings = await prisma.systemSettings.findFirst();
    const loyaltyCfg = extractLoyaltyConfig(settings);

    if (customerId || phone) {
      const customer = await prisma.customer.findUnique({
        where: customerId ? { id: customerId } : { phone: phone! },
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              orderNumber: true,
              orderType: true,
              status: true,
              paymentMethod: true,
              paymentStatus: true,
              subtotal: true,
              deliveryFee: true,
              discountAmount: true,
              finalAmount: true,
              pointsEarned: true,
              pointsRedeemed: true,
              items: true,
              createdAt: true,
              outlet: { select: { id: true, name: true, code: true } },
            },
          },
          _count: { select: { orders: true } },
        },
      });

      const progress = customer ? getLoyaltyProgress(customer.loyaltyPoints, settings) : null;
      return NextResponse.json({
        success: true,
        customer,
        loyaltyConfig: loyaltyCfg,
        progress,
      });
    }

    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
      ];
    }

    if (filter === "verified") {
      where.isVerified = true;
    } else if (filter === "repeat") {
      where.visitCount = { gte: 2 };
    } else if (filter === "reward_ready") {
      where.loyaltyPoints = { gte: loyaltyCfg.loyaltyRewardThreshold };
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [{ totalSpent: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: {
        _count: { select: { orders: true } },
      },
    });

    const summary = {
      totalCustomers: customers.length,
      verifiedCustomers: customers.filter((c) => c.isVerified).length,
      repeatCustomers: customers.filter((c) => c.visitCount >= 2 || (c._count?.orders || 0) >= 2).length,
      rewardReadyCustomers: customers.filter((c) => c.loyaltyPoints >= loyaltyCfg.loyaltyRewardThreshold).length,
      totalLoyaltyPoints: customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0),
      totalSpent: Number(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toFixed(2)),
    };

    return NextResponse.json({
      success: true,
      customers,
      summary,
      loyaltyConfig: loyaltyCfg,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, address, city, notes, isVerified, loyaltyPoints } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ success: false, error: "رقم هاتف العميل مطلوب" }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();
    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;

    const customer = await prisma.customer.upsert({
      where: { phone: cleanPhone },
      update: {
        ...(name !== undefined && { name: String(name).trim() || "عميل VIP" }),
        ...(cleanEmail !== undefined && { email: cleanEmail || null }),
        ...(address !== undefined && { address: String(address).trim() || null }),
        ...(city !== undefined && { city: String(city).trim() || null }),
        ...(notes !== undefined && { notes: String(notes).trim() || null }),
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
        ...(loyaltyPoints !== undefined && { loyaltyPoints: Math.max(0, Math.round(Number(loyaltyPoints))) }),
      },
      create: {
        phone: cleanPhone,
        name: String(name || "").trim() || "عميل VIP",
        email: cleanEmail || null,
        address: address ? String(address).trim() : null,
        city: city ? String(city).trim() : null,
        notes: notes ? String(notes).trim() : null,
        isVerified: Boolean(isVerified),
        loyaltyPoints: loyaltyPoints !== undefined ? Math.max(0, Math.round(Number(loyaltyPoints))) : 0,
      },
    });

    return NextResponse.json({ success: true, customer, message: "تم حفظ بيانات العميل بنجاح ✅" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, phone, action, pointsDelta, name, email, address, city, notes, isVerified, loyaltyPoints } = body;

    if (!id && !phone) {
      return NextResponse.json({ success: false, error: "معرف أو هاتف العميل مطلوب" }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({
      where: id ? { id } : { phone: String(phone).trim() },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "العميل غير موجود" }, { status: 404 });
    }

    if (action === "ADJUST_POINTS") {
      const delta = Math.round(Number(pointsDelta) || 0);
      const nextPoints = Math.max(0, existing.loyaltyPoints + delta);
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: { loyaltyPoints: nextPoints },
      });
      return NextResponse.json({
        success: true,
        customer: updated,
        message:
          delta >= 0
            ? `تم إضافة ${delta} نقطة إلى رصيد ${existing.name} بنجاح ⭐`
            : `تم خصم ${Math.abs(delta)} نقطة من رصيد ${existing.name} بنجاح`,
      });
    }

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() || existing.name }),
        ...(phone !== undefined && String(phone).trim() && { phone: String(phone).trim() }),
        ...(email !== undefined && { email: email ? String(email).trim().toLowerCase() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(city !== undefined && { city: city ? String(city).trim() : null }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
        ...(loyaltyPoints !== undefined && {
          loyaltyPoints: Math.max(0, Math.round(Number(loyaltyPoints))),
        }),
      },
    });

    return NextResponse.json({ success: true, customer: updated, message: "تم تحديث بيانات العميل بنجاح ✅" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "معرف العميل مطلوب" }, { status: 400 });
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف سجل العميل بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
