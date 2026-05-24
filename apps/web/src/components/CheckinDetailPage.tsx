'use client';

import { useMemo } from 'react';
import { THEMES, COLORS } from '@egoless-do/core';
import type { CheckinRecord } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';

function formatTime(ts?: number, date?: string): string {
  if (ts) {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return date ?? '';
}

export default function CheckinDetailPage({ date, onClose }: { date: string; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const record = store.checkinHistory.find((c: CheckinRecord) => c.date === date);

  const parsed = useMemo(() => {
    if (!record) return { userNote: '', practices: [] as { key: string; icon: string; label: string }[], customs: [] as string[], fasted: false, water: '', habits: [] as string[] };
    const raw = record.note || '';
    const PRACTICE_LABELS: Record<string, string> = { sit: 'checkinSit', stand: 'checkinStand', chant: 'checkinSutra' };
    const PRACTICE_ICONS: Record<string, string> = { sit: '🧘', stand: '🧍', chant: '📿' };

    // Try JSON format first (new format)
    try {
      const data = JSON.parse(raw);
      if (typeof data === 'object' && data !== null) {
        const practices = (data.practices as string[] ?? []).map((k: string) => ({
          key: k,
          icon: PRACTICE_ICONS[k] ?? k,
          label: T(PRACTICE_LABELS[k] ?? k),
        }));
        return {
          userNote: data.note ?? '',
          practices,
          customs: (data.customs as string[]) ?? [],
          fasted: !!data.fasted,
          water: data.water ?? '',
          habits: (data.habits as string[]) ?? [],
        };
      }
    } catch {
      // Not JSON — fall back to legacy emoji+delimiter format
    }

    // Legacy format: emoji prefixes + ' · ' delimiter
    const parts = raw.split(' · ');
    const practices: { key: string; icon: string; label: string }[] = [];
    const customs: string[] = [];
    const noteParts: string[] = [];
    for (const p of parts) {
      if (p.startsWith('🧘') || p.startsWith('🧍') || p.startsWith('📿')) {
        const entry = Object.entries(PRACTICE_ICONS).find(([, icon]) => p.startsWith(icon));
        practices.push(entry ? { key: entry[0], icon: entry[1], label: T(PRACTICE_LABELS[entry[0]] ?? entry[0]) } : { key: p, icon: p, label: p });
      } else if (p.startsWith('✓')) {
        customs.push(p.slice(1));
      } else if (p) {
        noteParts.push(p);
      }
    }
    return { userNote: noteParts.join(' · '), practices, customs, fasted: false, water: '', habits: [] };
  }, [record]);

  if (!record) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
        <div style={{ maxWidth: 390, margin: '0 auto', padding: '20px 16px' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0' }}>{T('checkinNoRecords')}</div>
        </div>
      </div>
    );
  }

  const statusBg = record.done ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.08)';
  const statusColor = record.done ? COLORS.GREEN : COLORS.RED;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto', fontFamily: '-apple-system,system-ui,sans-serif' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 22, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('checkinDetailTitle')}</div>
        </div>

        {/* Status card */}
        <div style={{
          background: statusBg, borderRadius: 16, padding: 20, marginBottom: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{record.done ? '✅' : '📝'}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: statusColor }}>
            {record.done ? T('checkinDone') : T('checkinNotDone')}
          </div>
          <div style={{ fontSize: 16, color: TH.sub, marginTop: 4 }}>{formatTime(record.timestamp, record.date)}</div>
        </div>

        {/* Streak */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 0', borderBottom: `1px solid ${TH.border}`, marginBottom: 12,
        }}>
          <span style={{ fontSize: 16, color: TH.sub }}>{T('checkinStreak')}</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: TH.text }}>{record.streak} {T('days')}</span>
        </div>

        {/* Weight */}
        {record.weight != null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 6 }}>{T('checkinWeight')}</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${TH.border}`, borderRadius: 10, background: TH.card }}>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600, padding: '8px 0', color: TH.text }}>{record.weight}</div>
              <span style={{ flex: 1, textAlign: 'center', color: TH.sub, fontSize: 16, padding: '8px 0' }}>{T('checkinKg')}</span>
            </div>
          </div>
        )}

        {/* Fasted & Water */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {parsed.fasted && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(16,185,129,.12)', borderRadius: 10 }}>
              <span>🙏</span>
              <span style={{ fontSize: 16, color: COLORS.GREEN, fontWeight: 600 }}>{T('checkinAbstinence')}</span>
            </div>
          )}
          {parsed.water && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(59,130,246,.12)', borderRadius: 10 }}>
              <span>💧</span>
              <span style={{ fontSize: 16, color: COLORS.BLUE, fontWeight: 600 }}>{parsed.water}</span>
            </div>
          )}
        </div>

        {/* Practices */}
        {parsed.practices.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ fontWeight: 600, color: TH.text }}>{T('checkinPractice')}</span>
            </div>
            {parsed.practices.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === parsed.practices.length - 1 ? 'none' : `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: 16, color: TH.text }}>{p.icon} {p.label}</span>
                <span style={{ color: COLORS.GREEN, fontWeight: 700, fontSize: 16 }}>✓</span>
              </div>
            ))}
          </div>
        )}

        {/* Custom items */}
        {parsed.customs.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>✎</span>
              <span style={{ fontWeight: 600, color: TH.text }}>{T('checkinCustom')}</span>
            </div>
            {parsed.customs.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === parsed.customs.length - 1 ? 'none' : `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: 16, color: TH.text }}>{name}</span>
                <span style={{ color: COLORS.GREEN, fontWeight: 700, fontSize: 16 }}>✓</span>
              </div>
            ))}
          </div>
        )}

        {/* Habits */}
        {parsed.habits.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>◇</span>
              <span style={{ fontWeight: 600, color: TH.text }}>{T('checkinHabitCheck')}</span>
            </div>
            {parsed.habits.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === parsed.habits.length - 1 ? 'none' : `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: 16, color: TH.text }}>{name}</span>
                <span style={{ color: COLORS.GREEN, fontWeight: 700, fontSize: 16 }}>✓</span>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        {parsed.userNote && (
          <div style={{ background: TH.card, borderRadius: 16, padding: 16, border: `1px solid ${TH.border}`, marginTop: 12 }}>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 8 }}>{T('checkinNote')}</div>
            <div style={{ fontSize: 16, color: TH.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{parsed.userNote}</div>
          </div>
        )}
      </div>
    </div>
  );
}
