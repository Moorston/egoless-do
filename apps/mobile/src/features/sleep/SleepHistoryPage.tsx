import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, dateStr, yesterday, t, type Theme , SleepEntry , FONT_LABEL, FONT_SMALL, scaleFontSize, formatSleepDuration, type I18nKey} from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Moon, Trash2, X, Heart } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { useRootNavigation, type MainTabParamList } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

const WEEKDAY_KEYS: readonly I18nKey[] = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'] as const;

function getWeekday(ds: string): I18nKey | '' {
  const [y, m, d] = ds.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return '';
  return WEEKDAY_KEYS[date.getDay()];
}

function formatMonth(key: string): string {
  const [y, mo] = key.split('-');
  return `${y}${t('sleepYearUnit')}${parseInt(mo)}${t('sleepMonthUnit')}`;
}

function formatTime(ts?: number): string {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function calcStreak(entries: SleepEntry[]): number {
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

function renderStars(quality?: number): string {
  if (!quality) return '';
  return '★'.repeat(quality) + '☆'.repeat(5 - quality);
}

// ── Stats Card ──
function StatsCard({ entries, TH: _TH, T: _T }: { entries: SleepEntry[]; TH: Theme; T: (key: string) => string }) {
  const styles = mkStyles(_TH);
  const totalDays = useMemo(() => new Set(entries.map(e => e.date)).size, [entries]);
  const avgDuration = useMemo(() => {
    const withDur = entries.filter(e => (e.durationMin ?? 0) > 0);
    if (!withDur.length) return 0;
    return Math.round(withDur.reduce((s, e) => s + (e.durationMin || 0), 0) / withDur.length);
  }, [entries]);
  const avgQuality = useMemo(() => {
    const withQ = entries.filter(e => e.quality != null);
    if (!withQ.length) return 0;
    return withQ.reduce((s, e) => s + (e.quality || 0), 0) / withQ.length;
  }, [entries]);
  const streak = useMemo(() => calcStreak(entries), [entries]);
  const weekStart = useMemo(() => getWeekStart(), []);
  const monthStart = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, []);
  const weekEntries = useMemo(() => entries.filter(e => e.date >= weekStart && (e.durationMin ?? 0) > 0), [entries, weekStart]);
  const weekAvg = useMemo(() => weekEntries.length ? Math.round(weekEntries.reduce((s, e) => s + (e.durationMin || 0), 0) / weekEntries.length) : 0, [weekEntries]);
  const monthEntries = useMemo(() => entries.filter(e => e.date >= monthStart && (e.durationMin ?? 0) > 0), [entries, monthStart]);
  const monthAvg = useMemo(() => monthEntries.length ? Math.round(monthEntries.reduce((s, e) => s + (e.durationMin || 0), 0) / monthEntries.length) : 0, [monthEntries]);

  return (
    <View style={styles.statsCardContainer}>
      <LinearGradient colors={['#6366f1', '#818cf8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsGradient}>
        <Text style={styles.statsTitle}>✦ {_T('sleepTotalSleep')}</Text>
        <View style={styles.statsRow}>
          {[
            { val: totalDays, label: _T('sleepTotalDays') },
            { val: formatSleepDuration(avgDuration), label: _T('sleepAvgDuration') },
            { val: avgQuality.toFixed(1), label: _T('sleepAvgQuality') },
            { val: streak, label: _T('sleepStreakDays') },
          ].map((s, i) => (
            <View key={i} style={styles.statsItem}>
              <Text style={styles.statsValue}>{s.val}</Text>
              <Text style={styles.statsLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statsDivider}>
          <View style={styles.statsWeekRow}>
            <Text style={styles.statsWeekLabel}>{formatSleepDuration(weekAvg)}</Text>
            <Text style={styles.statsWeekSub}>{_T('sleepWeekAvgTime')}</Text>
          </View>
          <View style={styles.statsWeekRow}>
            <Text style={styles.statsWeekLabel}>{formatSleepDuration(monthAvg)}</Text>
            <Text style={styles.statsWeekSub}>{_T('sleepMonthAvgTime')}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Heatmap ──
function Heatmap({ entries, TH, onPress, T: _T }: { entries: SleepEntry[]; TH: Theme; onPress: () => void; T: (key: string) => string }) {
  const styles = mkStyles(TH);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const ym = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const dateSet = useMemo(() => new Set(entries.filter(e => !e.deleted).map(e => e.date)), [entries]);
  const sleepDays = useMemo(() => {
    let c = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${ym}-${String(d).padStart(2, '0')}`;
      if (dateSet.has(ds)) c++;
    }
    return c;
  }, [dateSet, daysInMonth, ym]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.heatmapCard}>
      <View style={styles.heatmapHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.heatmapNavBtn}>
          <ChevronLeft size={18} color={TH.text} />
        </TouchableOpacity>
        <Text style={styles.heatmapTitle}>{formatMonth(ym)} {_T('sleepHeatmapTitle')}</Text>
        <View style={styles.heatmapStatsRow}>
          <Text style={styles.heatmapStatsText}>{sleepDays}/{daysInMonth}{_T('sleepDayUnit')}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.heatmapNavBtn}>
            <ChevronRight size={18} color={TH.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.heatmapWeekdays}>
        {(['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'] as const).map(w => (
          <Text key={w} style={styles.heatmapWeekdayText}>{_T(w)}</Text>
        ))}
      </View>
      <View style={styles.heatmapGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.heatmapCell}><View /></View>;
          const ds = `${ym}-${String(d).padStart(2, '0')}`;
          const has = dateSet.has(ds);
          return (
            <View key={d} style={styles.heatmapCell}>
              <View style={[styles.heatmapCellInner, { backgroundColor: has ? TH.primary : `${TH.border}80` }]}>
                <Text style={[styles.heatmapCellText, { color: has ? '#fff' : TH.sub, fontWeight: has ? '700' : '400' }]}>{d}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ── Detail Modal ──
function DetailModal({ entry, TH, T, onClose, onDelete }: { entry: SleepEntry | null; TH: Theme; T: (key: string) => string; onClose: () => void; onDelete: (id: string) => void }) {
  const styles = mkStyles(TH);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!entry) return null;

  const weekdayKeys = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'] as const;
  const [y, m, d] = entry.date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = isNaN(dt.getTime()) ? '' : `${T('sleepWeekdayPrefix')}${T(weekdayKeys[dt.getDay()])}`;

  const startEdit = () => { setNoteText(entry.note ?? ''); setEditingNote(true); };
  const saveNote = () => {
    const updated = { ...entry, note: noteText, updatedAt: Date.now() };
    const newHist = (useAppStore.getState().sleepHistory ?? []).map(e => e.id === entry.id ? updated : e);
    useAppStore.setState({ sleepHistory: newHist });
    void import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
    setEditingNote(false);
  };

  const practiceLabels: Record<string, string> = {
    breath: T('sleepBreath'),
    meditation: T('sleepMeditate'),
    reading: T('sleepReading'),
    journal: T('sleepJournal'),
    gratitude: T('sleepGratitudeSmall'),
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.detailOverlay}>
        <View style={styles.detailContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailDateText}>{`${parseInt(String(m))}${T('sleepMonthUnit')}${parseInt(String(d))}${T('sleepDayUnit')} ${weekday}`}</Text>
              <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
            </View>

            {/* Duration */}
            <Text style={styles.detailDuration}>
              {entry.durationMin ? formatSleepDuration(entry.durationMin) : '--'}
            </Text>
            <Text style={styles.detailDurationLabel}>{T('sleepDuration')}</Text>

            {/* Bedtime / Wake */}
            <View style={styles.detailTimeRow}>
              <View style={styles.detailTimeItem}>
                <Moon size={16} color={TH.sub} />
                <Text style={styles.detailTimeLabel}>{T('sleepBedtimeShort')}</Text>
                <Text style={styles.detailTimeValue}>{formatTime(entry.bedtimeAt)}</Text>
              </View>
              <View style={styles.detailTimeItem}>
                <Text style={{ fontSize: FONT_LABEL() }}>☀</Text>
                <Text style={styles.detailTimeLabel}>{T('sleepWakeShort')}</Text>
                <Text style={styles.detailTimeValue}>{formatTime(entry.wakeAt)}</Text>
              </View>
            </View>

            {/* Quality */}
            {entry.quality != null && (
              <View style={styles.detailQualityRow}>
                <Text style={[styles.detailQualityLabel, { color: TH.sub }]}>{T('sleepQuality')}</Text>
                <Text style={[styles.detailQualityLabel, { color: '#fbbf24' }]}>{renderStars(entry.quality)}</Text>
              </View>
            )}

            {/* Barrier status */}
            <View style={styles.detailBarrierRow}>
              <View style={[styles.detailBarrierDot, { backgroundColor: entry.barrierDone ? '#22c55e' : '#ef4444' }]} />
              <Text style={styles.detailBarrierText}>
                {entry.barrierDone
                  ? entry.barrierMin
                    ? `${T('sleepBarrierDone')}(${entry.barrierMin}${T('sleepMinutes')})`
                    : T('sleepBarrierDone')
                  : T('sleepBarrierNotDone')}
              </Text>
            </View>

            {/* Practice list */}
            {entry.practice && entry.practice.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>{T('sleepPracticeRecord')}</Text>
                <View style={styles.detailTagRow}>
                  {entry.practice.map(p => (
                    <View key={p} style={styles.detailTag}>
                      <Text style={styles.detailTagText}>{practiceLabels[p] ?? p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Gratitude */}
            {entry.gratitude && entry.gratitude.filter(g => g.trim()).length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  <Heart size={14} color={TH.primary} /> {T('sleepGratitudeItems')}
                </Text>
                {entry.gratitude.filter(g => g.trim()).map((g, i) => (
                  <Text key={i} style={styles.detailGratitudeItem}>· {g}</Text>
                ))}
              </View>
            )}

            {/* States */}
            {entry.bodyState && entry.bodyState.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{T('sleepBodyState')}: {entry.bodyState.join('、')}</Text>
              </View>
            )}
            {entry.mindState && entry.mindState.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{T('sleepMindState')}: {entry.mindState.join('、')}</Text>
              </View>
            )}

            {/* Note */}
            <View style={styles.detailSection}>
              <View style={styles.detailNoteHeader}>
                <Text style={styles.detailSectionTitle}>{T('sleepInsightNote')}</Text>
                {!editingNote && <TouchableOpacity onPress={startEdit}><Text style={styles.detailTagText}>{entry.note ? T('commonEdit') : T('commonAdd')}</Text></TouchableOpacity>}
              </View>
              {editingNote ? (
                <>
                  <TextInput style={[styles.detailNoteInput, { backgroundColor: TH.card }]} multiline maxLength={500} value={noteText} onChangeText={setNoteText} placeholder={T('sleepWriteInsight')} placeholderTextColor={TH.sub} />
                  <View style={styles.detailNoteActions}>
                    <TouchableOpacity onPress={() => setEditingNote(false)} style={[styles.detailNoteBtn, styles.detailNoteCancelBtn, { borderColor: TH.border }]}><Text style={{ color: TH.sub }}>{T('commonCancel')}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={saveNote} style={[styles.detailNoteBtn, styles.detailNoteSaveBtn, { backgroundColor: TH.primary }]}><Text style={{ color: '#fff', fontWeight: '600' }}>{T('commonSave')}</Text></TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: FONT_BODY(), color: entry.note ? TH.text : TH.sub }}>{entry.note || T('sleepNoNotes')}</Text>
              )}
            </View>

            {/* Delete */}
            <TouchableOpacity onPress={() => {
              Alert.alert(T('sleepDeleteRecord'), T('sleepDeleteRecordConfirm'), [
                { text: T('commonCancel'), style: 'cancel' },
                { text: T('commonDelete'), style: 'destructive', onPress: () => { onDelete(entry.id); onClose(); } },
              ]);
            }} style={styles.detailDeleteBtn}>
              <Trash2 size={16} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: FONT_BODY() }}>{T('sleepDeleteRecord')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Page ──
// ── Flattened data item ──
interface FlatItem {
  type: 'statCard' | 'heatmap' | 'monthHeader' | 'entry';
  key: string;
  monthKey?: string;
  items?: SleepEntry[];
  s?: SleepEntry;
  monthDurAvg?: number;
  idx?: number;
  isLast?: boolean;
}

export default function SleepHistoryPage() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const styles = mkStyles(TH);
  const { sleepHistory } = useShallowStore(s => ({ sleepHistory: s.sleepHistory }));
  const [selectedEntry, setSelectedEntry] = useState<SleepEntry | null>(null);

  const activeEntries = useMemo(() =>
    [...(sleepHistory ?? [])].filter(s => !s.deleted).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [sleepHistory]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof activeEntries>();
    for (const s of activeEntries) {
      const key = (s.date ?? '').slice(0, 7);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
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
      const monthDurArr = monthItems.filter(e => (e.durationMin ?? 0) > 0);
      const monthDurAvg = monthDurArr.length ? Math.round(monthDurArr.reduce((s, e) => s + (e.durationMin || 0), 0) / monthDurArr.length) : 0;
      items.push({ type: 'monthHeader', key: `mh-${monthKey}`, monthKey, items: monthItems, monthDurAvg });
      monthItems.forEach((s, idx) => {
        items.push({ type: 'entry', key: `e-${s.id ?? idx}`, s, idx, isLast: idx === monthItems.length - 1 });
      });
    }
    return items;
  }, [activeEntries, grouped]);

  const handleDelete = useCallback((id: string) => {
    const s = useAppStore.getState();
    const newHist = (s.sleepHistory ?? []).map(e => e.id === id ? { ...e, deleted: true, updatedAt: Date.now() } : e);
    useAppStore.setState({ sleepHistory: newHist });
    void import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
  }, []);

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item.type === 'statCard') return <StatsCard entries={activeEntries} TH={TH} T={T as unknown as (key: string) => string} />;
    if (item.type === 'heatmap') return <Heatmap entries={activeEntries} TH={TH} onPress={() => {}} T={T as unknown as (key: string) => string} />;
    if (item.type === 'monthHeader') {
      return (
        <View style={styles.monthHeader}>
          <View style={styles.monthDot} />
          <Text style={styles.monthText}>{formatMonth(item.monthKey!)}</Text>
          <Text style={styles.monthStatsText}>{item.items!.length}{T('sleepDayUnit')} · {formatSleepDuration(item.monthDurAvg!)}</Text>
        </View>
      );
    }
    // entry
    const s = item.s!;
    const parts = s.date.split('-');
    const dayStr = parts.length >= 3 ? `${parseInt(parts[1])}-${parseInt(parts[2])}` : s.date;
    const notePreview = s.note ? (s.note.length > 30 ? s.note.slice(0, 30) + '...' : s.note) : '';
    const practiceLabels: Record<string, string> = { breath: T('sleepBreath'), meditation: T('sleepMeditate'), reading: T('sleepReading'), journal: T('sleepJournal'), gratitude: T('sleepGratitudeSmall') };
    const practiceList = (s.practice ?? []).map(p => practiceLabels[p] ?? p);
    return (
      <TouchableOpacity onPress={() => setSelectedEntry(s)} activeOpacity={0.7}>
        <View style={styles.timelineRow}>
          <View style={styles.timelineTrack}>
            <View style={styles.timelineDot} />
            {!item.isLast && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.entryDayText}>{dayStr}</Text>
                <Text style={styles.entryWeekday}>{T('sleepWeekdayPrefix')}{(() => { const k = getWeekday(s.date); return k ? T(k) : ''; })()}</Text>
              </View>
              {s.durationMin ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{formatSleepDuration(s.durationMin)}</Text>
                </View>
              ) : null}
            </View>
            {s.quality != null && (
              <Text style={styles.qualityStars}>{renderStars(s.quality)}</Text>
            )}
            {s.gratitude && s.gratitude.filter(g => g.trim()).length > 0 && (
              <View style={styles.gratitudeRow}>
                <Heart size={12} color={TH.primary} />
                <Text style={styles.gratitudeText}>{s.gratitude.filter(g => g.trim()).length}{T('sleepGratitudeCount')}</Text>
              </View>
            )}
            {practiceList.length > 0 && (
              <View style={styles.practiceTagRow}>
                {practiceList.map(p => (
                  <View key={p} style={styles.practiceTag}>
                    <Text style={styles.practiceTagText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}
            {notePreview ? (
              <Text style={styles.notePreview}>{`「${notePreview}」`}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [activeEntries, TH]);

  const ListHeader = useMemo(() => (
    <ScreenHeader title={T('sleepHistoryTitle')} onBack={() => nav.goBack()} />
  ), [nav, T]);

  if (activeEntries.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.pageContainer}>
        <View style={styles.pageContent}>
          {ListHeader}
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyTitle}>{T('sleepNoRecords')}</Text>
            <Text style={styles.emptySubtitle}>{T('sleepEmptySubtitle')}</Text>
            <Text style={styles.emptySubtitle2}>{T('sleepEmptySubtitle2')}</Text>
            <TouchableOpacity onPress={() => nav.navigate('MainTabs', { screen: 'Sleep' as keyof MainTabParamList })} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>✦ {T('sleepStartRecording')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.pageContainer}>
      <FlatList<FlatItem>
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.pageContent}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />
      <DetailModal entry={selectedEntry} TH={TH} T={T as unknown as (key: string) => string} onClose={() => setSelectedEntry(null)} onDelete={handleDelete} />
    </SafeAreaView>
  );
}

function mkStyles(TH: Theme) {
  return StyleSheet.create({
    // ── StatsCard ──
    statsCardContainer: {
      marginBottom: 12,
      borderRadius: 20,
      overflow: 'hidden',
    },
    statsGradient: {
      padding: 20,
    },
    statsTitle: {
      fontSize: FONT_TITLE(),
      fontWeight: '700',
      color: '#fff',
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statsItem: {
      alignItems: 'center',
      flex: 1,
    },
    statsValue: {
      fontSize: FONT_STAT_CARD(),
      fontWeight: '900',
      color: '#fff',
    },
    statsLabel: {
      fontSize: FONT_SUB(),
      color: 'rgba(255,255,255,.7)',
      marginTop: 2,
    },
    statsDivider: {
      flexDirection: 'row',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,.15)',
    },
    statsWeekRow: {
      flex: 1,
    },
    statsWeekLabel: {
      fontSize: FONT_BODY(),
      fontWeight: '700',
      color: '#fff',
    },
    statsWeekSub: {
      fontSize: FONT_SUB(),
      color: 'rgba(255,255,255,.5)',
    },
    statsWeekValue: {
      fontSize: FONT_BODY(),
      fontWeight: '700',
      color: '#fff',
    },

    // ── Heatmap ──
    heatmapCard: {
      backgroundColor: TH.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
    },
    heatmapHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    heatmapNavBtn: {
      padding: 4,
    },
    heatmapTitle: {
      fontSize: FONT_SUB(),
      fontWeight: '700',
      color: TH.text,
    },
    heatmapStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    heatmapStatsText: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    heatmapWeekdays: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    heatmapWeekdayText: {
      flex: 1,
      textAlign: 'center',
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    heatmapGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    heatmapCell: {
      width: `${100 / 7}%` as unknown as number,
      aspectRatio: 1,
      padding: 2,
    },
    heatmapCellEmpty: {
      width: `${100 / 7}%` as unknown as number,
      aspectRatio: 1,
      padding: 2,
    },
    heatmapCellInner: {
      flex: 1,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heatmapCellText: {
      fontSize: FONT_SMALL(),
    },
    heatmapDayText: {
      fontSize: FONT_SUB(),
      fontWeight: '700',
      color: TH.text,
    },
    heatmapDayLabel: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    heatmapDayValue: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },

    // ── DetailModal ──
    detailOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,.75)',
      justifyContent: 'center',
      padding: 24,
    },
    detailContent: {
      backgroundColor: TH.cardSolid,
      borderRadius: 20,
      padding: 24,
      maxHeight: '85%',
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    detailDateText: {
      fontSize: FONT_SUB(),
      color: TH.sub,
    },
    detailDuration: {
      fontSize: scaleFontSize(32),
      fontWeight: '900',
      color: TH.primary,
      textAlign: 'center',
      marginBottom: 4,
    },
    detailDurationLabel: {
      fontSize: FONT_BODY(),
      color: TH.sub,
      textAlign: 'center',
      marginBottom: 16,
    },
    detailTimeRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    detailTimeItem: {
      alignItems: 'center',
    },
    detailTimeLabel: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
      marginTop: 4,
    },
    detailTimeValue: {
      fontSize: FONT_BODY(),
      fontWeight: '700',
      color: TH.text,
    },
    detailQualityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 12,
    },
    detailQualityLabel: {
      fontSize: FONT_BODY(),
    },
    detailBarrierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 12,
    },
    detailBarrierDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    detailBarrierText: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    detailSection: {
      marginBottom: 12,
    },
    detailSectionTitle: {
      fontSize: FONT_SUB(),
      fontWeight: '600',
      color: TH.text,
      marginBottom: 6,
    },
    detailTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    detailTag: {
      backgroundColor: `${TH.primary}15`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    detailTagText: {
      fontSize: FONT_BADGE(),
      color: TH.primary,
    },
    detailGratitudeItem: {
      fontSize: FONT_BODY(),
      color: TH.text,
      marginLeft: 8,
      marginBottom: 2,
    },
    detailNoteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    detailNoteInput: {
      borderRadius: 12,
      padding: 12,
      color: TH.text,
      fontSize: FONT_BODY(),
      minHeight: 80,
      textAlignVertical: 'top',
    },
    detailNoteActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    detailNoteBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    detailNoteCancelBtn: {
      borderWidth: 1,
    },
    detailNoteSaveBtn: {},
    detailDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
    },

    // ── SleepHistoryPage ──
    pageContainer: {
      flex: 1,
      backgroundColor: TH.bg,
    },
    pageContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 80,
    },
    emptyIcon: {
      fontSize: scaleFontSize(64),
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: FONT_TITLE(),
      fontWeight: '700',
      color: TH.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: FONT_BODY(),
      color: TH.sub,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtitle2: {
      fontSize: FONT_BODY(),
      color: TH.sub,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyBtn: {
      backgroundColor: TH.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: FONT_BODY(),
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      marginLeft: 4,
    },
    monthDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: TH.primary,
    },
    monthText: {
      fontSize: FONT_SUB(),
      fontWeight: '700',
      color: TH.text,
    },
    monthStatsText: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    timelineRow: {
      flexDirection: 'row',
      marginLeft: 4,
    },
    timelineTrack: {
      alignItems: 'center',
      width: 24,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: TH.primary,
      zIndex: 1,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: `${TH.primary}30`,
    },
    entryCard: {
      flex: 1,
      backgroundColor: TH.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      marginLeft: 8,
      borderLeftWidth: 3,
      borderLeftColor: TH.primary,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    entryDayText: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    entryWeekday: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    durationBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    durationText: {
      fontWeight: '700',
      fontSize: FONT_SUB(),
    },
    qualityStars: {
      fontSize: FONT_BADGE(),
      color: '#fbbf24',
      marginTop: 2,
    },
    gratitudeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    gratitudeText: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
    },
    practiceTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 4,
    },
    practiceTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    practiceTagText: {
      fontSize: FONT_SMALL(),
      color: TH.primary,
    },
    notePreview: {
      fontSize: FONT_BADGE(),
      color: TH.sub,
      marginTop: 2,
    },
  });
}
