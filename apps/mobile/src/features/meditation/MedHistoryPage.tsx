import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, FONT_STAT_SECTION, BUILTIN_TRACKS, dateStr, yesterday, type Theme } from '@egoless-do/core';
import { Calendar, ChevronLeft, ChevronRight, Music, FileText, Trash2, X } from 'lucide-react-native';
import type { MedHistoryEntry } from '@egoless-do/core';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getWeekday(ds: string): string {
  const [y, m, d] = ds.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? '' : WEEKDAYS[date.getDay()];
}

function formatMonth(key: string): string {
  const [y, mo] = key.split('-');
  return `${y}年${parseInt(mo)}月`;
}

function getTrackName(trackId?: string): string {
  if (!trackId) return '';
  return BUILTIN_TRACKS.find(t => t.id === trackId)?.name ?? trackId;
}

function calcStreak(entries: MedHistoryEntry[]): number {
  const dates = entries.filter(e => !e.deleted).map(e => e.date).sort().reverse();
  if (!dates.length) return 0;
  const today = dateStr();
  const yest = yesterday();
  if (dates[0] !== today && dates[0] !== yest) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return dateStr(d);
}

// ── Stats Card ──
function StatsCard({ entries, TH }: { entries: MedHistoryEntry[]; TH: Theme }) {
  const totalMin = useMemo(() => entries.reduce((s, e) => s + (e.durMin || 0), 0), [entries]);
  const totalDays = useMemo(() => new Set(entries.map(e => e.date)).size, [entries]);
  const streak = useMemo(() => calcStreak(entries), [entries]);
  const weekStart = useMemo(() => getWeekStart(), []);
  const monthStart = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, []);
  const weekMin = useMemo(() => entries.filter(e => e.date >= weekStart).reduce((s, e) => s + (e.durMin || 0), 0), [entries, weekStart]);
  const monthMin = useMemo(() => entries.filter(e => e.date >= monthStart).reduce((s, e) => s + (e.durMin || 0), 0), [entries, monthStart]);
  const longest = useMemo(() => Math.max(0, ...entries.map(e => e.durMin || 0)), [entries]);

  return (
    <View style={{ marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}>
      <LinearGradient colors={['#8446FF', '#18CEFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 16 }}>✦ 累计冥想</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[{ val: totalMin, label: '分钟' }, { val: totalDays, label: '天' }, { val: entries.length, label: '次' }, { val: streak, label: '天连续' }].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{s.val}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{weekMin}min</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>本周</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{monthMin}min</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>本月</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{longest}min</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>最长</Text></View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Heatmap ──
function Heatmap({ entries, TH, onPress }: { entries: MedHistoryEntry[]; TH: Theme; onPress: () => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const dateSet = useMemo(() => new Set(entries.filter(e => !e.deleted).map(e => e.date)), [entries]);
  const medDays = useMemo(() => { let c = 0; for (let d = 1; d <= daysInMonth; d++) { const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; if (dateSet.has(ds)) c++; } return c; }, [dateSet, daysInMonth, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(`${year}-${String(month + 1).padStart(2, '0')}`)} 冥想热力图</Text>
        <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{medDays}/{daysInMonth}天</Text>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS.map(w => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: FONT_BADGE, color: TH.sub }}>{w}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}><View /></View>;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const has = dateSet.has(ds);
          return (
            <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <View style={{ flex: 1, borderRadius: 4, backgroundColor: has ? TH.primary : `${TH.border}80`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10, color: has ? '#fff' : TH.sub, fontWeight: has ? '700' : '400' }}>{d}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ── Calendar Screen (month view) ──
export function MedCalendarScreen() {
  const TH = useTheme();
  const nav = useRootNavigation();
  const entries = useAppStore(s => s.medHistory ?? []);
  const activeEntries = useMemo(() => entries.filter(e => !e.deleted), [entries]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const dateSet = useMemo(() => new Set(activeEntries.map(e => e.date)), [activeEntries]);
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const medDays = useMemo(() => { let c = 0; for (let d = 1; d <= daysInMonth; d++) { if (dateSet.has(`${ym}-${String(d).padStart(2, '0')}`)) c++; } return c; }, [dateSet, daysInMonth, ym]);
  const totalDays = activeEntries.length;
  const streak = useMemo(() => calcStreak(activeEntries), [activeEntries]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title="冥想日历" onBack={() => nav.goBack()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={prevMonth}><ChevronLeft size={24} color={TH.text} /></TouchableOpacity>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{formatMonth(ym)}</Text>
          <TouchableOpacity onPress={nextMonth}><ChevronRight size={24} color={TH.text} /></TouchableOpacity>
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
                <View style={{ flex: 1, borderRadius: 8, backgroundColor: has ? TH.primary : `${TH.border}60`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: has ? '#fff' : TH.sub, fontWeight: has ? '700' : '400' }}>{d}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, backgroundColor: TH.card, borderRadius: 12, padding: 16 }}>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.primary }}>{medDays}/{daysInMonth}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>本月</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.primary }}>{totalDays}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>累计天数</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.primary }}>{streak}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>连续天数</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Detail Modal ──
function DetailModal({ entry, TH, T, onClose, onDelete }: { entry: MedHistoryEntry | null; TH: Theme; T: (key: string) => string; onClose: () => void; onDelete: (date: string) => void }) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const adapter = useAppStore(s => s);

  if (!entry) return null;

  const trackName = getTrackName(entry.trackId);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const [y, m, d] = entry.date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = isNaN(dt.getTime()) ? '' : `周${weekdays[dt.getDay()]}`;

  const startEdit = () => { setNoteText(entry.note ?? ''); setEditingNote(true); };
  const saveNote = () => {
    const updated = { ...entry, note: noteText, updatedAt: Date.now() };
    const newHist = (useAppStore.getState().medHistory ?? []).map(e => e.date === entry.date ? updated : e);
    const newTotal = newHist.filter(e => !e.deleted).reduce((s, e) => s + (e.durMin || 0), 0);
    useAppStore.setState({ medHistory: newHist, totalMedMinutes: newTotal });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
    setEditingNote(false);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{`${parseInt(String(m))}月${parseInt(String(d))}日 ${weekday}`}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '900', color: TH.primary, textAlign: 'center', marginBottom: 4 }}>{entry.durMin}</Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 16 }}>分钟</Text>
          {trackName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Music size={16} color={TH.primary} />
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{trackName}</Text>
            </View>
          ) : null}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>感悟笔记</Text>
              {!editingNote && <TouchableOpacity onPress={startEdit}><Text style={{ fontSize: FONT_BADGE, color: TH.primary }}>{entry.note ? '编辑' : '添加'}</Text></TouchableOpacity>}
            </View>
            {editingNote ? (
              <>
                <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top' }} multiline maxLength={500} value={noteText} onChangeText={setNoteText} placeholder="写下你的感悟..." placeholderTextColor={TH.sub} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setEditingNote(false)} style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}><Text style={{ color: TH.sub }}>取消</Text></TouchableOpacity>
                  <TouchableOpacity onPress={saveNote} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: TH.primary, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '600' }}>保存</Text></TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: FONT_BODY, color: entry.note ? TH.text : TH.sub }}>{entry.note || '暂无笔记'}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => {
            Alert.alert('删除记录', '确定要删除这条冥想记录吗？', [
              { text: '取消', style: 'cancel' },
              { text: '删除', style: 'destructive', onPress: () => { onDelete(entry.date); onClose(); } },
            ]);
          }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
            <Trash2 size={16} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: FONT_BODY }}>删除记录</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Page ──
