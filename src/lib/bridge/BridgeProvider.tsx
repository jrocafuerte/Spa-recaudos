'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { bridge } from './bridge';
import type { NativeToWeb } from './protocol';

type Init = Extract<NativeToWeb, { type: 'INIT' }>['payload'];

interface BridgeState {
  init?: Init;
  /** true cuando la app pasa a segundo plano: se ocultan datos sensibles. */
  obscured: boolean;
}

const Ctx = createContext<BridgeState>({ obscured: false });
export const useBridgeState = () => useContext(Ctx);

/**
 * Integra el ciclo de vida nativo: INIT (tema/idioma), botón atrás nativo,
 * estado de la app (privacy screen) y comunica la cabecera nativa.
 */
export function BridgeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<BridgeState>({ obscured: false });
  const depth = useRef(0);

  useEffect(() => {
    bridge.install();
    const off = bridge.subscribe((msg) => {
      switch (msg.type) {
        case 'INIT':
          document.documentElement.dataset.theme = msg.payload.theme;
          setState((s) => ({ ...s, init: msg.payload }));
          break;
        case 'BACK_PRESSED':
          if (depth.current > 0) router.back();
          else bridge.send({ type: 'CLOSE', payload: { reason: 'cancel' } });
          break;
        case 'APP_STATE':
          setState((s) => ({ ...s, obscured: msg.payload.state === 'background' }));
          break;
      }
    });
    bridge.send({ type: 'READY' });
    return () => {
      off();
    };
  }, [router]);

  // Profundidad de navegación para decidir si "atrás" navega o cierra el micro frontend.
  useEffect(() => {
    depth.current = pathname === '/' ? 0 : pathname.split('/').filter(Boolean).length;
  }, [pathname]);

  return (
    <Ctx.Provider value={state}>
      <div aria-hidden={state.obscured} className={state.obscured ? 'obscured' : undefined}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

/** Actualiza el título y el botón atrás de la cabecera NATIVA (la web no dibuja header propio). */
export function useNativeHeader(title: string, canGoBack = true): void {
  useEffect(() => {
    document.title = title;
    bridge.send({ type: 'SET_HEADER', payload: { title, canGoBack } });
  }, [title, canGoBack]);
}
