import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const notifWhere: any = {};
    const auditWhere: any = {};
    if (outletId && outletId !== "ALL") {
      notifWhere.outletId = outletId;
      auditWhere.outletId = outletId;
    }
    if (unreadOnly) {
      notifWhere.isRead = false;
    }

    const [notifications, unreadCount, auditLogs] = await Promise.all([
      prisma.adminNotification.findMany({
        where: notifWhere,
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
        take: 60,
      }),
      prisma.adminNotification.count({
        where: {
          ...(outletId && outletId !== "ALL" ? { outletId } : {}),
          isRead: false,
        },
      }),
      prisma.orderAuditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, id, notificationId, outletId, readBy } = body;

    if (action === "MARK_ALL_READ") {
      await prisma.adminNotification.updateMany({
        where: {
          isRead: false,
          ...(outletId && outletId !== "ALL" ? { outletId } : {}),
        },
        data: {
          isRead: true,
          readBy: readBy || "المدير العام",
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "تم تأكيد مراجعة كافة تنبيهات الرقابة ✅",
      });
    }

    const targetId = id || notificationId;
    if (!targetId) {
      return NextResponse.json({ success: false, error: "معرف التنبيه مطلوب" }, { status: 400 });
    }

    const updated = await prisma.adminNotification.update({
      where: { id: targetId },
      data: {
        isRead: true,
        readBy: readBy || "المدير العام",
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
