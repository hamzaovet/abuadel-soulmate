import { prisma } from "../lib/prisma";

async function main() {
  console.log("Updating users with distinct credentials and PINs...");

  const users = [
    {
      username: "maestro",
      passwordHash: "123456789",
      pin: "157230",
      name: "أ / حمزة عباس (المايسترو - المالك)",
      role: "owner",
      outletCode: null,
      phone: "01018671000",
    },
    {
      username: "gm",
      passwordHash: "gm@soul2026",
      pin: "246810",
      name: "كابتن الإدارة (المدير العام للمجموعة)",
      role: "general_manager",
      outletCode: null,
      phone: "01099887766",
    },
    {
      username: "manager-soulmate",
      passwordHash: "soul@manager26",
      pin: "112233",
      name: "م / تامر فؤاد (مدير كافيه سول ميت)",
      role: "branch_manager",
      outletCode: "SOULMATE_CAFE",
      phone: "01099887766",
    },
    {
      username: "manager-abuadel",
      passwordHash: "adel@manager26",
      pin: "445566",
      name: "حاج / سامي عادل (مدير حلواني أبو عادل)",
      role: "branch_manager",
      outletCode: "ABU_ADEL_PATISSERIE",
      phone: "15992",
    },
    {
      username: "cashier-soulmate",
      passwordHash: "soul@cashier26",
      pin: "778899",
      name: "كاشير صالة الكافيه (Soulmate POS)",
      role: "cashier",
      outletCode: "SOULMATE_CAFE",
      phone: "01099887766",
    },
    {
      username: "cashier-abuadel",
      passwordHash: "adel@cashier26",
      pin: "332211",
      name: "كاشير معرض حلواني أبو عادل",
      role: "cashier",
      outletCode: "ABU_ADEL_PATISSERIE",
      phone: "15992",
    },
    {
      username: "barista-soulmate",
      passwordHash: "barista@soul26",
      pin: "998877",
      name: "كابتن الباريستا والبار (KDS)",
      role: "barista",
      outletCode: "SOULMATE_CAFE",
      phone: "01099887766",
    },
  ];

  for (const u of users) {
    let outletId = null;
    if (u.outletCode) {
      const o = await prisma.outlet.findFirst({ where: { code: u.outletCode } });
      outletId = o?.id || null;
    }

    const existing = await prisma.user.findUnique({ where: { username: u.username } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: u.passwordHash,
          pin: u.pin,
          name: u.name,
          role: u.role,
          outletId,
          phone: u.phone,
          isActive: true,
        },
      });
      console.log(`Updated user ${u.username}`);
    } else {
      await prisma.user.create({
        data: {
          username: u.username,
          passwordHash: u.passwordHash,
          pin: u.pin,
          name: u.name,
          role: u.role,
          outletId,
          phone: u.phone,
          isActive: true,
        },
      });
      console.log(`Created user ${u.username}`);
    }
  }

  // Update Settings: remove haliyomakUrl as official site
  const settings = await prisma.systemSettings.findFirst();
  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        haliyomakUrl: "",
      },
    });
    console.log("Updated system settings!");
  }

  console.log("User credentials & settings update completed!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
