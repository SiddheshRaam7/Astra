'use client';
import { useState } from 'react';
import { Flag, Plus, Pencil, ShieldCheck, Target, Trash2, TrendingUp } from 'lucide-react';
import { Goal, currency } from '@/lib/model';
import { financialSummary, goalMetrics } from '@/lib/finance';
import { useFinance } from '@/lib/client-store';
import { CardHeading, Modal, MoneyInput, Progress, SectionTitle } from './shared';
import { Button } from './ui/button';
export function Goals() {
  const state = useFinance((s) => s.state)!,
    act = useFinance((s) => s.act),
    saving = useFinance((s) => s.saving),
    m = financialSummary(state);
  const [editing, setEditing] = useState<Goal | null>(null),
    [deleting, setDeleting] = useState<Goal | null>(null);
  const [emergency, setEmergency] = useState(false),
    [contribution, setContribution] = useState(state.emergencyContribution);
  const sorted = [...state.goals].sort(
    (a, b) =>
      ['High', 'Medium', 'Low'].indexOf(a.priority) - ['High', 'Medium', 'Low'].indexOf(b.priority),
  );
  return (
    <>
      <SectionTitle
        eyebrow="MAKE ROOM FOR WHAT MATTERS"
        title="A plan for your next chapter."
        description="Turn someday into a date on the calendar."
        action={
          <Button
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                name: '',
                target: 100000,
                saved: 0,
                deadline: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
                priority: 'Medium',
                contribution: 10000,
              })
            }
          >
            <Plus size={17} /> Create a goal
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Saved toward your goals</span>
          <strong>{currency(state.goals.reduce((s, g) => s + g.saved, 0))}</strong>
        </div>
        <div>
          <span>Monthly goal contributions</span>
          <strong>{currency(m.goals)}</strong>
        </div>
        <div>
          <span>Allowance after all allocations</span>
          <strong className={m.remaining < 0 ? 'red-text' : 'mint-text'}>
            {currency(m.remaining)}
          </strong>
        </div>
      </div>
      <div className="goal-grid">
        {sorted.map((g, i) => {
          const gm = goalMetrics(g, state.asOf);
          return (
            <section className="card goal-card" key={g.id}>
              <div className="goal-card-top">
                <span className={`goal-icon goal-${i % 3}`}>
                  <Target size={22} />
                </span>
                <span className={`priority ${g.priority.toLowerCase()}`}>
                  <Flag size={11} />
                  {g.priority} priority
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(g)}
                  aria-label={`Edit ${g.name}`}
                >
                  <Pencil size={15} />
                </Button>
              </div>
              <h2>{g.name}</h2>
              <p className="goal-deadline">
                {gm.months ? `${gm.months} months to make it happen` : 'Deadline reached'} ·{' '}
                {g.deadline}
              </p>
              <div className="goal-amount">
                <strong>{currency(g.saved)}</strong>
                <span>of {currency(g.target)}</span>
                <small>{Math.round(gm.percent)}%</small>
              </div>
              <Progress value={gm.percent} color={['mint', 'blue', 'gold'][i % 3]} />
              <div className="goal-facts">
                <div>
                  <span>Your monthly contribution</span>
                  <strong>{currency(g.contribution)}</strong>
                </div>
                <div>
                  <span>Needed per month</span>
                  <strong>{currency(gm.required)}</strong>
                </div>
                <div>
                  <span>Still to save</span>
                  <strong>{currency(gm.remaining)}</strong>
                </div>
              </div>
              <div className={`goal-track ${gm.onTrack && m.guiltFree >= 0 ? '' : 'warning-text'}`}>
                <TrendingUp size={15} />
                {gm.onTrack && m.guiltFree >= 0
                  ? 'Your current plan is on track'
                  : 'A small adjustment could help'}
              </div>
              <button
                className="delete-goal"
                aria-label={`Delete ${g.name}`}
                onClick={() => setDeleting(g)}
              >
                <Trash2 size={13} />
              </button>
            </section>
          );
        })}
      </div>
      <section className="card emergency-card">
        <div className="emergency-intro">
          <span className="emergency-icon">
            <ShieldCheck size={28} />
          </span>
          <div>
            <span className="eyebrow">YOUR FINANCIAL SAFETY NET</span>
            <h2>A cushion for life’s curveballs.</h2>
            <p>Protected savings. A little more peace of mind.</p>
          </div>
        </div>
        <div className="emergency-numbers">
          <strong>
            {m.emergencyRunway.toFixed(1)}
            <span>months covered</span>
          </strong>
          <strong>
            {currency(state.emergencySaved)}
            <span>of {currency(m.emergencyTarget)} target</span>
          </strong>
        </div>
        <Progress value={m.emergencyPercent} color="blue" />
        <div className="emergency-footer">
          <p>
            Target: {state.emergencyMonths} months of essentials · Contributing{' '}
            {currency(state.emergencyContribution)}/month
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setContribution(state.emergencyContribution);
              setEmergency(true);
            }}
          >
            Adjust contribution
          </Button>
        </div>
      </section>
      {editing && (
        <Modal
          title={
            state.goals.some((g) => g.id === editing.id)
              ? 'Make your goal work for you.'
              : 'What are you looking forward to?'
          }
          description="Every change updates your monthly allowance and cash flow."
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await act({ type: 'goal', goal: editing })) setEditing(null);
            }}
            className="form-stack"
          >
            <label className="field">
              Goal name
              <input
                required
                maxLength={80}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Something worth saving for"
              />
            </label>
            <div className="form-grid">
              <MoneyInput
                label="Target amount"
                value={editing.target}
                onChange={(v) => setEditing({ ...editing, target: v })}
              />
              <MoneyInput
                label="Already saved"
                value={editing.saved}
                onChange={(v) => setEditing({ ...editing, saved: v })}
              />
              <label className="field">
                Target date
                <input
                  type="date"
                  required
                  value={editing.deadline}
                  onChange={(e) => setEditing({ ...editing, deadline: e.target.value })}
                />
              </label>
              <label className="field">
                Priority
                <select
                  value={editing.priority}
                  onChange={(e) =>
                    setEditing({ ...editing, priority: e.target.value as Goal['priority'] })
                  }
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
            </div>
            <MoneyInput
              label="Monthly contribution"
              value={editing.contribution}
              onChange={(v) => setEditing({ ...editing, contribution: v })}
            />
            <div className="calculation-box">
              <span>Monthly guilt-free budget after this change</span>
              <strong>
                {currency(
                  m.guiltFree +
                    (state.goals.find((g) => g.id === editing.id)?.contribution ?? 0) -
                    editing.contribution,
                )}
              </strong>
              <small>
                Needed to reach your date: {currency(goalMetrics(editing, state.asOf).required)}
                /month
              </small>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save goal'}
            </Button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Let this goal go?"
          description={`Delete “${deleting.name}” from your plan. This releases its monthly allocation but does not move any saved money.`}
          onClose={() => setDeleting(null)}
        >
          <Button
            variant="destructive"
            disabled={saving}
            onClick={async () => {
              if (await act({ type: 'deleteGoal', id: deleting.id })) setDeleting(null);
            }}
          >
            Delete goal
          </Button>
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Keep goal
          </Button>
        </Modal>
      )}
      {emergency && (
        <Modal
          title="Protect a little more of your future."
          description="This changes your planned monthly allocation. It does not move money."
          onClose={() => setEmergency(false)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act({
                  type: 'allocation',
                  key: 'emergencyContribution',
                  amount: contribution,
                })
              )
                setEmergency(false);
            }}
          >
            <MoneyInput
              label="Monthly emergency contribution"
              value={contribution}
              onChange={setContribution}
            />
            <p className="notice">
              Your remaining monthly allowance would be{' '}
              {currency(m.remaining + state.emergencyContribution - contribution)}.
            </p>
            <Button disabled={saving}>Save contribution</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
