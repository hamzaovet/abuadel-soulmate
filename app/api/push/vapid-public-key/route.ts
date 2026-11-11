import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { publicKey } = await getVapidConfig();
    return NextResponse.json({ success: true, publicKey });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load VAPID public key" },
      { status: 500 }
    );
  }
}
