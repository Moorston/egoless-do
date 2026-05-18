import { useState } from 'react';
import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import { useAppStore, THEMES, t } from '@egoless/core';
import { Card, Btn, Modal } from '../../components/helpers';

const STATUS_MAP: Record<string, string> = {
  notStarted: '未开始',
  inProgress: '进行中',
  paused: '已暂停',
  abandoned: '已废弃',
  completed: '已完成',
};

const STATUS_LIST = ['notStarted', 'inProgress', 'paused', 'abandoned', 'completed'];

export default function Habits() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const habits = useAppStore((s) => s.habits);
  const addHabit = useAppStore((s) => s.addHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const changeHabitStatus = useAppStore((s) => s.changeHabitStatus);
  const checkInHabit = useAppStore((s) => s.checkInHabit);

  const [activeFilter, setActiveFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [insight, setInsight] = useState('');
  const [targetDays, setTargetDays] = useState('30');
  const [createTag, setCreateTag] = useState(true);

  const [showStatusChange, setShowStatusChange] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState<string | null>(null);

  const filtered = activeFilter === 'all'
    ? habits
    : habits.filter((h: any) => h.status === activeFilter);

  function handleAdd() {
    if (!name.trim()) return;
    addHabit({
      name: name.trim(), goal: goal.trim(), insight: insight.trim() || name.trim(),
      targetDays: Number(targetDays) || 30, startDate: new Date().toISOString().slice(0, 10),
      createTag,
    } as any);
    setName(''); setGoal(''); setInsight(''); setTargetDays('30'); setCreateTag(true);
    setShowAdd(false);
  }

  function handleStatusChange(id: string) {
    if (!newStatus) return;
    if (['abandoned', 'paused'].includes(newStatus)) {
      changeHabitStatus(id, newStatus as any, statusReason);
    } else {
      changeHabitStatus(id, newStatus as any);
    }
    setShowStatusChange(null);
    setStatusReason('');
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg } as any}>
      {/* Add Habit */}
      <Btn onClick={() => setShowAdd(true)}>➕ 新建习惯</Btn>

      {/* Filter */}
      <View style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, padding: '4px 0' }}>
        {['all', ...STATUS_LIST].map((s) => (
          <View key={s} onClick={() => setActiveFilter(s)}
            style={{
              padding: '4px 12px', borderRadius: 14, whiteSpace: 'nowrap',
              background: activeFilter === s ? TH.primary : 'rgba(255,255,255,.06)',
              color: activeFilter === s ? '#fff' : TH.sub, fontSize: 12,
            }}>
            <Text>{s === 'all' ? '全部' : STATUS_MAP[s]}</Text>
          </View>
        ))}
      </View>

      {/* Habit List */}
      {filtered.map((h: any) => {
        const pct = h.targetDays > 0 ? Math.min(100, Math.round(h.doneDays / h.targetDays * 100)) : 0;
        return (
          <Card key={h.id}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text }}>{h.name}</Text>
                <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2, display: 'block' }}>
                  {h.startDate} · 目标{h.targetDays}天 · 已完成{h.doneDays}天
                </Text>
              </View>
              <View style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 10,
                background: h.status === 'completed' ? '#22C55E22' : h.status === 'inProgress' ? '#7C3AED22' : h.status === 'paused' ? '#F59E0B22' : 'rgba(255,255,255,.06)',
                color: h.status === 'completed' ? '#22C55E' : h.status === 'inProgress' ? '#7C3AED' : h.status === 'paused' ? '#F59E0B' : TH.sub,
              }}>
                <Text>{STATUS_MAP[h.status]}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', background: TH.primary, borderRadius: 3 }} />
            </View>

            {/* Stats */}
            <View style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11, color: TH.sub }}>🔥 连续 {h.streak} 天</Text>
              <Text style={{ fontSize: 11, color: TH.sub }}>⏸ 中断 {h.interrupted} 次</Text>
              <Text style={{ fontSize: 11, color: TH.sub }}>📅 剩余 {Math.max(0, h.targetDays - h.doneDays)} 天</Text>
            </View>

            {/* Actions */}
            <View style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {h.status === 'notStarted' && (
                <>
                  <View onClick={() => changeHabitStatus(h.id, 'inProgress')}
                    style={{ padding: '4px 10px', borderRadius: 12, background: '#22C55E22', fontSize: 11, color: '#22C55E' }}>
                    <Text>▶ 开始</Text>
                  </View>
                  <View onClick={() => { setShowDeleteConfirm(h.id); }}
                    style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(255,255,255,.06)', fontSize: 11, color: TH.sub }}>
                    <Text>🗑 取消</Text>
                  </View>
                </>
              )}
              {h.status === 'inProgress' && (
                <>
                  <View onClick={() => { setShowStatusChange(h.id); setNewStatus('paused'); }}
                    style={{ padding: '4px 10px', borderRadius: 12, background: '#F59E0B22', fontSize: 11, color: '#F59E0B' }}>
                    <Text>⏸ 暂停</Text>
                  </View>
                  <View onClick={() => { setShowCalendar(h.id); }}
                    style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(255,255,255,.06)', fontSize: 11, color: TH.sub }}>
                    <Text>📅 日历</Text>
                  </View>
                </>
              )}
              {h.status === 'paused' && (
                <View onClick={() => changeHabitStatus(h.id, 'inProgress')}
                  style={{ padding: '4px 10px', borderRadius: 12, background: '#22C55E22', fontSize: 11, color: '#22C55E' }}>
                  <Text>▶ 恢复</Text>
                </View>
              )}
            </View>
          </Card>
        );
      })}

      {/* Add Modal */}
      <Modal show={showAdd} onClose={() => setShowAdd(false)} title="➕ 新建习惯">
        <View style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input placeholder="习惯名称" value={name} onInput={(e) => setName(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} />
          <Input placeholder="目标（天）" value={targetDays} onInput={(e) => setTargetDays(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} type="digit" />
          <Input placeholder="目标描述" value={goal} onInput={(e) => setGoal(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} />
          <Input placeholder="心法口诀（选填）" value={insight} onInput={(e) => setInsight(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} />
          <View onClick={() => setCreateTag(!createTag)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <View style={{
              width: 18, height: 18, borderRadius: 3, border: '2px solid',
              borderColor: createTag ? TH.primary : 'rgba(255,255,255,.2)',
              background: createTag ? TH.primary : 'transparent',
            }} />
            <Text style={{ fontSize: 12, color: TH.sub }}>自动生成感念标签</Text>
          </View>
          <Btn onClick={handleAdd}>创建</Btn>
        </View>
      </Modal>

      {/* Status Change Modal */}
      <Modal show={!!showStatusChange} onClose={() => setShowStatusChange(null)} title="更改状态">
        {['paused', 'abandoned', 'completed'].filter((s) => s !== newStatus).length > 0 && (
          <View style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {['paused', 'abandoned', 'completed'].map((s) => (
              <View key={s} onClick={() => setNewStatus(s)}
                style={{
                  padding: '6px 14px', borderRadius: 16,
                  background: newStatus === s ? TH.primary : 'rgba(255,255,255,.08)',
                  color: newStatus === s ? '#fff' : TH.sub, fontSize: 12,
                }}>
                <Text>{STATUS_MAP[s]}</Text>
              </View>
            ))}
          </View>
        )}
        {['paused', 'abandoned'].includes(newStatus) && (
          <Input placeholder="原因（选填）" value={statusReason} onInput={(e) => setStatusReason(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text, marginBottom: 10 }} />
        )}
        <Btn onClick={() => showStatusChange && handleStatusChange(showStatusChange)}
          style={{ opacity: newStatus ? 1 : 0.5 }}>确认</Btn>
      </Modal>

      {/* Delete Confirm */}
      <Modal show={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="确认取消">
        <Text style={{ textAlign: 'center', fontSize: 13, color: TH.sub, marginBottom: 16, display: 'block' }}>
          确认取消习惯？取消后将永久删除，不可恢复。
        </Text>
        <View style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => setShowDeleteConfirm(null)}
            style={{ flex: 1, background: 'rgba(255,255,255,.1)', color: TH.text }}>返回</Btn>
          <Btn onClick={() => { if (showDeleteConfirm) deleteHabit(showDeleteConfirm); setShowDeleteConfirm(null); }}
            style={{ flex: 1, background: '#ef4444' }}>确认取消</Btn>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal show={!!showCalendar} onClose={() => setShowCalendar(null)} title="📅 打卡日历">
        {showCalendar && (() => {
          const h = habits.find((h: any) => h.id === showCalendar);
          if (!h) return null;
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const cells: React.ReactNode[] = [];
          for (let i = 0; i < firstDay; i++) cells.push(<View key={`empty-${i}`} style={{ width: 36, height: 36 }} />);
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const checked = h.checkedDates?.includes(dateStr);
            cells.push(
              <View key={d}
                onClick={() => checkInHabit(h.id, dateStr)}
                style={{
                  width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: checked ? TH.primary : 'rgba(255,255,255,.06)',
                  color: checked ? '#fff' : TH.sub, fontSize: 12,
                }}>
                <Text>{d}</Text>
              </View>
            );
          }
          return (
            <View>
              <Text style={{ fontSize: 13, color: TH.text, textAlign: 'center', marginBottom: 10, display: 'block' }}>
                {year}年{month + 1}月
              </Text>
              <View style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 4, justifyContent: 'center' }}>
                {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                  <Text key={d} style={{ width: 36, textAlign: 'center', fontSize: 10, color: TH.sub }}>{d}</Text>
                ))}
                {cells}
              </View>
            </View>
          );
        })()}
      </Modal>
    </ScrollView>
  );
}
