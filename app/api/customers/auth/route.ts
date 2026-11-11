import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// 1. REGISTER OR LOGIN FOR CUSTOMER
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, name, phone, email, password, code, address, city } = body;

    // A. REGISTER
    if (action === "REGISTER") {
      if (!name || !phone || !email) {
        return NextResponse.json(
          { success: false, error: "الاسم ورقم الهاتف والبريد الإلكتروني مطلوبة" },
          { status: 400 }
        );
      }

      const cleanPhone = phone.trim();
      const cleanEmail = email.trim().toLowerCase();

      // Check existing customer
      let customer = await prisma.customer.findUnique({
        where: { phone: cleanPhone },
      });

      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      if (customer) {
        // Update customer with new code & details
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: name.trim(),
            email: cleanEmail,
            verificationCode: otp,
            passwordHash: password?.trim() || customer.passwordHash,
            address: address?.trim() || customer.address,
            city: city?.trim() || customer.city,
          },
        });
      } else {
        customer = await prisma.customer.create({
          data: {
            name: name.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            verificationCode: otp,
            passwordHash: password?.trim() || null,
            address: address?.trim() || null,
            city: city?.trim() || null,
            isVerified: false,
          },
        });
      }

      // Send verification email via Gmail SMTP
      await sendVerificationEmail(cleanEmail, otp, name.trim());

      return NextResponse.json({
        success: true,
        message: "تم إرسال كود التحقق بنجاح إلى بريدك الإلكتروني",
        customerId: customer.id,
      });
    }

    // B. VERIFY OTP
    if (action === "VERIFY_OTP") {
      if (!phone || !code) {
        return NextResponse.json(
          { success: false, error: "رقم الهاتف وكود التحقق مطلوبان" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.findUnique({
        where: { phone: phone.trim() },
      });

      if (!customer) {
        return NextResponse.json(
          { success: false, error: "لم يتم العثور على الحساب" },
          { status: 404 }
        );
      }

      if (customer.verificationCode !== code.trim()) {
        return NextResponse.json(
          { success: false, error: "كود التحقق غير صحيح، يرجى التأكد وإعادة المحاولة" },
          { status: 400 }
        );
      }

      // Mark verified
      const verifiedCustomer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          isVerified: true,
          verificationCode: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "تم تفعيل الحساب بنجاح ⭐",
        customer: {
          id: verifiedCustomer.id,
          name: verifiedCustomer.name,
          phone: verifiedCustomer.phone,
          email: verifiedCustomer.email,
          loyaltyPoints: verifiedCustomer.loyaltyPoints,
          totalSpent: verifiedCustomer.totalSpent,
          visitCount: verifiedCustomer.visitCount,
          isVerified: verifiedCustomer.isVerified,
          address: verifiedCustomer.address,
          city: verifiedCustomer.city,
        },
      });
    }

    // C. LOGIN
    if (action === "LOGIN") {
      if (!phone) {
        return NextResponse.json(
          { success: false, error: "برجاء إدخال رقم الهاتف المسجل" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.findUnique({
        where: { phone: phone.trim() },
      });

      if (!customer) {
        return NextResponse.json(
          { success: false, error: "رقم الهاتف غير مسجل، يمكنك إنشاء حساب جديد خلال لحظات" },
          { status: 404 }
        );
      }

      // If customer has password, verify it
      if (customer.passwordHash && password) {
        if (customer.passwordHash !== password.trim()) {
          return NextResponse.json(
            { success: false, error: "كلمة المرور غير صحيحة" },
            { status: 401 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          loyaltyPoints: customer.loyaltyPoints,
          totalSpent: customer.totalSpent,
          visitCount: customer.visitCount,
          isVerified: customer.isVerified,
          address: customer.address,
          city: customer.city,
        },
      });
    }

    // D. RESEND OTP
    if (action === "RESEND_OTP") {
      if (!phone) {
        return NextResponse.json({ success: false, error: "رقم الهاتف مطلوب" }, { status: 400 });
      }
      const customer = await prisma.customer.findUnique({
        where: { phone: phone.trim() },
      });
      if (!customer || !customer.email) {
        return NextResponse.json({ success: false, error: "الحساب غير موجود" }, { status: 404 });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.customer.update({
        where: { id: customer.id },
        data: { verificationCode: otp },
      });

      await sendVerificationEmail(customer.email, otp, customer.name);
      return NextResponse.json({ success: true, message: "تم إعادة إرسال كود التحقق بنجاح" });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
