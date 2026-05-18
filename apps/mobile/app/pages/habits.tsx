import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { useAppStore, THEMES, t, GREEN, RED, YELLOW, BLUE, ORANGE } from '@egoless/core';

const STATUS_LABELS: Record<string, string> = { all: '全部', notStarted: '未开始', inProgress: '进行中', paused: '暂停', abandoned: '废弃', completed: '已完成' };
const STATUS_COLORS: Record<string, string> = { notStarted: '#888', inProgress: GREEN, paused: YELLOW, abandoned: RED, completed: '#7C3AED' };

export default function HabitsScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const habits = useAppStore((s) => s.habits);
  const addHabit = useAppStore((s) => s.addHabit);
  const updateHabit = useAppStore((s) => s.updateHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const changeHabitStatus = useAppStore((s) => s.changeHabitStatus);

  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startDate: new Date().toISOString().slice(0, 10), targetDays: '21', goal: '', insight: '', createTag: true });
  const [showStatusModal, setShowStatusModal] = useState<{ id: string; newStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [showCalendar, setShowCalendar] = useState<string | null>(null);

  const filtered = filter === 'all' ? habits : habits.filter((h) => h.status === filter);

  function saveHabit() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateHabit(editingId, { ...form, targetDays: +form.targetDays });
    } else {
      addHabit({ ...form, targetDays: +form.targetDays, status: 'notStarted' as const });
    }
    setForm({ name: '', startDate: new Date().toISOString().slice(0, 10), targetDays: '21', goal: '', insight: '', createTag: true });
    setEditingId(null);
    setShowAdd(false);
  }

  function openEdit(h: typeof habits[0]) {
    setForm({ name: h.name, startDate: h.startDate, targetDays: String(h.targetDays), goal: h.goal, insight: h.insight, createTag: h.createTag });
    setEditingId(h.id);
    setShowAdd(true);
  }

  function handleStatus(id: string, ns: string) {
    if (ns === 'paused' || ns === 'abandoned') {
      setShowStatusModal({ id, newStatus: ns });
      setStatusReason('');
      return;
    }
    changeHabitStatus(id, ns as any);
  }

  function confirmStatus() {
    if (!showStatusModal) return;
    changeHabitStatus(showStatusModal.id, showStatusModal.newStatus as any, statusReason);
    setShowStatusModal(null);
    setStatusReason('');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={[s.bg, { backgroundColor: TH.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={[s.flexRow, { marginBottom: 12 }]}>
          <Text style={[s.pageTitle, { color: TH.text }]}>{T('myHabits')}</Text>
          <TouchableOpacity onPress={() => { setEditingId(null); setForm({ name: '', startDate: today, targetDays: '21', goal: '', insight: '', createTag: true }); setShowAdd(true); }}
            style={[s.addBtn, { backgroundColor: P }]}>
            <Text style={s.addBtnText}>{T('addHabit')}</Text>
          </TouchableOpacity>
        </View>

        {/* status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setFilter(k)}
                style={[s.tagChip, { borderColor: P, backgroundColor: filter === k ? P : 'transparent' }]}>
                <Text style={{ fontSize: 11, color: filter === k ? '#fff' : P }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.map((h) => {
          const canEdit = h.status === 'notStarted' || h.status === 'inProgress';
          const sc = STATUS_COLORS[h.status] || P;
          return (
            <View key={h.id} style={[s.card, { backgroundColor: TH.card, borderColor: TH.border, padding: 16 }]}>
              <View style={[s.flexRow, { alignItems: 'flex-start', marginBottom: 10 }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: TH.text }}>{h.name}</Text>
                  <Text style={{ fontSize: 11, color: TH.sub, marginTop: 3 }}>开始 {h.startDate} · 目标 {h.targetDays} 天</Text>
                  {h.goal ? <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>🎯 {h.goal}</Text> : null}
                  {h.insight ? <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2, fontStyle: 'italic' }}>"{h.insight}"</Text> : null}
                  {h.createTag ? <Text style={[s.autoTag, { backgroundColor: `${P}30`, color: P }]}>#{h.name}</Text> : null}
                  {h.pauseReason ? <Text style={{ fontSize: 11, color: YELLOW, marginTop: 4 }}>暂停：{h.pauseReason}</Text> : null}
                  {h.abandonReason ? <Text style={{ fontSize: 11, color: RED, marginTop: 4 }}>废弃：{h.abandonReason}</Text> : null}
                </View>
                <Text style={[s.statusBadge, { backgroundColor: `${sc}20`, color: sc }]}>{STATUS_LABELS[h.status]}</Text>
              </View>

              {/* progress bar */}
              <View style={{ marginBottom: 10 }}>
                <View style={[s.flexRow, { marginBottom: 4 }]}>
                  <Text style={{ fontSize: 11, color: TH.sub }}>{h.doneDays}/{h.targetDays} 天</Text>
                  <Text style={{ fontSize: 11, color: TH.sub }}>{Math.round(h.doneDays / h.targetDays * 100)}%</Text>
                </View>
                <View style={[s.progressBg, { backgroundColor: TH.border }]}>
                  <View style={[s.progressFill, { backgroundColor: P, width: `${Math.min(h.doneDays / h.targetDays * 100, 100)}%` as any }]} />
                </View>
              </View>

              {/* stats */}
              <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
                {[
                  { v: h.doneDays, l: '累计天数', c: P, cal: true },
                  { v: h.streak, l: '连续天数', c: ORANGE },
                  { v: h.interrupted, l: '中断天数', c: RED },
                  { v: Math.max(0, h.targetDays - h.doneDays), l: '剩余天数', c: GREEN },
                ].map(({ v, l, c, cal }) => (
                  <TouchableOpacity key={l} onPress={cal ? () => setShowCalendar(h.id) : undefined} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: c, textDecorationLine: cal ? 'underline' : 'none' }}>{v}</Text>
                    <Text style={{ fontSize: 10, color: TH.sub }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* actions */}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {canEdit ? (
                  <TouchableOpacity onPress={() => openEdit(h)}
                    style={[s.actionBtn, { borderColor: BLUE }]}>
                    <Text style={{ color: BLUE, fontSize: 11 }}>✏️ {T('editHabit')}</Text>
                  </TouchableOpacity>
                ) : null}
                {h.status === 'notStarted' ? (
                  <TouchableOpacity onPress={() => deleteHabit(h.id)}
                    style={[s.actionBtn, { borderColor: RED }]}>
                    <Text style={{ color: RED, fontSize: 11 }}>🗑 删除</Text>
                  </TouchableOpacity>
                ) : null}
                {['notStarted', 'paused'].includes(h.status) ? (
                  <TouchableOpacity onPress={() => handleStatus(h.id, 'inProgress')}
                    style={[s.actionBtn, { borderColor: GREEN }]}>
                    <Text style={{ color: GREEN, fontSize: 11 }}>▶ 开始</Text>
                  </TouchableOpacity>
                ) : null}
                {h.status === 'inProgress' ? (
                  <>
                    <TouchableOpacity onPress={() => handleStatus(h.id, 'paused')}
                      style={[s.actionBtn, { borderColor: YELLOW }]}>
                      <Text style={{ color: YELLOW, fontSize: 11 }}>⏸ 暂停</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatus(h.id, 'abandoned')}
                      style={[s.actionBtn, { borderColor: RED }]}>
                      <Text style={{ color: RED, fontSize: 11 }}>✕ 废弃</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          );
        })}

        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: TH.sub, fontSize: 13 }}>暂无习惯记录</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={[s.flexRow, { marginBottom: 20 }]}>
              <Text style={[s.modalTitle, { color: TH.text }]}>{editingId ? T('editHabit') : T('addHabit')}</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); setEditingId(null); }}>
                <Text style={{ fontSize: 22, color: TH.sub }}>×</Text>
              </TouchableOpacity>
            </View>
            {[
              { label: T('habitName'), key: 'name' as const, ph: '例：每日冥想' },
              { label: T('habitGoal'), key: 'goal' as const, ph: '每天打坐5分钟' },
              { label: T('habitInsight'), key: 'insight' as const, ph: '每天进步一点点...' },
            ].map(({ label, key, ph }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 6 }}>{label}</Text>
                <TextInput value={form[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholder={ph} placeholderTextColor={TH.sub}
                  style={[s.input, { backgroundColor: TH.card, borderColor: TH.border, color: TH.text }]} />
              </View>
            ))}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 6 }}>{T('startDate')}</Text>
              <TextInput value={form.startDate} onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
                style={[s.input, { backgroundColor: TH.card, borderColor: TH.border, color: TH.text }]} />
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 6 }}>{T('targetDays')}</Text>
              <TextInput value={form.targetDays} onChangeText={(v) => setForm((f) => ({ ...f, targetDays: v }))}
                keyboardType="number-pad"
                style={[s.input, { backgroundColor: TH.card, borderColor: TH.border, color: TH.text }]} />
            </View>
            <View style={[s.flexRow, { paddingVertical: 12, borderTopWidth: 1, borderTopColor: TH.border, marginBottom: 20 }]}>
              <View>
                <Text style={{ fontSize: 14, color: TH.text }}>{T('createTag')}</Text>
                <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>将习惯名称添加为感念标签</Text>
              </View>
              <TouchableOpacity onPress={() => setForm((f) => ({ ...f, createTag: !f.createTag }))}
                style={[s.toggle, { backgroundColor: form.createTag ? P : 'rgba(128,128,128,.3)' }]}>
                <View style={[s.toggleDot, { left: form.createTag ? 22 : 2 }]} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={saveHabit} style={[s.saveBtn, { backgroundColor: P }]}>
              <Text style={s.saveBtnText}>{T('createHabit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Status Reason Modal */}
      <Modal visible={!!showStatusModal} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[s.centerModal, { backgroundColor: TH.cardSolid }]}>
            <Text style={[s.modalTitle, { color: TH.text, marginBottom: 12 }]}>
              {showStatusModal?.newStatus === 'paused' ? '暂停原因' : '废弃原因'}
            </Text>
            <TextInput value={statusReason} onChangeText={setStatusReason}
              placeholder="请填写原因..." placeholderTextColor={TH.sub} multiline
              style={[s.textArea, { backgroundColor: TH.card, borderColor: TH.border, color: TH.text }]} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowStatusModal(null)}
                style={[s.halfBtn, { borderColor: TH.border }]}>
                <Text style={{ color: TH.sub, fontSize: 14 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmStatus}
                style={[s.halfBtn, { backgroundColor: P, borderColor: P }]}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal (simplified) */}
      <Modal visible={!!showCalendar} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[s.centerModal, { backgroundColor: TH.cardSolid }]}>
            <Text style={[s.modalTitle, { color: TH.text, marginBottom: 12 }]}>打卡日历</Text>
            <Text style={{ color: TH.sub, fontSize: 13, marginBottom: 16 }}>
              累计 {habits.find((h) => h.id === showCalendar)?.doneDays || 0} 天
            </Text>
            <TouchableOpacity onPress={() => setShowCalendar(null)}
              style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub, fontSize: 14 }}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 15, fontWeight: '600' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  autoTag: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4, alignSelf: 'flex-start', overflow: 'hidden' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  centerModal: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignSelf: 'center' },
  modalTitle: { fontWeight: '700', fontSize: 18 },
  input: { borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1 },
  textArea: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, minHeight: 80, textAlignVertical: 'top', marginBottom: 14 },
  toggle: { width: 44, height: 24, borderRadius: 12, position: 'relative' },
  toggleDot: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  saveBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  halfBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
