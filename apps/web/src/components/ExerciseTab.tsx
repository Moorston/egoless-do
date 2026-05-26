'use client';

import { useState, useMemo } from 'react';
import { SPORT_GROUPS, THEMES } from '@egoless-do/core';
import type { SportItem } from '@egoless-do/core';
import { useT, LinkWorldBtn } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { useOverlay } from './useOverlay';

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ExerciseTab() {
  const overlay = useOverlay();
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const [showOther, setShowOther] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('我的运动');
  const [showRecent, setShowRecent] = useState(false);

  const startSport = (s: SportItem) => {
    overlay.open('sport', { sport: s });
  };

  const exerciseLog = store.exerciseLog ?? [];

  // ── Weekly stats ──
  const weeklyStats = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3600 * 1000;
    const weekEntries = exerciseLog.filter(e => e.timestamp >= weekStart);
    const weekKm = weekEntries.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const weekCount = weekEntries.length;
    const allPaces = exerciseLog.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
    const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;
    return { weekKm, weekCount, bestPace };
  }, [exerciseLog]);

  const recentEntries = exerciseLog.slice(0, 3);

  const quickSports = [
    { icon: '🚶', label: T('exerciseWalk'), key: '行走', color: '#10B981', gps: true },
    { icon: '🏃', label: T('exerciseRun'), key: '跑步', color: '#3B82F6', gps: true },
    { icon: '🚴', label: T('exerciseCycle'), key: '骑行', color: '#F97316', gps: true },
    { icon: '🏋', label: T('exerciseOther'), key: '', color: '#8B5CF6', gps: false, more: true },
  ];

  return (
    <>
      {/* ── Hero Banner ── */}
      <div style={{
        borderRadius: 20, padding: 20, marginBottom: 20,
        background: `linear-gradient(135deg, ${P}, ${P}CC)`,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{T('exercise')}</div>
        {weeklyStats.weekCount > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{weeklyStats.weekKm.toFixed(1)}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>km</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseWeeklyKm')}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,.2)', margin: '4px 0' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{weeklyStats.weekCount}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseWorkouts')}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,.2)', margin: '4px 0' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>
                {weeklyStats.bestPace > 0 ? formatPace(weeklyStats.bestPace) : '--:--'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>/km</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseBestPace')}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>{T('exerciseNoActivity')}</div>
        )}
      </div>

      {/* ── Quick Start Grid ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TH.text, marginBottom: 12 }}>{T('exerciseQuickStart')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {quickSports.map(s => (
            <div key={s.label}
              onClick={() => s.more ? setShowOther(true) : startSport({ key: s.key, icon: s.icon, color: s.color, gps: s.gps })}
              style={{
                background: s.color, borderRadius: 16, padding: 16, minHeight: 100,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 36 }}>{s.icon}</span>
                {s.gps && (
                  <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: 8, padding: '3px 8px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                    {T('exerciseGpsTag')}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sport Categories (collapsible) ── */}
      <div style={{ marginBottom: 20 }}>
        {SPORT_GROUPS.map(g => {
          const isOpen = expandedGroup === g.group;
          return (
            <div key={g.group} style={{ marginBottom: 8 }}>
              <div
                onClick={() => setExpandedGroup(isOpen ? null : g.group)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', cursor: 'pointer' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: TH.text }}>{g.group} ({g.items.length})</span>
                <span style={{ fontSize: 14, color: TH.sub, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>›</span>
              </div>
              {isOpen && (
                <div style={{ background: TH.card, borderRadius: 14, overflow: 'hidden', border: `1px solid ${TH.border}` }}>
                  {g.items.map((s, i) => (
                    <div key={s.key}
                      onClick={() => startSport(s)}
                      style={{ display: 'flex', alignItems: 'center', padding: 14, gap: 12, cursor: 'pointer', borderBottom: i < g.items.length - 1 ? `1px solid ${TH.border}` : 'none' }}>
                      <span style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</span>
                      <span style={{ fontSize: 15, color: TH.text, flex: 1 }}>{s.key}</span>
                      {s.gps && (
                        <span style={{ background: `${P}20`, borderRadius: 6, padding: '2px 6px', fontSize: 11, color: P, fontWeight: 600 }}>
                          {T('exerciseGpsTag')}
                        </span>
                      )}
                      <span style={{ fontSize: 14, color: TH.sub }}>›</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recent Activity ── */}
      {recentEntries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div onClick={() => setShowRecent(v => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRecent ? 10 : 0, cursor: 'pointer' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: TH.text }}>{T('exerciseRecentActivity')} {showRecent ? '▾' : '▸'}</span>
            <span onClick={(e) => { e.stopPropagation(); overlay.open('exerciseHistory'); }} style={{ fontSize: 14, color: P, cursor: 'pointer' }}>{T('exerciseViewAll')} ›</span>
          </div>
          {showRecent && recentEntries.map(e => (
            <div key={e.id} style={{
              background: TH.card, borderRadius: 14, padding: 14, marginBottom: 8,
              border: `1px solid ${TH.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            }}
              onClick={() => overlay.open('exerciseHistory')}>
              <span style={{ fontSize: 28 }}>{e.sportIcon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: TH.text }}>{e.sportKey}</div>
                <div style={{ fontSize: 13, color: TH.sub, marginTop: 2 }}>
                  {new Date(e.timestamp).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: P }}>
                  {Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}
                </div>
                {e.distanceKm ? <div style={{ fontSize: 13, color: TH.sub }}>{e.distanceKm.toFixed(2)} km</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Global Map ── */}
      <LinkWorldBtn label={T('exerciseGlobal')} onClick={() => overlay.open('globalMap', { globalMapTitle: `${T('linkWorld')} — ${T('exerciseGlobal')}` })} />

      {/* ── Other sports drawer ── */}
      {showOther && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: TH.border, margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: TH.text }}>{T('exerciseCategory')}</div>
              <button onClick={() => setShowOther(false)} style={{ width: 34, height: 34, borderRadius: 17, background: TH.card, border: 'none', fontSize: 16, cursor: 'pointer', color: TH.text }}>×</button>
            </div>
            {SPORT_GROUPS.map(g => (
              <div key={g.group}>
                <div style={{ fontSize: 16, color: TH.sub, fontWeight: 600, padding: '12px 0 6px' }}>{g.group}</div>
                {g.items.map(s => (
                  <div key={s.key} onClick={() => { startSport(s); setShowOther(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${TH.border}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</span>
                      <span style={{ fontSize: 16, color: TH.text }}>{s.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
