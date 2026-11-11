import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseOfferData } from "@/lib/offers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setting = await prisma.systemSettings.findFirst({
      select: { specialOffers: true, offersEnabled: true },
    });

    const data = parseOfferData(setting?.specialOffers, setting?.offersEnabled);

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("Error fetching offers:", err);
    return new NextResponse(JSON.stringify(parseOfferData(null, true)), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}

async function handleSaveOffers(req: Request) {
  try {
    const body = await req.json();
    const isEnabled = body.enabled !== undefined ? Boolean(body.enabled) : true;
    body.enabled = isEnabled;
    const jsonStr = JSON.stringify(body);

    const existing = await prisma.systemSettings.findFirst({ select: { id: true } });
    const targetId = existing?.id || "default-settings";

    const updated = await prisma.systemSettings.upsert({
      where: { id: targetId },
      update: {
        specialOffers: jsonStr,
        offersEnabled: isEnabled,
      },
      create: {
        id: targetId,
        specialOffers: jsonStr,
        offersEnabled: isEnabled,
      },
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        offers: parseOfferData(updated.specialOffers, updated.offersEnabled),
        offersEnabled: updated.offersEnabled,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    console.error("Error saving offers:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleSaveOffers(req);
}

export async function PUT(req: Request) {
  return handleSaveOffers(req);
}
