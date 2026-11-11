import { NextResponse } from "next/server";
import { sendPushNotifications } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint ? String(body.endpoint).trim() : null;
    const role = body?.role ? String(body.role).toUpperCase() : null;
    const customerPhone = body?.customerPhone ? String(body.customerPhone).trim() : null;

    const result = await sendPushNotifications(
      endpoint
        ? { endpoint }
        : role
        ? { roles: [role] }
        : customerPhone
        ? { customerPhone }
        : { roles: ["OWNER", "ADMIN", "POS", "CUSTOMER"] },
      {
        title: body?.title || "🔔 تجربة إشعار الخلفية — أبو عادل & سول ميت",
        body:
          body?.body ||
          "ممتاز! جهازك جاهز لاستقبال الإشعارات بالصوت حتى لو التطبيق أو المتصفح مقفول تماماً 🚀✅",
        url: body?.url || "/",
        tag: `push-test-${Date.now()}`,
        requireInteraction: false,
      }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "فشل إرسال إشعار التجربة" },
      { status: 500 }
    );
  }
}
