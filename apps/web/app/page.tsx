'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore, THEMES, t } from '@egoless/core';
import type { SportItem } from '@egoless/core';
import {
  HomeIcon, ClockIcon, SparklesIcon, HeartIcon,
  BoltIcon, CheckCircleIcon, ChartBarIcon, Cog6ToothIcon,
} from '@heroicons/react/24/solid';
import Starfield from '../components/Starfield';
import { useReminder } from './components/useReminder';
import HomeTab from './components/HomeTab';
import FastingTab from './components/FastingTab';
import MeditateTab from './components/MeditateTab';
import ReflectionsTab from './components/ReflectionsTab';
import ExerciseTab from './components/ExerciseTab';
import HabitsTab from './components/HabitsTab';
import StatsTab from './components/StatsTab';
import SettingsTab from './components/SettingsTab';
import GlobalMapPage from './components/GlobalMapPage';
import CheckinPage from './components/CheckinPage';
import SportPage from './components/SportPage';
import FastHistoryPage from './components/FastHistoryPage';
import MedHistoryPage from './components/MedHistoryPage';
import HistoryPage from './components/HistoryPage';
import FoodLogPage from './components/FoodLogPage';
import GracePage from './components/GracePage';

const ICON_SIZE = 20;

const TABS = [
  { key: 'home', icon: HomeIcon, label: '首页' },
  { key: 'fasting', icon: ClockIcon, label: '禁食' },
  { key: 'meditate', icon: SparklesIcon, label: '冥想' },
  { key: 'reflections', icon: HeartIcon, label: '感念' },
  { key: 'exercise', icon: BoltIcon, label: '锻炼' },
  { key: 'habits', icon: CheckCircleIcon, label: '习惯' },
  { key: 'stats', icon: ChartBarIcon, label: '统计' },
  { key: 'settings', icon: Cog6ToothIcon, label: '设置' },
];
const BTN_TABS = TABS.filter((_, i) => [0, 1, 2, 4, 7].includes(i));

export default function App() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;

  const [tab, setTab] = useState(0);
  const [showGlobalMap, setShowGlobalMap] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showSport, setShowSport] = useState<SportItem | null>(null);
  const [showFastHistory, setShowFastHistory] = useState(false);
  const [showMedHistory, setShowMedHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFoodLog, setShowFoodLog] = useState(false);
  const [showGrace, setShowGrace] = useState(false);
  const [showNewMind, setShowNewMind] = useState(false);
  const [mindContent, setMindContent] = useState('');
  const [mindSelTags, setMindSelTags] = useState<string[]>([]);
  const [mindMood, setMindMood] = useState('');
  const [mindColorIdx, setMindColorIdx] = useState(0);
  const streak = useAppStore((s) => s.streak);
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  useReminder();

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

  if (showHistory) {
    return <HistoryPage onClose={() => setShowHistory(false)} />;
  }

  if (showFoodLog) {
    return <FoodLogPage onClose={() => setShowFoodLog(false)} />;
  }

  if (showGrace) {
    return <GracePage onClose={() => setShowGrace(false)} />;
  }

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', fontFamily: '-apple-system,system-ui,sans-serif', background: TH.bg, minHeight: '100dvh', color: TH.text, fontSize: 16, position: 'relative', paddingBottom: 80 }}>
      {TH.starfield && <Starfield />}

      {/* Header */}
      <div style={{ padding: '20px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 13, color: TH.sub, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500 }}>Egoless Do</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{T('appName')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: TH.sub }}>{T('streak')}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: P, lineHeight: 1.2 }}>{streak} <span style={{ fontSize: 16 }}>{T('days')} 🔥</span></div>
        </div>
      </div>

      {/* Header Tabs */}
      <div className="scroll-x" style={{ display: 'flex', padding: '12px 12px 0', gap: 4, flexShrink: 0, overflowX: 'auto', position: 'relative', zIndex: 1 }}>
        {TABS.map((t, i) => (
          <button key={t.key} onClick={() => setTab(i)}
            style={{ flexShrink: 0, padding: '7px 20px', border: 'none', borderRadius: 12, fontSize: 16, cursor: 'pointer',
              background: tab === i ? P : TH.card, color: tab === i ? '#fff' : TH.sub,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 44 }}>
            <t.icon style={{ width: ICON_SIZE, height: ICON_SIZE }} />{t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '8px 16px 0', fontSize: 14, color: TH.sub, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        今天 · {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
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
        {tab === 7 && <SettingsTab onOpenStats={() => setTab(6)} onOpenHistory={() => setShowHistory(true)} onOpenFoodLog={() => setShowFoodLog(true)} onOpenGrace={() => setShowGrace(true)} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390,
        background: TH.navBg, backdropFilter: 'blur(20px)', borderTop: `1px solid ${TH.border}`,
        display: 'flex', padding: '8px 0 18px', zIndex: 50 }}>
        {BTN_TABS.map((t, i) => (
          <button key={t.key} onClick={() => setTab(TABS.findIndex((x) => x.key === t.key))}
            style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === TABS.findIndex((x) => x.key === t.key) ? P : TH.sub,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
            <t.icon style={{ width: 22, height: 22 }} />
            <span style={{ fontSize: 16 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* FAB */}
      <FabButton onClick={() => { setShowNewMind(true); setTab(3); }} />
    </div>
  );
}

function FabButton({ onClick }: { onClick: () => void }) {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const pos = useRef({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const drag = useRef(false);

  const onMove = useCallback((clientX: number, clientY: number) => {
    const btn = btnRef.current;
    if (!btn) return;
    drag.current = true;
    const vw = window.innerWidth, vh = window.innerHeight;
    const r = btn.getBoundingClientRect();
    const nx = Math.max(0, Math.min(vw - 52, clientX - 26));
    const ny = Math.max(0, Math.min(vh - 52, clientY - 26));
    btn.style.left = nx + 'px';
    btn.style.top = ny + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }, []);

  const onEnd = useCallback(() => {
    setTimeout(() => { drag.current = false; }, 0);
  }, []);

  return (
    <button ref={btnRef}
      onMouseDown={(e) => { pos.current = { x: e.clientX, y: e.clientY }; }}
      onMouseMove={(e) => { if (e.buttons !== 1) return; const dx = Math.abs(e.clientX - pos.current.x), dy = Math.abs(e.clientY - pos.current.y); if (dx > 4 || dy > 4) onMove(e.clientX, e.clientY); }}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={(e) => { const t = e.touches[0]; pos.current = { x: t.clientX, y: t.clientY }; }}
      onTouchMove={(e) => { const t = e.touches[0]; const dx = Math.abs(t.clientX - pos.current.x), dy = Math.abs(t.clientY - pos.current.y); if (dx > 4 || dy > 4) { onMove(t.clientX, t.clientY); } }}
      onTouchEnd={(e) => {
        if (!drag.current) onClick();
        onEnd();
      }}
      onClick={(e) => { if (drag.current) { e.preventDefault(); return; } onClick(); }}
      style={{ position: 'fixed', bottom: 80, right: 'max(16px, calc((100% - 390px) / 2 + 16px))', width: 52, height: 52, borderRadius: 26,
        border: 'none', background: `linear-gradient(135deg,${P}99,${P})`, color: '#fff', fontSize: 24, cursor: 'pointer',
        zIndex: 60, boxShadow: `0 4px 20px ${P}80`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'none' }}>
      ✦
    </button>
  );
}
