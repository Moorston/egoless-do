'use client';

import { useMemo } from 'react';
import { THEMES, COLORS, calculateCheckinStreak, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BACK, FONT_STAT_SECTION, formatTime, parseCheckinNote } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, CheckCircle2, PenLine, Star, Circle, Check, PersonStanding, BookOpen, Hand, Droplets, Utensils } from 'lucide-react';

export default function CheckinDetailPage({ date, onClose }: { date: string; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const record = store.checkinHistory.find((c: CheckinEntry) => c.date === date);

  const PRACTICE_LABELS: Record<string, string> = { sit: 'checkinSit', stand: 'checkinStand', chant: 'checkinSutra' };
  const PRACTICE_ICONS: Record<string, React.ReactNode> = { sit: <PersonStanding size={16} style={{verticalAlign:'middle'}} />, stand: <PersonStanding size={16} style={{verticalAlign:'middle'}} />, chant: <BookOpen size={16} style={{verticalAlign:'middle'}} /> };

  const parsed = useMemo(() => {
    if (!record) return { userNote: '', practices: [] as { key: string; icon: React.ReactNode; label: string }[], customs: [] as string[], fasted: false, waterMl: 0, habits: [] as string[], food: 0 };
    const raw = record.note || '';
    const result = parseCheckinNote(raw);
    const practices = result.practices.map((k: string) => ({
      key: k,
      icon: PRACTICE_ICONS[k] ?? k,
      label: T(PRACTICE_LABELS[k] ?? k),
    }));
    return { ...result, practices };
  }, [record]);

  if (!record) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto' }}>
        <div style={{ maxWidth: 390, margin: '0 auto', padding: '20px 16px' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: FONT_BODY }}>{T('checkinNoRecords')}</div>
        </div>
      </div>
    );
  }

  const streak = record.done ? calculateCheckinStreak(store.checkinHistory, date) : 0;

  const statusBg = record.done ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.08)';
  const statusColor = record.done ? COLORS.GREEN : COLORS.RED;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: TH.bg, overflowY: 'auto', fontFamily: '-apple-system,system-ui,sans-serif' }}>
      <div style={{ maxWidth: 390, margin: '0 auto', padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('checkinDetailTitle')}</div>
        </div>

        {/* Status card */}
        <div style={{
          background: statusBg, borderRadius: 16, padding: 20, marginBottom: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: FONT_STAT_SECTION, marginBottom: 8 }}>{record.done ? <CheckCircle2 size={36} style={{verticalAlign:'middle'}} /> : <PenLine size={36} style={{verticalAlign:'middle'}} />}</div>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: statusColor }}>
            {record.done ? T('checkinDone') : T('checkinNotDone')}
          </div>
          <div style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 4 }}>{formatTime(record.timestamp, record.date)}</div>
        </div>

        {/* Streak */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 0', borderBottom: `1px solid ${TH.border}`, marginBottom: 12,
        }}>
          <span style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('checkinStreak')}</span>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{streak} {T('days')}</span>
        </div>

        {/* Weight */}
        {record.weight != null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 6 }}>{T('checkinWeight')}</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${TH.border}`, borderRadius: 10, background: TH.card }}>
              <div style={{ flex: 1, textAlign: 'center', fontSize: FONT_BODY, fontWeight: 600, padding: '8px 0', color: TH.text }}>{record.weight}</div>
              <span style={{ flex: 1, textAlign: 'center', color: TH.sub, fontSize: FONT_BODY, padding: '8px 0' }}>{T('checkinKg')}</span>
            </div>
          </div>
        )}

        {/* Fasted & Water & Food */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {parsed.fasted && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(16,185,129,.12)', borderRadius: 10, minWidth: 100 }}>
              <span><Hand size={16} style={{verticalAlign:'middle'}} /></span>
              <span style={{ fontSize: FONT_BODY, color: COLORS.GREEN, fontWeight: 600 }}>{T('checkinAbstinence')}</span>
            </div>
          )}
          {parsed.waterMl > 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(59,130,246,.12)', borderRadius: 10, minWidth: 100 }}>
              <span><Droplets size={16} style={{verticalAlign:'middle'}} /></span>
              <span style={{ fontSize: FONT_BODY, color: COLORS.BLUE, fontWeight: 600 }}>{parsed.waterMl}ml</span>
            </div>
          )}
          {parsed.food > 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(245,158,11,.12)', borderRadius: 10, minWidth: 100 }}>
              <span><Utensils size={16} style={{verticalAlign:'middle'}} /></span>
              <span style={{ fontSize: FONT_BODY, color: COLORS.ORANGE, fontWeight: 600 }}>{parsed.food} kcal</span>
            </div>
          )}
        </div>

        {/* Practices */}
        {parsed.practices.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_TITLE }}><Star size={18} style={{verticalAlign:'middle'}} /></span>
              <span style={{ fontWeight: 600, color: TH.text }}>{T('checkinPractice')}</span>
            </div>
            {parsed.practices.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === parsed.practices.length - 1 ? 'none' : `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: FONT_BODY, color: TH.text }}>{p.icon} {p.label}</span>
                <span style={{ color: COLORS.GREEN, fontWeight: 700, fontSize: FONT_BODY }}><Check size={16} style={{verticalAlign:'middle'}} /></span>
              </div>
            ))}
          </div>
        )}

        {/* Custom items */}
        {parsed.customs.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_TITLE }}><PenLine size={18} style={{verticalAlign:'middle'}} /></span>
              <span style={{ fontWeight: 600, color: TH.text }}>{T('checkinCustom')}</span>
            </div>
            {parsed.customs.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === parsed.customs.length - 1 ? 'none' : `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: FONT_BODY, color: TH.text }}>{name}</span>
                <span style={{ color: COLORS.GREEN, fontWeight: 700, fontSize: FONT_BODY }}><Check size={16} style={{verticalAlign:'middle'}} /></span>
              </div>
            ))}
          </div>
        )}

        {/* Habits */}
        {parsed.habits.length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: FONT_TITLE }}><Circle size={18} style={{verticalAlign:'middle'}} /></span>
              <span style={{ fontWeight: 600, color: TH.text }}>{T('checkinHabitCheck')}</span>
            </div>
            {parsed.habits.map((name, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i === parsed.habits.length - 1 ? 'none' : `1px solid ${TH.border}`,
              }}>
                <span style={{ fontSize: FONT_BODY, color: TH.text }}>{name}</span>
                <span style={{ color: COLORS.GREEN, fontWeight: 700, fontSize: FONT_BODY }}><Check size={16} style={{verticalAlign:'middle'}} /></span>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        {parsed.userNote && (
          <div style={{ background: TH.card, borderRadius: 16, padding: 16, border: `1px solid ${TH.border}`, marginTop: 12 }}>
            <div style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('checkinNote')}</div>
            <div style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{parsed.userNote}</div>
          </div>
        )}
      </div>
    </div>
  );
}
