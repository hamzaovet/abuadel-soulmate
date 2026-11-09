import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, password, pin } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "برجاء إدخال اسم المستخدم وكلمة المرور" },
        { status: 400 }
      );
    }

    // Check system lock
    const settings = await prisma.systemSettings.findFirst();
    const isLocked = settings?.systemLocked || false;

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { outlet: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    if (user.passwordHash !== password.trim()) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    if (pin && user.pin && user.pin !== pin.trim()) {
      return NextResponse.json(
        { success: false, error: "رمز PIN السري غير صحيح" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "هذا الحساب معطل حالياً من قِبل الإدارة" },
        { status: 403 }
      );
    }

    if (isLocked && user.role !== "owner") {
      return NextResponse.json(
        { success: false, error: settings?.lockMessage || "النظام مغلق حالياً للصيانة" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        outletId: user.outletId,
        outletName: user.outlet?.name || "الإدارة المركزية العامة",
        outletCode: user.outlet?.code || null,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
