import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "default-settings" },
      });
    }
    const { geminiApiKey: storedKey, vapidPrivateKey: _vp, ...safeSettings } = settings;
    return NextResponse.json({
      success: true,
      settings: {
        ...safeSettings,
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || storedKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const settings = await prisma.systemSettings.upsert({
      where: { id: "default-settings" },
      update: {
        ...(body.brandNameAr !== undefined && { brandNameAr: body.brandNameAr }),
        ...(body.brandNameEn !== undefined && { brandNameEn: body.brandNameEn }),
        ...(body.soulmatePhone !== undefined && { soulmatePhone: body.soulmatePhone }),
        ...(body.abuAdelPhone !== undefined && { abuAdelPhone: body.abuAdelPhone }),
        ...(body.hotline !== undefined && { hotline: body.hotline }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
        ...(body.haliyomakUrl !== undefined && { haliyomakUrl: body.haliyomakUrl }),
        ...(body.facebookUrl !== undefined && { facebookUrl: body.facebookUrl }),
        ...(body.serviceChargePercent !== undefined && { serviceChargePercent: Number(body.serviceChargePercent) }),
        ...(body.taxPercent !== undefined && { taxPercent: Number(body.taxPercent) }),
        ...(body.deliveryFee !== undefined && { deliveryFee: Number(body.deliveryFee) }),
        ...(body.preOrderDepositPercent !== undefined && { preOrderDepositPercent: Number(body.preOrderDepositPercent) }),
        ...(body.instapayAccount !== undefined && { instapayAccount: body.instapayAccount }),
        ...(body.vodafoneCashNumber !== undefined && { vodafoneCashNumber: body.vodafoneCashNumber }),
        ...(body.isServiceChargeEnabled !== undefined && { isServiceChargeEnabled: Boolean(body.isServiceChargeEnabled) }),
        ...(body.isTaxEnabled !== undefined && { isTaxEnabled: Boolean(body.isTaxEnabled) }),
        ...(body.isLoyaltyEnabled !== undefined && { isLoyaltyEnabled: Boolean(body.isLoyaltyEnabled) }),
        ...(body.pointsPerPoundSpent !== undefined && { pointsPerPoundSpent: Number(body.pointsPerPoundSpent) }),
        ...(body.poundValuePerPoint !== undefined && { poundValuePerPoint: Number(body.poundValuePerPoint) }),
        ...(body.loyaltyRewardThreshold !== undefined && {
          loyaltyRewardThreshold: Math.max(1, Math.round(Number(body.loyaltyRewardThreshold))),
        }),
        ...(body.loyaltyRewardValue !== undefined && {
          loyaltyRewardValue: Math.max(0, Number(body.loyaltyRewardValue)),
        }),
        ...(body.loyaltyAppliesToAbuAdel !== undefined && {
          loyaltyAppliesToAbuAdel: Boolean(body.loyaltyAppliesToAbuAdel),
        }),
        ...(body.loyaltyAppliesToSoulmate !== undefined && {
          loyaltyAppliesToSoulmate: Boolean(body.loyaltyAppliesToSoulmate),
        }),
        ...(body.loyaltyMotivationalMsg !== undefined && {
          loyaltyMotivationalMsg: String(body.loyaltyMotivationalMsg),
        }),
        ...(body.offersEnabled !== undefined && { offersEnabled: Boolean(body.offersEnabled) }),
        ...(body.specialOffers !== undefined && {
          specialOffers:
            typeof body.specialOffers === "string"
              ? body.specialOffers
              : JSON.stringify(body.specialOffers),
        }),
        ...(body.dailyReportAlertEnabled !== undefined && {
          dailyReportAlertEnabled: Boolean(body.dailyReportAlertEnabled),
        }),
        ...(body.dailyReportAlertTime !== undefined && {
          dailyReportAlertTime: String(body.dailyReportAlertTime || "20:00"),
        }),
        ...(body.dailyReportRepeatSeconds !== undefined && {
          dailyReportRepeatSeconds: Math.max(2, Math.round(Number(body.dailyReportRepeatSeconds) || 4)),
        }),
        ...(body.dailyReportAlertSound !== undefined && {
          dailyReportAlertSound: Boolean(body.dailyReportAlertSound),
        }),
        ...(body.internalSupplyMarkupEnabled !== undefined && {
          internalSupplyMarkupEnabled: Boolean(body.internalSupplyMarkupEnabled),
        }),
        ...(body.internalSupplyMarkupPercent !== undefined && {
          internalSupplyMarkupPercent: Math.max(0, Number(body.internalSupplyMarkupPercent) || 0),
        }),
        ...(body.talabatCommissionPercent !== undefined && {
          talabatCommissionPercent: Math.max(0, Math.min(100, Number(body.talabatCommissionPercent) || 0)),
        }),
        ...(body.geminiApiKey !== undefined && String(body.geminiApiKey).trim() !== "" && {
          geminiApiKey: String(body.geminiApiKey).trim(),
        }),
        ...(body.receiptFooterNotes !== undefined && { receiptFooterNotes: body.receiptFooterNotes }),
        ...(body.systemLocked !== undefined && { systemLocked: Boolean(body.systemLocked) }),
        ...(body.lockMessage !== undefined && { lockMessage: body.lockMessage }),
      },
      create: {
        id: "default-settings",
        ...body,
      },
    });

    const { geminiApiKey: storedKey, vapidPrivateKey: _vp, ...safeSettings } = settings;
    return NextResponse.json({
      success: true,
      settings: {
        ...safeSettings,
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || storedKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export { PATCH as PUT };
