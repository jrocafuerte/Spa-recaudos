'use client';

import { useEffect } from 'react';
import { bridge } from '@/lib/bridge/bridge';

export default function SessionExpired() {
  useEffect(() => {
    bridge.send({ type: 'SESSION_EXPIRED' });
  }, []);
  return (
    <>
      <h1>Sesión no válida</h1>
      <p className="muted">Por seguridad, vuelve a ingresar desde la app.</p>
      <button className="btn" onClick={() => bridge.send({ type: 'CLOSE', payload: { reason: 'cancel' } })}>
        Volver
      </button>
    </>
  );
}
