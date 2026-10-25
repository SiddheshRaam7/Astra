import { describe, expect, it } from 'vitest';
import { financialSummary } from '../src/lib/finance';
import { seedState } from '../src/lib/seed';
import { type Transaction } from '../src/lib/model';
import {
  checkingBalanceCents,
  mergeCheckingTransactions,
  PLAID_CHECKING_SCOPE,
  usdCheckingAccounts,
} from '../src/lib/server/plaid-sync';

const account = (id: string, subtype: string, current: number | null, currency = 'USD') => ({
  account_id: id,
  name: id,
  type: 'depository',
  subtype,
  balances: { iso_currency_code: currency, current, available: current },
});

describe('Plaid checking-only sync', () => {
  it('excludes savings and non-USD deposits from spendable balance and transaction scope', () => {
    const accounts = [
      account('checking', 'checking', 1800),
      account('savings', 'savings', 9000),
      account('foreign', 'checking', 5000, 'CAD'),
    ];
    const checking = usdCheckingAccounts(accounts);
    expect(checking.map((item) => item.account_id)).toEqual(['checking']);
    expect(checkingBalanceCents(checking)).toBe(180000);
    const state = seedState('2026-10-24');
    state.balance = checkingBalanceCents(checking);
    expect(financialSummary(state).safeToday).toBe(6600);
  });

  it('does not invent a zero balance when Plaid returns no usable balance', () => {
    const checking = account('checking', 'checking', null);
    expect(() => checkingBalanceCents([checking])).toThrow('no usable USD balance');
  });

  it('falls back to available when current is null', () => {
    const checking = account('checking', 'checking', null);
    checking.balances.available = 1400;
    expect(checkingBalanceCents([checking])).toBe(140000);
  });

  it('removes legacy savings transactions on the first checking-only resync', () => {
    const seed = seedState('2026-10-24');
    const sample = seed.transactions[0];
    const oldSavings: Transaction = {
      ...sample,
      id: 'plaid:savings',
      externalId: 'savings',
      source: 'plaid',
    };
    const oldChecking: Transaction = {
      ...sample,
      id: 'plaid:checking',
      externalId: 'checking',
      source: 'plaid',
    };
    const newChecking: Transaction = {
      ...sample,
      id: 'plaid:new',
      externalId: 'new',
      source: 'plaid',
    };
    const manual: Transaction = { ...sample, id: 'manual:1', source: 'manual' };
    const result = mergeCheckingTransactions(
      [sample, oldSavings, oldChecking, manual],
      [newChecking],
      new Set(),
      true,
    );
    expect(result.map((t) => t.id)).toEqual(['manual:1', 'plaid:new']);
  });

  it('retains existing checking history during later incremental syncs', () => {
    const sample = seedState('2026-10-24').transactions[0];
    const oldChecking: Transaction = {
      ...sample,
      id: 'plaid:old',
      externalId: 'old',
      source: 'plaid',
    };
    const newChecking: Transaction = {
      ...sample,
      id: 'plaid:new',
      externalId: 'new',
      source: 'plaid',
    };
    const result = mergeCheckingTransactions([oldChecking], [newChecking], new Set(), false);
    expect(result.map((t) => t.id)).toEqual(['plaid:old', 'plaid:new']);
  });

  it('uses an explicit scope marker so legacy data is rebuilt only once', () => {
    const state = seedState('2026-10-24');
    expect(state.bank.plaidScope).toBeUndefined();
    state.bank.plaidScope = PLAID_CHECKING_SCOPE;
    expect(state.bank.plaidScope).toBe('checking-only-v1');
  });
});
