'use client';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Droplets,
  Repeat2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useFinance } from '@/lib/client-store';
import { currency, SubscriptionDecision } from '@/lib/model';
import { detectSubscriptions, goalMetrics } from '@/lib/finance';
import { CardHeading, SectionTitle } from './shared';
import Link from 'next/link';
export function MoneyLeaks() {
  const state = useFinance((s) => s.state)!,
    act = useFinance((s) => s.act),
    saving = useFinance((s) => s.saving),
    subscriptions = detectSubscriptions(state);
  const savings = subscriptions
    .filter((s) => s.decision === 'unnecessary')
    .reduce((n, s) => n + s.amount, 0);
  return (
    <>
      <SectionTitle
        eyebrow="SMALL LEAKS ADD UP"
        title="Keep the good. Rethink the rest."
        description="A closer look at the recurring payments that quietly leave your account."
      />
      <div className="leak-hero card">
        <span className="leak-icon">
          <Droplets size={30} />
        </span>
        <div>
          <span className="eyebrow">YOUR IDENTIFIED OPPORTUNITY</span>
          <h2>
            {currency(savings)}
            <span>/month</span>
          </h2>
          <p>That’s {currency(savings * 12)} a year, from services you marked unnecessary.</p>
        </div>
        <span className="quiet-tag">REVIEWED BY YOU</span>
      </div>
      <div className="notice">
        <Repeat2 size={17} />
        <p>
          We detect monthly patterns, not whether you use a service. Price changes and possible
          overlaps are prompts to review. Mark a payment as essential, unnecessary, or a false
          positive. No subscription is cancelled here.
        </p>
      </div>
      <section className="card">
        <CardHeading
          title="The recurring cast"
          subtitle={`${subscriptions.length} likely recurring payments · based on recorded transaction history`}
        />
        <div className="subscription-list">
          {subscriptions.map((sub, i) => (
            <div className="subscription" key={sub.key}>
              <span className={`merchant-logo merchant-${i % 5}`}>{sub.merchant.slice(0, 1)}</span>
              <div className="subscription-name">
                <strong>{sub.merchant}</strong>
                <small>
                  {sub.transactions.length} payments · last seen {sub.lastDate} ·{' '}
                  {sub.confidence.toLowerCase()} confidence
                </small>
                <div className="subscription-flags">
                  {sub.increase > 0 && (
                    <span className="warning-text">
                      <TrendingUp size={11} /> Up {currency(sub.increase, true)}/mo
                    </span>
                  )}
                  {sub.possibleOverlap && <span>Possible entertainment overlap</span>}
                </div>
              </div>
              <div className="subscription-amount">
                <strong>
                  {currency(sub.amount, true)}
                  <small>/mo</small>
                </strong>
                <small>{currency(sub.annual, true)}/year</small>
              </div>
              <label className="sr-only" htmlFor={sub.key}>
                Review {sub.merchant}
              </label>
              <select
                id={sub.key}
                aria-label={`Review ${sub.merchant}`}
                disabled={saving}
                value={sub.decision}
                onChange={(e) =>
                  act({
                    type: 'subscription',
                    merchant: sub.key,
                    decision: e.target.value as SubscriptionDecision,
                  })
                }
              >
                <option value="review">Needs review</option>
                <option value="necessary">Worth keeping</option>
                <option value="unnecessary">Unnecessary</option>
                <option value="exclude">Not a subscription</option>
              </select>
            </div>
          ))}
          {subscriptions.length === 0 && (
            <p className="empty">
              No recurring patterns found. Import at least two months of transactions to find
              possible subscriptions.
            </p>
          )}
        </div>
      </section>
      <section className="card redirect-card">
        <CardHeading
          title="Give those dollars a new destination."
          subtitle="Potential acceleration if you cancel unnecessary services yourself and redirect the savings."
          action={<Sparkles size={20} className="mint-text" />}
        />
        <div className="acceleration-grid">
          {state.goals.map((g) => {
            const gm = goalMetrics(g, state.asOf);
            const current = g.contribution ? Math.ceil(gm.remaining / g.contribution) : null;
            const faster =
              g.contribution + savings
                ? Math.ceil(gm.remaining / (g.contribution + savings))
                : null;
            return (
              <div key={g.id}>
                <span>{g.name}</span>
                <strong>
                  {current !== null && faster !== null
                    ? `${Math.max(0, current - faster)} months sooner`
                    : 'Start making progress'}
                </strong>
                <small>
                  {currency(g.contribution)} → {currency(g.contribution + savings)}/month
                </small>
                <Link href="/goals">
                  Adjust your goal <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </section>
      <p className="page-footnote">
        Estimates assume recurring prices and contributions stay constant. Marking a service
        unnecessary does not change its transaction history or your available allowance.
      </p>
    </>
  );
}
