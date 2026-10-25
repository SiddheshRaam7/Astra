'use client';
import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowRight, GitFork, ShieldCheck } from 'lucide-react';
import { useFinance } from '@/lib/client-store';
import { currency } from '@/lib/model';
import { projectBalances } from '@/lib/finance';
import { Button } from './ui/button';
import { CardHeading, MoneyInput, SectionTitle } from './shared';
type Mode = 'purchase' | 'income' | 'savings' | 'subscriptions' | 'loan';
export function Simulator() {
  const state = useFinance((s) => s.state)!,
    [mode, setMode] = useState<Mode>('purchase'),
    [amount, setAmount] = useState(70000),
    [delay, setDelay] = useState(false),
    [aprA, setAprA] = useState(12),
    [aprB, setAprB] = useState(18),
    [term, setTerm] = useState(12);
  const scenario = useMemo(
    () => ({
      purchase: mode === 'purchase' ? amount : 0,
      monthlyIncomeChange: mode === 'income' ? amount : 0,
      monthlySavingsChange: mode === 'savings' ? amount : 0,
      monthlySubscriptionSavings: mode === 'subscriptions' ? amount : 0,
      delay,
    }),
    [mode, amount, delay],
  );
  const result = useMemo(() => projectBalances(state, scenario), [state, scenario]);
  const pmt = (apr: number) => {
    const rate = apr / 1200;
    return rate === 0
      ? Math.round(amount / term)
      : Math.round((amount * rate) / (1 - Math.pow(1 + rate, -term)));
  };
  const a = pmt(aprA),
    b = pmt(aprB);
  return (
    <>
      <SectionTitle
        eyebrow="ONE DECISION. DIFFERENT FUTURES."
        title="Try it before you live it."
        description="Explore your next move with your actual plan. Your financial records stay the same."
      />
      <div className="simulator-layout">
        <section className="card scenario-controls">
          <CardHeading title="What if I…" />
          <div className="scenario-tabs">
            {(
              [
                ['purchase', 'Make a purchase'],
                ['income', 'Earn a little more'],
                ['savings', 'Save a little more'],
                ['subscriptions', 'Reduce subscriptions'],
                ['loan', 'Compare two loans'],
              ] as [Mode, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                className={mode === key ? 'active' : ''}
                onClick={() => setMode(key)}
              >
                <GitFork size={16} />
                {label}
              </button>
            ))}
          </div>
          <MoneyInput
            label={
              mode === 'loan'
                ? 'Loan principal'
                : mode === 'purchase'
                  ? 'Purchase amount'
                  : 'Monthly change'
            }
            value={amount}
            onChange={setAmount}
          />
          {mode === 'purchase' && (
            <div className="segmented">
              <button className={!delay ? 'active' : ''} onClick={() => setDelay(false)}>
                Buy today
              </button>
              <button className={delay ? 'active' : ''} onClick={() => setDelay(true)}>
                Wait for payday
              </button>
            </div>
          )}
          {mode === 'loan' && (
            <>
              <label className="field">
                Term in months
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={term}
                  onChange={(e) => setTerm(Math.max(1, Math.min(360, Number(e.target.value))))}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  Offer A APR (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={aprA}
                    onChange={(e) => setAprA(Math.max(0, Math.min(100, Number(e.target.value))))}
                  />
                </label>
                <label className="field">
                  Offer B APR (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={aprB}
                    onChange={(e) => setAprB(Math.max(0, Math.min(100, Number(e.target.value))))}
                  />
                </label>
              </div>
            </>
          )}
          <div className="scenario-protection">
            <ShieldCheck size={18} />
            <p>
              Your emergency savings stay protected. Every scenario is a preview, never a transfer.
            </p>
          </div>
        </section>
        <div className="scenario-results">
          {mode === 'loan' ? (
            <>
              <section className="card">
                <CardHeading
                  title="Two offers. The full picture."
                  subtitle="Fixed rate, equal monthly payments, no additional fees assumed."
                />
                <div className="loan-grid">
                  {[
                    ['A', a, aprA],
                    ['B', b, aprB],
                  ].map(([name, payment, apr]) => (
                    <div key={name}>
                      <span className="eyebrow">
                        OFFER {name} · {apr}% APR
                      </span>
                      <strong>
                        {currency(Number(payment), true)}
                        <small>/month</small>
                      </strong>
                      <p>Total paid: {currency(Number(payment) * term, true)}</p>
                      <p>Interest: {currency(Number(payment) * term - amount, true)}</p>
                    </div>
                  ))}
                </div>
                <div className="notice">
                  Offer {a <= b ? 'A' : 'B'} has the lower scheduled cost by{' '}
                  {currency(Math.abs(a - b) * term, true)}. Compare origination fees, variable
                  rates, penalties, and contractual terms before deciding.
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="card projection-card">
                <CardHeading
                  title="Your next 90 days"
                  subtitle="Daily checking balance · planned baseline vs. your what-if"
                  action={<span className="quiet-tag">SIMULATION</span>}
                />
                <div className="projection-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={result.points}
                      margin={{ top: 25, right: 18, left: 0, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#b9dda0" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#b9dda0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#29312b" vertical={false} strokeDasharray="3 5" />
                      <XAxis
                        dataKey="label"
                        minTickGap={65}
                        stroke="#7e8a82"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `$${(v / 100).toLocaleString()}`}
                        stroke="#7e8a82"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#1a221d',
                          border: '1px solid #394338',
                          borderRadius: 12,
                        }}
                        formatter={(v) => currency(Number(v), true)}
                      />
                      <ReferenceLine
                        y={state.buffer}
                        stroke="#d4a576"
                        strokeDasharray="5 5"
                        label={{
                          value: 'Cash buffer',
                          fill: '#d4a576',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                      <Line
                        name="Your current plan"
                        dataKey="baseline"
                        stroke="#829fce"
                        dot={false}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Area
                        name="Your what-if"
                        dataKey="alternative"
                        stroke="#b9dda0"
                        fill="url(#projectionFill)"
                        strokeWidth={2}
                        type="stepAfter"
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 18 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <div className="scenario-metrics">
                <div className="card">
                  <span>Lowest projected balance</span>
                  <strong className={result.safe ? 'mint-text' : 'orange-text'}>
                    {currency(result.min)}
                  </strong>
                  <small>Includes conservative settlement timing</small>
                </div>
                <div className="card">
                  <span>Balance after 90 days</span>
                  <strong>{currency(result.end)}</strong>
                  <small>{currency(result.end - result.baselineEnd)} vs. your current plan</small>
                </div>
              </div>
              <section className={`card recommendation ${result.safe ? '' : 'at-risk'}`}>
                <span>{result.safe ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}</span>
                <div>
                  <h2>
                    {result.safe
                      ? 'There’s room in this version of the future.'
                      : 'Give this decision a little more room.'}
                  </h2>
                  <p>
                    {result.safe
                      ? 'This projection keeps your checking balance above the cash buffer. Keep enough flexibility for costs that are not in your plan.'
                      : `Your balance could cross the ${currency(state.buffer)} buffer on ${result.shortfall}. ${mode === 'purchase' && !delay ? 'Try waiting for payday, reducing the purchase, or revisiting your allocations.' : 'Consider a smaller change or adjust your timing.'}`}
                  </p>
                </div>
              </section>
            </>
          )}
          <section className="assumptions">
            <strong>What this forecast assumes</strong>
            <p>
              {result.assumptions}
              {mode === 'subscriptions'
                ? ' Subscription savings begin next month only if you actually cancel the services.'
                : ''}
              {mode === 'loan'
                ? ' Loan comparisons exclude fees, taxes, late payments, and rate changes. Final payments can vary due to rounding.'
                : ''}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
