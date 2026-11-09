import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER || "hamzaovet@gmail.com",
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS || "goyl rmse icox vrdh",
  },
});

export async function sendVerificationEmail(to: string, code: string, customerName: string) {
  try {
    const mailOptions = {
      from: `"سول ميت كافيه & حلواني أبو عادل" <${process.env.EMAIL_USER || "hamzaovet@gmail.com"}>`,
      to,
      subject: `رمز التحقق وتفعيل الحساب: ${code} ⭐`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #f59e0b; margin: 0;">سول ميت كافيه VIP & حلواني أبو عادل</h2>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">تأكيد وتفعيل حسابك الرسمي</p>
          </div>
          <div style="background-color: #1e293b; padding: 25px; border-radius: 12px; text-align: center; border: 1px solid #475569;">
            <p style="font-size: 15px; margin-bottom: 15px;">أهلاً بك يا <b>${customerName}</b>،</p>
            <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 20px;">استخدم رمز التحقق السري التالي لتفعيل حسابك والاستفادة من برنامج نقاط ولاء سول ميت وطلب الدليفري المباشر:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; background-color: #0f172a; padding: 12px 20px; border-radius: 10px; display: inline-block; font-family: monospace; border: 1px dashed #f59e0b;">
              ${code}
            </div>
            <p style="font-size: 11px; color: #64748b; margin-top: 20px;">هذا الكود صالح لمدة 15 دقيقة فقط. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>
          </div>
          <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">حلواني أبو عادل (الخط الساخن: 15992) • سول ميت كافيه (01099887766)</p>
            <p style="margin: 5px 0 0 0; color: #64748b;">حلي يومك واستمتع بأفخر فنجان قهوة ☕🍰</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: error.message };
  }
}
