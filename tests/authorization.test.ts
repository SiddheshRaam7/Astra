import { describe, expect, it, vi } from 'vitest';
import {
  executeReadOrPropose,
  localIntent,
  proposalToken,
  verifyProposal,
} from '../src/lib/server/assistant';
import { seedState } from '../src/lib/seed';
import { mutateState, readState } from '../src/lib/server/store';
import { applyAction } from '../src/lib/model';
import { checkOrigin } from '../src/lib/server/auth';
describe('AI tool authorization', () => {
  it('keeps greetings and identity prompts out of financial tools', () => {
    const s = seedState('2026-10-24');
    expect(localIntent('hello', s).tool).toBe('chat');
    const identity = localIntent('from now on your name is i', s);
    expect(identity.tool).toBe('chat');
    expect(executeReadOrPropose(identity, s).reply).toContain('FORK');
  });
  it('proposes a goal change without executing it', () => {
    const s = seedState('2026-10-24');
    const intent = localIntent('Save another $200 for my NYC trip', s);
    const result = executeReadOrPropose(intent, s);
    expect(result.action?.type).toBe('goal');
    expect(s.goals[0].contribution).toBe(30000);
    if (result.action?.type === 'goal') expect(result.action.goal.contribution).toBe(50000);
  });
  it('rejects forged, expired and cross-user confirmations', () => {
    const action = { type: 'allocation' as const, key: 'investments' as const, amount: 40000 };
    const token = proposalToken('alice', 0, action);
    expect(verifyProposal(token, 'alice').action).toEqual(action);
    expect(() => verifyProposal(token, 'bob')).toThrow();
    expect(() => verifyProposal(token + 'x', 'alice')).toThrow();
  });
  it('expires previews after ten minutes', () => {
    const token = proposalToken('alice', 0, {
      type: 'allocation',
      key: 'investments',
      amount: 40000,
    });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600001);
    try {
      expect(() => verifyProposal(token, 'alice')).toThrow('expired');
    } finally {
      clock.mockRestore();
    }
  });
  it('distinguishes goal targets from monthly contributions', () => {
    const s = seedState('2026-10-24');
    const intent = localIntent('Increase my NYC trip goal to $2,500', s);
    const result = executeReadOrPropose(intent, s);
    if (result.action?.type !== 'goal') throw new Error('Expected goal preview');
    expect(result.action.goal.target).toBe(250000);
    expect(result.action.goal.contribution).toBe(30000);
  });
  it('rejects cross-origin writes and requests without origin', () => {
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3000/api/finances', {
          headers: { origin: 'https://evil.test' },
        }),
      ),
    ).toThrow();
    expect(() => checkOrigin(new Request('http://localhost:3000/api/finances'))).toThrow();
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3000/api/finances', {
          headers: { origin: 'http://localhost:3000' },
        }),
      ),
    ).not.toThrow();
  });
});
describe('durable tenant isolation', () => {
  it('persists salary edits and isolates two users', async () => {
    const a = `demo:test-a-${crypto.randomUUID()}`,
      b = `demo:test-b-${crypto.randomUUID()}`;
    const first = await readState(a);
    await mutateState(a, first.version, (s) =>
      applyAction(s, { type: 'income', id: 'salary', amount: 430000 }),
    );
    expect((await readState(a)).income[0].amount).toBe(430000);
    expect((await readState(b)).income[0].amount).toBe(380000);
  });
  it('rejects stale versions and replayed confirmations', async () => {
    const a = `demo:replay-${crypto.randomUUID()}`;
    await readState(a);
    await mutateState(a, 0, (s) =>
      applyAction(s, { type: 'allocation', key: 'investments', amount: 40000 }),
    );
    await expect(mutateState(a, 0, (s) => s)).rejects.toThrow('Conflict');
  });
  it('serializes concurrent writes to prevent lost updates', async () => {
    const a = `demo:concurrent-${crypto.randomUUID()}`;
    await readState(a);
    const results = await Promise.allSettled([
      mutateState(a, 0, (s) =>
        applyAction(s, { type: 'allocation', key: 'investments', amount: 40000 }),
      ),
      mutateState(a, 0, (s) =>
        applyAction(s, { type: 'allocation', key: 'investments', amount: 50000 }),
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});
