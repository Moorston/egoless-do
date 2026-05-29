'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { THEMES, LANG_LIST, COLORS, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_CLOSE, FONT_STAT_CARD } from '@egoless-do/core';
import type { ThemeName } from '@egoless-do/core';
import { Toggle, useTheme, useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';
import type { SyncState } from '../db/syncService';
import { BarChart3, ClipboardList, CalendarCheck, Utensils, Shield, HeartCrack, Heart, RefreshCw, Share2, PersonStanding, Trash2, LogOut, ChevronRight, Check, X, Bell, Clock, Globe, Palette, Scale, Cloud, CloudUpload, History, Info, Lock } from 'lucide-react';

interface SettingsRow {
  label: string;
  right: React.ReactNode;
  icon?: React.ReactNode;
  sub?: string;
  onClick?: () => void;
  last?: boolean;
}

export default function SettingsTab({ onOpenStats, syncState }: { onOpenStats?: () => void; syncState?: SyncState & { triggerSync: () => Promise<void> } }) {
  const overlay = useOverlay();
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
      { label: T('settingsRemindOn'), icon: <Bell size={18} />, right: <Toggle on={store.remindEnabled} onChange={() => {
        if (!store.remindEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        store.setRemindEnabled(!store.remindEnabled);
      }} /> },
      { label: T('settingsRemindTime'), icon: <Clock size={18} />, right: <span style={{ color: TH.sub, cursor: 'pointer' }} onClick={() => { setTimeEdit(store.remindTime); setShowTimePicker(true); }}>{store.remindTime} {T('commonEdit')}</span>, last: true },
    ]},
    { title: T('settingsData'), rows: [
      { label: T('settingsStats'), icon: <BarChart3 size={18} />, right: <span style={{ color: TH.sub }}><ChevronRight size={18} /></span>, onClick: onOpenStats },
      { label: T('planHistory'), icon: <ClipboardList size={18} />, right: <span style={{ color: TH.sub }}><ChevronRight size={18} /></span>, onClick: () => overlay.open('planHistory') },
      { label: T('settingsHistory'), icon: <CalendarCheck size={18} />, right: <span style={{ color: TH.sub }}><ChevronRight size={18} /></span>, onClick: () => overlay.open('history') },
      { label: T('settingsFoodLog'), icon: <Utensils size={18} />, right: <span style={{ color: TH.sub }}><ChevronRight size={18} /></span>, onClick: () => overlay.open('foodLog') },
      { label: T('settingsGrace'), icon: <Shield size={18} />, sub: T('settingsGraceDesc'), right: <span style={{ color: TH.sub }}><ChevronRight size={18} /></span>, onClick: () => overlay.open('grace') },
      { label: T('settingsStreakBreak'), icon: <HeartCrack size={18} />, sub: T('settingsStreakBreakDesc'), right: <span style={{ color: TH.sub }}><ChevronRight size={18} /></span>, onClick: () => overlay.open('streakBreak'), last: true },
    ]},
    { title: T('settingsGeneral'), rows: [
      { label: T('settingsLanguage'), icon: <Globe size={18} />, right: <span style={{ color: TH.sub }}>{LANG_LIST.find(l => l.code === store.language)?.flag} {LANG_LIST.find(l => l.code === store.language)?.name} <ChevronRight size={18} style={{verticalAlign:'middle'}} /></span>, onClick: () => setShowLang(true) },
      { label: T('settingsTheme'), icon: <Palette size={18} />, right: <span style={{ color: TH.sub }}>{THEMES[store.theme].name} <ChevronRight size={18} style={{verticalAlign:'middle'}} /></span>, onClick: () => setShowTheme(true) },
      { label: T('settingsWeightUnit'), icon: <Scale size={18} />, right: <span style={{ color: TH.sub }}>{T(store.weightUnit === 'kg' ? 'weightUnitKg' : 'weightUnitLb')} <ChevronRight size={18} style={{verticalAlign:'middle'}} /></span>, onClick: () => setShowWeightUnit(true) },
    ]},
    { title: T('settingsHealthSection'), rows: [
      { label: T('settingsAppleHealth'), icon: <Heart size={18} />, sub: healthSync ? T('settingsConnected') : T('settingsNotEnabled'), right: <Toggle on={healthSync} onChange={() => setHealthSync(v => !v)} />, last: true },
    ]},
    { title: T('settingsSync'), rows: [
      ...(syncState ? [
        { label: T('settingsSyncStatus'), icon: <Cloud size={18} />, sub: syncState.online ? (syncState.status === 'syncing' ? T('settingsSyncing') : syncState.status === 'error' ? `错误: ${syncState.error}` : T('settingsConnected')) : T('settingsOffline'), right: <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: syncState.online ? (syncState.status === 'error' ? '#EF4444' : '#10B981') : '#6B7280' }} /> },
        { label: T('settingsPending'), icon: <CloudUpload size={18} />, right: <span style={{ color: TH.sub }}>{syncState.pendingCount} {T('settingsPendingUnit')}</span> },
        { label: T('settingsLastSync'), icon: <History size={18} />, right: <span style={{ color: TH.sub }}>{syncState.lastSyncAt ? new Date(syncState.lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : T('settingsNeverSync')}</span> },
        { label: T('settingsManualSync'), icon: <RefreshCw size={18} />, right: <span style={{ color: P, cursor: 'pointer', fontSize: FONT_BODY }}>{syncState.status === 'syncing' ? T('settingsSyncing') : T('settingsSyncNow')}</span>, onClick: () => { if (syncState.status !== 'syncing') syncState.triggerSync(); }, last: true },
      ] : []),
    ]},
    { title: T('settingsAbout'), rows: [
      { label: T('settingsShareFriend'), icon: <Share2 size={18} />, sub: T('settingsShareDesc'), right: <ChevronRight size={18} color={TH.sub} />, onClick: async () => {
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
      { label: T('settingsVersion'), icon: <Info size={18} />, right: <span style={{ color: TH.sub }}>1.0.0</span> },
      { label: T('settingsPrivacy'), icon: <Lock size={18} />, right: <ChevronRight size={18} color={TH.sub} /> },
      { label: T('settingsResetWelcome'), icon: <RefreshCw size={18} />, sub: T('settingsResetWelcomeDesc'), right: <ChevronRight size={18} color={TH.sub} />, last: true },
    ]},
    { title: T('settingsAccount'), rows: [
      { label: T('settingsClearData'), icon: <Trash2 size={18} />, sub: T('settingsClearDataDesc'), right: <span style={{ color: '#EF4444' }}>{T('settingsClearData')}</span>, onClick: () => { if (confirm(T('settingsClearConfirm'))) store.resetData(); } },
      { label: T('settingsLogout'), icon: <LogOut size={18} />, right: <span style={{ color: '#EF4444' }}>{T('settingsLogout')}</span>, onClick: () => { store.logout(); window.location.href = '/login'; }, last: true },
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
          <PersonStanding size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE }}>
            {store.auth.user?.name ?? T('settingsDefaultName')}
          </div>
          <div style={{ color: TH.sub, fontSize: FONT_BODY, marginTop: 3 }}>
            {store.streak} {T('checkinStreak')} · {store.auth.isSignedIn ? T('settingsConnected') : T('settingsOffline')}
          </div>
        </div>
        {store.auth.isSignedIn ? (
          <div style={{
            padding: '6px 12px',
            borderRadius: 12, background: `${P}20`,
          }}>
            <span style={{ color: P, fontSize: FONT_BADGE, fontWeight: '600' }}>{T('settingsFreePlan')}</span>
          </div>
        ) : (
          <div
            onClick={() => { window.location.href = '/login'; }}
            style={{
              padding: '8px 16px',
              borderRadius: 12, background: P,
              cursor: 'pointer',
            }}>
            <span style={{ color: '#fff', fontSize: FONT_BADGE, fontWeight: '700' }}>{T('settingsLogin')}</span>
          </div>
        )}
      </div>

      {sections.map(({ title, rows }) => (
        <div key={title} style={{ marginBottom: 4 }}>
          <div style={{ padding: '14px 0 6px', fontSize: FONT_BODY, color: TH.sub, fontWeight: 600 }}>{title}</div>
          <div style={{ ...cs(TH), padding: '0 16px' } as React.CSSProperties}>
            {rows.map((r: SettingsRow, i) => (
              <div key={i} onClick={r.onClick}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: r.last ? 'none' : `1px solid ${TH.border}`, cursor: r.onClick ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{r.icon}</span>}
                  <div>
                    <div style={{ fontSize: FONT_BODY, color: TH.text }}>{r.label}</div>
                    {r.sub && <div style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 1 }}>{r.sub}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{r.right}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Footer brand */}
      <div style={{ textAlign: 'center', color: TH.sub, fontSize: FONT_BADGE, padding: '16px 0 8px' }}>
        {T('settingsFooter')}
      </div>

      {typeof document !== 'undefined' && showTimePicker && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 300, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text, marginBottom: 16 }}>{T('settingsSetReminder')}</div>
            <input type="time" value={timeEdit} onChange={(e) => setTimeEdit(e.target.value)}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_CLOSE, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowTimePicker(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: FONT_BODY, cursor: 'pointer' }}>{T('commonCancel')}</button>
              <button onClick={() => { store.setRemindTime(timeEdit); setShowTimePicker(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BODY, cursor: 'pointer' }}>{T('commonSave')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && showLang && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('settingsLanguage')}</div>
              <button onClick={() => setShowLang(false)} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            {LANG_LIST.map((l) => (
              <div key={l.code} onClick={() => { store.setLanguage(l.code); setShowLang(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: FONT_CLOSE }}>{l.flag}</span>
                  <span style={{ fontSize: FONT_BODY, color: TH.text }}>{l.name}</span>
                </div>
                {l.code === store.language && <Check size={18} color={P} />}
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
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('settingsTheme')}</div>
              <button onClick={() => setShowTheme(false)} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {Object.entries(THEMES).map(([key, th]) => (
                <div key={key} onClick={() => { store.setTheme(key as ThemeName); setShowTheme(false); }}
                  style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${store.theme === key ? th.primary : 'transparent'}` }}>
                  <div style={{ background: th.bg, height: 56, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
                    <div style={{ width: '60%', height: 5, borderRadius: 3, background: th.primary, marginBottom: 3 }} />
                    <div style={{ width: '40%', height: 3, borderRadius: 2, background: th.card }} />
                  </div>
                  <div style={{ background: TH.card, padding: '5px 8px', fontSize: FONT_BODY, color: TH.text, textAlign: 'center' }}>{th.name}</div>
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
              <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('settingsSelectWeightUnit')}</div>
              <button onClick={() => setShowWeightUnit(false)} style={{ background: 'transparent', border: 'none', fontSize: FONT_CLOSE, color: TH.sub, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            {(['kg', 'lb'] as const).map((u) => (
              <div key={u} onClick={() => { store.setWeightUnit(u); setShowWeightUnit(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                <span style={{ fontSize: FONT_BODY, color: TH.text }}>{T(u === 'kg' ? 'weightUnitKg' : 'weightUnitLb')}</span>
                {store.weightUnit === u && <Check size={18} color={P} />}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
