import { deduplicate, type Transaction } from '../model';

export const PLAID_CHECKING_SCOPE = 'checking-only-v1' as const;

type BalanceAccount = {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balances: {
    iso_currency_code: string | null;
    current: number | null;
    available: number | null;
  };
};

export function usdCheckingAccounts<T extends BalanceAccount>(accounts: T[]): T[] {
  return accounts.filter(
    (account) =>
      account.type === 'depository' &&
      account.subtype === 'checking' &&
      account.balances.iso_currency_code === 'USD',
  );
}

export function checkingBalanceCents(accounts: BalanceAccount[]): number {
  return accounts.reduce((total, account) => {
    const balance = account.balances.current ?? account.balances.available;
    if (balance === null || !Number.isFinite(balance)) {
      throw new Error('A linked checking account has no usable USD balance; sync was not saved.');
    }
    return total + Math.round(balance * 100);
  }, 0);
}

export function mergeCheckingTransactions(
  existing: Transaction[],
  incoming: Transaction[],
  removedIds: Set<string>,
  rebuildFromChecking: boolean,
): Transaction[] {
  const retained = existing.filter(
    (transaction) =>
      transaction.source !== 'demo' &&
      !(rebuildFromChecking && transaction.source === 'plaid') &&
      !(transaction.externalId && removedIds.has(transaction.externalId)),
  );
  return deduplicate(retained, incoming);
}
