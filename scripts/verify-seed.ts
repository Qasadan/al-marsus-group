import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const admin = await db.user.findUnique({ where: { email: "almarsus.ltd@gmail.com" } });
console.log("admin found:", admin ? `yes (role=${admin.role}, active=${admin.isActive}, name=${admin.name})` : "NO");
console.log("total users:", await db.user.count());
const s = await db.companySettings.findUnique({ where: { id: "main" } });
console.log("settings row:", s ? `companyName="${s.companyName}", currency=${s.currency}, heroTitle set=${!!s.heroTitle}` : "MISSING");
console.log("gallery items:", await db.galleryItem.count());
await db.$disconnect();
