'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useWebStore } from '../store/useWebStore';
import { THEMES, t, setPocketbaseUrl, FONT_BODY, FONT_SUB, FONT_CLOSE, createLogger } from '@egoless-do/core';

const log = createLogger('Web');
import { useReminder } from './useReminder';
import { ErrorBoundary, useResponsive } from './helpers';
import {
  Home, Timer, Brain, Dumbbell, Settings, Plus, ClipboardList, Target, Sparkles,
} from 'lucide-react';
import { OverlayContext, useOverlayState } from './useOverlay';
import AppHeader from './AppHeader';
import HeaderTabs from './HeaderTabs';
import BottomNav from './BottomNav';
import StarfieldBackground from './StarfieldBackground';
import HomeTab from './HomeTab';
import FastingTab from './FastingTab';
import MeditateTab from './MeditateTab';
import ExerciseTab from './ExerciseTab';
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
const PrivacyPolicyPage = dynamic(() => import('./PrivacyPolicyPage'), { ssr: false });
const StatsPage = dynamic(() => import('./StatsPage'), { ssr: false });
const PlanTab = dynamic(() => import('./PlanTab'), { ssr: false });
const HabitsTab = dynamic(() => import('./HabitsTab'), { ssr: false });
const ReflectionsTab = dynamic(() => import('./ReflectionsTab'), { ssr: false });

const TABS = [
  { key: 'home',        Icon: Home,          labelKey: 'home'       },
  { key: 'exercise',    Icon: Dumbbell,       labelKey: 'exercise'    },
  { key: 'meditation',  Icon: Brain,          labelKey: 'meditation'  },
  { key: 'fasting',     Icon: Timer,          labelKey: 'fasting'     },
  { key: 'settings',    Icon: Settings,       labelKey: 'settings'    },
  { key: 'plan',        Icon: ClipboardList,  labelKey: 'plan'       },
  { key: 'habits',      Icon: Target,         labelKey: 'habits'     },
  { key: 'reflections', Icon: Sparkles,       labelKey: 'reflections' },
];

export default function AppShell() {
  const router = useRouter();

  // 使用选择器订阅，避免全量订阅导致的不必要重渲染
  const isSignedIn = useWebStore((s) => s.auth.isSignedIn);
  const theme = useWebStore((s) => s.theme);
  const language = useWebStore((s) => s.language);
  const auth = useWebStore((s) => s.auth);
  const refreshAuth = useWebStore((s) => s.refreshAuth);
  const logout = useWebStore((s) => s.logout);

  const TH = THEMES[theme];
  const T = (k: string) => t(k, language);

  const [tab, setTab] = useState(0);
  const [headerTab, setHeaderTab] = useState('home');
  const overlayState = useOverlayState();
  const { maxWidth } = useResponsive();
  useReminder();
  const scrollPosRef = useRef<Map<number, number>>(new Map());

  // Switch tab and preserve scroll position
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const switchTab = useCallback((targetIndex: number) => {
    scrollPosRef.current.set(tabRef.current, window.scrollY);
    setHeaderTab('home');
    setTab(targetIndex);
    requestAnimationFrame(() => {
      const savedY = scrollPosRef.current.get(targetIndex) ?? 0;
      window.scrollTo(0, savedY);
    });
  }, []);

  // Initialize PocketBase for community features
  useEffect(() => {
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (pbUrl) setPocketbaseUrl(pbUrl);
  }, []);

  // Sync theme CSS variables
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Auth expiry check on startup
  useEffect(() => {
    if (!isSignedIn) return;
    const expiresAt = auth.expiresAt;
    if (!expiresAt || expiresAt < Date.now()) {
      refreshAuth().catch(() => logout());
    } else if (expiresAt - Date.now() < 3600000) {
      refreshAuth().catch((e) => log.error(e));
    }
  }, [isSignedIn, auth.expiresAt]);

  // Auth guard
  useEffect(() => {
    if (!isSignedIn) router.push('/login');
  }, [isSignedIn, router]);

  const handleFabClick = useCallback(() => {
    switchTab(2);
  }, [switchTab]);

  if (!isSignedIn) return null;

  // Render overlay pages
  const renderOverlay = () => {
    const { overlay, overlayProps } = overlayState;
    switch (overlay) {
      case 'globalMap':
        return <GlobalMapPage onClose={overlayState.close} title={overlayState.overlayProps.globalMapTitle} icon={overlayState.overlayProps.globalMapIcon} />;
      case 'checkin':
        return <CheckinPage onClose={overlayState.close} graceDate={overlayProps.checkinGraceDate} />;
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
      case 'privacyPolicy':
        return <PrivacyPolicyPage onClose={overlayState.close} />;
      case 'stats':
        return <StatsPage onClose={overlayState.close} />;
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
          <div style={{ padding: '6px 16px 0', fontSize: FONT_SUB, color: TH.sub, flexShrink: 0, position: 'relative', zIndex: 1, borderBottom: `1px solid ${TH.border}` }}>
            {T('today')} · {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          <div style={{ padding: '12px 0 0', position: 'relative', zIndex: 1 }}>
            <HeaderTabs
              active={headerTab}
              onTabChange={setHeaderTab}
              onNavigateHome={() => { setHeaderTab('home'); switchTab(0); }}
            />
          </div>

          {/* Content */}
          <div style={{ padding: '12px 16px', position: 'relative', zIndex: 1 }}>
            {headerTab === 'home' && (
              <>
                {tab === 0 && <HomeTab />}
                {tab === 1 && <ExerciseTab />}
                {tab === 2 && <MeditateTab />}
                {tab === 3 && <FastingTab />}
                {tab === 4 && <SettingsTab onOpenStats={() => overlayState.open('stats')} />}
              </>
            )}
            {headerTab === 'plan' && <PlanTab />}
            {headerTab === 'habits' && <HabitsTab />}
            {headerTab === 'reflections' && <ReflectionsTab />}
          </div>

          <BottomNav tabs={TABS} activeTab={tab} onTabChange={switchTab} />
          <FabButton onClick={handleFabClick} />
        </div>

        {/* Overlay layer — renders on top without unmounting tab content */}
        {overlayState.overlay && renderOverlay()}
      </ErrorBoundary>
    </OverlayContext.Provider>
  );
}

function OverlayWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const theme = useWebStore((s) => s.theme);
  const language = useWebStore((s) => s.language);
  const TH = THEMES[theme];
  const T = (k: string) => t(k, language);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 420, background: TH.bg, minHeight: '100dvh', paddingBottom: 32 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: TH.bg }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: TH.sub, cursor: 'pointer' }}>✕</button>
          </div>
          <AppHeader />
          <div style={{ padding: '6px 16px 0', fontSize: FONT_SUB, color: TH.sub, borderBottom: `1px solid ${TH.border}` }}>
            {T('today')} · {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
        </div>
        <div style={{ padding: '0 16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FabButton({ onClick }: { onClick: () => void }) {
  const theme = useWebStore((s) => s.theme);
  const TH = THEMES[theme];
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
      onTouchEnd={(e) => { if (!drag.current) onClick(); onEnd(); e.preventDefault(); }}
      onClick={(e) => { if (drag.current) { e.preventDefault(); return; } onClick(); }}
      style={fabStyle}>
      <Plus size={24} color="#fff" />
    </button>
  );
}
