import dotenv from "dotenv";
import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

dotenv.config();

async function seedAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@smartattendance.local";
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME || "System Administrator";
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

  if (!password) {
    console.error("[seed-admin] Error: INITIAL_ADMIN_PASSWORD must be defined in environment.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("[seed-admin] Error: INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ role: "ADMIN" }, { email: email.toLowerCase() }],
    },
  });

  if (existingAdmin) {
    console.log(`[seed-admin] Admin account already exists (${existingAdmin.email}). No changes made.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, saltRounds);

  const admin = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`[seed-admin] Successfully bootstrapped initial ADMIN user: ${admin.email}`);
}

seedAdmin()
  .catch((err) => {
    console.error("[seed-admin] Error seeding admin:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
