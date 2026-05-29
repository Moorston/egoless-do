'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useWebStore } from '../store/useWebStore';
import { THEMES, t, setPocketbaseUrl, FONT_BODY, FONT_BUTTON, FONT_CLOSE } from '@egoless-do/core';
import { useReminder } from './useReminder';
import { ErrorBoundary, useResponsive } from './helpers';
import {
  Home, ClipboardList, Timer, Brain, Sparkles, Dumbbell,
  Target, BarChart3, Settings, Plus,
} from 'lucide-react';
import { useSync } from './useSync';
import { OverlayContext, useOverlayState } from './useOverlay';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import StarfieldBackground from './StarfieldBackground';
import HomeTab from './HomeTab';
import FastingTab from './FastingTab';
import MeditateTab from './MeditateTab';
import ReflectionsTab from './ReflectionsTab';
import ExerciseTab from './ExerciseTab';
import HabitsTab from './HabitsTab';
import SettingsTab from './SettingsTab';

// Lazy-loaded overlay pages (not needed on initial render)
const GlobalMapPage = dynamic(() => import('./GlobalMapPage'), { ssr: false });
const CheckinPage = dynamic(() => import('./CheckinPage'), { ssr: false });
const SportPage = dynamic(() => import('./SportPage'), { ssr: false });
const FastHistoryPage = dynamic(() => import('./FastHistoryPage'), { ssr: false });
const MedHistoryPage = dynamic(() => import('./MedHistoryPage'), { ssr: false });
const HistoryPage = dynamic(() => import('./HistoryPage'), { ssr: false });
const CheckinDetailPage = dynamic(() => import('./CheckinDetailPage'), { ssr: false });
const FoodLogPage = dynamic(() => import('./FoodLogPage'), { ssr: false });
const GracePage = dynamic(() => import('./GracePage'), { ssr: false });
const ExerciseHistoryPage = dynamic(() => import('./ExerciseHistoryPage'), { ssr: false });
const StreakBreakPage = dynamic(() => import('./StreakBreakPage'), { ssr: false });
const PlanCreatePage = dynamic(() => import('./PlanCreatePage'), { ssr: false });
const PlanDetailPage = dynamic(() => import('./PlanDetailPage'), { ssr: false });
const PlanHistoryPage = dynamic(() => import('./PlanHistoryPage'), { ssr: false });
import PlanTab from './PlanTab';

const TABS = [
  { key: 'home',        Icon: Home,          labelKey: 'home'       },
  { key: 'plan',        Icon: ClipboardList,  labelKey: 'plan'       },
  { key: 'fasting',     Icon: Timer,          labelKey: 'fasting'     },
  { key: 'meditation',  Icon: Brain,          labelKey: 'meditation'  },
  { key: 'reflections', Icon: Sparkles,       labelKey: 'reflections' },
  { key: 'exercise',    Icon: Dumbbell,       labelKey: 'exercise'    },
  { key: 'habits',      Icon: Target,         labelKey: 'habits'      },
  { key: 'settings',    Icon: Settings,       labelKey: 'settings'    },
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
      case 'streakBreak':
        return <StreakBreakPage onClose={overlayState.close} />;
      case 'planCreate':
        return <PlanCreatePage planId={overlayProps.planId} onClose={overlayState.close} />;
      case 'planDetail':
        return overlayProps.planId
          ? <PlanDetailPage planId={overlayProps.planId} onClose={overlayState.close} />
          : null;
      case 'planHistory':
        return <PlanHistoryPage onClose={overlayState.close} />;
      default:
        return null;
    }
  };

  return (
    <OverlayContext.Provider value={overlayState}>
      <ErrorBoundary>
        <div style={{ maxWidth, margin: '0 auto', fontFamily: '-apple-system,system-ui,sans-serif', background: TH.bg, minHeight: '100dvh', color: TH.text, fontSize: FONT_BODY, position: 'relative', paddingBottom: 80 }}>
          {TH.starfield && <StarfieldBackground />}
          <AppHeader />

          {/* Header Tabs */}
          <div style={{ display: 'flex', padding: '12px 12px 0', gap: 4, flexShrink: 0, overflowX: 'auto', position: 'relative', zIndex: 1 }}>
            {TABS.filter(t => t.key !== 'stats' && t.key !== 'settings').map((t) => {
              const i = TABS.indexOf(t);
              return (
              <button key={t.key} onClick={() => {
                setTab(i);
              }}
                style={{ flexShrink: 0, padding: '7px 18px', border: 'none', borderRadius: 12, fontSize: FONT_BUTTON, cursor: 'pointer',
                  background: tab === i ? TH.primary : TH.card, color: tab === i ? '#fff' : TH.sub, whiteSpace: 'nowrap' as const }}>
                <t.Icon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {T(t.labelKey)}
              </button>
              );
            })}
          </div>
          <div style={{ padding: '8px 16px 0', fontSize: FONT_BODY, color: TH.sub, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {T('today')} · {new Date().toLocaleDateString(store.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>

          {/* Content */}
          <div style={{ padding: '12px 16px', position: 'relative', zIndex: 1 }}>
            {tab === 0 && <HomeTab />}
            {tab === 1 && <PlanTab />}
            {tab === 2 && <FastingTab />}
            {tab === 3 && <MeditateTab />}
            {tab === 4 && <ReflectionsTab newMindTrigger={newMindTrigger} />}
            {tab === 5 && <ExerciseTab />}
            {tab === 6 && <HabitsTab />}
            {tab === 7 && <SettingsTab syncState={sync} />}
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
        border: 'none', background: `linear-gradient(135deg,${P}99,${P})`, color: '#fff', fontSize: FONT_CLOSE, cursor: 'pointer',
        zIndex: 60, boxShadow: `0 4px 20px ${P}80`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'none' }
    : { position: 'fixed', bottom: 80, right: 'max(16px, calc((100% - 390px) / 2 + 16px))', width: 52, height: 52, borderRadius: 26,
        border: 'none', background: `linear-gradient(135deg,${P}99,${P})`, color: '#fff', fontSize: FONT_CLOSE, cursor: 'pointer',
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
      <Plus size={24} />
    </button>
  );
}
