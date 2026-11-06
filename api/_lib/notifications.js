import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

export function notificationDto(row) {
  return {
    id: row.id,
    timelineId: row.timelineId || '',
    kind: row.kind,
    itemKey: row.itemKey || '',
    payload: row.payload || {},
    readAt: row.readAt || null,
    createdAt: row.createdAt,
  };
}

export async function createNotification(
  db,
  schema,
  { ownerId, timelineId = null, kind, itemKey = null, dedupeKey, payload = {}, reopen = false },
) {
  const now = new Date();
  const update = { timelineId, kind, itemKey, payload, updatedAt: now };
  if (reopen) {
    update.readAt = null;
    update.createdAt = now;
  }
  const [saved] = await db
    .insert(schema.notifications)
    .values({ ownerId, timelineId, kind, itemKey, dedupeKey, payload })
    .onConflictDoUpdate({
      target: [schema.notifications.ownerId, schema.notifications.dedupeKey],
      set: update,
    })
    .returning();
  return saved ? notificationDto(saved) : null;
}

export async function resolveNotifications(db, schema, { ownerId, timelineId, kind }) {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.notifications.ownerId, ownerId),
        eq(schema.notifications.timelineId, timelineId),
        eq(schema.notifications.kind, kind),
        isNull(schema.notifications.readAt),
      ),
    );
}

export async function reconcileOverdueNotifications(db, schema, ownerId, weddings) {
  const overdue = weddings.filter(
    (wedding) => wedding.nextActionTiming === 'overdue' && wedding.nextActionKey && wedding.nextActionDate,
  );
  const activeKeys = new Set(
    overdue.map(
      (wedding) =>
        `task.overdue:${wedding.id}:${wedding.nextActionKey}:${String(wedding.nextActionDate).slice(0, 10)}`,
    ),
  );
  await Promise.all(
    overdue.map((wedding) =>
      createNotification(db, schema, {
        ownerId,
        timelineId: wedding.id,
        kind: 'task.overdue',
        itemKey: wedding.nextActionKey,
        dedupeKey: `task.overdue:${wedding.id}:${wedding.nextActionKey}:${String(
          wedding.nextActionDate,
        ).slice(0, 10)}`,
        payload: {
          couple: wedding.couple,
          taskKey: wedding.nextActionKey,
          dueDate: wedding.nextActionDate,
          targetTab: 'journey',
        },
      }),
    ),
  );

  const openOverdue = await db
    .select({ id: schema.notifications.id, dedupeKey: schema.notifications.dedupeKey })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.ownerId, ownerId),
        eq(schema.notifications.kind, 'task.overdue'),
        isNull(schema.notifications.readAt),
      ),
    );
  const staleIds = openOverdue.filter((item) => !activeKeys.has(item.dedupeKey)).map((item) => item.id);
  if (staleIds.length) {
    await db
      .update(schema.notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.notifications.ownerId, ownerId), inArray(schema.notifications.id, staleIds)));
  }
}

export async function listNotifications(db, schema, ownerId, limit = 40) {
  const [rows, [unread]] = await Promise.all([
    db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.ownerId, ownerId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(Math.max(1, Math.min(100, limit))),
    db
      .select({ count: sql`count(*)::int` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.ownerId, ownerId), isNull(schema.notifications.readAt))),
  ]);
  return {
    notifications: rows.map(notificationDto),
    unreadCount: Number(unread?.count) || 0,
  };
}
