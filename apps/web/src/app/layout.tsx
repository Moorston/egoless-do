import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title:       '心流纪 | Egoless Do',
  description: '间歇性禁食 · 正念修行 · 运动习惯 · 思维记录',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '心流纪' },
};

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,
  userScalable:        false,
  themeColor:          '#0F0A1E',
  viewportFit:         'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ background: '#0F0A1E', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
