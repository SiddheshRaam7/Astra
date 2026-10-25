'use client';
import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import {
  Check,
  Database,
  Download,
  ExternalLink,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { currency, FinancialState } from '@/lib/model';
import { request, useFinance } from '@/lib/client-store';
import { Button } from './ui/button';
import { CardHeading, Modal, MoneyInput, SectionTitle } from './shared';
const integrations = [
  ['gemini', 'Google Gemini', 'Intent routing and financial document understanding'],
  ['elevenlabs', 'ElevenLabs', 'Voice conversations with confirmed financial tools'],
  ['database', 'Tiger Data / PostgreSQL', 'Durable, user-scoped financial storage'],
  ['auth0', 'Auth0', 'Secure login and isolated user sessions'],
  ['plaid', 'Plaid Sandbox', 'Synthetic banking connections and transaction sync'],
] as const;
export function Settings({ onEdit }: { onEdit: (id: string) => void }) {
  const state = useFinance((s) => s.state)!,
    demo = useFinance((s) => s.demo),
    storage = useFinance((s) => s.storage),
    act = useFinance((s) => s.act),
    accept = useFinance((s) => s.accept),
    saving = useFinance((s) => s.saving);
  const [status, setStatus] = useState<Record<string, boolean>>({}),
    [name, setName] = useState(state.name),
    [months, setMonths] = useState(state.emergencyMonths),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(''),
    [linkToken, setLinkToken] = useState<string | null>(null),
    [bankBusy, setBankBusy] = useState(false);
  const [newItem, setNewItem] = useState<'income' | 'essential' | null>(null),
    [itemName, setItemName] = useState(''),
    [itemAmount, setItemAmount] = useState(0),
    [itemDay, setItemDay] = useState(1);
  useEffect(() => {
    request('/api/integrations')
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  const plaid = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setBankBusy(true);
      try {
        await request('/api/plaid', { operation: 'exchange', publicToken });
        const data = await request('/api/plaid', { operation: 'sync' });
        accept(data.state);
        setLinkToken(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBankBusy(false);
      }
    },
    onExit: (error) => {
      setLinkToken(null);
      setBankBusy(false);
      if (error) setError(error.display_message || 'Bank connection was cancelled.');
    },
  });
  useEffect(() => {
    if (linkToken && plaid.ready) plaid.open();
  }, [linkToken, plaid.ready, plaid.open]);
  async function bank(operation: 'link' | 'sync') {
    setError('');
    setBankBusy(true);
    try {
      const data = await request('/api/plaid', { operation });
      if (operation === 'link') setLinkToken(data.linkToken);
      else accept(data.state);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBankBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fork-finances.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <SectionTitle
        eyebrow="YOUR MONEY. YOUR PREFERENCES."
        title="Make yourself at home."
        description="Manage your financial foundation, connections, and personal preferences."
      />
      <div className="settings-grid">
        <section className="card">
          <CardHeading title="A little about you" />
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await act({ type: 'settings', name, emergencyMonths: months })) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
              }
            }}
          >
            <label className="field">
              Preferred name
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              Emergency coverage target (months)
              <input
                type="number"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              />
            </label>
            <Button disabled={saving}>
              {saved ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                'Save preferences'
              )}
            </Button>
          </form>
          <div className="settings-note">
            <ShieldCheck size={18} />
            <p>
              {demo
                ? 'You’re exploring synthetic demo data in your own isolated browser session.'
                : 'Your finances are scoped to your authenticated Auth0 identity.'}{' '}
              Storage: {storage}.
            </p>
          </div>
          {status.auth0 && (
            <div className="settings-actions">
              <a className="button button-secondary" href={demo ? '/auth/login' : '/auth/logout'}>
                {demo ? 'Sign in with Auth0' : 'Sign out'}
              </a>
              {demo && (
                <a className="button button-ghost" href="/auth/login?screen_hint=signup">
                  Create an account
                </a>
              )}
            </div>
          )}
        </section>
        <section className="card">
          <CardHeading
            title="Your financial foundation"
            subtitle="Edit your cash balance and monthly allocations."
          />
          <div className="settings-values">
            {(
              [
                ['balance', 'Checking balance', state.balance],
                ['buffer', 'Protected cash buffer', state.buffer],
                ['emergencySaved', 'Emergency reserves', state.emergencySaved],
                ['investments', 'Monthly investments', state.investments],
                ['emergencyContribution', 'Monthly emergency savings', state.emergencyContribution],
                ['debtPayment', 'Required monthly debt', state.debtPayment],
              ] as [string, string, number][]
            ).map(([id, label, value]) => (
              <button key={id} onClick={() => onEdit(id)}>
                <span>{label}</span>
                <strong>
                  {currency(value)} <ExternalLink size={12} />
                </strong>
              </button>
            ))}
          </div>
        </section>
        <section className="card">
          <CardHeading
            title="Income & essentials"
            subtitle="Your planned monthly income and bills."
          />
          <div className="settings-values">
            {state.income.map((i) => (
              <button key={i.id} onClick={() => onEdit(i.id)}>
                <span className="mint-text">
                  {i.name} · payday {i.payday}
                </span>
                <strong>
                  {currency(i.amount)} <ExternalLink size={12} />
                </strong>
              </button>
            ))}
            {state.essentials.map((i) => (
              <button key={i.id} onClick={() => onEdit(i.id)}>
                <span>
                  {i.name} · due {i.dueDay}
                </span>
                <strong>
                  {currency(i.amount)} <ExternalLink size={12} />
                </strong>
              </button>
            ))}
          </div>
          <div className="settings-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewItem('income');
                setItemName('');
                setItemAmount(0);
              }}
            >
              <Plus size={14} /> Income source
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewItem('essential');
                setItemName('');
                setItemAmount(0);
              }}
            >
              <Plus size={14} /> Essential bill
            </Button>
          </div>
        </section>
        <section className="card">
          <CardHeading title="Connected accounts" action={<Link2 size={19} />} />
          <div className="bank-connection">
            <span className="bank-logo">
              <Database size={25} />
            </span>
            <h3>
              {state.bank.connected
                ? state.bank.accountName
                : 'A clearer view starts with a connection.'}
            </h3>
            <p>
              Plaid Sandbox only. Connect synthetic bank accounts through Plaid Link. You never
              enter bank passwords into FORK.
            </p>
            <small>Last synchronized: {state.bank.syncedAt ?? 'Not connected'}</small>
            <Button
              disabled={bankBusy || !status.plaid}
              variant="secondary"
              onClick={() => bank(state.bank.connected ? 'sync' : 'link')}
            >
              {state.bank.connected ? <RefreshCw size={15} /> : <Link2 size={15} />}{' '}
              {bankBusy
                ? 'Connecting…'
                : state.bank.connected
                  ? 'Sync Sandbox transactions'
                  : 'Connect Sandbox bank'}
            </Button>
            {!status.plaid && (
              <small>Requires Plaid credentials, encrypted token storage, and PostgreSQL.</small>
            )}
          </div>
        </section>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <section className="card">
        <CardHeading
          title="The tools behind your clarity"
          subtitle="Configuration status is shown honestly. Configured integrations still require live verification."
        />
        <div className="integration-list">
          {integrations.map(([key, label, description]) => (
            <div key={key}>
              <span className={`integration-icon ${status[key] ? 'configured' : ''}`}>
                {label.slice(0, 1)}
              </span>
              <div>
                <strong>{label}</strong>
                <small>{description}</small>
              </div>
              <span className={`integration-state ${status[key] ? 'configured' : ''}`}>
                <span />
                {status[key] ? 'Configured · not verified' : 'Credentials needed'}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="card data-export">
        <div>
          <h2>Your data belongs to you.</h2>
          <p>Download a JSON copy of your current financial plan and transactions.</p>
        </div>
        <Button variant="secondary" onClick={exportData}>
          <Download size={16} /> Export my data
        </Button>
      </section>
      {newItem && (
        <Modal
          title={newItem === 'income' ? 'Add an income source' : 'Add an essential bill'}
          description="This is a monthly plan. Your cash balance does not change until you update it or sync your account."
          onClose={() => setNewItem(null)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const item = { id: crypto.randomUUID(), name: itemName, amount: itemAmount };
              const result = await act(
                newItem === 'income'
                  ? { type: 'incomeSource', item: { ...item, payday: itemDay } }
                  : { type: 'essentialItem', item: { ...item, dueDay: itemDay } },
              );
              if (result) setNewItem(null);
            }}
          >
            <label className="field">
              Name
              <input
                required
                value={itemName}
                maxLength={60}
                onChange={(e) => setItemName(e.target.value)}
              />
            </label>
            <MoneyInput label="Monthly amount" value={itemAmount} onChange={setItemAmount} />
            <label className="field">
              {newItem === 'income' ? 'Payday' : 'Due day'} (1–28)
              <input
                required
                type="number"
                min={1}
                max={28}
                value={itemDay}
                onChange={(e) => setItemDay(Number(e.target.value))}
              />
            </label>
            <Button disabled={saving}>Save to my plan</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
