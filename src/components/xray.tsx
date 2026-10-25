'use client';
import { useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  Check,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ScanLine,
  Trash2,
  Upload,
} from 'lucide-react';
import { transactionSchema, Transaction, currency } from '@/lib/model';
import { useFinance } from '@/lib/client-store';
import { Button } from './ui/button';
import { CardHeading, SectionTitle } from './shared';
type Draft = Transaction & { evidence?: string; uncertainty?: string };
export function XRay() {
  const state = useFinance((s) => s.state)!,
    act = useFinance((s) => s.act),
    saving = useFinance((s) => s.saving),
    ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft[]>([]),
    [terms, setTerms] = useState<
      { label: string; value: string; evidence: string; uncertainty: string }[]
    >([]),
    [warnings, setWarnings] = useState<string[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [filename, setFilename] = useState(''),
    [success, setSuccess] = useState('');
  async function upload(file: File) {
    setError('');
    setSuccess('');
    setBusy(true);
    setFilename(file.name);
    setDraft([]);
    setTerms([]);
    setWarnings([]);
    try {
      if (file.size > 5000000) throw new Error('Choose a file smaller than 5 MB.');
      if (file.name.toLowerCase().endsWith('.csv')) {
        const parsed = Papa.parse<Record<string, string>>(await file.text(), {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().toLowerCase(),
        });
        if (parsed.errors.length)
          throw new Error(`CSV could not be parsed: ${parsed.errors[0].message}`);
        if (parsed.data.length > 1000) throw new Error('Import up to 1,000 CSV rows at a time.');
        const rows: Draft[] = parsed.data.map((r, i) => {
          const raw = Number(r.amount);
          if (!r.date || !r.merchant || !r.amount || !Number.isFinite(raw))
            throw new Error(`Row ${i + 2}: date, merchant, and a numeric amount are required.`);
          return transactionSchema.parse({
            id: crypto.randomUUID(),
            merchant: r.merchant,
            date: r.date,
            amount: Math.round(Math.abs(raw) * 100),
            category: r.category || 'Other',
            kind: r.kind || (raw < 0 ? 'income' : 'discretionary'),
            pending: r.pending === 'true',
            source: 'csv',
          });
        });
        setDraft(rows);
        setWarnings([
          'CSV amounts are dollars. Positive amounts are expenses; negative amounts default to income unless kind is provided. Review every category and type before confirming.',
        ]);
      } else {
        const data = new FormData();
        data.append('file', file);
        const response = await fetch('/api/xray', { method: 'POST', body: data });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setDraft(body.transactions);
        setTerms(body.terms);
        setWarnings(body.warnings);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  }
  function update(index: number, changes: Partial<Draft>) {
    setDraft((all) => all.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  }
  async function confirm() {
    setError('');
    try {
      const confirmed = draft.map((t) => transactionSchema.parse(t));
      const before = state.transactions.length;
      if (await act({ type: 'import', transactions: confirmed })) {
        const after = useFinance.getState().state!.transactions.length;
        setSuccess(
          `${after - before} transactions imported. ${draft.length - (after - before)} duplicate rows skipped. The account balance stays unchanged; imported history is not a bank balance.`,
        );
        setDraft([]);
      }
    } catch {
      setError(
        'Check every row: dates, merchant names, categories and positive amounts must be valid.',
      );
    }
  }
  return (
    <>
      <SectionTitle
        eyebrow="MAKE THE FINE PRINT MAKE SENSE"
        title="A clearer look at your finances."
        description="Turn statements into understanding. Review the facts before they become part of your plan."
      />
      <div className="xray-upload card">
        <span className="scan-icon">
          <ScanLine size={36} />
        </span>
        <span className="eyebrow">FINANCIAL X-RAY</span>
        <h2>More clarity. Less squinting.</h2>
        <p>
          Upload a statement, bill, loan offer, or screenshot.
          <br />
          FORK extracts the details for you to review.
        </p>
        <input
          ref={ref}
          type="file"
          accept=".csv,.pdf,.png,.jpg,.jpeg"
          hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <Upload size={17} />}{' '}
          {busy ? 'Reading your document…' : 'Choose a document'}
        </Button>
        <small>PDF, PNG, JPEG, CSV · up to 5 MB</small>
        <div className="upload-badges">
          <span>
            <Check size={13} /> Nothing imported without your review
          </span>
          <span>
            <Check size={13} /> Files are not retained by FORK
          </span>
        </div>
      </div>
      <div className="import-info">
        <section className="card">
          <FileSpreadsheet className="mint-text" size={24} />
          <h2>Start with a CSV.</h2>
          <p>
            Works without API credentials. Required columns: date (YYYY-MM-DD), merchant, amount in
            dollars. Optional: category, kind, pending.
          </p>
          <a href="/sample-transactions.csv" download className="text-link">
            Download sample CSV <Upload size={13} />
          </a>
        </section>
        <section className="card">
          <FileText className="blue-text" size={24} />
          <h2>Let Gemini read between the lines.</h2>
          <p>
            Document analysis requires your Gemini API key. It extracts only visible facts, with
            source evidence and uncertainties. Uploaded documents are sent to Google for analysis.
          </p>
          <span className="quiet-tag">REVIEW REQUIRED</span>
        </section>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="success-banner" role="status">
          <Check size={16} />
          {success}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="notice">
          <div>
            <strong>Review notes · {filename}</strong>
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}
      {draft.length > 0 && (
        <section className="card review-card">
          <CardHeading
            title="You have the final say."
            subtitle={`${draft.length} extracted rows. Correct anything that does not look right.`}
            action={
              <Button disabled={saving} onClick={confirm}>
                <Check size={16} />
                {saving ? 'Importing…' : 'Confirm import'}
              </Button>
            }
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Amount ($)</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Evidence / uncertainty</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.map((t, i) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        aria-label={`Date row ${i + 1}`}
                        type="date"
                        value={t.date}
                        onChange={(e) => update(i, { date: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Merchant row ${i + 1}`}
                        value={t.merchant}
                        onChange={(e) => update(i, { merchant: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Amount row ${i + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={t.amount / 100}
                        onChange={(e) =>
                          update(i, { amount: Math.round(Number(e.target.value) * 100) })
                        }
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Category row ${i + 1}`}
                        value={t.category}
                        onChange={(e) =>
                          update(i, { category: e.target.value as Transaction['category'] })
                        }
                      >
                        {transactionSchema.shape.category.options.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Type row ${i + 1}`}
                        value={t.kind}
                        onChange={(e) => update(i, { kind: e.target.value as Transaction['kind'] })}
                      >
                        <option>essential</option>
                        <option>discretionary</option>
                        <option>income</option>
                      </select>
                    </td>
                    <td className="evidence">
                      {t.evidence || 'CSV row'}
                      {t.uncertainty && <p className="warning-text">{t.uncertainty}</p>}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDraft((all) => all.filter((_, idx) => idx !== i))}
                        aria-label={`Remove row ${i + 1}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {terms.length > 0 && (
        <section className="card">
          <CardHeading
            title="Terms worth your attention"
            subtitle="Extracted terms are for review only and are not imported as transactions."
          />
          {terms.map((t, i) => (
            <div className="term" key={i}>
              <strong>
                {t.label}: {t.value}
              </strong>
              <p>{t.evidence}</p>
              {t.uncertainty && <small className="warning-text">{t.uncertainty}</small>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
