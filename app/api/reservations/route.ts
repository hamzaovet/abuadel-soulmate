import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const status = searchParams.get("status");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { bookingDate: "desc" },
      include: { outlet: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      customerName,
      customerPhone,
      customerEmail,
      reservationType, // "TABLE" | "PARTY"
      guestCount,
      bookingDate,
      timeSlot,
      zonePreference,
      specialRequests,
    } = body;

    if (!customerName || !customerPhone || !bookingDate || !timeSlot) {
      return NextResponse.json(
        { success: false, error: "الاسم، رقم الهاتف، التاريخ والموعد بيانات مطلوبة" },
        { status: 400 }
      );
    }

    let targetOutletId = outletId;
    if (!targetOutletId || targetOutletId === "ALL") {
      const soulmate = await prisma.outlet.findFirst({
        where: { code: "SOULMATE_CAFE" },
      });
      targetOutletId = soulmate?.id || (await prisma.outlet.findFirst())?.id;
    }

    const reservation = await prisma.reservation.create({
      data: {
        outletId: targetOutletId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || null,
        reservationType: reservationType || "TABLE",
        guestCount: parseInt(guestCount) || 2,
        bookingDate: new Date(bookingDate),
        timeSlot: timeSlot.trim(),
        zonePreference: zonePreference || "INDOOR",
        specialRequests: specialRequests?.trim() || null,
        status: "PENDING",
      },
      include: { outlet: true },
    });

    // Upsert into unified Customer CRM for marketing & loyalty tracking
    try {
      await prisma.customer.upsert({
        where: { phone: customerPhone.trim() },
        update: {
          name: customerName.trim(),
          ...(customerEmail?.trim() ? { email: customerEmail.trim().toLowerCase() } : {}),
          lastVisitAt: new Date(),
        },
        create: {
          phone: customerPhone.trim(),
          name: customerName.trim(),
          email: customerEmail?.trim()?.toLowerCase() || null,
          lastVisitAt: new Date(),
          notes: reservationType === "PARTY" ? "حجز حفلة / مناسبة" : "حجز ترابيزة",
        },
      });
    } catch {
      // Do not fail reservation creation on secondary CRM sync
    }

    return NextResponse.json({
      success: true,
      message:
        reservationType === "PARTY"
          ? "تم تسجيل طلب حجز الحفلة بنجاح وسيتواصل معكم فريق الاستقبال لتأكيد الترتيبات ⭐"
          : "تم استلام طلب حجز الترابيزة بنجاح وبانتظار التأكيد الفوري ☕",
      reservation,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "معرف الحجز والحالة مطلوبان" }, { status: 400 });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, reservation: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
