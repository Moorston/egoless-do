import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, FONT_STAT_SECTION, dateStr, COLORS } from '@egoless-do/core';
import { Calendar, Flame, X, Trash2 } from 'lucide-react-native';
import type { FastingSession } from '@egoless-do/core';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatMonth(key: string): string {
  const [y, m] = key.split('-');
  return `${y}年${parseInt(m)}月`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDur(f: FastingSession): { h: number; m: number; totalMin: number } {
  const durSec = Math.floor(((f.endedAt ?? Date.now()) - (f.startedAt ?? 0)) / 1000);
  return { h: Math.floor(durSec / 3600), m: Math.floor((durSec % 3600) / 60), totalMin: Math.floor(durSec / 60) };
}

function calcStreak(entries: FastingSession[]): number {
  const dates = entries.map(f => {
    const d = new Date(f.startedAt ?? 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }).sort().reverse();
  const unique = [...new Set(dates)];
  if (!unique.length) return 0;
  const today = dateStr();
  const yestDate = new Date(); yestDate.setDate(yestDate.getDate() - 1);
  const yest = dateStr(yestDate);
  if (unique[0] !== today && unique[0] !== yest) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    if (Math.abs((prev.getTime() - curr.getTime()) / 86400000 - 1) < 0.1) streak++;
    else break;
  }
  return streak;
}

// ── Stats Card ──
function StatsCard({ entries, TH }: { entries: FastingSession[]; TH: any }) {
  const totalHours = useMemo(() => Math.round(entries.reduce((s, f) => s + (getDur(f).totalMin / 60), 0)), [entries]);
  const streak = useMemo(() => calcStreak(entries), [entries]);
  const totalKcal = useMemo(() => entries.reduce((s, f) => s + (f.estimatedKcal ?? 0), 0), [entries]);
  const weekStart = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return dateStr(d); }, []);
  const monthStart = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, []);
  const weekCount = useMemo(() => entries.filter(f => { const d = new Date(f.startedAt ?? 0); return dateStr(d) >= weekStart; }).length, [entries, weekStart]);
  const monthCount = useMemo(() => entries.filter(f => { const d = new Date(f.startedAt ?? 0); return dateStr(d) >= monthStart; }).length, [entries, monthStart]);

  return (
    <View style={{ marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}>
      <LinearGradient colors={['#8446FF', '#18CEFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 16 }}>✦ 累计禁食</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[{ val: totalHours, label: '小时' }, { val: entries.length, label: '次' }, { val: streak, label: '天连续' }, { val: totalKcal, label: 'kcal' }].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{s.val}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{weekCount}次</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>本周</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{monthCount}次</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>本月</Text></View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Heatmap ──
function Heatmap({ entries, TH, onPress }: { entries: FastingSession[]; TH: any; onPress: () => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const dateSet = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(f => { const d = new Date(f.startedAt ?? 0); s.add(dateStr(d)); });
    return s;
  }, [entries]);
  const fastDays = useMemo(() => { let c = 0; for (let d = 1; d <= daysInMonth; d++) { const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; if (dateSet.has(ds)) c++; } return c; }, [dateSet, daysInMonth, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(`${year}-${String(month + 1).padStart(2, '0')}`)} 禁食热力图</Text>
        <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{fastDays}/{daysInMonth}天</Text>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS.map(w => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: FONT_BADGE, color: TH.sub }}>{w}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }} />;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const has = dateSet.has(ds);
          return (
            <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <View style={{ flex: 1, borderRadius: 4, backgroundColor: has ? '#8446FF' : `${TH.border}80`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10, color: has ? '#fff' : TH.sub, fontWeight: has ? '700' : '400' }}>{d}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ── Calendar Screen ──
export function FastCalendarScreen() {
  const TH = useTheme();
  const nav = useRootNavigation();
  const entries = useAppStore(s => (s.fastingHistory ?? []).filter(f => !f.deleted));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const dateSet = useMemo(() => { const s = new Set<string>(); entries.forEach(f => { const d = new Date(f.startedAt ?? 0); s.add(dateStr(d)); }); return s; }, [entries]);
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const fastDays = useMemo(() => { let c = 0; for (let d = 1; d <= daysInMonth; d++) { if (dateSet.has(`${ym}-${String(d).padStart(2, '0')}`)) c++; } return c; }, [dateSet, daysInMonth, ym]);
  const streak = useMemo(() => calcStreak(entries), [entries]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title="禁食日历" onBack={() => nav.goBack()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={prevMonth}><Text style={{ fontSize: 24, color: TH.text }}>{'‹'}</Text></TouchableOpacity>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{formatMonth(ym)}</Text>
          <TouchableOpacity onPress={nextMonth}><Text style={{ fontSize: 24, color: TH.text }}>{'›'}</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {WEEKDAYS.map(w => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: FONT_SUB, color: TH.sub, fontWeight: '600' }}>{w}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            if (d === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }} />;
            const ds = `${ym}-${String(d).padStart(2, '0')}`;
            const has = dateSet.has(ds);
            return (
              <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
                <View style={{ flex: 1, borderRadius: 8, backgroundColor: has ? '#8446FF' : `${TH.border}60`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: has ? '#fff' : TH.sub, fontWeight: has ? '700' : '400' }}>{d}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, backgroundColor: TH.card, borderRadius: 12, padding: 16 }}>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#8446FF' }}>{fastDays}/{daysInMonth}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>本月</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#8446FF' }}>{entries.length}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>累计次数</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#8446FF' }}>{streak}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>连续天数</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Detail Modal ──
function DetailModal({ entry, TH, onClose, onDelete }: { entry: FastingSession | null; TH: any; onClose: () => void; onDelete: (id: string) => void }) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  if (!entry) return null;

  const { h, m } = getDur(entry);
  const actualHours = h + m / 60;
  const completionRate = entry.targetHours > 0 ? Math.min(Math.round((actualHours / entry.targetHours) * 100), 100) : 0;
  const startDate = new Date(entry.startedAt ?? 0);
  const weekday = WEEKDAYS[startDate.getDay()];

  const startEdit = () => { setNoteText(entry.note ?? ''); setEditingNote(true); };
  const saveNote = () => {
    const updated = { ...entry, note: noteText, updatedAt: Date.now() };
    const newHist = (useAppStore.getState().fastingHistory ?? []).map(e => e.id === entry.id ? updated : e);
    useAppStore.setState({ fastingHistory: newHist });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
    setEditingNote(false);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{formatTime(entry.startedAt ?? 0)} 周{weekday}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#8446FF', textAlign: 'center', marginBottom: 4 }}>{h}h {m}m</Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 8 }}>目标 {entry.targetHours}h · 完成 {completionRate}%</Text>
          <View style={{ height: 6, backgroundColor: `${TH.border}80`, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${completionRate}%`, backgroundColor: completionRate >= 100 ? '#10b981' : '#8446FF', borderRadius: 3 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Flame size={16} color={COLORS.ORANGE} /><Text style={{ fontSize: FONT_BODY, color: TH.text }}>~{entry.estimatedKcal ?? 0} kcal</Text></View>
          </View>
          {entry.insight ? <Text style={{ fontSize: FONT_BODY, color: TH.sub, fontStyle: 'italic', marginBottom: 12 }}>「{entry.insight}」</Text> : null}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>感悟笔记</Text>
              {!editingNote && <TouchableOpacity onPress={startEdit}><Text style={{ fontSize: FONT_BADGE, color: '#8446FF' }}>{entry.note ? '编辑' : '添加'}</Text></TouchableOpacity>}
            </View>
            {editingNote ? (
              <>
                <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top' }} multiline maxLength={500} value={noteText} onChangeText={setNoteText} placeholder="写下你的感悟..." placeholderTextColor={TH.sub} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setEditingNote(false)} style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}><Text style={{ color: TH.sub }}>取消</Text></TouchableOpacity>
                  <TouchableOpacity onPress={saveNote} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#8446FF', alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '600' }}>保存</Text></TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: FONT_BODY, color: entry.note ? TH.text : TH.sub }}>{entry.note || '暂无笔记'}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => { Alert.alert('删除记录', '确定要删除这条禁食记录吗？', [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => { onDelete(entry.id); onClose(); } }]); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
            <Trash2 size={16} color="#ef4444" /><Text style={{ color: '#ef4444', fontSize: FONT_BODY }}>删除记录</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Page ──
export default function FastHistoryPage() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const [selectedEntry, setSelectedEntry] = useState<FastingSession | null>(null);

  const activeEntries = useMemo(() =>
    [...(store.fastingHistory ?? [])].filter(f => !f.deleted).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)),
    [store.fastingHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof activeEntries>();
    for (const f of activeEntries) {
      const d = new Date(f.startedAt ?? 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries());
  }, [activeEntries]);

  const handleDelete = useCallback((id: string) => {
    const newHist = (useAppStore.getState().fastingHistory ?? []).map(f => f.id === id ? { ...f, deleted: true, updatedAt: Date.now() } : f);
    useAppStore.setState({ fastingHistory: newHist });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ScreenHeader title={T('fastingHistory')} onBack={() => nav.goBack()} />
          <TouchableOpacity onPress={() => nav.navigate('FastCalendar' as never)} style={{ padding: 8 }}>
            <Calendar size={22} color="#8446FF" />
          </TouchableOpacity>
        </View>

        {activeEntries.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🕐</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 8 }}>还没有禁食记录</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 8 }}>每一次禁食都是对身体的善待</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 24 }}>从今天开始，尝试一次轻断食</Text>
            <TouchableOpacity onPress={() => (nav as any).navigate('MainTabs', { screen: 'Fasting' })} style={{ backgroundColor: '#8446FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>✦ 开始第一次禁食</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <StatsCard entries={activeEntries} TH={TH} />
            <Heatmap entries={activeEntries} TH={TH} onPress={() => nav.navigate('FastCalendar' as never)} />

            {grouped.map(([monthKey, items]) => {
              const monthKcal = items.reduce((s, f) => s + (f.estimatedKcal ?? 0), 0);
              return (
                <View key={monthKey} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#8446FF' }} />
                    <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(monthKey)}</Text>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length}次 · {monthKcal}kcal</Text>
                  </View>
                  {items.map((f, idx) => {
                    const { h, m } = getDur(f);
                    const actualHours = h + m / 60;
                    const completionRate = f.targetHours > 0 ? Math.min(Math.round((actualHours / f.targetHours) * 100), 100) : 0;
                    const isLast = idx === items.length - 1;
                    const notePreview = f.note ? (f.note.length > 30 ? f.note.slice(0, 30) + '...' : f.note) : '';
                    return (
                      <TouchableOpacity key={f.id ?? idx} onPress={() => setSelectedEntry(f)} activeOpacity={0.7}>
                        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                          <View style={{ alignItems: 'center', width: 24 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#8446FF', zIndex: 1 }} />
                            {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: '#8446FF30' }} />}
                          </View>
                          <View style={{ flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 10, marginLeft: 8, borderLeftWidth: 3, borderLeftColor: '#8446FF' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatTime(f.startedAt ?? 0)}</Text>
                              <View style={{ backgroundColor: '#8446FF15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ color: '#8446FF', fontWeight: '700', fontSize: FONT_SUB }}>{h}h {m}m</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>目标 {f.targetHours}h</Text>
                              <View style={{ flex: 1, height: 4, backgroundColor: `${TH.border}80`, borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{ height: 4, width: `${completionRate}%`, backgroundColor: completionRate >= 100 ? '#10b981' : '#8446FF', borderRadius: 2 }} />
                              </View>
                              <Text style={{ fontSize: FONT_BADGE, color: completionRate >= 100 ? '#10b981' : '#8446FF', fontWeight: '600' }}>{completionRate}%</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>🔥 ~{f.estimatedKcal ?? 0} kcal</Text>
                            </View>
                            {notePreview ? <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2 }}>「{notePreview}」</Text> : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
      <DetailModal entry={selectedEntry} TH={TH} onClose={() => setSelectedEntry(null)} onDelete={handleDelete} />
    </SafeAreaView>
  );
}
