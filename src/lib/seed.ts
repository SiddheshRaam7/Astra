import { FinancialState, isoDate, Transaction } from './model';

export function seedState(asOf = isoDate()): FinancialState {
  const now = new Date(`${asOf}T12:00:00Z`),
    year = now.getUTCFullYear(),
    month = now.getUTCMonth();
  const tx: Transaction[] = [];
  const add = (
    id: string,
    merchant: string,
    amount: number,
    day: number,
    category: Transaction['category'],
    kind: Transaction['kind'],
    offset = 0,
    pending = false,
  ) => {
    const d = new Date(Date.UTC(year, month + offset, Math.min(day, now.getUTCDate())));
    tx.push({ id, merchant, amount, date: isoDate(d), category, kind, pending, source: 'demo' });
  };
  for (let i = -2; i <= 0; i++) {
    add(`spotify${i}`, 'Spotify Premium', 1199, 5, 'Entertainment', 'discretionary', i);
    add(`netflix${i}`, 'Netflix', i === 0 ? 1799 : 1549, 8, 'Entertainment', 'discretionary', i);
    add(`adobe${i}`, 'Adobe Creative Cloud', 2299, 12, 'Shopping', 'discretionary', i);
    add(`icloud${i}`, 'Apple iCloud+', 299, 15, 'Other', 'discretionary', i);
    add(`hulu${i}`, 'Hulu', 1299, 18, 'Entertainment', 'discretionary', i);
  }
  add('coffee', 'Juniper Coffee', 1850, 20, 'Dining', 'discretionary');
  add('dinner', 'Little Italy', 6400, 21, 'Dining', 'discretionary');
  add('target', 'Target', 8455, 22, 'Shopping', 'discretionary');
  add('weekend', 'Weekend with friends', 19400, 23, 'Entertainment', 'discretionary');
  // Current-month discretionary total = $430 exactly.
  add('pending', 'Local Market · pending', 3400, 24, 'Food', 'essential', 0, true);
  add('rent', 'Oakwood Apartments', 120000, 1, 'Housing', 'essential');
  add('groceries', 'Trader Joe’s', 36000, 10, 'Food', 'essential');
  add('utilities', 'Utilities & transport', 44000, 16, 'Utilities', 'essential');
  add('salary', 'Acme Studio · payroll', 380000, 1, 'Income', 'income');
  add('freelance', 'Freelance design', 40000, 15, 'Income', 'income');
  const deadline = (months: number) => isoDate(new Date(Date.UTC(year, month + months, 28)));
  return {
    version: 0,
    asOf,
    name: 'Alex',
    balance: 284650,
    buffer: 50000,
    emergencySaved: 640000,
    emergencyMonths: 6,
    investments: 35000,
    emergencyContribution: 25000,
    debtPayment: 0,
    income: [
      { id: 'salary', name: 'Salary', amount: 380000, payday: 1 },
      { id: 'side', name: 'Side income', amount: 40000, payday: 15 },
    ],
    essentials: [
      { id: 'rent', name: 'Rent & housing', amount: 120000, dueDay: 1 },
      { id: 'food', name: 'Food & groceries', amount: 36000, dueDay: 7 },
      { id: 'other', name: 'Other essentials', amount: 44000, dueDay: 12 },
    ],
    goals: [
      {
        id: 'nyc',
        name: 'New York, here I come',
        target: 180000,
        saved: 75000,
        deadline: deadline(6),
        priority: 'High',
        contribution: 30000,
      },
      {
        id: 'laptop',
        name: 'A little creative upgrade',
        target: 240000,
        saved: 96000,
        deadline: deadline(10),
        priority: 'Medium',
        contribution: 15000,
      },
      {
        id: 'freedom',
        name: 'Future freedom fund',
        target: 500000,
        saved: 120000,
        deadline: deadline(24),
        priority: 'Low',
        contribution: 15000,
      },
    ],
    transactions: tx,
    subscriptionDecisions: {
      adobecreativecloud: 'unnecessary',
      hulu: 'unnecessary',
      spotifypremium: 'necessary',
      appleicloud: 'necessary',
    },
    bank: { connected: false, syncedAt: null, accountName: 'Demo checking', balanceAsOf: asOf },
  };
}
