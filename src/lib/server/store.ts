import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import { profiles, snapshots, actionLogs } from './schema';
import { FinancialState, isoDate, stateSchema, transactionSchema } from '../model';
import { detectSubscriptions } from '../finance';
import { seedState } from '../seed';

let database: ReturnType<typeof drizzle> | undefined;
export function db() {
  if (!process.env.DATABASE_URL) return null;
  return (database ??= drizzle(
    postgres(process.env.DATABASE_URL, { max: 5, ssl: 'require', prepare: false }),
  ));
}
const locks = new Map<string, Promise<unknown>>();
const dataDirectory = path.join(process.cwd(), '.data');
function fileFor(userId: string) {
  return path.join(dataDirectory, `${createHash('sha256').update(userId).digest('hex')}.json`);
}
function assertLocalDemo(userId: string) {
  if (!userId.startsWith('demo:'))
    throw new Error('Configure DATABASE_URL for authenticated financial data.');
  if (process.env.VERCEL) throw new Error('Durable demo storage on Vercel requires DATABASE_URL.');
}
async function localRead(userId: string) {
  assertLocalDemo(userId);
  try {
    return stateSchema.parse(JSON.parse(await readFile(fileFor(userId), 'utf8')));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    const state = seedState();
    await localWrite(userId, state);
    return state;
  }
}
async function localWrite(userId: string, state: FinancialState) {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const target = fileFor(userId),
    temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, target);
}
export async function readState(userId: string): Promise<FinancialState> {
  const database = db();
  if (!database) {
    const s = await localRead(userId);
    return { ...s, asOf: isoDate() };
  }
  const [row] = await database.select().from(snapshots).where(eq(snapshots.userId, userId));
  if (row) return { ...stateSchema.parse(row.data), asOf: isoDate() };
  const initial = userId.startsWith('demo:')
    ? seedState()
    : {
        ...seedState(),
        name: 'Member',
        balance: 0,
        emergencySaved: 0,
        income: [],
        essentials: [],
        goals: [],
        transactions: [],
        investments: 0,
        emergencyContribution: 0,
        bank: {
          connected: false,
          syncedAt: null,
          accountName: 'Manual account',
          balanceAsOf: null,
        },
      };
  await database.insert(profiles).values({ userId, name: initial.name }).onConflictDoNothing();
  await database
    .insert(snapshots)
    .values({ userId, version: 0, data: initial })
    .onConflictDoNothing();
  return stateSchema.parse(
    (await database.select().from(snapshots).where(eq(snapshots.userId, userId)))[0].data,
  );
}
export async function mutateState(
  userId: string,
  version: number,
  change: (s: FinancialState) => FinancialState,
  audit?: unknown,
) {
  const previous = locks.get(userId) ?? Promise.resolve();
  const operation = previous
    .catch(() => {})
    .then(async () => {
      const database = db();
      if (database) {
        await readState(userId);
        return database.transaction(async (tx) => {
          const [row] = await tx
            .select()
            .from(snapshots)
            .where(eq(snapshots.userId, userId))
            .for('update');
          if (!row || row.version !== version)
            throw new Error('Conflict: finances changed. Refresh and try again.');
          const next = stateSchema.parse(
            change({ ...stateSchema.parse(row.data), asOf: isoDate() }),
          );
          await tx
            .update(snapshots)
            .set({ data: next, version: next.version, updatedAt: new Date() })
            .where(eq(snapshots.userId, userId));
          await tx.update(profiles).set({ name: next.name }).where(eq(profiles.userId, userId));
          // Mirrors feed SQL analytics; the snapshot is the atomic canonical state.
          for (const [table, rows] of [
            ['income_sources', next.income],
            ['goals', next.goals],
            ['transactions', next.transactions],
            [
              'expense_categories',
              transactionSchema.shape.category.options.map((name) => ({ id: name, name })),
            ],
            ['recurring_payments', detectSubscriptions(next).map((s) => ({ id: s.key, ...s }))],
            ['budgets', next.essentials],
            ['financial_accounts', [{ id: 'checking', balance: next.balance, ...next.bank }]],
            [
              'emergency_funds',
              [
                {
                  id: 'emergency',
                  saved: next.emergencySaved,
                  months: next.emergencyMonths,
                  contribution: next.emergencyContribution,
                },
              ],
            ],
          ] as const) {
            await tx.execute(sql`delete from ${sql.identifier(table)} where user_id = ${userId}`);
            for (const row of rows)
              await tx.execute(
                sql`insert into ${sql.identifier(table)} (user_id, id, data) values (${userId}, ${row.id}, ${JSON.stringify(row)}::jsonb)`,
              );
          }
          if (audit) await tx.insert(actionLogs).values({ id: randomUUID(), userId, data: audit });
          return next;
        });
      }
      const current = await localRead(userId);
      if (current.version !== version)
        throw new Error('Conflict: finances changed. Refresh and try again.');
      const next = stateSchema.parse(change({ ...current, asOf: isoDate() }));
      await localWrite(userId, next);
      return next;
    });
  locks.set(userId, operation);
  try {
    return await operation;
  } finally {
    if (locks.get(userId) === operation) locks.delete(userId);
  }
}
