import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const tableNumber = searchParams.get("tableNumber");
    const customerPhone = searchParams.get("customerPhone");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }
    if (tableNumber) {
      where.tableNumber = tableNumber;
    }
    if (customerPhone) {
      where.senderPhone = customerPhone;
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 150,
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
      tableNumber,
      orderNumber,
      message,
    } = body;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "نص الرسالة مطلوب" }, { status: 400 });
    }

    // Default outlet to Soulmate Cafe if not provided
    let targetOutletId = outletId;
    if (!targetOutletId || targetOutletId === "ALL") {
      const soulmate = await prisma.outlet.findFirst({
        where: { code: "SOULMATE_CAFE" },
      });
      targetOutletId = soulmate?.id || (await prisma.outlet.findFirst())?.id;
    }

    const chatMsg = await prisma.chatMessage.create({
      data: {
        outletId: targetOutletId,
        senderType: senderType || "CUSTOMER",
        senderName: senderName || "عميل",
        senderPhone: senderPhone || null,
        tableNumber: tableNumber || null,
        orderNumber: orderNumber || null,
        message: message.trim(),
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
    const { outletId } = body;
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
