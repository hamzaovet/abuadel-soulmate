import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const tableNumber = searchParams.get("tableNumber");
    const customerPhone = searchParams.get("customerPhone");
    const guestId = searchParams.get("guestId");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }

    const identityFilters: any[] = [];
    if (tableNumber) {
      identityFilters.push({ tableNumber });
    }
    if (customerPhone) {
      identityFilters.push({ senderPhone: customerPhone });
    }
    if (guestId && guestId !== customerPhone) {
      identityFilters.push({ senderPhone: guestId });
    }

    if (identityFilters.length === 1) {
      Object.assign(where, identityFilters[0]);
    } else if (identityFilters.length > 1) {
      where.OR = identityFilters;
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { outlet: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outletId,
      senderType, // "CUSTOMER" | "STAFF"
      senderName,
      senderPhone,
      guestId,
      tableNumber,
      orderNumber,
      message,
      imageUrl,
    } = body;

    if (!message?.trim() && !imageUrl) {
      return NextResponse.json({ success: false, error: "نص الرسالة أو الصورة مطلوب" }, { status: 400 });
    }

    // Default outlet to Soulmate Cafe if not provided
    let targetOutletId = outletId;
    if (!targetOutletId || targetOutletId === "ALL") {
      const soulmate = await prisma.outlet.findFirst({
        where: { code: "SOULMATE_CAFE" },
      });
      targetOutletId = soulmate?.id || (await prisma.outlet.findFirst())?.id;
    }

    // If customer now uses a real phone after chatting earlier as guestId, unify prior guest thread
    if (senderType === "CUSTOMER" && senderPhone && guestId && senderPhone !== guestId) {
      await prisma.chatMessage.updateMany({
        where: { senderPhone: guestId },
        data: { senderPhone },
      });
    }

    const chatMsg = await prisma.chatMessage.create({
      data: {
        outletId: targetOutletId,
        senderType: senderType || "CUSTOMER",
        senderName: senderName || "عميل",
        senderPhone: senderPhone || guestId || null,
        tableNumber: tableNumber || null,
        orderNumber: orderNumber || null,
        message: message?.trim() || "📎 صورة مرفقة",
        imageUrl: imageUrl || null,
      },
      include: { outlet: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ success: true, message: chatMsg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { outletId, targetRole, customerPhone, guestId, tableNumber } = body;

    if (targetRole === "STAFF") {
      const identityFilters: any[] = [];
      if (tableNumber) identityFilters.push({ tableNumber });
      if (customerPhone) identityFilters.push({ senderPhone: customerPhone });
      if (guestId && guestId !== customerPhone) identityFilters.push({ senderPhone: guestId });

      if (identityFilters.length === 0) {
        return NextResponse.json({ success: true });
      }
      const where: any = { senderType: "STAFF", isRead: false };
      if (outletId && outletId !== "ALL") where.outletId = outletId;
      if (identityFilters.length === 1) Object.assign(where, identityFilters[0]);
      else where.OR = identityFilters;

      await prisma.chatMessage.updateMany({
        where,
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    const where: any = { senderType: "CUSTOMER", isRead: false };
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }
    await prisma.chatMessage.updateMany({
      where,
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
