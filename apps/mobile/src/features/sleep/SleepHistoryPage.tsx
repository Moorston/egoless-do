import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, ScreenHeader, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, FONT_STAT_SECTION, FONT_STAT_CARD, dateStr, yesterday } from '@egoless-do/core';
import { formatSleepDuration } from '@egoless-do/core';
import { ChevronLeft, ChevronRight, Moon, Trash2, X, Heart } from 'lucide-react-native';
import type { SleepEntry } from '@egoless-do/core';

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
function StatsCard({ entries, TH }: { entries: SleepEntry[]; TH: any }) {
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
    <View style={{ marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}>
      <LinearGradient colors={['#6366f1', '#818cf8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 16 }}>✦ 累计睡眠</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            { val: totalDays, label: '累计天数' },
            { val: formatSleepDuration(avgDuration), label: '平均时长' },
            { val: avgQuality.toFixed(1), label: '平均质量' },
            { val: streak, label: '连续天数' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '900', color: '#fff' }}>{s.val}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{formatSleepDuration(weekAvg)}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>本周均时</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{formatSleepDuration(monthAvg)}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>本月均时</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Heatmap ──
function Heatmap({ entries, TH, onPress }: { entries: SleepEntry[]; TH: any; onPress: () => void }) {
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
          <ChevronLeft size={18} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(ym)} 睡眠热力图</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{sleepDays}/{daysInMonth}天</Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
            <ChevronRight size={18} color={TH.text} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS.map(w => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: FONT_BADGE, color: TH.sub }}>{w}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}><View /></View>;
          const ds = `${ym}-${String(d).padStart(2, '0')}`;
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

// ── Detail Modal ──
function DetailModal({ entry, TH, T, onClose, onDelete }: { entry: SleepEntry | null; TH: any; T: any; onClose: () => void; onDelete: (id: string) => void }) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!entry) return null;

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const [y, m, d] = entry.date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = isNaN(dt.getTime()) ? '' : `周${weekdays[dt.getDay()]}`;

  const startEdit = () => { setNoteText(entry.note ?? ''); setEditingNote(true); };
  const saveNote = () => {
    const updated = { ...entry, note: noteText, updatedAt: Date.now() };
    const newHist = (useAppStore.getState().sleepHistory ?? []).map(e => e.id === entry.id ? updated : e);
    useAppStore.setState({ sleepHistory: newHist });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
    setEditingNote(false);
  };

  const practiceLabels: Record<string, string> = {
    breath: '调息',
    meditation: '冥想',
    reading: '阅读',
    journal: '日记',
    gratitude: '感恩',
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, maxHeight: '85%' }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{`${parseInt(String(m))}月${parseInt(String(d))}日 ${weekday}`}</Text>
              <TouchableOpacity onPress={onClose}><X size={20} color={TH.sub} /></TouchableOpacity>
            </View>

            {/* Duration */}
            <Text style={{ fontSize: 32, fontWeight: '900', color: TH.primary, textAlign: 'center', marginBottom: 4 }}>
              {entry.durationMin ? formatSleepDuration(entry.durationMin) : '--'}
            </Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 16 }}>睡眠时长</Text>

            {/* Bedtime / Wake */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Moon size={16} color={TH.sub} />
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 4 }}>入睡</Text>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{formatTime(entry.bedtimeAt)}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16 }}>☀</Text>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 4 }}>起床</Text>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{formatTime(entry.wakeAt)}</Text>
              </View>
            </View>

            {/* Quality */}
            {entry.quality != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>质量</Text>
                <Text style={{ fontSize: FONT_BODY, color: '#fbbf24' }}>{renderStars(entry.quality)}</Text>
              </View>
            )}

            {/* Barrier status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: entry.barrierDone ? '#22c55e' : '#ef4444' }} />
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
                {entry.barrierDone ? `睡眠屏障已${entry.barrierMin ? `完成(${entry.barrierMin}分钟)` : '完成'}` : '未完成睡眠屏障'}
              </Text>
            </View>

            {/* Practice list */}
            {entry.practice && entry.practice.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 6 }}>修行练习</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {entry.practice.map(p => (
                    <View key={p} style={{ backgroundColor: `${TH.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.primary }}>{practiceLabels[p] ?? p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Gratitude */}
            {entry.gratitude && entry.gratitude.filter(g => g.trim()).length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                  <Heart size={14} color={TH.primary} /> 感恩事项
                </Text>
                {entry.gratitude.filter(g => g.trim()).map((g, i) => (
                  <Text key={i} style={{ fontSize: FONT_BODY, color: TH.text, marginLeft: 8, marginBottom: 2 }}>· {g}</Text>
                ))}
              </View>
            )}

            {/* States */}
            {entry.bodyState && entry.bodyState.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>身体: {entry.bodyState.join('、')}</Text>
              </View>
            )}
            {entry.mindState && entry.mindState.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>心理: {entry.mindState.join('、')}</Text>
              </View>
            )}

            {/* Note */}
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

            {/* Delete */}
            <TouchableOpacity onPress={() => {
              Alert.alert('删除记录', '确定要删除这条睡眠记录吗？', [
                { text: '取消', style: 'cancel' },
                { text: '删除', style: 'destructive', onPress: () => { onDelete(entry.id); onClose(); } },
              ]);
            }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
              <Trash2 size={16} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: FONT_BODY }}>删除记录</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Page ──
export default function SleepHistoryPage() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { sleepHistory } = useAppStore(useShallow(s => ({ sleepHistory: s.sleepHistory })));
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

  const handleDelete = useCallback((id: string) => {
    const s = useAppStore.getState();
    const newHist = (s.sleepHistory ?? []).map(e => e.id === id ? { ...e, deleted: true, updatedAt: Date.now() } : e);
    useAppStore.setState({ sleepHistory: newHist });
    import('../../store/storageAdapter').then(({ flushWrites }) => flushWrites());
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title="睡眠历史" onBack={() => nav.goBack()} />

        {activeEntries.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🌙</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 8 }}>还没有睡眠记录</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 8 }}>每晚的安睡都是送给身体的礼物</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 24 }}>从今天开始，记录你的睡眠</Text>
            <TouchableOpacity onPress={() => (nav as any).navigate('MainTabs', { screen: 'Sleep' })} style={{ backgroundColor: TH.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>✦ 开始记录睡眠</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <StatsCard entries={activeEntries} TH={TH} />
            <Heatmap entries={activeEntries} TH={TH} onPress={() => {}} />

            {grouped.map(([monthKey, items]) => {
              const monthDurArr = items.filter(e => (e.durationMin ?? 0) > 0);
              const monthAvgDur = monthDurArr.length ? Math.round(monthDurArr.reduce((s, e) => s + (e.durationMin || 0), 0) / monthDurArr.length) : 0;
              return (
                <View key={monthKey} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TH.primary }} />
                    <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(monthKey)}</Text>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length}天 · {formatSleepDuration(monthAvgDur)}</Text>
                  </View>
                  {items.map((s, idx) => {
                    const isLast = idx === items.length - 1;
                    const parts = s.date.split('-');
                    const dayStr = parts.length >= 3 ? `${parseInt(parts[1])}-${parseInt(parts[2])}` : s.date;
                    const notePreview = s.note ? (s.note.length > 30 ? s.note.slice(0, 30) + '...' : s.note) : '';
                    const practiceList = (s.practice ?? []).map(p => {
                      const labels: Record<string, string> = { breath: '调息', meditation: '冥想', reading: '阅读', journal: '日记', gratitude: '感恩' };
                      return labels[p] ?? p;
                    });
                    return (
                      <TouchableOpacity key={s.id ?? idx} onPress={() => setSelectedEntry(s)} activeOpacity={0.7}>
                        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                          <View style={{ alignItems: 'center', width: 24 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TH.primary, zIndex: 1 }} />
                            {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: `${TH.primary}30` }} />}
                          </View>
                          <View style={{ flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 10, marginLeft: 8, borderLeftWidth: 3, borderLeftColor: TH.primary }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{dayStr}</Text>
                                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>周{getWeekday(s.date)}</Text>
                              </View>
                              {s.durationMin ? (
                                <View style={{ backgroundColor: `${TH.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                  <Text style={{ color: TH.primary, fontWeight: '700', fontSize: FONT_SUB }}>{formatSleepDuration(s.durationMin)}</Text>
                                </View>
                              ) : null}
                            </View>
                            {/* Quality stars */}
                            {s.quality != null && (
                              <Text style={{ fontSize: FONT_BADGE, color: '#fbbf24', marginTop: 2 }}>{renderStars(s.quality)}</Text>
                            )}
                            {/* Gratitude count */}
                            {s.gratitude && s.gratitude.filter(g => g.trim()).length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Heart size={12} color={TH.primary} />
                                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{s.gratitude.filter(g => g.trim()).length}条感恩</Text>
                              </View>
                            )}
                            {/* Practice tags */}
                            {practiceList.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {practiceList.map(p => (
                                  <View key={p} style={{ backgroundColor: `${TH.primary}10`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 11, color: TH.primary }}>{p}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                            {/* Note preview */}
                            {notePreview ? (
                              <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2 }}>「{notePreview}」</Text>
                            ) : null}
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
      <DetailModal entry={selectedEntry} TH={TH} T={T} onClose={() => setSelectedEntry(null)} onDelete={handleDelete} />
    </SafeAreaView>
  );
}
