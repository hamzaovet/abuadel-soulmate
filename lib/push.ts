import * as webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  icon?: string;
  badge?: string;
}

export interface PushTarget {
  roles?: string[];
  outletId?: string | null;
  customerPhone?: string | null;
  endpoint?: string | null;
}

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let cachedVapid: VapidConfig | null = null;

export function normalizePhoneForPush(phone?: string | null): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 10 && digits.startsWith("20")) {
    return "0" + digits.slice(2);
  }
  return digits;
}

export async function getVapidConfig(): Promise<VapidConfig> {
  const envPublic = (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "")
    .replace(/[\r\n\s]+/g, "")
    .trim();
  const envPrivate = (process.env.VAPID_PRIVATE_KEY || "")
    .replace(/[\r\n\s]+/g, "")
    .trim();
  const subject = (process.env.VAPID_SUBJECT || "mailto:admin@abuadel-soulmate.vercel.app").trim();

  if (envPublic && envPrivate) {
    cachedVapid = { publicKey: envPublic, privateKey: envPrivate, subject };
    return cachedVapid;
  }

  if (cachedVapid) {
    return cachedVapid;
  }

  let settings = await prisma.systemSettings.findFirst();
  if (settings?.vapidPublicKey && settings?.vapidPrivateKey) {
    cachedVapid = {
      publicKey: settings.vapidPublicKey.trim(),
      privateKey: settings.vapidPrivateKey.trim(),
      subject,
    };
    return cachedVapid;
  }

  const generated = webpush.generateVAPIDKeys();
  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        vapidPublicKey: generated.publicKey,
        vapidPrivateKey: generated.privateKey,
      },
    });
  } else {
    await prisma.systemSettings.upsert({
      where: { id: "default-settings" },
      create: {
        id: "default-settings",
        vapidPublicKey: generated.publicKey,
        vapidPrivateKey: generated.privateKey,
      },
      update: {
        vapidPublicKey: generated.publicKey,
        vapidPrivateKey: generated.privateKey,
      },
    });
  }

  cachedVapid = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  };
  return cachedVapid;
}

export async function sendPushNotifications(
  target: PushTarget,
  payload: PushPayload
): Promise<{ sent: number; failed: number; deactivated: number }> {
  try {
    const { publicKey, privateKey, subject } = await getVapidConfig();
    if (!publicKey || !privateKey) {
      return { sent: 0, failed: 0, deactivated: 0 };
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const orClauses: any[] = [];

    if (target.endpoint) {
      orClauses.push({ endpoint: target.endpoint });
    }

    if (target.roles && target.roles.length > 0) {
      if (target.outletId) {
        orClauses.push({
          role: { in: target.roles },
          OR: [{ outletId: null }, { outletId: "" }, { outletId: target.outletId }],
        });
      } else {
        orClauses.push({
          role: { in: target.roles },
        });
      }
    }

    const normalizedTargetPhone = normalizePhoneForPush(target.customerPhone);
    if (normalizedTargetPhone) {
      const phoneCandidates = Array.from(
        new Set(
          [
            normalizedTargetPhone,
            target.customerPhone?.trim() || "",
            normalizedTargetPhone.slice(-10),
          ].filter((p) => p.length >= 8)
        )
      );
      if (phoneCandidates.length > 0) {
        orClauses.push({
          customerPhone: { in: phoneCandidates },
        });
      }
    }

    if (orClauses.length === 0) {
      return { sent: 0, failed: 0, deactivated: 0 };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        isActive: true,
        OR: orClauses,
      },
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0, deactivated: 0 };
    }

    const serializedPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      tag: payload.tag || "abuadel-soulmate-alert",
      requireInteraction: Boolean(payload.requireInteraction),
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-192.png",
    });

    let sent = 0;
    let failed = 0;
    let deactivated = 0;
    const expiredIds: string[] = [];
    const sentIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            serializedPayload,
            {
              TTL: 3600,
              urgency: "high",
            }
          );
          sent += 1;
          sentIds.push(sub.id);
        } catch (err: any) {
          failed += 1;
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
            deactivated += 1;
            expiredIds.push(sub.id);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: expiredIds } },
        data: { isActive: false },
      });
    }

    if (sentIds.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: sentIds } },
        data: { lastNotifiedAt: new Date() },
      });
    }

    return { sent, failed, deactivated };
  } catch (err) {
    console.error("sendPushNotifications error:", err);
    return { sent: 0, failed: 0, deactivated: 0 };
  }
}
