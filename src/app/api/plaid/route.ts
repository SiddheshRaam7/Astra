import { z } from 'zod';
import { CountryCode, Products, type Transaction as PlaidTransaction } from 'plaid';
import { and, eq } from 'drizzle-orm';
import { checkOrigin, identity } from '@/lib/server/auth';
import { db, mutateState, readState } from '@/lib/server/store';
import { plaidItems } from '@/lib/server/schema';
import { decryptToken, encryptToken, plaidClient } from '@/lib/server/plaid';
import { errorResponse } from '@/lib/server/http';
import { deduplicate, isoDate, Transaction } from '@/lib/model';

function convert(t: PlaidTransaction): Transaction {
  const group = t.personal_finance_category?.primary ?? '';
  const income = group === 'INCOME';
  // Transfers/refunds require review; no invented income classification.
  const essential = ['RENT_AND_UTILITIES', 'TRANSPORTATION', 'MEDICAL', 'LOAN_PAYMENTS'].includes(
    group,
  );
  const category: Transaction['category'] = income
    ? 'Income'
    : group === 'RENT_AND_UTILITIES'
      ? 'Housing'
      : group === 'TRANSPORTATION'
        ? 'Transport'
        : group === 'FOOD_AND_DRINK'
          ? 'Dining'
          : group === 'ENTERTAINMENT'
            ? 'Entertainment'
            : 'Other';
  return {
    id: `plaid:${t.transaction_id}`,
    externalId: t.transaction_id,
    merchant: t.merchant_name || t.name,
    amount: Math.round(Math.abs(t.amount) * 100),
    date: t.date,
    category,
    kind: income ? 'income' : essential ? 'essential' : 'discretionary',
    pending: t.pending,
    source: 'plaid',
  };
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await identity();
    const database = db();
    if (!database)
      throw new Error('Plaid requires DATABASE_URL for secure server-side token storage.');
    const body = z
      .discriminatedUnion('operation', [
        z.object({ operation: z.literal('link') }),
        z.object({ operation: z.literal('exchange'), publicToken: z.string().min(1).max(1000) }),
        z.object({ operation: z.literal('sync') }),
      ])
      .parse(await req.json());
    const client = plaidClient();
    await readState(user.id);
    if (body.operation === 'link') {
      if (!process.env.TOKEN_ENCRYPTION_KEY)
        throw new Error('Configure TOKEN_ENCRYPTION_KEY before linking an account.');
      const result = await client.linkTokenCreate({
        client_name: 'FORK · Sandbox',
        language: 'en',
        country_codes: [CountryCode.Us],
        user: { client_user_id: user.id },
        products: [Products.Transactions],
      });
      return Response.json({ linkToken: result.data.link_token });
    }
    if (body.operation === 'exchange') {
      const result = await client.itemPublicTokenExchange({ public_token: body.publicToken });
      await database
        .insert(plaidItems)
        .values({
          userId: user.id,
          itemId: result.data.item_id,
          encryptedToken: encryptToken(result.data.access_token),
        })
        .onConflictDoUpdate({
          target: [plaidItems.userId, plaidItems.itemId],
          set: { encryptedToken: encryptToken(result.data.access_token), cursor: null },
        });
      return Response.json({ connected: true });
    }
    const items = await database.select().from(plaidItems).where(eq(plaidItems.userId, user.id));
    if (!items.length) throw new Error('Link a Plaid Sandbox bank first.');
    const current = await readState(user.id);
    const additions: Transaction[] = [];
    const removals = new Set<string>();
    const cursors: { itemId: string; cursor: string }[] = [];
    let balance = 0;
    const names: string[] = [];
    for (const item of items) {
      const token = decryptToken(item.encryptedToken);
      let cursor = item.cursor ?? undefined;
      let more = true;
      let pages = 0;
      const accounts = await client.accountsBalanceGet({ access_token: token });
      const checking = accounts.data.accounts.filter(
        (a) => a.type === 'depository' && a.balances.iso_currency_code === 'USD',
      );
      const ids = new Set(checking.map((a) => a.account_id));
      balance += checking.reduce(
        (v, a) => v + Math.round((a.balances.current ?? a.balances.available ?? 0) * 100),
        0,
      );
      names.push(...checking.map((a) => a.name));
      while (more) {
        if (++pages > 100)
          throw new Error('Transaction sync exceeded its safety limit. Try again later.');
        const result = await client.transactionsSync({ access_token: token, cursor, count: 500 });
        for (const t of [...result.data.added, ...result.data.modified])
          if (ids.has(t.account_id)) {
            removals.add(t.transaction_id);
            if (t.pending_transaction_id) removals.add(t.pending_transaction_id);
            // Non-income credits are refunds/transfers, not new spending or earnings.
            // Exclude them until transfer/refund reconciliation is supported.
            if (t.amount < 0 && t.personal_finance_category?.primary !== 'INCOME') continue;
            if (t.personal_finance_category?.primary?.startsWith('TRANSFER')) continue;
            additions.push(convert(t));
          }
        for (const t of result.data.removed) removals.add(t.transaction_id);
        more = result.data.has_more;
        cursor = result.data.next_cursor;
      }
      cursors.push({ itemId: item.itemId, cursor: cursor ?? '' });
    }
    const timestamp = new Date().toISOString();
    const state = await mutateState(user.id, current.version, (s) => ({
      ...s,
      version: s.version + 1,
      asOf: isoDate(),
      balance: Math.max(0, balance),
      transactions: deduplicate(
        s.transactions.filter(
          (t) => t.source !== 'demo' && !(t.externalId && removals.has(t.externalId)),
        ),
        additions,
      ),
      bank: {
        connected: true,
        syncedAt: timestamp,
        balanceAsOf: timestamp,
        accountName: names.join(', ').slice(0, 100) || 'Sandbox bank',
      },
    }));
    // Cursor advances only after durable state save. Replays are deduplicated.
    for (const c of cursors)
      await database
        .update(plaidItems)
        .set({ cursor: c.cursor })
        .where(and(eq(plaidItems.userId, user.id), eq(plaidItems.itemId, c.itemId)));
    return Response.json({
      state,
      note: 'Sandbox data only. Non-income credits and transfers excluded pending reconciliation. Review transaction classifications. Sync is manual; no real-time webhook is configured.',
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'isAxiosError' in e)
      return Response.json(
        {
          error:
            'Plaid Sandbox request failed. Check credentials and try again; no secrets are exposed.',
        },
        { status: 502 },
      );
    return errorResponse(e);
  }
}
