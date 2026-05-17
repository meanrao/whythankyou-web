import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const wishlists = pgTable('wishlists', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  person: text('person').notNull(),
  occasion: text('occasion').notNull(),
  date: text('date').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
