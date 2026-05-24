'use client';

import { useState, useMemo } from 'react';
import { COLORS, dateStr } from '@egoless-do/core';
import type { CheckinRecord } from '@egoless-do/core';
import { RowItem, Toggle, useTheme, useT, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';

function parseExistingNote(raw: string): { userNote: string; practices: string[]; customs: string[]; fasted: boolean; water: string; habits: string[] } {
  if (!raw) return { userNote: '', practices: [], customs: [], fasted: false, water: '', habits: [] };
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      return {
        userNote: data.note ?? '',
        practices: data.practices ?? [],
        customs: data.customs ?? [],
        fasted: !!data.fasted,
        water: data.water ?? '',
        habits: data.habits ?? [],
      };
    }
  } catch {
    // legacy format
  }
  return { userNote: raw, practices: [], customs: [], fasted: false, water: '', habits: [] };
}

export default function CheckinPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();

  const today = dateStr();
  const existing = useMemo(() =>
    store.checkinHistory.find((c: CheckinRecord) => c.date === today),
    [store.checkinHistory, today],
  );
  const parsed = useMemo(() => parseExistingNote(existing?.note ?? ''), [existing]);

  // Calculate today's total calories from foodLog
  const totalCal = useMemo(() => store.foodLog.reduce((a, f) => a + f.calories, 0), [store.foodLog]);

  const [weight, setWeight] = useState(() => existing?.weight != null ? String(existing.weight) : '65');
  const [fasted, setFasted] = useState(() => parsed.fasted);
  const [water, setWater] = useState(() => parsed.water || (store.waterMl >= 2000 ? '>2000ml' : store.waterMl >= 1500 ? '2000ml' : store.waterMl >= 1000 ? '1500ml' : store.waterMl >= 500 ? '1000ml' : store.waterMl > 0 ? '500ml' : ''));
  const [practices, setPractices] = useState(() => ({
    sit: parsed.practices.includes('sit'),
    stand: parsed.practices.includes('stand'),
    chant: parsed.practices.includes('chant'),
  }));
  const [note, setNote] = useState(() => parsed.userNote);
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>(
    () => parsed.customs.map((name, i) => ({ id: `existing-${i}`, name })),
  );
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>(
    () => Object.fromEntries(parsed.customs.map((_, i) => [`existing-${i}`, true])),
  );
  const [localDone, setLocalDone] = useState<boolean | null>(() => existing?.done ?? null);
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
        
        {/* Today's food calories display */}
        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🍽</span><span style={{ color: TH.text }}>{T('checkinFood')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: P }}>{totalCal}</span>
              <span style={{ color: TH.sub, fontSize: 14 }}>kcal</span>
            </div>
          </div>
        </div>

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
          // Set water amount (not add, but set to the selected value)
          const waterMap: Record<string, number> = { '500ml': 500, '1000ml': 1000, '1500ml': 1500, '2000ml': 2000, '>2000ml': 2500 };
          if (water && waterMap[water]) {
            // Reset water first, then add the selected amount
            store.resetWater();
            store.addWater(waterMap[water]);
          }
          // Build structured note (JSON for new format, fallback-compatible)
          const noteData: Record<string, unknown> = {};
          if (note) noteData.note = note;
          if (fasted) noteData.fasted = true;
          if (water) noteData.water = water;
          const pr: string[] = [];
          if (practices.sit) pr.push('sit');
          if (practices.stand) pr.push('stand');
          if (practices.chant) pr.push('chant');
          if (pr.length) noteData.practices = pr;
          const customs = freeItems.filter(item => freeCheckins[item.id] && item.name).map(item => item.name);
          if (customs.length) noteData.customs = customs;
          const checkedHabits = Object.entries(habitCheckins)
            .filter(([, checked]) => checked)
            .map(([id]) => store.habits.find(h => h.id === id)?.name)
            .filter(Boolean);
          if (checkedHabits.length) noteData.habits = checkedHabits;
          const weightNum = weight ? parseFloat(weight) : undefined;
          store.submitCheckin(localDone, JSON.stringify(noteData), undefined, weightNum);
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
