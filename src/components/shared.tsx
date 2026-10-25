'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';
import { currency } from '@/lib/model';
import type { ReactNode } from 'react';
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-head">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close dialog">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function CardHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Progress({ value, color = 'mint' }: { value: number; color?: string }) {
  return (
    <div
      className={`progress ${color}`}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Stat({
  label,
  amount,
  detail,
  tone = '',
}: {
  label: string;
  amount: number;
  detail: string;
  tone?: string;
}) {
  return (
    <div className="stat">
      <div>
        <span className={`stat-dot ${tone}`} />
        {label}
        <ArrowUpRight size={14} />
      </div>
      <strong>{currency(amount)}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function MoneyInput({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  name?: string;
}) {
  return (
    <label className="field">
      {label}
      <div className="money-input">
        <span>$</span>
        <input
          type="number"
          min="0"
          max="10000000"
          step="0.01"
          required
          value={(value / 100).toString()}
          onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
          {...props}
        />
      </div>
    </label>
  );
}
