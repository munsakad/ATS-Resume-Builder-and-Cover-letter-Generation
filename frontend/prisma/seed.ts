import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Student123!", 10);
  await prisma.user.upsert({
    where: { email: "sam@resumeai.dev" },
    update: {},
    create: { name: "Sam Lee", email: "sam@resumeai.dev", passwordHash: hash },
  });

  console.log("Seeded:");
  console.log("  User -> sam@resumeai.dev / Student123!");
  console.log("");
  console.log("No sample resumes were seeded — add one from the app,");
  console.log("then score it once both the frontend and Python backend");
  console.log("are running with a real GEMINI_API_KEY set.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
