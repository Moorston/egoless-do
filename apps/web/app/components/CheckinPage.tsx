'use client';

import { useState } from 'react';
import { useAppStore, ORANGE, GREEN, RED, dateStr } from '@egoless/core';
import { RowItem, Toggle, useTheme, useT, inp } from './helpers';

export default function CheckinPage({ onClose }: { onClose: () => void }) {
  const { TH, P } = useTheme();
  const T = useT();
  const checkinDone = useAppStore((s) => s.checkinDone);
  const setCheckinDone = useAppStore((s) => s.setCheckinDone);
  const addCheckin = useAppStore((s) => s.addCheckin);
  const habits = useAppStore((s) => s.habits);
  const streak = useAppStore((s) => s.streak);

  const [weight, setWeight] = useState('65');
  const [fasted, setFasted] = useState(false);
  const [water, setWater] = useState('');
  const [practices, setPractices] = useState({ sit: false, stand: false, chant: false });
  const [note, setNote] = useState('');
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>([]);
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>({});
  const [localDone, setLocalDone] = useState<boolean | null>(checkinDone);
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: TH.bg, overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: '-apple-system,system-ui,sans-serif', color: TH.text, fontSize: 16 }}>
      <div style={{ padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: 22, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: TH.text }}>{T('todayCheckin')}</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: TH.sub, marginBottom: 6 }}>今日体重</div>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${TH.border}`, borderRadius: 10, background: TH.card }}>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
              style={{ flex: 1, textAlign: 'center', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, padding: '8px 0', background: 'transparent', color: TH.text }} />
            <span style={{ flex: 1, textAlign: 'center', color: TH.sub, fontSize: 13, padding: '8px 0' }}>公斤</span>
          </div>
        </div>

        <RowItem label="今日禁欲" icon="🙏" right={<Toggle on={fasted} onChange={() => setFasted((v) => !v)} />} />
        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>💧</span><span style={{ color: TH.text }}>今日饮水</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['500ml', '1000ml', '1500ml', '2000ml', '>2000ml'].map((v) => (
              <button key={v} onClick={() => setWater(v)}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${water === v ? P : TH.border}`, background: water === v ? `${P}30` : 'transparent', color: water === v ? '#fff' : TH.sub, fontSize: 13, cursor: 'pointer' }}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>⭐</span><span style={{ fontWeight: 600, color: TH.text }}>修行记录</span>
          </div>
          {[{ key: 'sit' as const, icon: '🧘', label: '打坐' }, { key: 'stand' as const, icon: '🧍', label: '站桩' }, { key: 'chant' as const, icon: '📿', label: '诵经' }].map(({ key, icon, label }, i, arr) => (
            <RowItem key={key} icon={icon} label={label} last={i === arr.length - 1}
              right={<Toggle on={practices[key]} onChange={() => setPractices((p) => ({ ...p, [key]: !p[key] }))} />} />
          ))}
        </div>

        {habits.filter((h) => h.status === 'inProgress').length > 0 && (
          <div style={{ padding: '13px 0', borderBottom: `1px solid ${TH.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>◇</span><span style={{ fontWeight: 600, color: TH.text }}>习惯打卡</span>
            </div>
            {habits.filter((h) => h.status === 'inProgress').map((h, i, arr) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${TH.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>◇</span>
                  <div>
                    <div style={{ fontSize: 14, color: TH.text }}>{h.name}</div>
                    <div style={{ fontSize: 13, color: TH.sub }}>连续 {h.streak} 天</div>
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
              <span style={{ fontSize: 18 }}>✎</span><span style={{ fontWeight: 600, color: TH.text }}>{T('freeCheckin')}</span>
            </div>
            <button onClick={() => setFreeItems((f) => [...f, { id: String(Date.now()), name: '' }])}
              style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: P, color: '#fff', fontSize: 18, cursor: 'pointer' }}>+</button>
          </div>
          {freeItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Toggle on={!!freeCheckins[item.id]} onChange={() => setFreeCheckins((c) => ({ ...c, [item.id]: !c[item.id] }))} />
              <input value={item.name} onChange={(e) => setFreeItems((f) => f.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x))}
                placeholder={`自定义项目 ${freeItems.indexOf(item) + 1}`} style={{ ...inp(TH), flex: 1, padding: '7px 10px' } as React.CSSProperties} />
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 13, color: TH.sub, marginBottom: 8 }}>{T('note')}</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="今天有什么想说的..." rows={3}
            style={{ width: '100%', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, padding: '10px 12px', color: TH.text, fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setLocalDone(false)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === false ? RED : TH.border, background: localDone === false ? 'rgba(239,68,68,.15)' : 'transparent', color: localDone === false ? RED : TH.sub }}>
            ✗ {T('notDone')}
          </button>
          <button onClick={() => setLocalDone(true)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer',
              border: '2px solid', borderColor: localDone === true ? GREEN : TH.border, background: localDone === true ? 'rgba(16,185,129,.15)' : 'transparent', color: localDone === true ? GREEN : TH.sub }}>
            ✓ {T('done')}
          </button>
        </div>

        <button onClick={() => { setCheckinDone(localDone); addCheckin({ date: dateStr(), done: localDone ?? false, note, streak }); onClose(); }}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', marginBottom: 10, background: localDone === true ? GREEN : localDone === false ? RED : P, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {localDone === true ? T('submit') : localDone === false ? T('save') : '请选择完成状态'}
        </button>

        <div style={{ padding: '12px 0' }}>
          <button onClick={onClose}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${TH.border}`, background: 'transparent', color: TH.sub, fontSize: 15, cursor: 'pointer' }}>
            {T('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
