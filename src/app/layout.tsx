import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chamada Escolar',
  description: 'Sistema digital de chamada com QR Code para escolas',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0d1117" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <script dangerouslySetInnerHTML={{ __html: `
        window.__pwaInstallPrompt = null;
        window.addEventListener('beforeinstallprompt', function(e) {
          e.preventDefault();
          window.__pwaInstallPrompt = e;
        });
      `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
