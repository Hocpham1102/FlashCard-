import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!globalForPrisma.prisma) {
  prisma
    .$connect()
    .then(() => {
      console.log("✅ Successfully connected to Supabase database");
    })
    .catch((error: unknown) => {
      console.error("❌ Failed to connect to Supabase database:", error);
    });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
