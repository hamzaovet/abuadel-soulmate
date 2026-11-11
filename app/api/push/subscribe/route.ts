import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sub = body?.subscription;
    const endpoint = String(sub?.endpoint || "").trim();
    const p256dh = String(sub?.keys?.p256dh || "").trim();
    const auth = String(sub?.keys?.auth || "").trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: "بيانات اشتراك الإشعارات غير مكتملة" },
        { status: 400 }
      );
    }

    const role = String(body?.role || "CUSTOMER").toUpperCase();
    const outletId = body?.outletId ? String(body.outletId).trim() : null;
    const userId = body?.userId ? String(body.userId).trim() : null;
    const userName = body?.userName ? String(body.userName).trim() : null;
    const rawPhone = body?.customerPhone ? String(body.customerPhone).trim() : "";
    const normalizedPhone = normalizePhoneForPush(rawPhone) || null;
    const userAgent = req.headers.get("user-agent") || null;

    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh,
        auth,
        role,
        outletId,
        userId,
        userName,
        customerPhone: normalizedPhone,
        userAgent,
        isActive: true,
      },
      update: {
        p256dh,
        auth,
        role,
        outletId,
        userId,
        userName,
        ...(normalizedPhone ? { customerPhone: normalizedPhone } : {}),
        ...(userAgent ? { userAgent } : {}),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: saved.id,
      role: saved.role,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "تعذر حفظ اشتراك الإشعارات" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "").trim();
    if (!endpoint) {
      return NextResponse.json({ success: false, error: "endpoint مطلوب" }, { status: 400 });
    }

    await prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "تعذر إلغاء الاشتراك" },
      { status: 500 }
    );
  }
}
