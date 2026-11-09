import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.outletId = outletId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { outlet: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, title, amount, category, recordedBy, notes } = body;

    if (!outletId || !title || !amount) {
      return NextResponse.json({ success: false, error: "بيانات المصروف والمبلغ مطلوبة" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        outletId,
        title: title.trim(),
        amount: Number(amount),
        category: category || "SUPPLIES",
        recordedBy: recordedBy || "الكاشير",
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
