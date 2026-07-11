import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_SECTION, BUILTIN_TRACKS, dateStr, yesterday, type Theme , MedHistoryEntry } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronLeft, ChevronRight, Music, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useNavigateToTab } from '../../navigation/useAppNavigation';
import { useAppStore, useShallowStore } from '../../store/useAppStore';



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
  const dates = entries.filter((e: MedHistoryEntry) => !e.deleted).map((e: MedHistoryEntry) => e.date).sort().reverse();
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
function StatsCard({ entries }: { entries: MedHistoryEntry[] }) {
  const totalMin = useMemo(() => entries.reduce((s, e) => s + (e.durMin || 0), 0), [entries]);
  const totalDays = useMemo(() => new Set(entries.map((e: MedHistoryEntry) => e.date)).size, [entries]);
  const streak = useMemo(() => calcStreak(entries), [entries]);
  const weekStart = useMemo(() => getWeekStart(), []);
  const monthStart = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, []);
  const weekMin = useMemo(() => entries.filter((e: MedHistoryEntry) => e.date >= weekStart).reduce((s, e) => s + (e.durMin || 0), 0), [entries, weekStart]);
  const monthMin = useMemo(() => entries.filter((e: MedHistoryEntry) => e.date >= monthStart).reduce((s, e) => s + (e.durMin || 0), 0), [entries, monthStart]);
  const longest = useMemo(() => Math.max(0, ...entries.map((e: MedHistoryEntry) => e.durMin || 0)), [entries]);

  return (
    <View style={styles.statsOuter}>
      <LinearGradient colors={['#8446FF', '#18CEFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientPadding}>
        <Text style={styles.heroTitle}>✦ 累计冥想</Text>
        <View style={styles.heroStatsRow}>
          {[{ val: totalMin, label: '分钟' }, { val: totalDays, label: '天' }, { val: entries.length, label: '次' }, { val: streak, label: '天连续' }].map((s, i) => (
            <View key={i} style={styles.heroStatCol}>
              <Text style={styles.heroStatValue}>{s.val}</Text>
              <Text style={styles.heroStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.heroKcalRow}>
          <View style={styles.flex1}><Text style={styles.heroKcalValue}>{weekMin}min</Text><Text style={styles.heroSub}>本周</Text></View>
          <View style={styles.flex1}><Text style={styles.heroKcalValue}>{monthMin}min</Text><Text style={styles.heroSub}>本月</Text></View>
          <View style={styles.flex1}><Text style={styles.heroKcalValue}>{longest}min</Text><Text style={styles.heroSub}>最长</Text></View>
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
  const dateSet = useMemo(() => new Set(entries.filter((e: MedHistoryEntry) => !e.deleted).map((e: MedHistoryEntry) => e.date)), [entries]);
  const medDays = useMemo(() => { let c = 0; for (let d = 1; d <= daysInMonth; d++) { const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; if (dateSet.has(ds)) c++; } return c; }, [dateSet, daysInMonth, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <View style={styles.heatmapHeader}>
        <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(`${year}-${String(month + 1).padStart(2, '0')}`)} 冥想热力图</Text>
        <Text style={[styles.badgeFont, { color: TH.sub }]}>{medDays}/{daysInMonth}天</Text>
      </View>
      <View style={styles.heatmapWeekdaysRow}>
        {WEEKDAYS.map(w => <Text key={w} style={[styles.weekdayText, { color: TH.sub }]}>{w}</Text>)}
      </View>
      <View style={styles.heatmapGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={[styles.heatmapCell, { width: `${100 / 7}%` }]}><View /></View>;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const has = dateSet.has(ds);
          return (
            <View key={d} style={[styles.heatmapCell, { width: `${100 / 7}%` }]}>
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
  const entries = useShallowStore(s => s.medHistory ?? []);
  const activeEntries = useMemo(() => entries.filter((e: MedHistoryEntry) => !e.deleted), [entries]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const dateSet = useMemo(() => new Set(activeEntries.map((e: MedHistoryEntry) => e.date)), [activeEntries]);
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
          {WEEKDAYS.map(w => <Text key={w} style={[styles.calendarWeekdayText, { color: TH.sub }]}>{w}</Text>)}
        </View>
        <View style={styles.heatmapGrid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={`e${i}`} style={[styles.calendarCell, { width: `${100 / 7}%` }]} />;
            const ds = `${ym}-${String(d).padStart(2, '0')}`;
            const has = dateSet.has(ds);
            return (
              <View key={d} style={[styles.calendarCell, { width: `${100 / 7}%` }]}>
                <View style={{ flex: 1, borderRadius: 8, backgroundColor: has ? TH.primary : `${TH.border}60`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[styles.calendarDayFontSize, { color: has ? '#fff' : TH.sub, fontWeight: has ? '700' : '400' }]}>{d}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={[styles.calendarStatsRow, { marginTop: 20, backgroundColor: TH.card }]}>
          <View style={styles.alignCenter}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.primary }}>{medDays}/{daysInMonth}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>本月</Text></View>
          <View style={styles.alignCenter}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.primary }}>{totalDays}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>累计天数</Text></View>
          <View style={styles.alignCenter}><Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.primary }}>{streak}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>连续天数</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Detail Modal ──
function DetailModal({ entry, TH, onClose, onDelete }: { entry: MedHistoryEntry | null; TH: Theme; onClose: () => void; onDelete: (date: string) => void }) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!entry) return null;

  const trackName = getTrackName(entry.trackId);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const [y, m, d] = entry.date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = isNaN(dt.getTime()) ? '' : `周${weekdays[dt.getDay()]}`;

  const startEdit = () => { setNoteText(entry.note ?? ''); setEditingNote(true); };
  const saveNote = () => {
    const updated = { ...entry, note: noteText, updatedAt: Date.now() };
    const newHist = (useAppStore.getState().medHistory ?? []).map((e: MedHistoryEntry) => e.date === entry.date ? updated : e);
    const newTotal = newHist.filter((e: MedHistoryEntry) => !e.deleted).reduce((s, e) => s + (e.durMin || 0), 0);
    useAppStore.setState({ medHistory: newHist, totalMedMinutes: newTotal });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
    setEditingNote(false);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.detailOverlay}>
        <View style={[styles.detailInner, { backgroundColor: TH.cardSolid }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{`${parseInt(String(m))}月${parseInt(String(d))}日 ${weekday}`}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={[styles.detailDuration, { color: TH.primary }]}>{entry.durMin}</Text>
          <Text style={[styles.detailDurationLabel, { color: TH.sub }]}>分钟</Text>
          {trackName ? (
            <View style={styles.detailTrackRow}>
              <Music size={16} color={TH.primary} />
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{trackName}</Text>
            </View>
          ) : null}
          <View style={styles.detailSection}>
            <View style={styles.detailNoteHeader}>
              <Text style={[styles.subBold, { color: TH.text }]}>感悟笔记</Text>
              {!editingNote && <TouchableOpacity onPress={startEdit}><Text style={[styles.badgeFont, { color: TH.primary }]}>{entry.note ? '编辑' : '添加'}</Text></TouchableOpacity>}
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
          }} style={styles.deleteBtn}>
            <Trash2 size={16} color="#ef4444" />
            <Text style={styles.deleteText}>删除记录</Text>
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
  const { medHistory } = useShallowStore(s => ({ medHistory: s.medHistory }));
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
    const newHist = (s.medHistory ?? []).map((e: MedHistoryEntry) => e.date === date ? { ...e, deleted: true, updatedAt: Date.now() } : e);
    useAppStore.setState({ medHistory: newHist, totalMedMinutes: newHist.filter((e: MedHistoryEntry) => !e.deleted).reduce((sum, e) => sum + (e.durMin || 0), 0) });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
  }, []);

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item.type === 'statCard') return <StatsCard entries={activeEntries} />;
    if (item.type === 'heatmap') return <Heatmap entries={activeEntries} TH={TH} onPress={() => nav.navigate('MedCalendar' as never)} />;
    if (item.type === 'monthHeader') {
      return (
        <View style={styles.monthHeaderRow}>
          <View style={[styles.timelineDot, { backgroundColor: TH.primary }]} />
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(item.monthKey!)}</Text>
          <Text style={[styles.badgeFont, { color: TH.sub }]}>{item.items!.length}次 · {item.monthMin}min</Text>
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
        <View style={styles.entryRow}>
          <View style={styles.timelineCol}>
            <View style={[styles.timelineDot, { backgroundColor: TH.primary, zIndex: 1 }]} />
            {!item.isLast && <View style={[styles.timelineLine, { backgroundColor: `${TH.primary}30` }]} />}
          </View>
          <View style={{ flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 10, marginLeft: 8, borderLeftWidth: 3, borderLeftColor: TH.primary }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: trackName || notePreview ? 4 : 0 }}>
              <View style={styles.entryInfoRow}>
                <Text style={[styles.badgeFont, { color: TH.sub }]}>{dayStr}</Text>
                <Text style={[styles.badgeFont, { color: TH.sub }]}>周{getWeekday(m.date)}</Text>
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
    <View style={styles.headerRow}>
      <ScreenHeader title={T('meditationHistory')} onBack={() => nav.goBack()} />
      <TouchableOpacity onPress={() => nav.navigate('MedCalendar' as never)} style={styles.calendarBtnPadding}>
        <Calendar size={22} color={TH.primary} />
      </TouchableOpacity>
    </View>
  ), [T, nav, TH]);

  if (activeEntries.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.emptyPagePad}>
          {ListHeader}
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyEmoji}>🧘</Text>
            <Text style={[styles.emptyTitle, { color: TH.text }]}>还没有冥想记录</Text>
            <Text style={[styles.emptyDesc, { color: TH.sub }]}>每一次静坐都是送给自己的礼物</Text>
            <Text style={[styles.emptySubDesc, { color: TH.sub }]}>从今天开始，给自己几分钟安静的时光</Text>
            <TouchableOpacity onPress={() => useNavigateToTab()('Meditation')} style={[styles.emptyCtaBtn, { backgroundColor: TH.primary }]}>
              <Text style={styles.whiteBodyBold}>✦ 开始第一次冥想</Text>
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
      <DetailModal entry={selectedEntry} TH={TH} onClose={() => setSelectedEntry(null)} onDelete={handleDelete} />
    </SafeAreaView>
  );
}
