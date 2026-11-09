import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            tables: true,
            menuItems: true,
            orders: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, outlets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
