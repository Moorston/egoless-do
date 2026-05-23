import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState, useMemo } from 'react';
import { useStore } from '../../utils/store';
import { useT } from '../../utils/i18n';
import { COLORS, tomorrow, dateStr, daysInMonth } from '../../core';
import type { Habit, HabitStatus } from '../../core';
import { getPrimaryColor } from '../../utils/theme';

const P = getPrimaryColor();
const SL: Record<HabitStatus, string> = { notStarted: 'habitStatusNotStarted', inProgress: 'habitStatusInProgress', paused: 'habitStatusPaused', abandoned: 'habitStatusAbandoned', completed: 'habitStatusCompleted' };
const SC: Record<HabitStatus, string> = { notStarted: '#888', inProgress: COLORS.GREEN, paused: COLORS.YELLOW, abandoned: COLORS.RED, completed: P };
const ALL_FILTERS: [string, string][] = [['all', 'habitStatusAll'], ['notStarted', 'habitStatusNotStarted'], ['inProgress', 'habitStatusInProgress'], ['paused', 'habitStatusPaused'], ['abandoned', 'habitStatusAbandoned'], ['completed', 'habitStatusCompleted']];

export default function HabitsPage() {
  const store = useStore();
  const T = useT();
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [insight, setInsight] = useState('');
  const [autoTag, setAutoTag] = useState(true);
  const [days, setDays] = useState('21');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCal, setShowCal] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = filter === 'all' ? store.habits : store.habits.filter(h => h.status === filter);
  const calHabit = useMemo(() => store.habits.find(h => h.id === showCal), [store.habits, showCal]);
  const calDays = useMemo(() => daysInMonth(calYear, calMonth), [calYear, calMonth]);
  const firstDay = useMemo(() => new Date(calYear, calMonth, 1).getDay(), [calYear, calMonth]);

  const save = () => {
    if (!name.trim()) return;
    if (editingId) {
      store.updateHabit(editingId, { name, goal, insight, targetDays: +days || 21 });
    } else {
      store.addHabit({ name, startDate: tomorrow(), targetDays: +days || 21, goal, insight, createTag: autoTag });
    }
    resetForm();
  };

  const resetForm = () => { setName(''); setGoal(''); setInsight(''); setAutoTag(true); setDays('21'); setEditingId(null); setShowAdd(false); };

  return (
    <View style={{ background: '#0F0A1E', minHeight: '100vh' }}>
      <ScrollView scrollY style={{ height: '100vh', padding: '32rpx' }}>
        {/* Header */}
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32rpx' }}>
          <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold' }}>{T('habitTitle')}</Text>
          <View onClick={() => { setEditingId(null); setName(''); setGoal(''); setInsight(''); setAutoTag(true); setDays('21'); setShowAdd(true); }} style={{ background: P, borderRadius: '40rpx', padding: '12rpx 28rpx' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx' }}>{T('habitAdd')}</Text>
          </View>
        </View>

        {/* Filter */}
        <ScrollView scrollX style={{ marginBottom: '28rpx' }}>
          <View style={{ display: 'flex', gap: '12rpx' }}>
            {ALL_FILTERS.map(([v, l]) => (
              <View key={v} onClick={() => setFilter(v)} style={{ padding: '10rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${filter === v ? P : 'rgba(255,255,255,.2)'}`, background: filter === v ? `${P}30` : 'transparent' }}>
                <Text style={{ color: filter === v ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{T(l)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Habit cards */}
        {filtered.map(h => (
          <View key={h.id} style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '28rpx', marginBottom: '20rpx' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24rpx' }}>
              <View style={{ flex: 1, marginRight: '20rpx' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', display: 'block' }}>{h.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '6rpx' }}>{T('habitStart')} {h.startDate} · {T('habitGoal')} {h.targetDays} {T('habitDays')}</Text>
                {h.goal ? <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>🎯 {h.goal}</Text> : null}
                {h.insight ? <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '4rpx', fontStyle: 'italic' }}>"{h.insight}"</Text> : null}
                {h.createTag && (
                  <View style={{ marginTop: '12rpx', alignSelf: 'flex-start', background: `${P}30`, borderRadius: '20rpx', paddingHorizontal: '20rpx', paddingVertical: '6rpx' }}>
                    <Text style={{ color: P, fontSize: '40rpx' }}>#{h.name}</Text>
                  </View>
                )}
                {h.pauseReason ? <Text style={{ color: COLORS.YELLOW, fontSize: '40rpx', display: 'block', marginTop: '8rpx' }}>⏸ {h.pauseReason}</Text> : null}
              </View>
              <View style={{ background: `${SC[h.status]}22`, borderRadius: '16rpx', paddingHorizontal: '20rpx', paddingVertical: '8rpx' }}>
                <Text style={{ color: SC[h.status], fontSize: '40rpx', fontWeight: '600' }}>{T(SL[h.status])}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={{ marginBottom: '24rpx' }}>
              <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12rpx' }}>
                <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{h.doneDays}/{h.targetDays} {T('habitDays')}</Text>
                <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{Math.round(h.doneDays / Math.max(h.targetDays, 1) * 100)}%</Text>
              </View>
              <View style={{ height: '12rpx', background: 'rgba(255,255,255,.1)', borderRadius: '6rpx', overflow: 'hidden' }}>
                <View style={{ height: '12rpx', background: P, borderRadius: '6rpx', width: `${Math.min(h.doneDays / Math.max(h.targetDays, 1) * 100, 100)}%` }} />
              </View>
            </View>

            {/* Stats */}
            <View onClick={() => { setShowCal(h.id); setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }}
              style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '28rpx' }}>
              {[
                { v: h.doneDays, l: T('habitCumDays'), c: P },
                { v: h.streak, l: T('habitStreakDays'), c: COLORS.ORANGE },
                { v: h.interrupted, l: T('habitInterrupted'), c: COLORS.RED },
                { v: Math.max(0, h.targetDays - h.doneDays), l: T('habitRemainDays'), c: COLORS.GREEN },
              ].map(({ v, l, c }) => (
                <View key={l} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: '40rpx', fontWeight: '800', color: c, display: 'block', textAlign: 'center' }}>{v}</Text>
                  <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)', display: 'block', textAlign: 'center' }}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={{ display: 'flex', gap: '16rpx' }}>
              {(h.status === 'notStarted' || h.status === 'inProgress') && (
                <View onClick={() => { setName(h.name); setGoal(h.goal ?? ''); setInsight(h.insight ?? ''); setAutoTag(h.createTag ?? true); setDays(String(h.targetDays)); setEditingId(h.id); setShowAdd(true); }} style={{ paddingHorizontal: '24rpx', paddingVertical: '12rpx', borderRadius: '16rpx', border: `2rpx solid ${COLORS.BLUE}` }}>
                  <Text style={{ color: COLORS.BLUE, fontSize: '40rpx' }}>✏ {T('habitEdit')}</Text>
                </View>
              )}
              {h.status === 'notStarted' && (
                <>
                  <View onClick={() => setConfirmDelete(h.id)} style={{ paddingHorizontal: '24rpx', paddingVertical: '12rpx', borderRadius: '16rpx', border: `2rpx solid ${COLORS.RED}` }}>
                    <Text style={{ color: COLORS.RED, fontSize: '40rpx' }}>🗑 {T('habitDelete')}</Text>
                  </View>
                  <View onClick={() => store.updateHabit(h.id, { status: 'inProgress' })} style={{ paddingHorizontal: '24rpx', paddingVertical: '12rpx', borderRadius: '16rpx', border: `2rpx solid ${COLORS.GREEN}` }}>
                    <Text style={{ color: COLORS.GREEN, fontSize: '40rpx' }}>{T('habitStartBtn')}</Text>
                  </View>
                </>
              )}
              {h.status === 'inProgress' && (
                <View onClick={() => store.updateHabit(h.id, { status: 'paused' })} style={{ paddingHorizontal: '24rpx', paddingVertical: '12rpx', borderRadius: '16rpx', border: `2rpx solid ${COLORS.YELLOW}` }}>
                  <Text style={{ color: COLORS.YELLOW, fontSize: '40rpx' }}>{T('habitPauseBtn')}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <Text style={{ color: 'rgba(255,255,255,.45)', textAlign: 'center', display: 'block', marginTop: '120rpx', fontSize: '40rpx' }}>{T('habitEmpty')}</Text>
        )}
      </ScrollView>

      {/* Add modal */}
      {showAdd && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <View style={{ background: '#1A1030', borderRadius: '48rpx 48rpx 0 0', padding: '48rpx 40rpx', width: '100%' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32rpx' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx' }}>{T('habitAddTitle')}</Text>
              <Text onClick={() => resetForm()} style={{ color: 'rgba(255,255,255,.4)', fontSize: '52rpx' }}>×</Text>
            </View>
            <View style={{ marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('habitName')}</Text>
              <Input value={name} onInput={e => setName(e.detail.value)} placeholder="每日冥想"
                style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', color: '#fff', fontSize: '40rpx', width: '100%' }} />
            </View>
            <View style={{ marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('habitGoal')}</Text>
              <Input value={goal} onInput={e => setGoal(e.detail.value)} placeholder="每天5分钟"
                style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', color: '#fff', fontSize: '40rpx', width: '100%' }} />
            </View>
            <View style={{ marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('habitInsight')}</Text>
              <Input value={insight} onInput={e => setInsight(e.detail.value)} placeholder="为什么要做这个习惯"
                style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', color: '#fff', fontSize: '40rpx', width: '100%' }} />
            </View>
            <View style={{ marginBottom: '20rpx' }}>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '8rpx' }}>{T('habitTargetDays')}</Text>
              <Input value={days} onInput={e => setDays(e.detail.value)} placeholder="21"
                style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '20rpx 24rpx', color: '#fff', fontSize: '40rpx', width: '100%' }} />
            </View>
            <View onClick={() => setAutoTag(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '32rpx' }}>
              <View style={{ width: '36rpx', height: '36rpx', borderRadius: '8rpx', border: `4rpx solid ${autoTag ? P : 'rgba(255,255,255,.2)'}`, background: autoTag ? P : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {autoTag && <Text style={{ color: '#fff', fontSize: '40rpx' }}>✓</Text>}
              </View>
              <Text style={{ color: '#fff', fontSize: '40rpx' }}>自动创建标签 #{name || 'habit'}</Text>
            </View>
            <View onClick={save} style={{ background: P, borderRadius: '24rpx', padding: '28rpx', textAlign: 'center', marginTop: '16rpx' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx' }}>{T('createHabit')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Calendar modal */}
      {showCal && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <View style={{ background: '#1A1030', borderRadius: '48rpx 48rpx 0 0', padding: '48rpx 40rpx', width: '100%', maxHeight: '80vh' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32rpx' }}>
              <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{T('habitCalendar')}</Text>
              <Text onClick={() => setShowCal(null)} style={{ color: 'rgba(255,255,255,.4)', fontSize: '52rpx' }}>×</Text>
            </View>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32rpx' }}>
              <Text onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} style={{ color: P, fontSize: '40rpx' }}>‹</Text>
              <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{calYear}年{calMonth + 1}月</Text>
              <Text onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} style={{ color: P, fontSize: '40rpx' }}>›</Text>
            </View>
            <View style={{ display: 'flex', marginBottom: '16rpx' }}>
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={{ display: 'flex', flexWrap: 'wrap' }}>
              {Array.from({ length: firstDay }).map((_, i) => <View key={`e${i}`} style={{ width: '14.28%', aspectRatio: '1' }} />)}
              {Array.from({ length: calDays }).map((_, i) => {
                const day = i + 1;
                const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const checked = calHabit?.checkedDates.includes(ds);
                const isToday = ds === dateStr();
                return (
                  <View key={day} style={{ width: '14.28%', aspectRatio: '1', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: '64rpx', height: '64rpx', borderRadius: '32rpx', alignItems: 'center', justifyContent: 'center', background: checked ? P : isToday ? `${P}30` : 'transparent' }}>
                      <Text style={{ color: checked ? '#fff' : isToday ? P : '#fff', fontSize: '40rpx', fontWeight: isToday ? '700' : '400' }}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ display: 'flex', justifyContent: 'center', gap: '40rpx', marginTop: '32rpx' }}>
              <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                <View style={{ width: '24rpx', height: '24rpx', borderRadius: '12rpx', background: P }} />
                <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{T('habitChecked')}</Text>
              </View>
              <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                <View style={{ width: '24rpx', height: '24rpx', borderRadius: '12rpx', background: `${P}30` }} />
                <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{T('habitToday')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48rpx' }}>
          <View style={{ background: '#1A1030', borderRadius: '40rpx', padding: '48rpx', width: '100%', alignItems: 'center' }}>
            <Text style={{ fontSize: '80rpx', display: 'block', marginBottom: '24rpx' }}>🗑</Text>
            <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff', marginBottom: '16rpx', display: 'block' }}>{T('habitConfirmDelete')}</Text>
            <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', textAlign: 'center', display: 'block', marginBottom: '40rpx' }}>{T('habitConfirmDeleteDesc')}</Text>
            <View style={{ display: 'flex', gap: '16rpx', width: '100%' }}>
              <View onClick={() => setConfirmDelete(null)} style={{ flex: 1, border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('habitCancel')}</Text>
              </View>
              <View onClick={() => { if (confirmDelete) store.deleteHabit(confirmDelete); setConfirmDelete(null); }}
                style={{ flex: 1, background: COLORS.RED, borderRadius: '24rpx', padding: '24rpx', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('habitConfirm')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

