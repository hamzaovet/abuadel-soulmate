import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const query = searchParams.get("q");

    if (phone) {
      const customer = await prisma.customer.findUnique({
        where: { phone: phone.trim() },
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { id: true, orderNumber: true, finalAmount: true, createdAt: true, status: true },
          },
        },
      });
      return NextResponse.json({ success: true, customer });
    }

    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { totalSpent: "desc" },
      take: 50,
      include: {
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, notes } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: "رقم هاتف العميل مطلوب" }, { status: 400 });
    }

    const customer = await prisma.customer.upsert({
      where: { phone: phone.trim() },
      update: {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.trim() }),
        ...(notes && { notes: notes.trim() }),
      },
      create: {
        phone: phone.trim(),
        name: name?.trim() || "عميل VIP",
        email: email?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
