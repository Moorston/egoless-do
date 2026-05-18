'use client';

import { useState } from 'react';
import { useAppStore, ORANGE, GREEN, RED, BLUE, YELLOW, QUICK_FOODS } from '@egoless/core';
import { Toggle, useTheme, useT, cs, inp } from './helpers';

export default function HomeTab({ onOpenCheckin }: { onOpenCheckin?: () => void }) {
  const streak = useAppStore((s) => s.streak);
  const waterMl = useAppStore((s) => s.waterMl);
  const waterGoal = useAppStore((s) => s.waterGoal);
  const calGoal = useAppStore((s) => s.calGoal);
  const foodLog = useAppStore((s) => s.foodLog);
  const addWater = useAppStore((s) => s.addWater);
  const checkinDone = useAppStore((s) => s.checkinDone);
  const addFood = useAppStore((s) => s.addFood);
  const setWaterGoal = useAppStore((s) => s.setWaterGoal);
  const setCalGoal = useAppStore((s) => s.setCalGoal);
  const totalCal = foodLog.reduce((a, f) => a + f.calories, 0);
  const { TH, P } = useTheme();
  const T = useT();

  const [showFood, setShowFood] = useState(false);
  const [fn, setFn] = useState('');
  const [fc, setFc] = useState('');
  const [fnote, setFnote] = useState('');
  const [showWG, setShowWG] = useState(false);
  const [wgi, setWgi] = useState(String(waterGoal));
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(calGoal));

  return (
    <>
      <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,#16A34A,#15803D)', padding: '18px 20px', marginBottom: 12, color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: 17, textAlign: 'center' }}>{T('todayCheckin')}</div>
        <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.8, marginTop: 3, marginBottom: 14 }}>今天朝目标迈进了吗？</div>
        <button onClick={() => onOpenCheckin?.()}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '2px solid rgba(255,255,255,.6)', background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {checkinDone === null ? T('openCheckin') : checkinDone ? '✓ ' + T('done') + ' · 修改' : '✗ ' + T('notDone') + ' · 修改'}
        </button>
      </div>

      <div style={{ ...cs(TH), textAlign: 'center', padding: '20px 16px' } as React.CSSProperties}>
        <div style={{ fontSize: 34 }}>🔷</div>
        <div style={{ color: TH.sub, fontSize: 13, marginTop: 6 }}>{T('streak')}</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: ORANGE, lineHeight: 1.1 }}>{streak}</div>
        <div style={{ color: TH.sub, fontSize: 13, marginTop: 4 }}>{T('days')}</div>
        <div style={{ fontSize: 13, color: TH.sub, marginTop: 8 }}>允许1天宽限，偶尔忘记不会中断连胜</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { icon: '📅', label: '累计完成', value: streak + 1, unit: T('days'), bg: ORANGE },
          { icon: '🏆', label: '最长连续', value: streak + 1, unit: T('days'), bg: YELLOW },
          { icon: '💪', label: '节省卡路里', value: 4500, unit: '千卡', bg: '#FF8A65' },
          { icon: '🍽', label: '节省餐数', value: streak + 1, unit: '顿', bg: BLUE },
        ].map((item) => (
          <div key={item.label} style={{ background: item.bg, borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 22 }}>{item.icon}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.78)' }}>{item.label}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 17 }}>{item.value}<span style={{ fontSize: 12, fontWeight: 400 }}> {item.unit}</span></div>
          </div>
        ))}
      </div>

      <div style={cs(TH)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{T('water')}</span>
          <span style={{ color: TH.sub, fontSize: 12, cursor: 'pointer' }} onClick={() => { setWgi(String(waterGoal)); setShowWG(true); }}>
            <span style={{ fontWeight: 600, color: P }}>{waterMl}</span> ml / {waterGoal}ml ✏️
          </span>
        </div>
        <div style={{ height: 6, background: TH.border, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: 6, background: BLUE, borderRadius: 3, width: `${Math.min(waterMl / waterGoal * 100, 100)}%`, transition: 'width .4s' }} />
        </div>
        <button onClick={() => addWater(250)} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: BLUE, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>+ 250ml</button>
      </div>

      <div style={cs(TH)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: ORANGE }}>今日卡路里</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: ORANGE }}>{totalCal}</span>
          <span style={{ color: TH.sub, fontSize: 13 }}>/ {calGoal} kcal</span>
          <span style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => { setCgi(String(calGoal)); setShowCG(true); }}>✏️</span>
        </div>
        <div style={{ height: 4, background: TH.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: 4, background: ORANGE, borderRadius: 2, width: `${Math.min(totalCal / calGoal * 100, 100)}%`, transition: 'width .4s' }} />
        </div>
      </div>

      <button onClick={() => setShowFood(true)}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 12, position: 'relative', zIndex: 1 }}>
        {T('addFoodBtn')}
      </button>

      {showFood && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: TH.text }}>{T('addFood')}</div>
            <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder={T('foodName')} style={{ ...inp(TH), marginBottom: 10, border: `2px solid ${P}` } as React.CSSProperties} />
            <input type="number" value={fc} onChange={(e) => setFc(e.target.value)} placeholder={T('calories2')} style={{ ...inp(TH), marginBottom: 10 } as React.CSSProperties} />
            <textarea value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder="备注" rows={2}
              style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: TH.sub, marginBottom: 8 }}>{T('quickAdd')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {QUICK_FOODS.map((f) => (
                <button key={f.name} onClick={() => { setFn(f.name); setFc(String(f.cal)); }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${TH.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: TH.text }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: P, marginTop: 2 }}>{f.cal}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFood(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 14, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { if (fn.trim()) { addFood({ name: fn, calories: +fc || 0, note: fnote, timestamp: Date.now() }); setShowFood(false); } }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: ORANGE, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>确定</button>
            </div>
          </div>
        </div>
      )}

      {showWG && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: TH.text }}>设置每日饮水目标</div>
            <div style={{ fontSize: 12, color: TH.sub, marginBottom: 16 }}>请输入500-3000之间的数值</div>
            <input type="number" value={wgi} onChange={(e) => setWgi(e.target.value)}
              style={{ ...inp(TH), fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20, border: `2px solid ${BLUE}`, width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowWG(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 14, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { setWaterGoal(Math.max(500, Math.min(3000, +wgi || 2000))); setShowWG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: BLUE, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showCG && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: TH.text }}>设置每日卡路里目标</div>
            <div style={{ fontSize: 12, color: TH.sub, marginBottom: 16 }}>请输入500-10000之间的数值</div>
            <input type="number" value={cgi} onChange={(e) => setCgi(e.target.value)}
              style={{ ...inp(TH), fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20, border: `2px solid ${GREEN}`, width: '100%', boxSizing: 'border-box' } as React.CSSProperties} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCG(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 14, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { setCalGoal(Math.max(500, Math.min(10000, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: GREEN, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
