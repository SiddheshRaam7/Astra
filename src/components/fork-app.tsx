'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Droplets,
  GitFork,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Mic,
  Pencil,
  ScanLine,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Waypoints,
  X,
} from 'lucide-react';
import { useFinance } from '@/lib/client-store';
import { Action, currency, FinancialState } from '@/lib/model';
import { financialSummary } from '@/lib/finance';
import { Overview } from './overview';
import { CashFlow } from './cash-flow';
import { Goals } from './goals';
import { MoneyLeaks } from './money-leaks';
import { Simulator } from './simulator';
import { XRay } from './xray';
import { Settings } from './settings';
import { Button } from './ui/button';
import { CardHeading, Modal, MoneyInput, SectionTitle } from './shared';
const navigation = [
  ['/', 'Overview', LayoutDashboard],
  ['/cash-flow', 'Cash Flow', Waypoints],
  ['/goals', 'Goal Planning', Target],
  ['/money-leaks', 'Money Leaks', Droplets],
  ['/x-ray', 'Financial X-Ray', ScanLine],
  ['/simulator', 'Decision Simulator', GitFork],
] as const;
export function ForkApp() {
  const router = useRouter();
  const setAiOpen = (value: boolean) => useFinance.setState({ aiOpen: value });
  const pathname = usePathname(),
    { state, error, loaded, load, demo, saving, act } = useFinance();
  const [mobile, setMobile] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [amount, setAmount] = useState(0),
    [explain, setExplain] = useState(false),
    [projected, setProjected] = useState(false),
    [savedToast, setSavedToast] = useState(false);
  useEffect(() => {
    void load();
    const channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('fork-finances') : null;
    if (channel) channel.onmessage = () => void load();
    const focus = () => void load();
    window.addEventListener('focus', focus);
    return () => {
      channel?.close();
      window.removeEventListener('focus', focus);
    };
  }, [load]);
  const onEdit = useCallback(
    (id: string) => {
      const s = useFinance.getState().state;
      if (!s) return;
      if (id === 'goals') {
        router.push('/goals');
        return;
      }
      if (id === 'discretionary') {
        setExplain(true);
        return;
      }
      setEditing(id);
      setAmount(
        s.income.find((i) => i.id === id)?.amount ??
          s.essentials.find((i) => i.id === id)?.amount ??
          ((id === 'income'
            ? s.income[0]?.amount
            : id === 'essentials'
              ? s.essentials[0]?.amount
              : s[id as keyof FinancialState]) as number) ??
          0,
      );
    },
    [router],
  );
  if (!loaded || !state)
    return (
      <div className="loading-screen">
        <div className="brand">
          <ForkLogo />
          FORK<span>FINANCIAL CLARITY</span>
        </div>
        {error ? (
          <>
            <h1>Let’s get your workspace ready.</h1>
            <p role="alert">{error}</p>
            <Button onClick={() => load()}>Try again</Button>
            <Link href="/auth/login">Sign in with Auth0</Link>
          </>
        ) : (
          <>
            <LoaderCircle size={25} className="spin" />
            <p>Finding your financial flow…</p>
          </>
        )}
      </div>
    );
  const m = financialSummary(state),
    currentLabel = navigation.find(([href]) => href === pathname)?.[1] ?? 'Settings';
  const selectedIncome =
      state.income.find((i) => i.id === editing) ||
      (editing === 'income' ? state.income[0] : undefined),
    selectedEssential =
      state.essentials.find((i) => i.id === editing) ||
      (editing === 'essentials' ? state.essentials[0] : undefined);
  const label =
    selectedIncome?.name ??
    selectedEssential?.name ??
    {
      balance: 'Available checking balance',
      buffer: 'Protected cash buffer',
      investments: 'Monthly investments',
      emergencyContribution: 'Monthly emergency contribution',
      emergencySaved: 'Protected emergency savings',
      debtPayment: 'Required monthly debt payment',
    }[editing ?? ''] ??
    'Financial allocation';
  async function saveEdit() {
    let action: Action;
    if (selectedIncome) action = { type: 'income', id: selectedIncome.id, amount };
    else if (selectedEssential) action = { type: 'essential', id: selectedEssential.id, amount };
    else action = { type: 'allocation', key: editing as 'balance', amount };
    if (await act(action)) {
      setEditing(null);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <Link href="/" className="brand">
          <ForkLogo />
          <span>
            FORK<span className="brand-dot">.</span>
          </span>
        </Link>
        <span className="sidebar-caption">A LITTLE CLARITY. A BETTER NEXT MOVE.</span>
        <button
          className="workspace-switch"
          onClick={() => {
            setMobile(false);
            router.push('/settings');
          }}
        >
          <span className="workspace-avatar">{state.name.slice(0, 1)}</span>
          <span>
            <strong>Personal workspace</strong>
            <small>Your financial home</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <span className="nav-label">YOUR MONEY, UNDERSTOOD</span>
        <nav>
          {navigation.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobile(false)}
              className={pathname === href ? 'active' : ''}
            >
              <Icon size={18} />
              <span>{label}</span>
              {href === '/money-leaks' && <span className="nav-badge">↗</span>}
              {pathname === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon">
              <GitFork size={22} />
            </span>
            <h3>Life’s full of forks.</h3>
            <p>
              Let’s make your next
              <br />
              one a little clearer.
            </p>
            <button onClick={() => setAiOpen(true)}>
              Talk it through <ArrowRight size={14} />
            </button>
          </div>
          <Link
            href="/settings"
            onClick={() => setMobile(false)}
            className={`settings-link ${pathname === '/settings' ? 'active' : ''}`}
          >
            <SettingsIcon size={18} /> Settings
          </Link>
          <div className="profile">
            <span className="profile-avatar">{state.name.slice(0, 1)}</span>
            <span>
              <strong>{state.name}’s space</strong>
              <small>
                <span /> {demo ? 'Demo account' : 'Private account'}
              </small>
            </span>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Your workspace <ChevronRight size={13} />
            <span>{currentLabel}</span>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              <span />
              {demo ? 'SYNTHETIC DEMO' : 'PRIVATE WORKSPACE'}
            </span>
            <span className="header-divider" />
            <span className="month-label">
              <CalendarDays size={15} />
              {new Date(state.asOf + 'T12:00:00Z').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </span>
            <button
              className="header-mic"
              onClick={() => setAiOpen(true)}
              aria-label="Open voice assistant"
            >
              <Mic size={17} />
            </button>
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => load()}>Refresh</button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {pathname === '/' ? (
                <Overview
                  state={state}
                  onEdit={onEdit}
                  ask={() => setAiOpen(true)}
                  explain={() => setExplain(true)}
                />
              ) : pathname === '/cash-flow' ? (
                <>
                  <SectionTitle
                    eyebrow="FOLLOW THE FLOW"
                    title="Every dollar has a direction."
                    description="Your finances, connected. Drag a bubble to explore. Click one to make a change."
                    action={
                      <div className="segmented">
                        <button
                          className={!projected ? 'active' : ''}
                          onClick={() => setProjected(false)}
                        >
                          This month
                        </button>
                        <button
                          className={projected ? 'active' : ''}
                          onClick={() => setProjected(true)}
                        >
                          Next 3 months
                        </button>
                      </div>
                    }
                  />
                  <div className="summary-strip">
                    <div>
                      <span>Monthly income</span>
                      <strong className="mint-text">{currency(m.income)}</strong>
                    </div>
                    <div>
                      <span>Essentials & debt</span>
                      <strong>{currency(m.essentials + state.debtPayment)}</strong>
                    </div>
                    <div>
                      <span>Your future</span>
                      <strong className="blue-text">
                        {currency(m.goals + state.investments + state.emergencyContribution)}
                      </strong>
                    </div>
                    <div>
                      <span>Guilt-free allowance</span>
                      <strong>{currency(m.guiltFree)}</strong>
                    </div>
                  </div>
                  <section className="card full-flow">
                    <CashFlow state={state} onEdit={onEdit} projected={projected} />
                    <div className="flow-footer">
                      <span>
                        <i className="legend-dot income" />
                        Income
                        <i className="legend-dot expense" />
                        Essentials
                        <i className="legend-dot savings" />
                        Savings & investments
                        <i className="legend-dot discretionary" />
                        Guilt-free
                      </span>
                      <small>
                        {projected
                          ? '3 × monthly plan · no growth or interest assumed'
                          : 'Monthly planned allocations · USD'}
                      </small>
                    </div>
                  </section>
                  <section className="notice">
                    <CircleHelp size={19} />
                    <p>
                      This diagram shows your allocation plan. Editing income changes monthly
                      affordability; it does not add cash to your account. The projected view
                      repeats your monthly allocations for three months. Explore daily cash timing
                      in the Decision Simulator.
                    </p>
                  </section>
                </>
              ) : pathname === '/goals' ? (
                <Goals />
              ) : pathname === '/money-leaks' ? (
                <MoneyLeaks />
              ) : pathname === '/simulator' ? (
                <Simulator />
              ) : pathname === '/x-ray' ? (
                <XRay />
              ) : (
                <Settings onEdit={onEdit} />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="page-footer">
            <span>
              <ForkLogo /> Clarity for the moments that matter.
            </span>
            <span>Built for HackPSU 2026 · FNB Financial Confidence Challenge</span>
          </footer>
        </main>
      </div>
      {saving && (
        <div className="save-status">
          <LoaderCircle size={14} className="spin" /> Saving your plan…
        </div>
      )}
      {savedToast && (
        <div className="save-status">
          <Check size={14} /> Plan saved. Your numbers are up to date.
        </div>
      )}
      {editing && (
        <Modal
          title={
            editing === 'income'
              ? 'Your income sources'
              : editing === 'essentials'
                ? 'Your essential expenses'
                : label
          }
          description="Update your plan. All connected calculations refresh after saving."
          onClose={() => setEditing(null)}
        >
          {editing === 'income' || editing === 'essentials' ? (
            <div className="settings-values">
              {(editing === 'income' ? state.income : state.essentials).map((item) => (
                <button key={item.id} onClick={() => onEdit(item.id)}>
                  <span>{item.name}</span>
                  <strong>
                    {currency(item.amount)} <Pencil size={13} />
                  </strong>
                </button>
              ))}
              {editing === 'essentials' && (
                <button onClick={() => onEdit('debtPayment')}>
                  <span>Required debt payments</span>
                  <strong>
                    {currency(state.debtPayment)} <Pencil size={13} />
                  </strong>
                </button>
              )}
              <p className="page-footnote">
                Choose an allocation to edit its amount and inspect related recorded activity.
              </p>
            </div>
          ) : (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void saveEdit();
              }}
            >
              <MoneyInput label={label} value={Number(amount) || 0} onChange={setAmount} />
              <div className="notice">
                <ShieldCheck size={17} />
                <p>
                  {editing === 'balance'
                    ? 'Enter your available checking balance before pending debits. Emergency savings belong in the separate protected reserve.'
                    : 'This is a planning entry. No funds are transferred and the checking balance does not change.'}
                </p>
              </div>
              {(selectedIncome || selectedEssential) && (
                <div className="edit-context">
                  <h3>Related recorded transactions</h3>
                  {state.transactions
                    .filter((t) => (selectedIncome ? t.kind === 'income' : t.kind === 'essential'))
                    .slice(0, 4)
                    .map((t) => (
                      <div key={t.id}>
                        <span>{t.merchant}</span>
                        <strong>{currency(t.amount, true)}</strong>
                      </div>
                    ))}
                </div>
              )}
              <Button disabled={saving}>{saving ? 'Saving…' : 'Save change'}</Button>
            </form>
          )}
        </Modal>
      )}
      {explain && (
        <Modal
          title="Room to spend. With a reason."
          description="Monthly affordability and available cash answer two different questions."
          onClose={() => setExplain(false)}
        >
          <div className="calculation-details">
            <h3>Your monthly allowance</h3>
            {[
              ['Net monthly income', m.income],
              ['Essentials & required debt', -(m.essentials + state.debtPayment)],
              ['Goal contributions', -m.goals],
              ['Planned investments', -state.investments],
              ['Emergency contributions', -state.emergencyContribution],
              ['Guilt-free monthly budget', m.guiltFree],
              ['Already spent', -m.spent],
              ['Remaining allowance', m.remaining],
            ].map(([key, value]) => (
              <div key={String(key)}>
                <span>{key}</span>
                <strong>{currency(Number(value))}</strong>
              </div>
            ))}
            <h3>What your cash can cover today</h3>
            {[
              ['Checking balance', state.balance],
              ['Pending payments', -m.pending],
              [`Bills through ${m.nextPayday}`, -m.reserved],
              ['Protected cash buffer', -state.buffer],
              ['Cash room', m.available],
            ].map(([key, value]) => (
              <div key={String(key)}>
                <span>{key}</span>
                <strong>{currency(Number(value))}</strong>
              </div>
            ))}
            <div className="safe-result">
              <span>Safe today = max(0, min(allowance, cash room))</span>
              <strong>{currency(m.safeToday)}</strong>
            </div>
            <p>
              Emergency savings are excluded. Expected income is not counted as cash until it
              arrives. Bills on payday are reserved before the deposit. Your balance is as of{' '}
              {state.bank.balanceAsOf ?? state.asOf}; estimates depend on complete, up-to-date
              inputs. “Safe today” is an upper limit, not a recommended daily spend.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ForkLogo() {
  return (
    <svg width="30" height="32" viewBox="0 0 30 32" fill="none" aria-hidden="true">
      <path
        d="M7 3v8c0 5 8 5 8 11v7M23 3v8c0 5-8 5-8 11M15 2v10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="7" cy="3" r="2.2" fill="currentColor" />
      <circle cx="23" cy="3" r="2.2" fill="currentColor" />
    </svg>
  );
}
