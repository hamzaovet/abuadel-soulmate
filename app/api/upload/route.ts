import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "لم يتم اختيار صورة للرفع" }, { status: 400 });
    }

    const apiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY || "1705736b8f2b46dcbaeec8a6025aca83";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    const imgbbForm = new FormData();
    imgbbForm.append("image", base64Image);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: imgbbForm,
    });

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({
        success: true,
        url: data.data.url,
        thumb: data.data.thumb?.url || data.data.url,
      });
    } else {
      return NextResponse.json(
        { success: false, error: data.error?.message || "فشل رفع الصورة إلى ImgBB" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
