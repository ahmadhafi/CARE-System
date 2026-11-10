import { createInitialSeed, persistStateToPostgres } from "../src/lib/store";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Seeding CARE System PostgreSQL database...");
  const seed = createInitialSeed();
  await persistStateToPostgres(seed);

  for (const n of seed.notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        userId: n.userId,
        event: n.event,
        title: n.title,
        message: n.message,
        bookingId: n.bookingId ?? null,
        channel: n.channel,
        status: n.status,
        read: n.read,
        sentAt: new Date(n.sentAt),
      },
      update: {},
    });
  }

  for (const a of seed.auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        actorId: a.actorId,
        actorName: a.actorName,
        actorRole: a.actorRole,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        summary: a.summary,
        before: a.before ?? null,
        after: a.after ?? null,
        at: new Date(a.at),
      },
      update: {},
    });
  }

  console.log("CARE System PostgreSQL seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
