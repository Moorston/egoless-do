'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWebStore } from '../store/useWebStore';
import { THEMES, t, setPocketbaseUrl } from '@egoless-do/core';
import { useReminder } from './useReminder';
import { ErrorBoundary, useResponsive } from './helpers';
import { useSync } from './useSync';
import { OverlayContext, useOverlayState } from './useOverlay';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import HomeTab from './HomeTab';
import FastingTab from './FastingTab';
import MeditateTab from './MeditateTab';
import ReflectionsTab from './ReflectionsTab';
import ExerciseTab from './ExerciseTab';
import HabitsTab from './HabitsTab';
import StatsTab from './StatsTab';
import SettingsTab from './SettingsTab';
import GlobalMapPage from './GlobalMapPage';
import CheckinPage from './CheckinPage';
import SportPage from './SportPage';
import FastHistoryPage from './FastHistoryPage';
import MedHistoryPage from './MedHistoryPage';
import HistoryPage from './HistoryPage';
import CheckinDetailPage from './CheckinDetailPage';
import FoodLogPage from './FoodLogPage';
import GracePage from './GracePage';
import ExerciseHistoryPage from './ExerciseHistoryPage';

const TABS = [
  { key: 'home',        icon: '🏠', labelKey: 'home'       },
  { key: 'fasting',     icon: '⏱', labelKey: 'fasting'     },
  { key: 'meditation',  icon: '☯', labelKey: 'meditation'  },
  { key: 'reflections', icon: '✦', labelKey: 'reflections' },
  { key: 'exercise',    icon: '🏃', labelKey: 'exercise'    },
  { key: 'habits',      icon: '◇', labelKey: 'habits'      },
  { key: 'stats',       icon: '◈', labelKey: 'stats'       },
  { key: 'settings',    icon: '⚙', labelKey: 'settings'    },
];

