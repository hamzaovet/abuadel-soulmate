import { prisma } from "../lib/prisma";

async function main() {
  console.log("Updating and isolating system users for Maestro, Soulmate, and Abu Adel...");

  const soulmate = await prisma.outlet.findFirst({ where: { code: "SOULMATE_CAFE" } });
  const abuadel = await prisma.outlet.findFirst({ where: { code: "ABU_ADEL_PATISSERIE" } });

  if (!soulmate || !abuadel) {
    console.error("Outlets not found!");
    process.exit(1);
  }

  // Delete legacy gm or unwanted accounts
  await prisma.user.deleteMany({
    where: {
      username: { in: ["gm", "general_manager"] },
    },
  });
  console.log("Removed old shared GM accounts.");

  const users = [
    // 1. Maestro (The ONLY shared owner account)
    {
      username: "maestro",
      name: "أ / حمزة عباس (المايسترو - المالك العام)",
      passwordHash: "123456789",
      pin: "157230",
      role: "owner",
      outletId: null,
      phone: "01018671000",
      isActive: true,
    },
    // 2. Soulmate Manager (Strictly Soulmate Cafe)
    {
      username: "manager-soulmate",
      name: "م / تامر فؤاد (مدير كافيه سول ميت VIP)",
      passwordHash: "soulmate@2026",
      pin: "782015",
      role: "branch_manager",
      outletId: soulmate.id,
      phone: "01556782015",
      isActive: true,
    },
    // 3. Abu Adel Manager (Strictly Abu Adel Patisserie)
    {
      username: "manager-abuadel",
      name: "حاج / سامي عادل (مدير حلواني أبو عادل)",
      passwordHash: "abuadel@2026",
      pin: "468211",
      role: "branch_manager",
      outletId: abuadel.id,
      phone: "01146862114",
      isActive: true,
    },
    // 4. Soulmate Cashier (Soulmate POS)
    {
      username: "cashier-soulmate",
      name: "كاشير صالة كافيه سول ميت",
      passwordHash: "cashier@soulmate",
      pin: "103025",
      role: "cashier",
      outletId: soulmate.id,
      phone: "01210103025",
      isActive: true,
    },
    // 5. Abu Adel Cashier (Abu Adel POS)
    {
      username: "cashier-abuadel",
      name: "كاشير معرض حلواني أبو عادل",
      passwordHash: "cashier@abuadel",
      pin: "159920",
      role: "cashier",
      outletId: abuadel.id,
      phone: "15992",
      isActive: true,
    },
    // 6. Soulmate Barista (KDS)
    {
      username: "barista-soulmate",
      name: "كابتن الباريستا والبار (KDS)",
      passwordHash: "barista@soulmate",
      pin: "998877",
      role: "barista",
      outletId: soulmate.id,
      phone: "01099887766",
      isActive: true,
    },
    // 7. Abu Adel Chef (Kitchen)
    {
      username: "chef-abuadel",
      name: "شيف حلواني ومخبوزات أبو عادل",
      passwordHash: "chef@abuadel",
      pin: "621140",
      role: "chef",
      outletId: abuadel.id,
      phone: "01146862114",
      isActive: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        passwordHash: u.passwordHash,
        pin: u.pin,
        role: u.role,
        outletId: u.outletId,
        phone: u.phone,
        isActive: true,
      },
      create: {
        username: u.username,
        name: u.name,
        passwordHash: u.passwordHash,
        pin: u.pin,
        role: u.role,
        outletId: u.outletId,
        phone: u.phone,
        isActive: true,
      },
    });
    console.log(`Configured user: ${u.username} (${u.role}) - PIN: ${u.pin}`);
  }

  console.log("All isolated users successfully configured in Neon database!");
}

main()
  .catch((e) => {
    console.error("Error updating users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