// ── Flattened data item ──
interface FlatItem {
  type: 'header' | 'statCard' | 'heatmap' | 'monthHeader' | 'entry';
  key: string;
  monthKey?: string;
  items?: MedHistoryEntry[];
  m?: MedHistoryEntry;
  monthMin?: number;
  idx?: number;
  isLast?: boolean;
}

export default function MedHistoryPage() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { medHistory } = useAppStore(useShallow(s => ({ medHistory: s.medHistory })));
  const [selectedEntry, setSelectedEntry] = useState<MedHistoryEntry | null>(null);

  const activeEntries = useMemo(() =>
    [...(medHistory ?? [])].filter(m => !m.deleted).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [medHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof activeEntries>();
    for (const m of activeEntries) {
      const key = (m.date ?? '').slice(0, 7);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [activeEntries]);

  const flatData = useMemo((): FlatItem[] => {
    if (activeEntries.length === 0) return [];
    const items: FlatItem[] = [
      { type: 'statCard', key: 'statCard' },
      { type: 'heatmap', key: 'heatmap' },
    ];
    for (const [monthKey, monthItems] of grouped) {
      const monthMin = monthItems.reduce((s, e) => s + (e.durMin || 0), 0);
      items.push({ type: 'monthHeader', key: `mh-${monthKey}`, monthKey, items: monthItems, monthMin });
      monthItems.forEach((m, idx) => {
        items.push({ type: 'entry', key: `e-${m.date ?? idx}`, m, idx, isLast: idx === monthItems.length - 1 });
      });
    }
    return items;
  }, [activeEntries, grouped]);

  const handleDelete = useCallback((date: string) => {
    const s = useAppStore.getState();
    const newHist = (s.medHistory ?? []).map(e => e.date === date ? { ...e, deleted: true, updatedAt: Date.now() } : e);
    useAppStore.setState({ medHistory: newHist, totalMedMinutes: newHist.filter(e => !e.deleted).reduce((sum, e) => sum + (e.durMin || 0), 0) });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
  }, []);

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item.type === 'statCard') return <StatsCard entries={activeEntries} TH={TH} />;
    if (item.type === 'heatmap') return <Heatmap entries={activeEntries} TH={TH} onPress={() => nav.navigate('MedCalendar' as never)} />;
    if (item.type === 'monthHeader') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TH.primary }} />
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(item.monthKey!)}</Text>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{item.items!.length}次 · {item.monthMin}min</Text>
        </View>
      );
    }
    // entry
    const m = item.m!;
    const parts = m.date.split('-');
    const dayStr = parts.length >= 3 ? `${parseInt(parts[1])}-${parseInt(parts[2])}` : m.date;
    const trackName = getTrackName(m.trackId);
    const notePreview = m.note ? (m.note.length > 30 ? m.note.slice(0, 30) + '...' : m.note) : '';
    return (
      <TouchableOpacity onPress={() => setSelectedEntry(m)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
          <View style={{ alignItems: 'center', width: 24 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TH.primary, zIndex: 1 }} />
            {!item.isLast && <View style={{ width: 2, flex: 1, backgroundColor: `${TH.primary}30` }} />}
          </View>
          <View style={{ flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 10, marginLeft: 8, borderLeftWidth: 3, borderLeftColor: TH.primary }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: trackName || notePreview ? 4 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{dayStr}</Text>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>周{getWeekday(m.date)}</Text>
              </View>
              <View style={{ backgroundColor: `${TH.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: TH.primary, fontWeight: '700', fontSize: FONT_SUB }}>{m.durMin}min</Text>
              </View>
            </View>
            {trackName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Music size={12} color={TH.sub} />
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{trackName}</Text>
              </View>
            ) : null}
            {notePreview ? (
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2 }}>「{notePreview}」</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [activeEntries, TH, nav]);

  const ListHeader = useMemo(() => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <ScreenHeader title={T('meditationHistory')} onBack={() => nav.goBack()} />
      <TouchableOpacity onPress={() => nav.navigate('MedCalendar' as never)} style={{ padding: 8 }}>
        <Calendar size={22} color={TH.primary} />
      </TouchableOpacity>
    </View>
  ), [T, nav, TH]);

  if (activeEntries.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={{ paddingHorizontal: 16 }}>
          {ListHeader}
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🧘</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 8 }}>还没有冥想记录</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 8 }}>每一次静坐都是送给自己的礼物</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 24 }}>从今天开始，给自己几分钟安静的时光</Text>
            <TouchableOpacity onPress={() => nav.navigate('MainTabs' as never, { screen: 'Meditation' } as never)} style={{ backgroundColor: TH.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              {/* 修复: 移除 as any */}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>✦ 开始第一次冥想</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <FlatList<FlatItem>
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />
      <DetailModal entry={selectedEntry} TH={TH} T={T} onClose={() => setSelectedEntry(null)} onDelete={handleDelete} />
    </SafeAreaView>
  );
}
