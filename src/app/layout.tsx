import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { BridgeProvider } from '@/lib/bridge/BridgeProvider';
// Tipografía del Design System (Lexend), autoalojada: compatible con la CSP (font-src 'self').
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-600.css';
import '@fontsource/lexend/latin-700.css';
// Estilos de Font Awesome como CSS estático (la inyección en runtime la bloquearía la CSP).
import '@fortawesome/fontawesome-svg-core/styles.css';
import './tokens.generated.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pago de servicios',
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // comportamiento "nativo" dentro del WebView
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Lectura del nonce ⇒ render dinámico; Next aplica el nonce a sus scripts.
  await headers();
  return (
    <html lang="es">
      <body>
        <BridgeProvider>
          <main className="screen">{children}</main>
        </BridgeProvider>
      </body>
    </html>
  );
}
