'use client';

import { useState } from 'react';
import { THEMES, COLORS, QUICK_FOODS } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';

export default function FoodLogPage({ onClose }: { onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const foodLog = store.foodLog || [];
  const totalCal = foodLog.reduce((a, f) => a + f.calories, 0);
  const [showAdd, setShowAdd] = useState(false);
  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');

  function addFoodItem() {
    if (!fn.trim()) return;
    store.addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() });
    setFn(''); setFc(''); setFnote(''); setShowAdd(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
      <div style={{ maxWidth: 390, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 22, color: TH.text }}>{T('foodTitle')}</div>
              <div style={{ fontSize: 16, color: TH.sub }}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16,
            textAlign: 'center', padding: '20px 16px'
          }}>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('foodTodayKcal')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: COLORS.ORANGE }}>{totalCal}</span>
              <span style={{ fontSize: 20, color: TH.sub }}>/ {store.calGoal}</span>
            </div>
            <div style={{ fontSize: 16, color: '#10B981', marginTop: 6 }}>{T('foodRemaining')}: {Math.max(0, store.calGoal - totalCal)} kcal</div>
          </div>

          <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 16, marginTop: 12 }}>
            {foodLog.length === 0 ? (
              <div style={{ color: TH.sub, fontSize: 16, textAlign: 'center', padding: 24 }}>{T('foodEmpty')}</div>
            ) : (
              foodLog.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                  borderBottom: i < foodLog.length - 1 ? `1px solid ${TH.border}` : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: TH.text }}>{f.name}</div>
                    {f.note && <div style={{ fontSize: 16, color: TH.sub }}>{f.note}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: P }}>{f.calories} kcal</div>
                </div>
              ))
            )}
          </div>

          <button onClick={() => setShowAdd(true)}
            style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 12, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            + {T('foodAdd')}
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: TH.text }}>{T('foodAddTitle')}</div>
            <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder={T('foodName')}
              style={{ width: '100%', background: TH.card, border: `2px solid ${P}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <input type="number" value={fc} onChange={(e) => setFc(e.target.value)} placeholder={T('foodCal')}
              style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <textarea value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder={T('foodInsight')} rows={2}
              style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 16, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('foodQuickAdd')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {QUICK_FOODS.map((f) => (
                <button key={f.name} onClick={() => { setFn(f.name); setFc(String(f.cal)); }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${TH.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 16, color: TH.text }}>{f.name}</div>
                  <div style={{ fontSize: 16, color: P, marginTop: 2 }}>{f.cal ?? 0}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('commonCancel')}</button>
              <button onClick={addFoodItem} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.ORANGE, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('foodConfirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
