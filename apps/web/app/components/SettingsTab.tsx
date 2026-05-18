'use client';

import { useState } from 'react';
import { useAppStore, THEMES, LANG_LIST } from '@egoless/core';
import { Toggle, useTheme, useT, cs } from './helpers';

export default function SettingsTab({ onOpenStats, onOpenHistory, onOpenFoodLog, onOpenGrace }: { onOpenStats?: () => void; onOpenHistory?: () => void; onOpenFoodLog?: () => void; onOpenGrace?: () => void }) {
  const setThemeName = useAppStore((s) => s.setThemeName);
  const setLang = useAppStore((s) => s.setLang);
  const themeName = useAppStore((s) => s.themeName);
  const remindEnabled = useAppStore((s) => s.remindEnabled);
  const setRemindEnabled = useAppStore((s) => s.setRemindEnabled);
  const remindTime = useAppStore((s) => s.remindTime);
  const setRemindTime = useAppStore((s) => s.setRemindTime);
  const { TH, P } = useTheme();
  const T = useT();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeEdit, setTimeEdit] = useState(remindTime);
  const [healthSync, setHealthSync] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  const sections = [
    { title: '打卡提醒', rows: [
      { label: T('remindOn'), right: <Toggle on={remindEnabled} onChange={() => {
        if (!remindEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        setRemindEnabled(!remindEnabled);
      }} /> },
      { label: T('remindTime'), right: <span style={{ color: TH.sub, cursor: 'pointer' }} onClick={() => { setTimeEdit(remindTime); setShowTimePicker(true); }}>{remindTime} 编辑</span>, last: true },
    ]},
    { title: '数据记录', rows: [
      { label: T('statsData'), icon: '📊', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenStats },
      { label: T('history'), icon: '📅', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenHistory },
      { label: T('foodLog'), icon: '🍽', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenFoodLog },
      { label: '冰冻火苗', icon: '❄️', sub: '今天和昨天都没打卡', right: <span style={{ color: TH.sub }}>›</span> },
      { label: T('graceRestore'), icon: '🛡', sub: '昨天没打卡，今天补卡', right: <span style={{ color: TH.sub }}>›</span>, onClick: onOpenGrace },
      { label: '连胜中断', icon: '❤️', sub: '连续两天未打卡', right: <span style={{ color: TH.sub }}>›</span>, last: true },
    ]},
    { title: '通用设置', rows: [
      { label: T('language'), right: <span style={{ color: TH.sub }}>🇨🇳 简体中文 ›</span>, onClick: () => setShowLang(true) },
      { label: T('theme'), right: <span style={{ color: TH.sub }}>{THEMES[themeName].name} ›</span>, onClick: () => setShowTheme(true) },
      { label: '体重单位', right: <span style={{ color: TH.sub }}>公斤 ›</span>, last: true },
    ]},
    { title: '数据同步', rows: [
      { label: T('appleHealth'), sub: '未启用', right: <Toggle on={healthSync} onChange={() => setHealthSync((v) => !v)} />, last: true },
    ]},
    { title: '关于', rows: [
      { label: T('shareApp'), icon: '🧘', right: <span style={{ color: TH.sub }}>›</span> },
      { label: T('version'), right: <span style={{ color: TH.sub }}>1.0.0</span> },
      { label: T('privacy'), right: <span style={{ color: TH.sub }}>›</span> },
      { label: T('resetWelcome'), icon: '🔄', sub: '重新显示用户协议', right: <span style={{ color: TH.sub }}>›</span>, last: true },
    ]},
  ];

  return (
    <>
      {sections.map(({ title, rows }) => (
        <div key={title} style={{ marginBottom: 4 }}>
          <div style={{ padding: '14px 0 6px', fontSize: 13, color: TH.sub, fontWeight: 600 }}>{title}</div>
          <div style={{ ...cs(TH), padding: '0 16px' } as React.CSSProperties}>
            {rows.map((r, i) => (
              <div key={i} onClick={(r as any).onClick}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: (r as any).last ? 'none' : `1px solid ${TH.border}`, cursor: (r as any).onClick ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(r as any).icon && <span style={{ fontSize: 18 }}>{(r as any).icon}</span>}
                  <div>
                    <div style={{ fontSize: 14, color: TH.text }}>{r.label}</div>
                    {(r as any).sub && <div style={{ fontSize: 13, color: TH.sub, marginTop: 1 }}>{(r as any).sub}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{r.right}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <div style={{ padding: '14px 0 6px', fontSize: 13, color: TH.sub, fontWeight: 600 }}>其他设置</div>
        <div style={{ ...cs(TH), padding: '0 16px' } as React.CSSProperties}>
          {[
            { label: '清除数据', icon: '🗑', sub: '删除所有打卡记录', right: <span style={{ color: TH.sub }}>›</span>, last: true },
          ].map((r, i) => (
            <div key={i} onClick={(r as any).onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: (r as any).last ? 'none' : `1px solid ${TH.border}`, cursor: (r as any).onClick ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 14, color: TH.text }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: TH.sub, marginTop: 1 }}>{r.sub}</div>
                </div>
              </div>
              <span style={{ color: TH.sub, fontSize: 13 }}>{r.right}</span>
            </div>
          ))}
        </div>
      </div>

      {showTimePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 300, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: TH.text, marginBottom: 16 }}>设置提醒时间</div>
            <input type="time" value={timeEdit} onChange={(e) => setTimeEdit(e.target.value)}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: 22, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowTimePicker(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 14, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { setRemindTime(timeEdit); setShowTimePicker(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showLang && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('language')}</div>
              <button onClick={() => setShowLang(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            {LANG_LIST.map((l) => (
              <div key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{l.flag}</span>
                  <span style={{ fontSize: 15, color: TH.text }}>{l.name}</span>
                </div>
                {l.code === useAppStore.getState().lang && <span style={{ color: P, fontSize: 18 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showTheme && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('theme')}</div>
              <button onClick={() => setShowTheme(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {Object.entries(THEMES).map(([key, th]) => (
                <div key={key} onClick={() => { setThemeName(key); setShowTheme(false); }}
                  style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${themeName === key ? th.primary : 'transparent'}` }}>
                  <div style={{ background: th.bg, height: 56, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
                    <div style={{ width: '60%', height: 5, borderRadius: 3, background: th.primary, marginBottom: 3 }} />
                    <div style={{ width: '40%', height: 3, borderRadius: 2, background: th.card }} />
                  </div>
                  <div style={{ background: TH.card, padding: '5px 8px', fontSize: 12, color: TH.text, textAlign: 'center' }}>{th.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
