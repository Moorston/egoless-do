'use client';

import { useState } from 'react';
import { COLORS, dateStr } from '@egoless-do/core';
import { RowItem, Toggle, useTheme, useT, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';

export default function CheckinPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();

  const [weight, setWeight] = useState('65');
  const [fasted, setFasted] = useState(false);
  const [water, setWater] = useState('');
  const [practices, setPractices] = useState({ sit: false, stand: false, chant: false });
  const [note, setNote] = useState('');
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>([]);
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>({});
  const [localDone, setLocalDone] = useState<boolean | null>(null);
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: TH.bg, overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: '-apple-system,system-ui,sans-serif', color: TH.text, fontSize: 16 }}>
      <div style={{ padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 22, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('checkinTitle')}</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 16, color: TH.sub, marginBottom: 6 }}>{T('checkinWeight')}</div>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${TH.border}`, borderRadius: 10, background: TH.card }}>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
              style={{ flex: 1, textAlign: 'center', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, padding: '8px 0', background: 'transparent', color: TH.text }} />
            <span style={{ flex: 1, textAlign: 'center', color: TH.sub, fontSize: 16, padding: '8px 0' }}>{T('checkinKg')}</span>
          </div>
        </div>

        <RowItem label={T('checkinAbstinence')} icon="🙏" right={<Toggle on={fasted} onChange={() => setFasted((v) => !v)} />} />
        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>💧</span><span style={{ color: TH.text }}>{T('checkinWater')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['500ml', '1000ml', '1500ml', '2000ml', '>2000ml'].map((v) => (
              <button key={v} onClick={() => setWater(v)}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${water === v ? P : TH.border}`, background: water === v ? `${P}30` : 'transparent', color: water === v ? '#fff' : TH.sub, fontSize: 16, cursor: 'pointer' }}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>⭐</span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinPractice')}</span>
          </div>
          {[{ key: 'sit' as const, icon: '🧘', label: T('checkinSit') }, { key: 'stand' as const, icon: '🧍', label: T('checkinStand') }, { key: 'chant' as const, icon: '📿', label: T('checkinSutra') }].map(({ key, icon, label }, i, arr) => (
            <RowItem key={key} icon={icon} label={label} last={i === arr.length - 1}
              right={<Toggle on={practices[key]} onChange={() => setPractices((p) => ({ ...p, [key]: !p[key] }))} />} />
          ))}
        </div>

        {store.habits.filter((h) => h.status === 'inProgress').length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>◇</span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinHabitCheck')}</span>
            </div>
            {store.habits.filter((h) => h.status === 'inProgress').map((h, i, arr) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${TH.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>◇</span>
                  <div>
                    <div style={{ fontSize: 16, color: TH.text }}>{h.name}</div>
                    <div style={{ fontSize: 16, color: TH.sub }}>{h.streak} {T('checkinStreak')}</div>
                  </div>
                </div>
                <Toggle on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins((c) => ({ ...c, [h.id]: !c[h.id] }))} />
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>✎</span><span style={{ fontWeight: 600, color: TH.text }}>{T('checkinCustom')}</span>
            </div>
            <button onClick={() => setFreeItems((f) => [...f, { id: String(Date.now()), name: '' }])}
              style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: P, color: '#fff', fontSize: 18, cursor: 'pointer' }}>+</button>
          </div>
          {freeItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Toggle on={!!freeCheckins[item.id]} onChange={() => setFreeCheckins((c) => ({ ...c, [item.id]: !c[item.id] }))} />
              <input value={item.name} onChange={(e) => setFreeItems((f) => f.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x))}
                placeholder={`${T('checkinFree')} ${freeItems.indexOf(item) + 1}`} style={{ ...inp(TH), flex: 1, padding: '7px 10px' } as React.CSSProperties} />
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('checkinNote')}</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={T('checkinNotePlaceholder')} rows={3}
            style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, padding: '10px 12px', color: TH.text, fontSize: 16, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setLocalDone(false)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === false ? COLORS.RED : TH.border, background: localDone === false ? 'rgba(239,68,68,.15)' : 'transparent', color: localDone === false ? COLORS.RED : TH.sub }}>
            ✗ {T('checkinNotDone')}
          </button>
          <button onClick={() => setLocalDone(true)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === true ? COLORS.GREEN : TH.border, background: localDone === true ? 'rgba(16,185,129,.15)' : 'transparent', color: localDone === true ? COLORS.GREEN : TH.sub }}>
            ✓ {T('checkinDone')}
          </button>
        </div>

        <button onClick={() => {
          if (localDone === null) return;
          const today = dateStr();
          Object.entries(habitCheckins).forEach(([id, checked]) => {
            if (checked) store.checkinHabit(id, today);
          });
          // Add water if selected
          const waterMap: Record<string, number> = { '500ml': 500, '1000ml': 1000, '1500ml': 1500, '2000ml': 2000, '>2000ml': 2500 };
          if (water && waterMap[water]) store.addWater(waterMap[water]);
          // Build enhanced note
          const parts = [note];
          if (practices.sit) parts.push(`🧘${T('checkinSit')}`);
          if (practices.stand) parts.push(`🧍${T('checkinStand')}`);
          if (practices.chant) parts.push(`📿${T('checkinSutra')}`);
          freeItems.forEach(item => {
            if (freeCheckins[item.id] && item.name) parts.push(`✓${item.name}`);
          });
          const weightNum = weight ? parseFloat(weight) : undefined;
          store.submitCheckin(localDone, parts.filter(Boolean).join(' · '), undefined, weightNum);
          onClose();
        }}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', marginBottom: 10, background: localDone === true ? COLORS.GREEN : localDone === false ? COLORS.RED : P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
          {localDone === true ? T('checkinSubmit') : localDone === false ? T('checkinSave') : T('checkinSelectStatus')}
        </button>

        <div style={{ padding: '12px 0' }}>
          <button onClick={onClose}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>
            {T('commonCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
