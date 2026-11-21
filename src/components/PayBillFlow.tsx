'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ApiError, api, apiWithKey } from '@/lib/api/client';
import {
  type Biller,
  type Debt,
  type PaymentIntent,
  type Receipt,
  type SourceAccount,
  formatMoney,
} from '@/lib/api/types';
import { bridge } from '@/lib/bridge/bridge';
import { formatDate } from '@/lib/format';
import { useNativeHeader } from '@/lib/bridge/BridgeProvider';

type Step = 'reference' | 'select' | 'confirm';

/**
 * Flujo: referencia → deuda + cuenta → resumen → confirmación NATIVA
 * (biometría + step-up token) → pago → comprobante.
 */
export function PayBillFlow({ billerId }: { billerId: string }) {
  const router = useRouter();
  const [biller, setBiller] = useState<Biller>();
  const [step, setStep] = useState<Step>('reference');
  const [reference, setReference] = useState('');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<SourceAccount[]>([]);
  const [debtId, setDebtId] = useState<string>();
  const [accountId, setAccountId] = useState<string>();
  const [intent, setIntent] = useState<PaymentIntent>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const idemKey = useRef<string>(undefined);

  useNativeHeader(biller?.name ?? 'Pago de servicios');

  useEffect(() => {
    api<Biller>(`v1/billers/${billerId}`)
      .then(setBiller)
      .catch((e: Error) => setError(e.message));
  }, [billerId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Error inesperado');
      bridge.send({ type: 'HAPTIC', payload: { style: 'error' } });
    } finally {
      setBusy(false);
    }
  };

  const validReference = biller ? new RegExp(biller.referencePattern).test(reference) : false;

  const searchDebts = () =>
    run(async () => {
      const [d, a] = await Promise.all([
        api<{ items: Debt[] }>(`v1/billers/${billerId}/debts`, { method: 'POST', body: { reference } }),
        api<{ items: SourceAccount[] }>('v1/source-accounts'),
      ]);
      setDebts(d.items);
      setAccounts(a.items);
      setDebtId(d.items[0]?.id);
      setAccountId(a.items[0]?.id);
      setStep('select');
    });

  const createIntent = () =>
    run(async () => {
      const i = await api<PaymentIntent>('v1/payment-intents', {
        method: 'POST',
        body: { billerId, reference, debtId, sourceAccountId: accountId },
      });
      idemKey.current = crypto.randomUUID();
      setIntent(i);
      setStep('confirm');
    });

  const confirm = () =>
    run(async () => {
      if (!intent) return;
      // La app nativa muestra su propia hoja de confirmación + biometría y
      // solicita a mse-banca-movil un token ligado a ESTE intent (hash + monto).
      const res = await bridge.request(
        {
          type: 'REQUEST_STEP_UP',
          payload: {
            intentHash: intent.intentHash,
            amount: intent.total,
            currency: intent.currency,
            billerName: intent.billerName,
            reference: intent.reference,
          },
        },
        'STEP_UP_RESULT',
      );
      if (res.payload.status === 'cancelled') return;
      if (res.payload.status === 'failed') throw new Error(res.payload.reason ?? 'No se pudo autorizar el pago');
      const receipt = await apiWithKey<Receipt>(
        'v1/payments',
        { intentId: intent.intentId, stepUpToken: res.payload.stepUpToken },
        idemKey.current!,
      );
      bridge.send({ type: 'HAPTIC', payload: { style: 'success' } });
      router.replace(`/receipt/${receipt.paymentId}`);
    });

  if (!biller) return <div className="skeleton" aria-busy="true" />;

  return (
    <>
      {step === 'reference' && (
        <>
          <h1>{biller.name}</h1>
          <div className="field">
            <label htmlFor="ref">{biller.referenceLabel}</label>
            <input
              id="ref"
              inputMode={biller.referencePattern.includes('A-Z') ? 'text' : 'numeric'}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={20}
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
          </div>
          <button className="btn" disabled={!validReference || busy} onClick={searchDebts}>
            {busy ? 'Consultando…' : 'Consultar deuda'}
          </button>
        </>
      )}

      {step === 'select' && (
        <>
          <h2>Deudas pendientes</h2>
          {debts.length === 0 ? (
            <p className="muted">No tienes deudas pendientes con esta referencia.</p>
          ) : (
            <ul className="list">
              {debts.map((d) => (
                <li key={d.id}>
                  <button className="row" aria-pressed={debtId === d.id} onClick={() => setDebtId(d.id)}>
                    <span>
                      {d.description}
                      <small>Vence {formatDate(d.dueDate)}</small>
                    </span>
                    <strong>{formatMoney(d.amount, d.currency)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h2>Cuenta de cargo</h2>
          <ul className="list">
            {accounts.map((a) => (
              <li key={a.id}>
                <button className="row" aria-pressed={accountId === a.id} onClick={() => setAccountId(a.id)}>
                  <span>
                    {a.type === 'SAVINGS' ? 'Ahorros' : 'Corriente'} {a.numberMasked}
                    <small>Disponible {formatMoney(a.availableBalance, a.currency)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn" disabled={!debtId || !accountId || busy} onClick={createIntent}>
            Continuar
          </button>
        </>
      )}

      {step === 'confirm' && intent && (
        <>
          <p className="total">{formatMoney(intent.total, intent.currency)}</p>
          <div className="card summary">
            <dl>
              <dt>Empresa</dt>
              <dd>{intent.billerName}</dd>
              <dt>Referencia</dt>
              <dd>{intent.reference}</dd>
              <dt>Concepto</dt>
              <dd>{intent.description}</dd>
              <dt>Importe</dt>
              <dd>{formatMoney(intent.amount, intent.currency)}</dd>
              <dt>Comisión</dt>
              <dd>{formatMoney(intent.fee, intent.currency)}</dd>
              <dt>Cuenta</dt>
              <dd>{intent.sourceAccount}</dd>
            </dl>
          </div>
          <button className="btn" disabled={busy} onClick={confirm}>
            {busy ? 'Procesando…' : 'Pagar'}
          </button>
          <button className="btn secondary" disabled={busy} onClick={() => setStep('select')}>
            Modificar
          </button>
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
