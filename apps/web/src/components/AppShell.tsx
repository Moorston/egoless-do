'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWebStore } from '../store/useWebStore';
import { THEMES, t, setPocketbaseUrl } from '@egoless-do/core';
import type { ThemeName, SportItem } from '@egoless-do/core';
import { useReminder } from './useReminder';
import { ErrorBoundary, useResponsive } from './helpers';
import { useSync } from './useSync';
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

const BOTTOM_NAV_KEYS = ['home', 'fasting', 'meditation', 'exercise', 'settings'];

export default function AppShell() {
  const store = useWebStore();
  const router = useRouter();
  const isSignedIn = store.auth.isSignedIn;
  const TH    = THEMES[store.theme];
  const P     = TH.primary;
  const lang  = store.language;
  const T     = (k: string) => t(k, lang);

  const [tab,           setTab]          = useState(0);
  const [showGlobalMap, setShowGlobalMap] = useState(false);
  const [showCheckin,   setShowCheckin]   = useState(false);
  const [showSport,     setShowSport]     = useState<SportItem | null>(null);
  const [showFastHistory, setShowFastHistory] = useState(false);
  const [showMedHistory, setShowMedHistory] = useState(false);
  const [showHistory,   setShowHistory]   = useState(false);
  const [showCheckinDetail, setShowCheckinDetail] = useState(false);
  const [checkinDetailDate, setCheckinDetailDate] = useState('');
  const [showFoodLog,   setShowFoodLog]   = useState(false);
  const [showGrace,     setShowGrace]     = useState(false);
  const [showNewMind,   setShowNewMind]   = useState(false);
  const [mindContent,   setMindContent]   = useState('');
  const [mindSelTags,   setMindSelTags]   = useState<string[]>([]);
  const [mindMood,      setMindMood]      = useState('');
  const [mindColorIdx,  setMindColorIdx]  = useState(0);

  const { maxWidth } = useResponsive();
  const sync = useSync();
  useReminder();

  // Initialize PocketBase for community features
  useEffect(() => {
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (pbUrl) setPocketbaseUrl(pbUrl);
  }, []);

  // Auth expiry check on startup
  useEffect(() => {
    if (!isSignedIn) return;
    const expiresAt = store.auth.expiresAt;
    if (!expiresAt || expiresAt < Date.now()) {
      // Token already expired — try refresh, else logout
      store.refreshAuth().catch(() => store.logout());
    } else if (expiresAt - Date.now() < 3600000) {
      // Expires within 1 hour — proactively refresh
      store.refreshAuth().catch((e) => console.error('[err]', e));
    }
  }, []);

  // Auth guard: redirect to login if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return null; // Don't render anything while redirecting
  }

  const BTN_TABS = TABS.filter(t => BOTTOM_NAV_KEYS.includes(t.key));

  if (showGlobalMap) {
    return <GlobalMapPage TH={TH} P={P} onClose={() => setShowGlobalMap(false)} />;
  }
  if (showCheckin) {
    return <CheckinPage onClose={() => setShowCheckin(false)} />;
  }
  if (showSport) {
    return <SportPage sport={showSport} onClose={() => setShowSport(null)} />;
  }
  if (showFastHistory) {
    return <FastHistoryPage onClose={() => setShowFastHistory(false)} />;
  }
  if (showMedHistory) {
    return <MedHistoryPage onClose={() => setShowMedHistory(false)} />;
  }
  if (showCheckinDetail) {
    return <CheckinDetailPage date={checkinDetailDate} onClose={() => setShowCheckinDetail(false)} />;
  }
  if (showHistory) {
    return <HistoryPage onClose={() => setShowHistory(false)} onOpenDetail={(date) => { setCheckinDetailDate(date); setShowCheckinDetail(true); }} />;
  }
  if (showFoodLog) {
    return <FoodLogPage onClose={() => setShowFoodLog(false)} />;
  }
  if (showGrace) {
    return <GracePage onClose={() => setShowGrace(false)} />;
  }

  return (
    <ErrorBoundary>
      <div style={{ maxWidth, margin: '0 auto', fontFamily: '-apple-system,system-ui,sans-serif', background: TH.bg, minHeight: '100dvh', color: TH.text, fontSize: 16, position: 'relative', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, color: TH.sub, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500 }}>Egoless Do</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{T('appName')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, color: TH.sub }}>{T('streak')}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: P, lineHeight: 1.2 }}>{store.streak} <span style={{ fontSize: 16 }}>{T('days')} 🔥</span></div>
          </div>
        </div>

        {/* Header Tabs */}
        <div style={{ display: 'flex', padding: '12px 12px 0', gap: 4, flexShrink: 0, overflowX: 'auto', position: 'relative', zIndex: 1 }}>
          {TABS.map((t, i) => (
            <button key={t.key} onClick={() => setTab(i)}
              style={{ flexShrink: 0, padding: '7px 18px', border: 'none', borderRadius: 12, fontSize: 15, cursor: 'pointer',
                background: tab === i ? P : TH.card, color: tab === i ? '#fff' : TH.sub, whiteSpace: 'nowrap' as const }}>
              {t.icon} {T(t.labelKey)}
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 16px 0', fontSize: 16, color: TH.sub, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {T('today')} · {new Date().toLocaleDateString(store.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })}
        </div>

        {/* Content */}
        <div style={{ padding: '12px 16px', position: 'relative', zIndex: 1 }}>
          {tab === 0 && <HomeTab onOpenCheckin={() => setShowCheckin(true)} />}
          {tab === 1 && <FastingTab onOpenGlobalMap={() => setShowGlobalMap(true)} onOpenFastHistory={() => setShowFastHistory(true)} />}
          {tab === 2 && <MeditateTab onOpenGlobalMap={() => setShowGlobalMap(true)} onOpenMedHistory={() => setShowMedHistory(true)} />}
          {tab === 3 && <ReflectionsTab
            showNew={showNewMind}
            setShowNew={setShowNewMind}
            content={mindContent}
            setContent={setMindContent}
            selTags={mindSelTags}
            setSelTags={setMindSelTags}
            mood={mindMood}
            setMood={setMindMood}
            colorIdx={mindColorIdx}
            setColorIdx={setMindColorIdx}
          />}
          {tab === 4 && <ExerciseTab onOpenGlobalMap={() => setShowGlobalMap(true)} onOpenSport={(s) => setShowSport(s)} />}
          {tab === 5 && <HabitsTab />}
          {tab === 6 && <StatsTab />}
          {tab === 7 && <SettingsTab onOpenStats={() => setTab(6)} onOpenHistory={() => setShowHistory(true)} onOpenFoodLog={() => setShowFoodLog(true)} onOpenGrace={() => setShowGrace(true)} syncState={sync} />}
        </div>

        {/* Bottom Nav */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth,
          background: TH.navBg, backdropFilter: 'blur(20px)', borderTop: `1px solid ${TH.border}`,
          display: 'flex', padding: '8px 0 18px', zIndex: 50 }}>
          {BTN_TABS.map((t) => {
            const idx = TABS.findIndex(x => x.key === t.key);
            return (
              <button key={t.key} onClick={() => setTab(idx)}
                style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
                  color: tab === idx ? P : TH.sub,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <span style={{ fontSize: 15 }}>{T(t.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* FAB */}
        <FabButton onClick={() => { setShowNewMind(true); setTab(3); }} />
      </div>
    </ErrorBoundary>
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
