'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { type Receipt, formatMoney } from '@/lib/api/types';
import { bridge } from '@/lib/bridge/bridge';
import { useNativeHeader } from '@/lib/bridge/BridgeProvider';

export function ReceiptView({ paymentId }: { paymentId: string }) {
  useNativeHeader('Comprobante', false);
  const [r, setR] = useState<Receipt>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    api<Receipt>(`v1/payments/${paymentId}`)
      .then(setR)
      .catch((e: Error) => setError(e.message));
  }, [paymentId]);

  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!r) return <div className="skeleton" aria-busy="true" />;

  const share = () =>
    bridge.send({
      type: 'SHARE_RECEIPT',
      payload: {
        text: `Pago ${r.billerName} · Ref. ${r.reference} · ${formatMoney(r.total, r.currency)} · Cód. ${r.authorizationCode} · ${new Date(r.executedAt).toLocaleString('es')}`,
      },
    });

  return (
    <>
      <p className="success" aria-hidden>
        ✓
      </p>
      <h1 className="center">¡Pago realizado!</h1>
      <p className="total">{formatMoney(r.total, r.currency)}</p>
      <div className="card summary">
        <dl>
          <dt>Empresa</dt>
          <dd>{r.billerName}</dd>
          <dt>Referencia</dt>
          <dd>{r.reference}</dd>
          <dt>Cuenta</dt>
          <dd>{r.sourceAccount}</dd>
          <dt>Código</dt>
          <dd>{r.authorizationCode}</dd>
          <dt>Fecha</dt>
          <dd>{new Date(r.executedAt).toLocaleString('es')}</dd>
        </dl>
      </div>
      <button className="btn secondary" onClick={share}>
        Compartir comprobante
      </button>
      <button className="btn" onClick={() => bridge.send({ type: 'CLOSE', payload: { reason: 'done' } })}>
        Finalizar
      </button>
    </>
  );
}
