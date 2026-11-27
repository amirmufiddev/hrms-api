import { PrismaClient } from '@prisma/client';
import { hashLocalPassword, usersMissingPassword } from '../src/modules/auth/local-password-bootstrap';

async function main() {
  const password = process.env.LOCAL_BOOTSTRAP_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error('LOCAL_BOOTSTRAP_PASSWORD is required (min 6 chars)');
  }

  const prisma = new PrismaClient();
  try {
    const active = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, passwordHash: true },
    });
    const missing = usersMissingPassword(active);
    const passwordHash = await hashLocalPassword(password);
    for (const user of missing) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }
    console.log(`Updated ${missing.length} user(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});