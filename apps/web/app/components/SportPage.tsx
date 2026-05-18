'use client';

import { useState, useEffect, useRef } from 'react';
import { SPORT_BG_COLORS } from '@egoless/core';
import type { SportItem } from '@egoless/core';
import dynamic from 'next/dynamic';
import { useTheme, useT } from './helpers';

const GpsTrackMap = dynamic(() => import('./GpsTrackMap'), { ssr: false });

const GPS_SPORTS = new Set(['行走', '跑步', '骑行']);

export default function SportPage({ sport, onClose }: { sport: SportItem; onClose: () => void }) {
  const { TH } = useTheme();
  const T = useT();
  const [page, setPage] = useState<'prep' | 'active'>('prep');
  const [sec, setSec] = useState(0);
  const [active, setActive] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (page === 'active' && active) { ref.current = setInterval(() => setSec((s) => s + 1), 1000); }
    else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [page, active]);

  if (page === 'active' && GPS_SPORTS.has(sport.key)) {
    return <GpsTrackMap sport={sport} onClose={onClose} />;
  }

  const bg = SPORT_BG_COLORS[sport.key] || '#4CAF50';

  if (page === 'active') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#2a2835', overflowY: 'auto' }}>
        <div style={{ maxWidth: 390, margin: '0 auto', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.08)', paddingBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{sport.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#bbb' }}>{sport.key}</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}><span style={{ color: '#aaa' }}>❤️</span><span style={{ color: '#22C55E' }}>↗</span><span style={{ color: '#22C55E' }}>✏️</span></div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', margin: '14px 0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎵</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>选择运动音乐</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>让音乐陪伴你的每一次运动</div>
            </div>
          </div>
          <div style={{ padding: '32px 28px 0' }}>
            <div style={{ fontSize: 88, fontWeight: 900, color: '#fff' }}>{Math.floor(sec / 60) || 0}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginTop: 6, marginBottom: 48 }}>总消耗</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 40 }}>
              <div>
                <div style={{ fontSize: 38, fontWeight: 800, color: '#fff' }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>总时长</div>
              </div>
              <div>
                <div style={{ fontSize: 38, fontWeight: 800, color: '#fff' }}>0.{String(Math.floor(sec / 15)).padStart(2, '0')}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>爬升高度</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '0 24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
            <button style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>🔓</button>
            <button onClick={() => setActive((v) => !v)} style={{ width: 76, height: 76, borderRadius: 38, background: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
              {active ? '⏸' : '▶'}
            </button>
            <button onClick={onClose} style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{sport.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 15, color: TH.text }}>{sport.key}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.sub, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)' }}>
        <div style={{ width: '100%', margin: '0 0 16px', borderRadius: 18, overflow: 'hidden', height: 260, background: bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: 72, position: 'relative', zIndex: 1 }}>{sport.icon}</div>
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(255,255,255,.85)', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>{sport.key}运动数据将自动记录。请确保健康权限已开启，以获取更准确的数据。</div>
          </div>
        </div>
        <button onClick={() => { setSec(0); setActive(true); setPage('active'); }}
          style={{ width: '100%', height: 64, borderRadius: 32, border: 'none', background: bg, color: '#fff', fontWeight: 900, fontSize: 28, cursor: 'pointer', letterSpacing: 2, marginBottom: 12 }}>
          GO
        </button>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.sub, fontSize: 13, cursor: 'pointer', display: 'block', margin: '0 auto' }}>← 返回</button>
      </div>
      </div>
    </div>
  );
}
