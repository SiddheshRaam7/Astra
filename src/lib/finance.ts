import { currency, FinancialState, Goal, merchantKey, monthKey, sum, Transaction } from './model';

export function goalMetrics(goal: Goal, asOf: string) {
  const now = new Date(`${asOf}T12:00:00Z`),
    end = new Date(`${goal.deadline}T12:00:00Z`);
  const months = Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)),
  );
  const remaining = Math.max(0, goal.target - goal.saved);
  return {
    months,
    remaining,
    required: remaining === 0 ? 0 : months ? Math.ceil(remaining / months) : remaining,
    percent: Math.min(100, (goal.saved / goal.target) * 100),
    onTrack: remaining === 0 || (months > 0 && goal.contribution * months >= remaining),
  };
}

export function financialSummary(s: FinancialState) {
  const income = sum(s.income.map((i) => i.amount)),
    essentials = sum(s.essentials.map((i) => i.amount));
  const goals = sum(s.goals.map((g) => g.contribution));
  const guiltFree =
    income - essentials - s.debtPayment - goals - s.investments - s.emergencyContribution;
  const current = s.transactions.filter(
    (t) => monthKey(t.date) === monthKey(s.asOf) && t.date <= s.asOf,
  );
  const spent = sum(current.filter((t) => t.kind === 'discretionary').map((t) => t.amount));
  const pending = sum(
    s.transactions.filter((t) => t.pending && t.kind !== 'income').map((t) => t.amount),
  );
  const remaining = guiltFree - spent;
  const now = new Date(`${s.asOf}T12:00:00Z`),
    day = now.getUTCDate(),
    days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const nextPayday = nextIncomeDate(s);
  // Preserve liquidity until the next expected income. Bills on payday are reserved
  // before income, because settlement order is not guaranteed.
  const upcoming = upcomingBills(s, 35).filter((b) => b.date <= nextPayday);
  const reserved = sum(upcoming.map((b) => b.amount));
  const available = Math.max(0, s.balance - pending - reserved - s.buffer);
  const safeToday = Math.max(0, Math.min(remaining, available));
  const pace = guiltFree > 0 ? spent / guiltFree / (day / days) : spent > 0 ? 2 : 0;
  const speed =
    remaining < 0 || available === 0 || pace > 1.3
      ? 'At Risk'
      : pace > 1.05
        ? 'Caution'
        : pace > 0.8
          ? 'On Track'
          : 'Comfortable';
  const emergencyTarget = essentials * s.emergencyMonths;
  return {
    income,
    essentials,
    goals,
    guiltFree,
    spent,
    remaining,
    pending,
    reserved,
    available,
    safeToday,
    pace,
    speed,
    day,
    days,
    nextPayday,
    upcoming,
    emergencyTarget,
    emergencyRunway: essentials ? s.emergencySaved / essentials : 0,
    emergencyPercent: emergencyTarget
      ? Math.min(100, (s.emergencySaved / emergencyTarget) * 100)
      : 100,
    totalExpenses: sum(current.filter((t) => t.kind !== 'income').map((t) => t.amount)),
    expectedSpend: Math.round((guiltFree * day) / days),
  };
}

export function nextIncomeDate(s: FinancialState) {
  const now = new Date(`${s.asOf}T12:00:00Z`);
  return (
    s.income
      .filter((i) => i.amount > 0)
      .map((i) => {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), i.payday));
        if (d.toISOString().slice(0, 10) <= s.asOf) d.setUTCMonth(d.getUTCMonth() + 1);
        return d.toISOString().slice(0, 10);
      })
      .sort()[0] ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()))
      .toISOString()
      .slice(0, 10)
  );
}

export function upcomingBills(s: FinancialState, horizon: number) {
  const now = new Date(`${s.asOf}T12:00:00Z`);
  const bills: { id: string; name: string; amount: number; date: string }[] = [];
  for (let offset = 0; offset <= horizon; offset++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    const date = d.toISOString().slice(0, 10);
    for (const b of s.essentials) if (d.getUTCDate() === b.dueDay) bills.push({ ...b, date });
    if (d.getUTCDate() === 1 && s.debtPayment)
      bills.push({ id: 'debt', name: 'Debt payment', amount: s.debtPayment, date });
  }
  return bills;
}

