import { pgTable, text, integer, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import type { FinancialState } from '../model';
export const profiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
export const snapshots = pgTable('financial_snapshots', {
  userId: text('user_id')
    .primaryKey()
    .references(() => profiles.userId),
  version: integer('version').notNull(),
  data: jsonb('data').$type<FinancialState>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
export const actionLogs = pgTable('ai_action_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => profiles.userId),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
export const plaidItems = pgTable(
  'plaid_items',
  {
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId),
    itemId: text('item_id').notNull(),
    encryptedToken: text('encrypted_token').notNull(),
    cursor: text('cursor'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);
