'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { THEMES, LANG_LIST, COLORS } from '@egoless-do/core';
import type { ThemeName } from '@egoless-do/core';
import { Toggle, useTheme, useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import type { SyncState } from '../db/syncService';

interface SettingsRow {
  label: string;
  right: React.ReactNode;
  icon?: string;
  sub?: string;
  onClick?: () => void;
  last?: boolean;
}

export default function SettingsTab({ onOpenStats, onOpenHistory, onOpenFoodLog, onOpenGrace, syncState }: { onOpenStats?: () => void; onOpenHistory?: () => void; onOpenFoodLog?: () => void; onOpenGrace?: () => void; syncState?: SyncState & { triggerSync: () => Promise<void> } }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeEdit, setTimeEdit] = useState(store.remindTime);
  const [showLang, setShowLang] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showWeightUnit, setShowWeightUnit] = useState(false);
  const [healthSync, setHealthSync] = useState(false);

  const sections = [
    { title: T('settingsRemind'), rows: [
      { label: T('settingsRemindOn'), right: <Toggle on={store.remindEnabled} onChange={() => {
        if (!store.remindEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        store.setRemindEnabled(!store.remindEnabled);
      }} /> },
      { label: T('settingsRemindTime'), right: <span style={{ color: TH.sub, cursor: 'pointer' }} onClick={() => { setTimeEdit(store.remindTime); setShowTimePicker(true); }}>{store.remindTime} {T('commonEdit')}</span>, last: true },
    ]},
    { title: T('settingsData'), rows: [
      { label: T('settingsStats'), icon: '📊', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenStats },
      { label: T('settingsHistory'), icon: '📅', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenHistory },
      { label: T('settingsFoodLog'), icon: '🍽', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenFoodLog },
      { label: T('settingsFreeze'), icon: '❄️', sub: T('settingsFreezeDesc'), right: <span style={{ color: TH.sub }}>›</span> },
      { label: T('settingsGrace'), icon: '🛡', sub: T('settingsGraceDesc'), right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenGrace },
      { label: T('settingsStreakBreak'), icon: '❤️', sub: T('settingsStreakBreakDesc'), right: <span style={{ color: TH.sub }}>›</span>, last: true },
    ]},
    { title: T('settingsGeneral'), rows: [
      { label: T('settingsLanguage'), right: <span style={{ color: TH.sub }}>{LANG_LIST.find(l => l.code === store.language)?.flag} {LANG_LIST.find(l => l.code === store.language)?.name} ›</span>, onClick: () => setShowLang(true) },
      { label: T('settingsTheme'), right: <span style={{ color: TH.sub }}>{THEMES[store.theme].name} ›</span>, onClick: () => setShowTheme(true) },
      { label: T('settingsWeightUnit'), right: <span style={{ color: TH.sub }}>{T(store.weightUnit === 'kg' ? 'weightUnitKg' : 'weightUnitLb')} ›</span>, onClick: () => setShowWeightUnit(true) },
    ]},
    { title: T('settingsSync'), rows: [
      { label: T('settingsAppleHealth'), sub: healthSync ? T('settingsConnected') : T('settingsNotEnabled'), right: <Toggle on={healthSync} onChange={() => setHealthSync(v => !v)} /> },
      ...(syncState ? [
        { label: T('settingsSyncStatus'), sub: syncState.online ? (syncState.status === 'syncing' ? T('settingsSyncing') : syncState.status === 'error' ? `错误: ${syncState.error}` : T('settingsConnected')) : T('settingsOffline'), right: <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: syncState.online ? (syncState.status === 'error' ? '#EF4444' : '#10B981') : '#6B7280' }} /> },
        { label: T('settingsPending'), right: <span style={{ color: TH.sub }}>{syncState.pendingCount} {T('settingsPendingUnit')}</span> },
        { label: T('settingsLastSync'), right: <span style={{ color: TH.sub }}>{syncState.lastSyncAt ? new Date(syncState.lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : T('settingsNeverSync')}</span> },
        { label: T('settingsManualSync'), icon: '🔄', right: <span style={{ color: P, cursor: 'pointer', fontSize: 16 }}>{syncState.status === 'syncing' ? T('settingsSyncing') : T('settingsSyncNow')}</span>, onClick: () => { if (syncState.status !== 'syncing') syncState.triggerSync(); }, last: true },
      ] : []),
    ]},
    { title: T('settingsAbout'), rows: [
      { label: T('settingsShareFriend'), icon: '🤝', sub: T('settingsShareDesc'), right: <span style={{ color: TH.sub }}>›</span>, onClick: async () => {
        const url = 'https://egoless-do.app';
        try {
          if (navigator.share) {
            await navigator.share({ title: '心流纪 Egoless Do', url });
          } else {
            await navigator.clipboard.writeText(url);
            alert('链接已复制');
          }
        } catch { /* cancelled */ }
      }},
      { label: T('settingsShare'), icon: '🧘', right: <span style={{ color: TH.sub }}>›</span> },
      { label: T('settingsVersion'), right: <span style={{ color: TH.sub }}>1.0.0</span> },
      { label: T('settingsPrivacy'), right: <span style={{ color: TH.sub }}>›</span> },
      { label: T('settingsResetWelcome'), icon: '🔄', sub: T('settingsResetWelcomeDesc'), right: <span style={{ color: TH.sub }}>›</span>, last: true },
    ]},
    { title: T('settingsAccount'), rows: [
      { label: T('settingsClearData'), icon: '🗑', sub: T('settingsClearDataDesc'), right: <span style={{ color: '#EF4444' }}>{T('settingsClearData')}</span>, onClick: () => { if (confirm(T('settingsClearConfirm'))) store.resetData(); } },
      { label: T('settingsLogout'), icon: '🚪', right: <span style={{ color: '#EF4444' }}>{T('settingsLogout')}</span>, onClick: () => { store.logout(); window.location.href = '/login'; }, last: true },
    ]},
  ];

  return (
    <>
      {/* Profile card */}
      <div style={{ ...cs(TH), display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 } as React.CSSProperties}>
        <div style={{
          width: 56, height: 56, borderRadius: 28,
          background: `${P}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26 }}>🧘</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: TH.text, fontWeight: '700', fontSize: 17 }}>
            {store.auth.user?.name ?? T('settingsDefaultName')}
          </div>
          <div style={{ color: TH.sub, fontSize: 16, marginTop: 3 }}>
            {store.streak} {T('checkinStreak')} · {store.auth.isSignedIn ? T('settingsConnected') : T('settingsOffline')}
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          borderRadius: 12, background: `${P}20`,
        }}>
          <span style={{ color: P, fontSize: 11, fontWeight: '600' }}>{T('settingsFreePlan')}</span>
        </div>
      </div>

      {sections.map(({ title, rows }) => (
        <div key={title} style={{ marginBottom: 4 }}>
          <div style={{ padding: '14px 0 6px', fontSize: 16, color: TH.sub, fontWeight: 600 }}>{title}</div>
          <div style={{ ...cs(TH), padding: '0 16px' } as React.CSSProperties}>
            {rows.map((r: SettingsRow, i) => (
              <div key={i} onClick={r.onClick}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: r.last ? 'none' : `1px solid ${TH.border}`, cursor: r.onClick ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.icon && <span style={{ fontSize: 18 }}>{r.icon}</span>}
                  <div>
                    <div style={{ fontSize: 16, color: TH.text }}>{r.label}</div>
                    {r.sub && <div style={{ fontSize: 16, color: TH.sub, marginTop: 1 }}>{r.sub}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{r.right}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Footer brand */}
      <div style={{ textAlign: 'center', color: TH.sub, fontSize: 11, padding: '16px 0 8px' }}>
        {T('settingsFooter')}
      </div>

      {typeof document !== 'undefined' && showTimePicker && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 300, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: TH.text, marginBottom: 16 }}>{T('settingsSetReminder')}</div>
            <input type="time" value={timeEdit} onChange={(e) => setTimeEdit(e.target.value)}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: 22, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowTimePicker(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('commonCancel')}</button>
              <button onClick={() => { store.setRemindTime(timeEdit); setShowTimePicker(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('commonSave')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && showLang && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('settingsLanguage')}</div>
              <button onClick={() => setShowLang(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            {LANG_LIST.map((l) => (
              <div key={l.code} onClick={() => { store.setLanguage(l.code); setShowLang(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{l.flag}</span>
                  <span style={{ fontSize: 16, color: TH.text }}>{l.name}</span>
                </div>
                {l.code === store.language && <span style={{ color: P, fontSize: 18 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && showTheme && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('settingsTheme')}</div>
              <button onClick={() => setShowTheme(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {Object.entries(THEMES).map(([key, th]) => (
                <div key={key} onClick={() => { store.setTheme(key as ThemeName); setShowTheme(false); }}
                  style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${store.theme === key ? th.primary : 'transparent'}` }}>
                  <div style={{ background: th.bg, height: 56, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
                    <div style={{ width: '60%', height: 5, borderRadius: 3, background: th.primary, marginBottom: 3 }} />
                    <div style={{ width: '40%', height: 3, borderRadius: 2, background: th.card }} />
                  </div>
                  <div style={{ background: TH.card, padding: '5px 8px', fontSize: 16, color: TH.text, textAlign: 'center' }}>{th.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && showWeightUnit && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('settingsSelectWeightUnit')}</div>
              <button onClick={() => setShowWeightUnit(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            {(['kg', 'lb'] as const).map((u) => (
              <div key={u} onClick={() => { store.setWeightUnit(u); setShowWeightUnit(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                <span style={{ fontSize: 16, color: TH.text }}>{T(u === 'kg' ? 'weightUnitKg' : 'weightUnitLb')}</span>
                {store.weightUnit === u && <span style={{ color: P, fontSize: 18 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
