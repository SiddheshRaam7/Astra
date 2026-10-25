import { z } from 'zod';

export const money = z.number().int().min(0).max(1_000_000_000);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Use a valid calendar date',
  );
export const goalSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  target: money.refine((v) => v > 0),
  saved: money,
  deadline: date,
  priority: z.enum(['High', 'Medium', 'Low']),
  contribution: money,
});
export const transactionSchema = z.object({
  id: z.string().min(1).max(150),
  merchant: z.string().trim().min(1).max(120),
  amount: money,
  date,
  category: z.enum([
    'Housing',
    'Food',
    'Transport',
    'Utilities',
    'Health',
    'Shopping',
    'Dining',
    'Entertainment',
    'Income',
    'Other',
  ]),
  kind: z.enum(['essential', 'discretionary', 'income']),
  pending: z.boolean(),
  source: z.enum(['demo', 'manual', 'csv', 'plaid', 'document']),
  externalId: z.string().max(150).optional(),
});
export const stateSchema = z.object({
  version: z.number().int().nonnegative(),
  asOf: date,
  name: z.string().trim().min(1).max(60),
  balance: money,
  buffer: money,
  emergencySaved: money,
  emergencyMonths: z.number().int().min(1).max(24),
  investments: money,
  emergencyContribution: money,
  debtPayment: money,
  income: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().min(1).max(60),
        amount: money,
        payday: z.number().int().min(1).max(28),
      }),
    )
    .max(20),
  essentials: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().min(1).max(60),
        amount: money,
        dueDay: z.number().int().min(1).max(28),
      }),
    )
    .max(40),
  goals: z.array(goalSchema).max(100),
  transactions: z.array(transactionSchema).max(10000),
  subscriptionDecisions: z.record(
    z.string(),
    z.enum(['review', 'necessary', 'unnecessary', 'exclude']),
  ),
  bank: z.object({
    connected: z.boolean(),
    syncedAt: z.string().nullable(),
    accountName: z.string().max(100),
    balanceAsOf: z.string().nullable(),
    plaidScope: z.literal('checking-only-v1').optional(),
  }),
});
export type FinancialState = z.infer<typeof stateSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type SubscriptionDecision = FinancialState['subscriptionDecisions'][string];
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('incomeSource'), item: stateSchema.shape.income.element }),
  z.object({ type: z.literal('essentialItem'), item: stateSchema.shape.essentials.element }),
  z.object({
    type: z.literal('removeItem'),
    kind: z.enum(['income', 'essentials']),
    id: z.string(),
  }),
  z.object({ type: z.literal('income'), id: z.string(), amount: money }),
  z.object({ type: z.literal('essential'), id: z.string(), amount: money }),
  z.object({
    type: z.literal('allocation'),
    key: z.enum([
      'investments',
      'emergencyContribution',
      'debtPayment',
      'buffer',
      'emergencySaved',
      'balance',
    ]),
    amount: money,
  }),
  z.object({ type: z.literal('goal'), goal: goalSchema }),
  z.object({ type: z.literal('deleteGoal'), id: z.string() }),
  z.object({
    type: z.literal('subscription'),
    merchant: z.string().max(120),
    decision: z.enum(['review', 'necessary', 'unnecessary', 'exclude']),
  }),
  z.object({
    type: z.literal('import'),
    transactions: z.array(transactionSchema).min(1).max(1000),
  }),
  z.object({
    type: z.literal('settings'),
    name: z.string().trim().min(1).max(60),
    emergencyMonths: z.number().int().min(1).max(24),
  }),
]);
export type Action = z.infer<typeof actionSchema>;

export function isoDate(d?: Date) {
  return d
    ? d.toISOString().slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
}
export function monthKey(d: string) {
  return d.slice(0, 7);
}
export function currency(cents: number, decimals = false) {
  const precision = decimals || cents % 100 !== 0 ? 2 : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(cents / 100);
}
export function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
export function merchantKey(merchant: string) {
  return merchant
    .toLowerCase()
    .replace(/\b(inc|llc|com|payment|purchase)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 100);
}

export function deduplicate(existing: Transaction[], incoming: Transaction[]) {
  const ids = new Set(existing.map((t) => t.id));
  const external = new Set(existing.filter((t) => t.externalId).map((t) => t.externalId));
  const fingerprints = new Set(
    existing.map((t) => `${t.date}|${merchantKey(t.merchant)}|${t.amount}|${t.kind}`),
  );
  const result = [...existing];
  for (const t of incoming) {
    const key = `${t.date}|${merchantKey(t.merchant)}|${t.amount}|${t.kind}`;
    if (
      ids.has(t.id) ||
      (t.externalId && external.has(t.externalId)) ||
      (!t.externalId && fingerprints.has(key))
    )
      continue;
    result.push(t);
    ids.add(t.id);
    if (t.externalId) external.add(t.externalId);
    fingerprints.add(key);
  }
  return result;
}

export function applyAction(state: FinancialState, input: unknown): FinancialState {
  const a = actionSchema.parse(input);
  const s = structuredClone(state);
  if (a.type === 'incomeSource') {
    const i = s.income.findIndex((x) => x.id === a.item.id);
    if (i < 0) s.income.push(a.item);
    else s.income[i] = a.item;
  } else if (a.type === 'essentialItem') {
    const i = s.essentials.findIndex((x) => x.id === a.item.id);
    if (i < 0) s.essentials.push(a.item);
    else s.essentials[i] = a.item;
  } else if (a.type === 'removeItem') {
    if (a.kind === 'income') s.income = s.income.filter((x) => x.id !== a.id);
    else s.essentials = s.essentials.filter((x) => x.id !== a.id);
  } else if (a.type === 'income' || a.type === 'essential') {
    const row = (a.type === 'income' ? s.income : s.essentials).find((x) => x.id === a.id);
    if (!row) throw new Error('Financial item not found');
    row.amount = a.amount;
  } else if (a.type === 'allocation') s[a.key] = a.amount;
  else if (a.type === 'goal') {
    const i = s.goals.findIndex((g) => g.id === a.goal.id);
    if (i < 0) s.goals.push(a.goal);
    else s.goals[i] = a.goal;
  } else if (a.type === 'deleteGoal') s.goals = s.goals.filter((g) => g.id !== a.id);
  else if (a.type === 'subscription') s.subscriptionDecisions[a.merchant] = a.decision;
  else if (a.type === 'settings') {
    s.name = a.name;
    s.emergencyMonths = a.emergencyMonths;
  } else if (a.type === 'import') s.transactions = deduplicate(s.transactions, a.transactions);
  s.version += 1;
  return stateSchema.parse(s);
}
