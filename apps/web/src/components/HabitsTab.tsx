'use client';

import { useState, useMemo } from 'react';
import { COLORS, tmr, daysInMonth, dateStr } from '@egoless-do/core';
import type { Habit } from '@egoless-do/core';
import { Toggle, useTheme, useT, cs, inp } from './helpers';
import { useWebStore } from '../store/useWebStore';

export default function HabitsTab() {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startDate: tmr(), targetDays: '21', goal: '', insight: '', createTag: true });
  const [showStatus, setShowStatus] = useState<{ id: string; ns: string } | null>(null);
  const [reason, setReason] = useState('');
  const [showCal, setShowCal] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const STATUS_LABELS_R: Record<string, string> = { all: T('habitStatusAll'), notStarted: T('habitStatusNotStarted'), inProgress: T('habitStatusInProgress'), paused: T('habitStatusPaused'), abandoned: T('habitStatusAbandoned'), completed: T('habitStatusCompleted') };
  const STATUS_COLORS_R: Record<string, string> = { notStarted: TH.sub, inProgress: COLORS.GREEN, paused: COLORS.YELLOW, abandoned: COLORS.RED, completed: P };
  const filtered = filter === 'all' ? store.habits : store.habits.filter((h) => h.status === filter);

  function save() {
    if (!form.name.trim()) return;
    if (editingId) { store.updateHabit(editingId, { ...form, targetDays: +form.targetDays }); }
    else { store.addHabit({ ...form, targetDays: +form.targetDays }); }
    setForm({ name: '', startDate: tmr(), targetDays: '21', goal: '', insight: '', createTag: true });
    setEditingId(null); setShowAdd(false);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TH.text }}>{T('myHabits')}</div>
        <button onClick={() => { setEditingId(null); setForm({ name: '', startDate: tmr(), targetDays: '21', goal: '', insight: '', createTag: true }); setShowAdd(true); }}
          style={{ padding: '6px 16px', borderRadius: 20, border: 'none', background: P, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{T('addHabit')}</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(STATUS_LABELS_R).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: '4px 10px', borderRadius: 20, fontSize: 16, cursor: 'pointer', border: '1px solid', background: filter === k ? P : 'transparent', color: filter === k ? '#fff' : P, borderColor: P }}>{l}</button>
        ))}
      </div>

      {filtered.map((h) => {
        const canEdit = h.status === 'notStarted' || h.status === 'inProgress';
        const sc = STATUS_COLORS_R[h.status] || P;
        return (
          <div key={h.id} style={{ ...cs(TH), padding: 16 } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1, marginRight: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: TH.text }}>{h.name}</div>
                <div style={{ fontSize: 16, color: TH.sub, marginTop: 3 }}>{T('habitStart')} {h.startDate} · {T('habitGoal')} {h.targetDays} {T('habitDays')}</div>
                {h.goal && <div style={{ fontSize: 16, color: TH.sub, marginTop: 2 }}>🎯 {h.goal}</div>}
                {h.insight && <div style={{ fontSize: 16, color: TH.sub, marginTop: 2, fontStyle: 'italic' }}>"{h.insight}"</div>}
                {h.createTag && <span style={{ fontSize: 16, padding: '2px 8px', borderRadius: 10, background: `${P}30`, color: P, marginTop: 4, display: 'inline-block' }}>#{h.name}</span>}
                {h.pauseReason && <div style={{ fontSize: 16, color: COLORS.YELLOW, marginTop: 4 }}>{T('habitPause')}{h.pauseReason}</div>}
                {h.abandonReason && <div style={{ fontSize: 16, color: COLORS.RED, marginTop: 4 }}>{T('habitAbandon')}{h.abandonReason}</div>}
              </div>
              <span style={{ fontSize: 16, padding: '3px 8px', borderRadius: 8, background: `${sc}20`, color: sc, fontWeight: 600, flexShrink: 0 }}>{STATUS_LABELS_R[h.status]}</span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: TH.sub, marginBottom: 4 }}>
                <span>{h.doneDays}/{h.targetDays} {T('days')}</span>
                <span>{Math.round(h.doneDays / Math.max(h.targetDays, 1) * 100)}%</span>
              </div>
              <div style={{ height: 6, background: TH.border, borderRadius: 3 }}>
                <div style={{ height: 6, background: P, borderRadius: 3, width: `${Math.min(h.doneDays / Math.max(h.targetDays, 1) * 100, 100)}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
              {[{ v: h.doneDays, l: T('habitCumDays'), c: P, cal: true }, { v: h.streak, l: T('habitStreakDays'), c: COLORS.ORANGE }, { v: h.interrupted, l: T('habitInterrupted'), c: COLORS.RED }, { v: Math.max(0, h.targetDays - h.doneDays), l: T('habitRemainDays'), c: COLORS.GREEN }].map(({ v, l, c, cal }) => (
                <div key={l} style={{ textAlign: 'center', cursor: cal ? 'pointer' : 'default' }} onClick={cal ? () => setShowCal(h.id) : undefined}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c, textDecoration: cal ? 'underline' : 'none' }}>{v}</div>
                  <div style={{ fontSize: 16, color: TH.sub }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {canEdit && <button onClick={() => { setForm({ name: h.name, startDate: h.startDate, targetDays: String(h.targetDays), goal: h.goal || '', insight: h.insight || '', createTag: h.createTag }); setEditingId(h.id); setShowAdd(true); }}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${COLORS.BLUE}`, background: 'transparent', color: COLORS.BLUE, fontSize: 16, cursor: 'pointer' }}>✏️ {T('editHabit')}</button>}
              {h.status === 'notStarted' && <button onClick={() => setConfirmDelete(h.id)}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${COLORS.RED}`, background: 'transparent', color: COLORS.RED, fontSize: 16, cursor: 'pointer' }}>🗑 {T('habitDelete')}</button>}
              {['notStarted', 'paused'].includes(h.status) && <button onClick={() => store.changeHabitStatus(h.id, 'inProgress')}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${COLORS.GREEN}`, background: 'transparent', color: COLORS.GREEN, fontSize: 16, cursor: 'pointer' }}>{T('habitStartBtn')}</button>}
              {h.status === 'inProgress' && <>
                <button onClick={() => { setShowStatus({ id: h.id, ns: 'paused' }); setReason(''); }}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${COLORS.YELLOW}`, background: 'transparent', color: COLORS.YELLOW, fontSize: 16, cursor: 'pointer' }}>{T('habitPauseBtn')}</button>
              </>}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && <div style={{ textAlign: 'center', color: TH.sub, padding: '40px 0', fontSize: 16 }}>{T('habitEmpty')}</div>}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 390, background: TH.cardSolid, borderRadius: '24px 24px 0 0', padding: '24px 24px 80px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{editingId ? T('habitEditTitle') : T('habitAddTitle')}</div>
              <button onClick={() => { setShowAdd(false); setEditingId(null); }} style={{ background: 'transparent', border: 'none', fontSize: 22, color: TH.sub, cursor: 'pointer' }}>×</button>
            </div>
            {[{ label: T('habitName'), key: 'name' as const, ph: '例：每日冥想' }, { label: T('habitGoal'), key: 'goal' as const, ph: '每天打坐5分钟' }, { label: T('habitInsight'), key: 'insight' as const, ph: '每天进步一点点...' }].map(({ label, key, ph }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 16, color: TH.sub, marginBottom: 6 }}>{label}</div>
                <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inp(TH)} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 16, color: TH.sub, marginBottom: 6 }}>{T('startDate')}</div>
              <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} style={inp(TH)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 16, color: TH.sub, marginBottom: 6 }}>{T('habitTargetDays')}</div>
              <input type="number" value={form.targetDays} onChange={(e) => setForm((f) => ({ ...f, targetDays: e.target.value }))} style={inp(TH)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: `1px solid ${TH.border}`, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, color: TH.text }}>{T('habitAutoTag')}</div>
                <div style={{ fontSize: 16, color: TH.sub, marginTop: 2 }}>{T('habitAutoTagDesc')}</div>
              </div>
              <Toggle on={form.createTag} onChange={() => setForm((f) => ({ ...f, createTag: !f.createTag }))} />
            </div>
            <button onClick={save} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('createHabit')}</button>
          </div>
        </div>
      )}

      {showStatus && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: TH.text }}>{showStatus.ns === 'paused' ? T('habitPauseReason') : T('habitAbandonReason')}</div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={T('habitReasonPlaceholder')} rows={3}
              style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, padding: '10px 12px', color: TH.text, fontSize: 16, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowStatus(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('cancel')}</button>
              <button onClick={() => { store.changeHabitStatus(showStatus.id, showStatus.ns as Habit['status'], reason); setShowStatus(null); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: P, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showCal && (
        <HabitCalendarModal habitId={showCal} onClose={() => setShowCal(null)} />
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: TH.text, marginBottom: 6 }}>{T('habitConfirmDelete')}</div>
            <div style={{ fontSize: 16, color: TH.sub, marginBottom: 20 }}>{T('habitConfirmDeleteDesc')}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('habitCancel')}</button>
              <button onClick={() => { store.deleteHabit(confirmDelete); setConfirmDelete(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.RED, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{T('habitConfirm')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HabitCalendarModal({ habitId, onClose }: { habitId: string; onClose: () => void }) {
  const store = useWebStore();
  const { TH, P } = useTheme();
  const T = useT();
  const habit = store.habits.find((h) => h.id === habitId);
  const checked = useMemo(() => new Set(habit?.checkedDates || []), [habit]);
  const today = new Date();
  const [vy, setVy] = useState(today.getFullYear());
  const [vm, setVm] = useState(today.getMonth());
  if (!habit) return null;

  const first = new Date(vy, vm, 1).getDay();
  const days = daysInMonth(vy, vm);
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const ms = `${vy}-${String(vm + 1).padStart(2, '0')}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: TH.cardSolid, borderRadius: 20, padding: 20, width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={() => { if (vm === 0) { setVy((y) => y - 1); setVm(11); } else setVm((m) => m - 1); }}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 22, cursor: 'pointer' }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 16, color: TH.text }}>{vy}年{vm + 1}月</div>
          <button onClick={() => { if (vm === 11) { setVy((y) => y + 1); setVm(0); } else setVm((m) => m + 1); }}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 22, cursor: 'pointer' }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 16, color: TH.sub }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = `${ms}-${String(d).padStart(2, '0')}`;
            const ck = checked.has(ds);
            const isT = ds === dateStr();
            return (
              <div key={i} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 7, fontSize: 16,
                fontWeight: ck ? 700 : 400, background: ck ? P : isT ? `${P}22` : 'transparent',
                color: ck ? '#fff' : isT ? P : TH.text }}>{d}</div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: P }} />
            <span style={{ fontSize: 16, color: TH.sub }}>{T('habitChecked')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: `${P}22` }} />
            <span style={{ fontSize: 16, color: TH.sub }}>{T('habitToday')}</span>
          </div>
        </div>
        <button onClick={onClose}
          style={{ width: '100%', marginTop: 14, padding: 11, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 16, cursor: 'pointer' }}>{T('cancel')}</button>
      </div>
    </div>
  );
}
