import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@lawbygrace.app";
  const username = "grace";
  const password = "GraceAdmin2026!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists:", email);
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name: "Grace",
      username,
      email,
      password: hashed,
      role: "ADMIN",
      isVerified: true,
      bio: "Curator of the Law by Grace library.",
    },
  });

  console.log("✅ Created the Law by Grace administrator:");
  console.log("   Email:   ", email);
  console.log("   Password:", password);
  console.log("   Login at: /admin/login");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());