export type Scenario = {
  purchase: number;
  monthlyIncomeChange: number;
  monthlySavingsChange: number;
  monthlySubscriptionSavings: number;
  delay: boolean;
  months?: number;
};
export function projectBalances(s: FinancialState, scenario: Scenario) {
  const summary = financialSummary(s);
  const days = (scenario.months ?? 3) * 30;
  const now = new Date(`${s.asOf}T12:00:00Z`),
    payday = nextIncomeDate(s);
  let baseline = s.balance - summary.pending,
    alternative = baseline;
  const bills = upcomingBills(s, days);
  const points: { date: string; label: string; baseline: number; alternative: number }[] = [];
  let min = alternative,
    shortfall: string | null = null;
  for (let offset = 0; offset <= days; offset++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    const date = d.toISOString().slice(0, 10);
    const income =
      offset === 0
        ? 0
        : sum(s.income.filter((i) => i.payday === d.getUTCDate()).map((i) => i.amount));
    const obligations = sum(bills.filter((b) => b.date === date).map((b) => b.amount));
    // Record the conservative intraday low before an expected deposit clears.
    const low = alternative - obligations;
    if (low < s.buffer && !shortfall) shortfall = date;
    min = Math.min(min, low);
    const allocations =
      offset > 0 && d.getUTCDate() === 1
        ? summary.goals + s.investments + s.emergencyContribution
        : 0;
    const discretionary = offset > 0 ? Math.max(0, Math.round(summary.guiltFree / 30.4375)) : 0;
    baseline += income - obligations - allocations - discretionary;
    alternative += income - obligations - allocations - discretionary;
    if (offset > 0 && d.getUTCDate() === s.income[0]?.payday)
      alternative += scenario.monthlyIncomeChange;
    if (offset > 0 && d.getUTCDate() === 1)
      alternative += scenario.monthlySubscriptionSavings - scenario.monthlySavingsChange;
    if ((!scenario.delay && offset === 0) || (scenario.delay && date === payday))
      alternative -= scenario.purchase;
    min = Math.min(min, alternative);
    if (alternative < s.buffer && !shortfall) shortfall = date;
    points.push({
      date,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      baseline,
      alternative,
    });
  }
  return {
    points,
    min,
    shortfall,
    end: alternative,
    baselineEnd: baseline,
    safe: min >= s.buffer,
    assumptions:
      'Expected income arrives on scheduled dates; essential bills and allocations repeat monthly; discretionary spending continues at the planned daily average. Bills settle before same-day income. Emergency reserves are excluded. No interest, market returns, or unexpected costs assumed.',
  };
}

export function detectSubscriptions(s: FinancialState) {
  const groups = new Map<string, Transaction[]>();
  for (const t of s.transactions)
    if (t.kind !== 'income' && !t.pending) {
      const key = merchantKey(t.merchant);
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
  return [...groups.entries()].flatMap(([key, tx]) => {
    tx.sort((a, b) => a.date.localeCompare(b.date));
    if (tx.length < 2) return [];
    const gaps = tx
      .slice(1)
      .map((t, i) => (Date.parse(t.date) - Date.parse(tx[i].date)) / 86400000);
    const recurring = gaps.some((g) => g >= 25 && g <= 35);
    if (!recurring) return [];
    const last = tx[tx.length - 1],
      previous = tx[tx.length - 2];
    const decision = s.subscriptionDecisions[key] ?? 'review';
    if (decision === 'exclude') return [];
    const similar = [...groups.entries()].some(
      ([otherKey, otherTx]) =>
        otherKey !== key &&
        otherTx.some((t) => t.category === last.category && t.category === 'Entertainment') &&
        otherTx.length >= 2,
    );
    return [
      {
        key,
        merchant: last.merchant,
        amount: last.amount,
        annual: last.amount * 12,
        increase: Math.max(0, last.amount - previous.amount),
        decision,
        possibleOverlap: similar,
        transactions: tx,
        confidence: gaps.filter((g) => g >= 25 && g <= 35).length >= 2 ? 'High' : 'Medium',
        lastDate: last.date,
      },
    ];
  });
}

export function purchaseExplanation(s: FinancialState, amount: number) {
  const m = financialSummary(s);
  const simulation = projectBalances(s, {
    purchase: amount,
    monthlyIncomeChange: 0,
    monthlySavingsChange: 0,
    monthlySubscriptionSavings: 0,
    delay: false,
  });
  return `${currency(amount)} is ${amount <= m.safeToday ? 'within' : 'above'} your ${currency(m.safeToday)} safe-to-spend estimate. You would have ${currency(m.remaining - amount)} of this month’s allowance left. ${simulation.safe ? 'The 90-day projection stays above your cash buffer.' : `The projection crosses your ${currency(s.buffer)} cash buffer${simulation.shortfall ? ` on ${simulation.shortfall}` : ''}. Consider delaying or reducing this purchase.`} Your emergency savings are protected and excluded.`;
}