export default function AppShell() {
  const store = useWebStore();
  const router = useRouter();
  const isSignedIn = store.auth.isSignedIn;
  const TH = THEMES[store.theme];
  const lang = store.language;
  const T = (k: string) => t(k, lang);

  const [tab, setTab] = useState(0);
  const [newMindTrigger, setNewMindTrigger] = useState(0);
  const overlayState = useOverlayState();
  const { maxWidth } = useResponsive();
  const sync = useSync();
  useReminder();

  // Initialize PocketBase for community features
  useEffect(() => {
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (pbUrl) setPocketbaseUrl(pbUrl);
  }, []);

  // Sync theme CSS variables
  useEffect(() => {
    document.documentElement.dataset.theme = store.theme;
  }, [store.theme]);

  // Auth expiry check on startup
  useEffect(() => {
    if (!isSignedIn) return;
    const expiresAt = store.auth.expiresAt;
    if (!expiresAt || expiresAt < Date.now()) {
      store.refreshAuth().catch(() => store.logout());
    } else if (expiresAt - Date.now() < 3600000) {
      store.refreshAuth().catch((e) => console.error('[err]', e));
    }
  }, []);

  // Auth guard
  useEffect(() => {
    if (!isSignedIn) router.push('/login');
  }, [isSignedIn, router]);

  const handleFabClick = useCallback(() => {
    setNewMindTrigger(n => n + 1);
    setTab(3);
  }, []);

  if (!isSignedIn) return null;

  // Render overlay pages
  const renderOverlay = () => {
    const { overlay, overlayProps } = overlayState;
    switch (overlay) {
      case 'globalMap':
        return <GlobalMapPage onClose={overlayState.close} title={overlayState.overlayProps.globalMapTitle} icon={overlayState.overlayProps.globalMapIcon} />;
      case 'checkin':
        return <CheckinPage onClose={overlayState.close} />;
      case 'sport':
        return overlayProps.sport ? <SportPage sport={overlayProps.sport} onClose={overlayState.close} /> : null;
      case 'fastHistory':
        return <FastHistoryPage onClose={overlayState.close} />;
      case 'medHistory':
        return <MedHistoryPage onClose={overlayState.close} />;
      case 'checkinDetail':
        return overlayProps.checkinDetailDate
          ? <CheckinDetailPage date={overlayProps.checkinDetailDate} onClose={overlayState.close} />
          : null;
      case 'history':
        return <HistoryPage onClose={overlayState.close} />;
      case 'foodLog':
        return <FoodLogPage onClose={overlayState.close} />;
      case 'grace':
        return <GracePage onClose={overlayState.close} />;
      case 'exerciseHistory':
        return <ExerciseHistoryPage onClose={overlayState.close} />;
      default:
        return null;
    }
  };

  return (
    <OverlayContext.Provider value={overlayState}>
      <ErrorBoundary>
        <div style={{ maxWidth, margin: '0 auto', fontFamily: '-apple-system,system-ui,sans-serif', background: TH.bg, minHeight: '100dvh', color: TH.text, fontSize: 16, position: 'relative', paddingBottom: 80 }}>
          <AppHeader />

          {/* Header Tabs */}
          <div style={{ display: 'flex', padding: '12px 12px 0', gap: 4, flexShrink: 0, overflowX: 'auto', position: 'relative', zIndex: 1 }}>
            {TABS.map((t, i) => (
              <button key={t.key} onClick={() => setTab(i)}
                style={{ flexShrink: 0, padding: '7px 18px', border: 'none', borderRadius: 12, fontSize: 15, cursor: 'pointer',
                  background: tab === i ? TH.primary : TH.card, color: tab === i ? '#fff' : TH.sub, whiteSpace: 'nowrap' as const }}>
                {t.icon} {T(t.labelKey)}
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 16px 0', fontSize: 16, color: TH.sub, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {T('today')} · {new Date().toLocaleDateString(store.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>

          {/* Content */}
          <div style={{ padding: '12px 16px', position: 'relative', zIndex: 1 }}>
            {tab === 0 && <HomeTab />}
            {tab === 1 && <FastingTab />}
            {tab === 2 && <MeditateTab />}
            {tab === 3 && <ReflectionsTab newMindTrigger={newMindTrigger} />}
            {tab === 4 && <ExerciseTab />}
            {tab === 5 && <HabitsTab />}
            {tab === 6 && <StatsTab />}
            {tab === 7 && <SettingsTab onOpenStats={() => setTab(6)} syncState={sync} />}
          </div>

          <BottomNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
          <FabButton onClick={handleFabClick} />
        </div>

        {/* Overlay layer — renders on top without unmounting tab content */}
        {overlayState.overlay && renderOverlay()}
      </ErrorBoundary>
    </OverlayContext.Provider>
  );
}

function FabButton({ onClick }: { onClick: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const drag = useRef(false);

  const onMove = useCallback((clientX: number, clientY: number) => {
    drag.current = true;
    const vw = window.innerWidth, vh = window.innerHeight;
    const nx = Math.max(0, Math.min(vw - 52, clientX - 26));
    const ny = Math.max(0, Math.min(vh - 52, clientY - 26));
    setPos({ x: nx, y: ny });
  }, []);

  const onEnd = useCallback(() => {
    setTimeout(() => { drag.current = false; }, 0);
  }, []);

  const fabStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', width: 52, height: 52, borderRadius: 26,
        border: 'none', background: `linear-gradient(135deg,${P}99,${P})`, color: '#fff', fontSize: 24, cursor: 'pointer',
        zIndex: 60, boxShadow: `0 4px 20px ${P}80`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'none' }
    : { position: 'fixed', bottom: 80, right: 'max(16px, calc((100% - 390px) / 2 + 16px))', width: 52, height: 52, borderRadius: 26,
        border: 'none', background: `linear-gradient(135deg,${P}99,${P})`, color: '#fff', fontSize: 24, cursor: 'pointer',
        zIndex: 60, boxShadow: `0 4px 20px ${P}80`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'none' };

  return (
    <button
      onMouseDown={(e) => { startPos.current = { x: e.clientX, y: e.clientY }; }}
      onMouseMove={(e) => { if (e.buttons !== 1) return; const dx = Math.abs(e.clientX - startPos.current.x), dy = Math.abs(e.clientY - startPos.current.y); if (dx > 4 || dy > 4) onMove(e.clientX, e.clientY); }}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={(e) => { const t = e.touches[0]; startPos.current = { x: t.clientX, y: t.clientY }; }}
      onTouchMove={(e) => { const t = e.touches[0]; const dx = Math.abs(t.clientX - startPos.current.x), dy = Math.abs(t.clientY - startPos.current.y); if (dx > 4 || dy > 4) onMove(t.clientX, t.clientY); }}
      onTouchEnd={(e) => { if (!drag.current) onClick(); onEnd(); }}
      onClick={(e) => { if (drag.current) { e.preventDefault(); return; } onClick(); }}
      style={fabStyle}>
      ✦
    </button>
  );
}
