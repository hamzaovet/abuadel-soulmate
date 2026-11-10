import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const station = searchParams.get("station");
    const outletId = searchParams.get("outletId");

    const where: any = {
      status: { in: ["QUEUED", "IN_PREPARATION"] },
    };

    if (station && station !== "ALL") {
      where.station = station;
    }
    if (outletId && outletId !== "ALL") {
      where.order = { outletId };
    }

    const tickets = await prisma.kdsTicket.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            tableNumber: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            deliveryPhone: true,
            deliveryFee: true,
            subtotal: true,
            finalAmount: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    const parsedTickets = tickets.map((t) => {
      let items: any[] = [];
      try {
        items = typeof t.itemsSummary === "string" ? JSON.parse(t.itemsSummary) : t.itemsSummary;
      } catch {
        items = [];
      }
      return {
        ...t,
        items,
      };
    });

    return NextResponse.json({ success: true, tickets: parsedTickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ success: false, error: "معرف التذكرة والحالة مطلوبين" }, { status: 400 });
    }

    const ticket = await prisma.kdsTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(status === "DONE" && { completedAt: new Date() }),
      },
      include: { order: true },
    });

    // Check if all KDS tickets for this order are completed
    const remaining = await prisma.kdsTicket.count({
      where: {
        orderId: ticket.orderId,
        status: { not: "DONE" },
      },
    });

    if (remaining === 0) {
      await prisma.order.update({
        where: { id: ticket.orderId },
        data: { status: "READY_TO_SERVE" },
      });
    } else {
      await prisma.order.update({
        where: { id: ticket.orderId },
        data: { status: "PREPARING" },
      });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
