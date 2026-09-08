/**
 * 建立示範用的商家帳號 + 一筆寄件人（LINE 客人的寄件單會掛在此帳號下）。
 * 執行：npm run seed
 */
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.MERCHANT_USER_EMAIL || "test@example.com";
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error("請先在 .env 設定 SEED_PASSWORD 再執行 seed");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "測試商家",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`商家帳號: ${email} / ${password}  (id=${user.id})`);

  const senderCount = await prisma.senderProfile.count({ where: { userId: user.id } });
  if (senderCount === 0) {
    await prisma.senderProfile.create({
      data: {
        userId: user.id,
        name: "Demo Sender",
        address1: "1, Sec.1, Demo Rd., Demo Dist.",
        city: "Taipei",
        postal: "100000",
        country: "TW",
        phone: "0900000000",
      },
    });
    console.log("已建立寄件人: Demo Sender");
  } else {
    console.log(`已有 ${senderCount} 筆寄件人，略過`);
  }
  console.log("seed 完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
