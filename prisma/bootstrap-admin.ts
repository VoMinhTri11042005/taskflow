import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const databaseUrl = process.env.DATABASE_URL;
const email = (process.env.ADMIN_EMAIL ?? "admin@taskflow.vn").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "admin123";

if (!databaseUrl || databaseUrl.includes("PASTE_POSTGRESQL_URL_HERE")) {
  throw new Error("Hãy dán DATABASE_URL PostgreSQL thật vào file .env trước khi chạy.");
}

if (password.length < 8) {
  throw new Error("ADMIN_PASSWORD phải có ít nhất 8 ký tự.");
}

const db = new PrismaClient();

async function main() {
  const administrators = await db.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });

  if (administrators.length > 1) {
    throw new Error("Database đang có nhiều admin. Hãy xử lý thủ công trước khi chạy lại.");
  }

  if (administrators[0] && administrators[0].email !== email) {
    throw new Error(`Admin hiện tại là ${administrators[0].email}. Không tạo thêm admin thứ hai.`);
  }

  const admin = await db.user.upsert({
    where: { email },
    create: {
      email,
      password: hashSync(password, 10),
      name: "Quản trị viên",
      role: "admin",
      status: "approved",
      color: "#ef4444",
    },
    update: {
      password: hashSync(password, 10),
      role: "admin",
      status: "approved",
    },
  });

  await db.teamMember.upsert({
    where: { email },
    create: {
      name: admin.name,
      email,
      role: "admin",
      color: "#ef4444",
    },
    update: { name: admin.name, role: "admin", color: "#ef4444" },
  });

  console.log(`Admin is ready: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
