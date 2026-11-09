import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    const where: any = {};
    if (outletId && outletId !== "ALL") {
      where.OR = [{ outletId }, { outletId: null }];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
    });

    const safeUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      outletId: u.outletId,
      outletName: u.outlet?.name || "الإدارة المركزية العامة",
      phone: u.phone,
      pin: u.pin,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, password, pin, role, outletId, phone } = body;

    if (!name || !username || !password) {
      return NextResponse.json({ success: false, error: "الاسم واسم المستخدم وكلمة المرور مطلوبة" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "اسم المستخدم مسجل بالفعل" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        passwordHash: password.trim(),
        pin: pin?.trim() || "159920",
        role: role || "cashier",
        outletId: outletId || null,
        phone: phone?.trim() || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, username, password, pin, role, outletId, phone, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(username && { username: username.trim().toLowerCase() }),
        ...(password && { passwordHash: password.trim() }),
        ...(pin && { pin: pin.trim() }),
        ...(role && { role }),
        ...(outletId !== undefined && { outletId: outletId || null }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
