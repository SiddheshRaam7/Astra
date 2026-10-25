'use client';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Coffee,
  CreditCard,
  Landmark,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { FinancialState, currency } from '@/lib/model';
import { detectSubscriptions, financialSummary, goalMetrics } from '@/lib/finance';
import { Button } from './ui/button';
import { CardHeading, Progress, SectionTitle, Stat } from './shared';
import { CashFlow } from './cash-flow';
export function Speedometer({ state }: { state: FinancialState }) {
  const m = financialSummary(state),
    angle = -90 + (Math.min(1.5, m.pace) / 1.5) * 180;
  return (
    <div className="speedometer">
      <svg viewBox="0 0 260 150" aria-label={`Spending pace: ${m.speed}`}>
        <path
          d="M 28 125 A 102 102 0 0 1 232 125"
          pathLength="100"
          fill="none"
          stroke="#262c29"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 28 125 A 102 102 0 0 1 232 125"
          pathLength="100"
          fill="none"
          stroke="url(#gauge)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="100 100"
        />
        <defs>
          <linearGradient id="gauge">
            <stop offset="0%" stopColor="#bce7a1" />
            <stop offset="50%" stopColor="#a9d4b8" />
            <stop offset="80%" stopColor="#e1c08b" />
            <stop offset="100%" stopColor="#d88b80" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${angle},130,125)`}>
          <line
            x1="130"
            y1="125"
            x2="130"
            y2="51"
            stroke="#edf3e8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="130" cy="125" r="7" fill="#edf3e8" />
          <circle cx="130" cy="125" r="3" fill="#1c251e" />
        </g>
        <text x="24" y="148" fill="#8c978f" fontSize="10">
          EASY DOES IT
        </text>
        <text x="188" y="148" fill="#8c978f" fontSize="10">
          SLOW DOWN
        </text>
      </svg>
      <div
        className={`pace-status ${m.speed === 'At Risk' || m.speed === 'Caution' ? 'orange' : ''}`}
      >
        <span />
        {m.speed}
      </div>
      <p>
        You’ve used {m.guiltFree > 0 ? Math.round((m.spent / m.guiltFree) * 100) : 100}% of your
        allowance,
        <br />
        {Math.round((m.day / m.days) * 100)}% through the month.
      </p>
    </div>
  );
}
export function Overview({
  state,
  onEdit,
  ask,
  explain,
}: {
  state: FinancialState;
  onEdit: (id: string) => void;
  ask: () => void;
  explain: () => void;
}) {
  const m = financialSummary(state),
    subscriptions = detectSubscriptions(state),
    leaks = subscriptions.filter((t) => t.decision === 'unnecessary'),
    savings = leaks.reduce((a, b) => a + b.amount, 0);
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const [safeWhole, safeFraction] = currency(m.safeToday, true).split('.');
  return (
    <>
      <SectionTitle
        eyebrow="A LITTLE CLARITY GOES A LONG WAY"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${state.name}.`}
        description="Your money has a plan. You have room to live."
        action={
          <Button variant="secondary" onClick={onEdit.bind(null, 'balance')}>
            <Wallet size={15} /> Manage finances
          </Button>
        }
      />
      <div className="overview-top">
        <section className="safe-card">
          <div className="safe-top">
            <span>
              <span className="live-dot" /> YOUR ROOM TO BREATHE
            </span>
            <button onClick={explain} aria-label="Explain safe to spend">
              <CircleHelp size={17} />
            </button>
          </div>
          <p className="safe-label">Safe to spend today</p>
          <div className="safe-amount">
            {safeWhole}
            <span>.{safeFraction}</span>
          </div>
          <p className="safe-copy">
            {m.safeToday > 0
              ? 'Bills reserved. Goals planned. This part’s yours.'
              : 'A little pause today protects your next move.'}
          </p>
          <div className="safe-mini">
            <span>
              <Check size={13} /> {currency(state.buffer)} cash buffer reserved
            </span>
            <span>
              <ShieldCheck size={13} /> Emergency fund untouched
            </span>
          </div>
          <div className="safe-bottom">
            <div>
              <span>Monthly guilt-free budget</span>
              <strong>{currency(m.guiltFree)}</strong>
            </div>
            <div>
              <span>Spent so far</span>
              <strong>{currency(m.spent)}</strong>
            </div>
            <button onClick={explain}>
              How we calculate this <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="safe-decoration" />
        </section>
        <section className="card pace-card">
          <CardHeading
            title="Your spending pace"
            action={<span className="quiet-tag">THIS MONTH</span>}
          />
          <Speedometer state={state} />
        </section>
      </div>
      <section className="stats-row">
        <Stat
          label="Available balance"
          amount={state.balance}
          detail={`${state.bank.accountName} · ${state.bank.balanceAsOf ?? state.asOf}`}
        />
        <Stat
          label="Monthly income"
          amount={m.income}
          detail={`${state.income.length} income sources · after tax`}
          tone="income"
        />
        <Stat
          label="Monthly expenses"
          amount={m.totalExpenses}
          detail={`${currency(m.essentials)} planned essentials · includes pending`}
          tone="expense"
        />
        <Stat
          label="Building your future"
          amount={m.goals + state.investments + state.emergencyContribution}
          detail="Goals, investments & emergency fund"
          tone="savings"
        />
      </section>
      <section className="card overview-flow">
        <CardHeading
          title="Give every dollar a direction."
          subtitle="A living picture of where your money goes."
          action={
            <Link className="text-link" href="/cash-flow">
              Explore cash flow <ArrowUpRight size={15} />
            </Link>
          }
        />
        <CashFlow state={state} compact onEdit={onEdit} />
        <div className="flow-footer">
          <span>
            <i className="legend-dot income" />
            Income <i className="legend-dot expense" />
            Essentials <i className="legend-dot savings" />
            Your future <i className="legend-dot discretionary" />
            Yours to enjoy
          </span>
          <small>Drag to explore · click a bubble to edit</small>
        </div>
      </section>
      <div className="overview-lower">
        <section className="card">
          <CardHeading
            title="Little steps. Big things."
            subtitle="The future you’re putting money toward."
            action={
              <Link href="/goals" className="icon-link" aria-label="View goals">
                <ArrowUpRight size={18} />
              </Link>
            }
          />
          <div className="mini-goals">
            {state.goals.slice(0, 3).map((g, i) => {
              const gm = goalMetrics(g, state.asOf);
              const Icon = [Landmark, CreditCard, TrendingUp][i];
              return (
                <Link href="/goals" key={g.id} className="mini-goal">
                  <span className={`goal-icon goal-${i}`}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <div>
                      <strong>{g.name}</strong>
                      <small>{Math.round(gm.percent)}%</small>
                    </div>
                    <Progress value={gm.percent} color={['mint', 'blue', 'gold'][i]} />
                    <div>
                      <small>
                        {currency(g.saved)} <span>of {currency(g.target)}</span>
                      </small>
                      <small>{currency(g.contribution)}/mo</small>
                    </div>
                  </div>
                </Link>
              );
            })}
            {state.goals.length === 0 && (
              <p className="empty">
                Your next chapter starts with a goal. <Link href="/goals">Create one</Link>.
              </p>
            )}
          </div>
        </section>
        <section className="card insight-card">
          <CardHeading
            title="A little nudge from FORK"
            action={<Sparkles size={17} className="mint-text" />}
          />
          <span className="insight-eyebrow">SMALL CHANGE, REAL IMPACT</span>
          <h3>
            {savings > 0 ? (
              <>
                Your subscriptions could
                <br />
                fund your next adventure.
              </>
            ) : (
              <>
                Your next decision starts
                <br />
                with a clearer picture.
              </>
            )}
          </h3>
          <p>
            {savings > 0 ? (
              <>
                You’ve marked {leaks.length} subscriptions as unnecessary. That’s{' '}
                <strong>{currency(savings * 12)} a year</strong> you could put toward something that
                matters.
              </>
            ) : (
              'Review your recurring payments and decide which ones still earn a place in your budget.'
            )}
          </p>
          <Link href="/money-leaks" className="text-link mint-text">
            Find your money leaks <ArrowRight size={16} />
          </Link>
          <div className="insight-footer">
            <ShieldCheck size={14} /> Based on your recorded financial data
          </div>
        </section>
      </div>
      <div className="overview-lower bottom-row">
        <section className="card">
          <CardHeading
            title="The latest in your wallet"
            subtitle="Your most recent recorded activity."
            action={
              <Link className="text-link" href="/x-ray">
                Import transactions <ArrowUpRight size={14} />
              </Link>
            }
          />
          <div className="transaction-list">
            {recent.map((t) => (
              <div className="transaction" key={t.id}>
                <span className={`transaction-icon ${t.kind}`}>
                  {t.kind === 'income' ? (
                    <ArrowDownLeft size={18} />
                  ) : t.category === 'Dining' ? (
                    <Coffee size={18} />
                  ) : (
                    <CreditCard size={18} />
                  )}
                </span>
                <div>
                  <strong>{t.merchant}</strong>
                  <small>
                    {t.category} · {t.date}
                    {t.pending ? ' · Pending' : ''}
                  </small>
                </div>
                <strong className={t.kind === 'income' ? 'mint-text' : ''}>
                  {t.kind === 'income' ? '+' : '−'}
                  {currency(t.amount, true)}
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <CardHeading title="Coming up" subtitle="A little foresight feels good." />
          <div className="upcoming-list">
            {m.upcoming.slice(0, 3).map((b) => (
              <div key={`${b.id}-${b.date}`}>
                <span className="date-tile">
                  <small>
                    {new Date(b.date + 'T12:00:00Z').toLocaleDateString('en-US', {
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </small>
                  <strong>{b.date.slice(8)}</strong>
                </span>
                <div>
                  <strong>{b.name}</strong>
                  <small>Planned payment</small>
                </div>
                <strong>{currency(b.amount)}</strong>
              </div>
            ))}
            <div className="payday">
              <span>
                <ArrowDownLeft size={17} /> Next expected payday
              </span>
              <strong>{m.nextPayday}</strong>
            </div>
          </div>
          <button className="ask-inline" onClick={ask}>
            <Sparkles size={15} /> Let’s plan for what’s next <ChevronRight size={16} />
          </button>
        </section>
      </div>
    </>
  );
}
