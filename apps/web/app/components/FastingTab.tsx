'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, GREEN, YELLOW, ORANGE, RED } from '@egoless/core';
import { useTheme, useT, cs, LinkWorldBtn } from './helpers';

export default function FastingTab({ onOpenGlobalMap, onOpenFastHistory }: { onOpenGlobalMap?: () => void; onOpenFastHistory?: () => void }) {
  const fastingSession = useAppStore((s) => s.fastingSession);
  const fastHistory = useAppStore((s) => s.fastHistory);
  const startFasting = useAppStore((s) => s.startFasting);
  const stopFasting = useAppStore((s) => s.stopFasting);
  const { TH, P } = useTheme();
  const T = useT();
  const [elapsed, setElapsed] = useState(0);
  const [showDur, setShowDur] = useState(false);
  const [tmpDur, setTmpDur] = useState(8);
  const [agreed, setAgreed] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (fastingSession) {
      ref.current = setInterval(() => setElapsed(Math.floor((Date.now() - fastingSession.startedAt) / 1000)), 1000);
    } else { clearInterval(ref.current); setElapsed(0); }
    return () => clearInterval(ref.current);
  }, [fastingSession]);

  const pct = fastingSession ? Math.min(elapsed / (fastingSession.targetHours * 3600), 1) : 0;
  const streak = useAppStore((s) => s.streak);
  const kcal = Math.round(elapsed / 3600 * 32);
  const kg = (kcal / 7700).toFixed(2);

  return (
    <>
      <div style={{ ...cs(TH), textAlign: 'center' } as React.CSSProperties}>
        {fastingSession ? (
          <>
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 16px' }}>
              <svg width={160} height={160} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={80} cy={80} r={68} fill="none" stroke={TH.border} strokeWidth={10} />
                <circle cx={80} cy={80} r={68} fill="none" stroke={P} strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: P }}>{Math.floor(elapsed / 3600)}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</div>
                <div style={{ fontSize: 13, color: TH.sub }}>目标 {fastingSession.targetHours}h</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: TH.sub, marginBottom: 16 }}>禁食进行中 🔥 {Math.round(pct * 100)}%</div>
            <button onClick={stopFasting} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: RED, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{T('stopFasting')}</button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{T('startFasting')}</button>
            <button onClick={() => startFasting(8)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: GREEN, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{T('quickStart')}</button>
          </div>
        )}
      </div>

      <LinkWorldBtn label="看看全球谁在禁食" onClick={() => onOpenGlobalMap?.()} />

      <div onClick={onOpenFastHistory} style={{ background: TH.card, borderRadius: 16, marginBottom: 12, border: `1px solid ${TH.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 18 }}>⏱</span>
        <span style={{ fontSize: 13, color: TH.text }}>{T('fastingHistory')}</span>
        <span style={{ marginLeft: 'auto', color: TH.sub }}>›</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, color: TH.text }}>你的统计</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { icon: '⏳', label: '总次数', value: `${fastHistory.length} 次`, bg: '#EF9A9A' },
          { icon: '⏰', label: T('totalFasting'), value: '48 小时', bg: GREEN },
          { icon: '🔥', label: '连续天数', value: `${streak} ${T('days')}`, bg: '#FF8A65' },
          { icon: '🏆', label: '最长连续', value: '12 天', bg: '#9C27B0' },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 26 }}>{s.icon}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{s.label}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: ORANGE, borderRadius: 14, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 26 }}>🔥</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>节省卡路里</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{kcal} <span style={{ fontSize: 13, fontWeight: 400 }}>kcal</span></div>
        </div>
        <div style={{ background: GREEN, borderRadius: 14, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 26 }}>⚖️</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>预计减重</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{kg} <span style={{ fontSize: 13, fontWeight: 400 }}>公斤</span></div>
        </div>
      </div>

      <div style={cs(TH)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: YELLOW }}>健康提示</span>
        </div>
        {['禁食期间多喝水', '感到不适请立即停止', '建议从短时间开始', '禁食前后避免暴饮暴食'].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 3 ? 8 : 0 }}>
            <span style={{ color: TH.sub, fontSize: 13 }}>•</span>
            <span style={{ fontSize: 13, color: TH.sub, lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </div>

      {showDur && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 18, textAlign: 'center', marginBottom: 20, color: TH.text }}>选择时长</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 4, 6, 8, 10, 12].map((d) => (
                <button key={d} onClick={() => setTmpDur(d)}
                  style={{ width: 72, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, background: tmpDur === d ? P : TH.card, color: tmpDur === d ? '#fff' : TH.text }}>{d}h</button>
              ))}
            </div>
            <div style={{ background: 'rgba(255,248,200,.08)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', gap: 8 }}>
              <span>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#FCD34D', marginBottom: 4 }}>温馨提示</div>
                <div style={{ fontSize: 12, color: TH.sub }}>请听从身体的声音，感到不适请立即停止。</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }} onClick={() => setAgreed((v) => !v)}>
              <div style={{ width: 18, height: 18, border: `2px solid ${agreed ? P : TH.border}`, borderRadius: 4, background: agreed ? P : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {agreed && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: TH.text }}>我已了解</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDur(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 14, cursor: 'pointer' }}>{T('cancel')}</button>
              <button disabled={!agreed} onClick={() => { startFasting(tmpDur); setShowDur(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', cursor: agreed ? 'pointer' : 'not-allowed', background: agreed ? P : 'rgba(128,128,128,.2)', color: '#fff', fontWeight: 600, fontSize: 14 }}>⏰ 开始</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
