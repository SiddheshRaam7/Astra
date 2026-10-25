import { describe, expect, it } from 'vitest';
import { seedState } from '../src/lib/seed';
import { applyAction, deduplicate, transactionSchema, stateSchema } from '../src/lib/model';
import {
  detectSubscriptions,
  financialSummary,
  goalMetrics,
  projectBalances,
} from '../src/lib/finance';
const state = () => seedState('2026-10-24');
describe('deterministic financial calculations', () => {
  it('preserves distinct provider charges even if merchant, date and amount match', () => {
    const t = state().transactions[0];
    expect(
      deduplicate(
        [{ ...t, externalId: 'charge-a' }],
        [{ ...t, id: 'other', externalId: 'charge-b' }],
      ),
    ).toHaveLength(2);
  });
  it('balances the complete seeded monthly allocation', () => {
    const m = financialSummary(state());
    expect(m.income).toBe(420000);
    expect(m.essentials).toBe(200000);
    expect(m.goals).toBe(60000);
    expect(m.guiltFree).toBe(100000);
    expect(m.spent).toBe(43000);
    expect(m.remaining).toBe(57000);
    expect(m.safeToday).toBe(57000);
    expect(m.income).toBe(
      m.essentials + m.goals + state().investments + state().emergencyContribution + m.guiltFree,
    );
  });
  it('subtracts required debt as well as all savings allocations', () => {
    const s = state();
    s.debtPayment = 15000;
    expect(financialSummary(s).guiltFree).toBe(85000);
  });
  it('does not mistake a salary increase for cash deposited today', () => {
    const s = state();
    s.balance = 180000;
    const before = financialSummary(s);
    const after = financialSummary(
      applyAction(s, { type: 'income', id: 'salary', amount: 430000 }),
    );
    expect(after.guiltFree - before.guiltFree).toBe(50000);
    expect(after.safeToday).toBe(before.safeToday);
  });
  it('reserves pending charges, bills through payday and the cash buffer', () => {
    const s = state();
    s.balance = 180000;
    const m = financialSummary(s);
    expect(m.reserved).toBe(120000);
    expect(m.pending).toBe(3400);
    expect(m.safeToday).toBe(6600);
  });
  it('never borrows emergency reserves for spending', () => {
    const s = state();
    s.balance = 10000;
    s.emergencySaved = 90000000;
    expect(financialSummary(s).safeToday).toBe(0);
  });
  it('handles negative monthly room with a zero safe estimate', () => {
    const s = state();
    s.income[0].amount = 100000;
    const m = financialSummary(s);
    expect(m.remaining).toBeLessThan(0);
    expect(m.safeToday).toBe(0);
    expect(m.speed).toBe('At Risk');
  });
  it('updates spending pace dynamically', () => {
    const s = state();
    expect(financialSummary(s).speed).toBe('Comfortable');
    s.transactions.push({ ...s.transactions[0], id: 'big-purchase', date: s.asOf, amount: 65000 });
    expect(financialSummary(s).speed).toBe('At Risk');
  });
  it('calculates emergency coverage and target', () => {
    const m = financialSummary(state());
    expect(m.emergencyRunway).toBe(3.2);
    expect(m.emergencyTarget).toBe(1200000);
  });
  it('calculates goal savings, deadlines, and completion', () => {
    const g = state().goals[0];
    const m = goalMetrics(g, '2026-10-24');
    expect(m.remaining).toBe(105000);
    expect(m.required).toBe(Math.ceil(105000 / m.months));
    expect(m.percent).toBeCloseTo(41.666666);
    expect(goalMetrics({ ...g, deadline: '2026-01-01' }, '2026-10-24').onTrack).toBe(false);
    expect(goalMetrics({ ...g, saved: g.target }, '2026-10-24').required).toBe(0);
  });
  it('reallocates goal contributions atomically without changing cash', () => {
    const s = state();
    const after = applyAction(s, { type: 'goal', goal: { ...s.goals[0], contribution: 50000 } });
    expect(financialSummary(after).remaining).toBe(37000);
    expect(after.balance).toBe(s.balance);
    expect(s.goals[0].contribution).toBe(30000);
  });
  it('projects purchases and delayed purchases without mutations', () => {
    const s = state();
    const original = JSON.stringify(s);
    const opts = {
      purchase: 70000,
      monthlyIncomeChange: 0,
      monthlySavingsChange: 0,
      monthlySubscriptionSavings: 0,
      delay: false,
    };
    const now = projectBalances(s, opts);
    const later = projectBalances(s, { ...opts, delay: true });
    expect(now.points[0].alternative).toBe(s.balance - 3400 - 70000);
    expect(later.points[0].alternative).toBe(s.balance - 3400);
    expect(now.points).toHaveLength(91);
    expect(JSON.stringify(s)).toBe(original);
  });
  it('includes recurring debt obligations in balance projections', () => {
    const s = state();
    const opts = {
      purchase: 0,
      monthlyIncomeChange: 0,
      monthlySavingsChange: 0,
      monthlySubscriptionSavings: 0,
      delay: false,
    };
    const before = projectBalances(s, opts);
    s.debtPayment = 30000;
    const after = projectBalances(s, opts);
    expect(after.points.find((p) => p.date === '2026-11-01')!.baseline).toBeLessThan(
      before.points.find((p) => p.date === '2026-11-01')!.baseline,
    );
  });
  it('detects recurrence, increases and reviewed savings without assuming disuse', () => {
    const subs = detectSubscriptions(state());
    expect(subs).toHaveLength(5);
    expect(subs.find((s) => s.merchant === 'Netflix')!.increase).toBe(250);
    expect(subs.find((s) => s.merchant === 'Netflix')!.decision).toBe('review');
    expect(subs.filter((s) => s.decision === 'unnecessary').reduce((n, s) => n + s.amount, 0)).toBe(
      3598,
    );
  });
  it('excludes false-positive recurring merchants', () => {
    const s = state();
    s.subscriptionDecisions.netflix = 'exclude';
    expect(detectSubscriptions(s).some((s) => s.merchant === 'Netflix')).toBe(false);
  });
  it('deduplicates by external id and normalized row without losing legitimate other amounts', () => {
    const t = state().transactions[0];
    expect(deduplicate([t], [{ ...t, id: 'new' }])).toHaveLength(1);
    expect(
      deduplicate(
        [{ ...t, externalId: 'abc' }],
        [{ ...t, id: 'new', amount: 999, externalId: 'abc' }],
      ),
    ).toHaveLength(1);
    expect(deduplicate([t], [{ ...t, id: 'new', amount: t.amount + 1 }])).toHaveLength(2);
  });
  it('rejects invalid cents, impossible dates, and unauthorized action keys', () => {
    expect(() => transactionSchema.parse({ ...state().transactions[0], amount: 1.5 })).toThrow();
    expect(() =>
      transactionSchema.parse({ ...state().transactions[0], date: '2026-02-30' }),
    ).toThrow();
    expect(() => applyAction(state(), { type: 'allocation', key: 'userId', amount: 1 })).toThrow();
    expect(() => stateSchema.parse({ ...state(), balance: -1 })).toThrow();
  });
});
