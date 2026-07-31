// ─── HomePage — Sleep home page (extracted from SleepEngine) ─────
// Displays: body clock, sleep goal, diary, ritual entry, trend, streak

import { getCurrentPeriod, getNextSleepPeriod, type BodyClockPeriod, FONT_TITLE, type SleepGoal, type WorkState, SleepEntry } from '@egoless-do/core';
import { Moon, Sun, Clock, Heart, ChevronRight, BarChart3 } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';

import DiaryModal from './DiaryModal';
import SleepSummaryCard from './SleepSummaryCard';
import BodyClockDial from './components/BodyClockDial';
import BedtimeReminderModal from './components/BedtimeReminderModal';
import TimePickerModal from '../../components/TimePickerModal';
import {
  formatDuration,
  formatTime,
  formatSleepDate,
  countGratitude,
  qualityLabel,
  parseHHMM,
} from './sleepSummaryLogic';
import { styles } from './sleepStyles';

interface HomePageProps {
  todaySleep: SleepEntry | null | undefined;
  sleepGoal: SleepGoal;
  sleepHistory: SleepEntry[];
  sleepStreak: number;
  showBedtimeModal: boolean;
  showDiary: boolean;
  onStartBarrier: (min: number) => void;
  onQuickGratitude: () => void;
  onSetShowDiary: (v: boolean) => void;
  onDismissBedtimeModal: () => void;
  onStartBarrierFromModal: () => void;
  onSaveQuickDiary?: (quality: number, workState?: WorkState) => void;
  onSetSleepGoal?: (goal: SleepGoal) => void;
  onSnooze?: () => void;
  onSkipTonight?: () => void;
}

// eslint-disable-next-line max-lines-per-function -- large screen component; splitting into sub-components is a separate refactor
export default function HomePage(props: HomePageProps) {
  const { todaySleep, sleepGoal, sleepStreak, showBedtimeModal, showDiary,
    onStartBarrier, onQuickGratitude, onSetShowDiary, onDismissBedtimeModal, onStartBarrierFromModal, onSaveQuickDiary, onSetSleepGoal, onSnooze, onSkipTonight } = props;
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();

  const currentPeriod = getCurrentPeriod();
  const nextSleep = getNextSleepPeriod();

  // ── Sleep Goal Edit Modal ──
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editBedtime, setEditBedtime] = useState('');
  const [editWake, setEditWake] = useState('');
  const [editWeekendBedtime, setEditWeekendBedtime] = useState('');
  const [editWeekendWake, setEditWeekendWake] = useState('');
  const [editStages, setEditStages] = useState<number[]>([30, 15, 5]);
  const [goalPickerType, setGoalPickerType] = useState<'bedtime' | 'wake' | 'weekendBedtime' | 'weekendWake' | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 自动根据入睡/起床时间计算目标时长
  const computedGoalHours = useMemo(() => {
    const bt = parseHHMM(editBedtime);
    const wt = parseHHMM(editWake);
    if (bt == null || wt == null) return sleepGoal.targetHours;
    let diffMin = wt - bt;
    if (diffMin < 0) diffMin += 24 * 60 * 60 * 1000;
    return Math.round(diffMin / 60000 / 60);
  }, [editBedtime, editWake, sleepGoal.targetHours]);

  const openGoalModal = () => {
    setEditBedtime(sleepGoal.targetBedtime);
    setEditWake(sleepGoal.targetWake);
    setEditWeekendBedtime(sleepGoal.weekendBedtime ?? '');
    setEditWeekendWake(sleepGoal.weekendWake ?? '');
    setEditStages(sleepGoal.reminderStages ?? [30, 15, 5]);
    setShowGoalModal(true);
  };

  // Validate HH:MM time format
  const isValidTime = (v: string) => /^\d{1,2}:\d{2}$/.test(v);

  const saveGoal = () => {
    if (onSetSleepGoal) {
      if (!isValidTime(editBedtime) || !isValidTime(editWake)) {
        return;
      }
      const validHours = Math.max(1, Math.min(24, computedGoalHours));
      onSetSleepGoal({
        ...sleepGoal,
        targetBedtime: editBedtime,
        targetWake: editWake,
        targetHours: validHours,
        weekendBedtime: editWeekendBedtime || undefined,
        weekendWake: editWeekendWake || undefined,
        reminderStages: editStages,
      });
    }
    setShowGoalModal(false);
  };

  // ── Trend chart data ──
  const trendData = useMemo(() => {
    const days: { date: string; durationMin: number; quality: number }[] = [];
    const history = (props.sleepHistory ?? []).filter(s => !s.deleted);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = history.find(s => s.date === ds);
      days.push({
        date: ds,
        durationMin: entry?.durationMin ?? 0,
        quality: entry?.quality ?? 0,
      });
    }
    return days;
  }, [props.sleepHistory]);

  const avgDuration = trendData.length > 0
    ? Math.round(trendData.filter(d => d.durationMin > 0).reduce((s, d) => s + d.durationMin, 0) / Math.max(1, trendData.filter(d => d.durationMin > 0).length))
    : 0;

  const maxDuration = Math.max(...trendData.map(d => d.durationMin), 480);

  const barColor = (durationMin: number, quality: number) => {
    if (quality >= 4 || durationMin >= 420) return '#8B5CF6';
    if (quality >= 3 || durationMin >= 360) return '#6366F1';
    if (quality >= 2 || durationMin >= 300) return '#F59E0B';
    return '#EF4444';
  };

  // ── Body clock detail modal ──
  const [clockDetail, setClockDetail] = useState<BodyClockPeriod | null>(null);

  // ── Trend detail modal ──
  const [trendDetail, setTrendDetail] = useState<{ date: string; durationMin: number; quality: number } | null>(null);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Sleep" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* ── SleepSummaryCard (inline-editing summary card) ── */}
        {onSaveQuickDiary ? (
          <SleepSummaryCard
            todaySleep={todaySleep}
            onSaveQuickDiary={(quality, workState) => onSaveQuickDiary(quality, workState === null ? undefined : workState)}
            onOpenFullDiary={() => onSetShowDiary(true)}
            sleepGoalEnabled={sleepGoal.enabled}
            sleepGoalHours={sleepGoal.targetHours}
          />
        ) : null}

        {/* ── BodyClockCard ── */}
        <View style={{ borderRadius: 20, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 20, marginBottom: 16, alignItems: 'center', overflow: 'hidden' }}>
          {/* Top accent bar */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: TH.primary, opacity: 0.6 }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: TH.primary, marginBottom: 10, alignSelf: 'flex-start', letterSpacing: 1 }}>十 二 时 辰</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: TH.text }}>{currentPeriod.nameZh}</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${TH.primary}15` }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: TH.primary }}>{currentPeriod.organ}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 14, lineHeight: 20 }}>{currentPeriod.advice}</Text>
          <BodyClockDial theme={TH} onPeriodPress={setClockDetail} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Moon size={15} color={TH.sub} />
            <Text style={{ fontSize: 13, color: TH.sub }}>
              {`距${nextSleep.period.nameZh}还有 ${Math.floor(nextSleep.minutesUntil / 60)}h${nextSleep.minutesUntil % 60}m`}
            </Text>
          </View>
        </View>

        {/* ── SleepGoalCard ── */}
        <View style={{ borderRadius: 20, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TH.text }}>睡眠目标</Text>
            <TouchableOpacity onPress={openGoalModal}>
              <Text style={{ fontSize: 14, color: TH.primary, fontWeight: '600' }}>编辑</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Moon size={16} color={TH.primary} />
              <Text style={{ fontSize: 14, color: TH.sub }}>目标入睡</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: TH.text }}>{sleepGoal.targetBedtime}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Sun size={16} color="#F59E0B" />
              <Text style={{ fontSize: 14, color: TH.sub }}>目标起床</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: TH.text }}>{sleepGoal.targetWake}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Clock size={16} color="#10B981" />
              <Text style={{ fontSize: 14, color: TH.sub }}>目标时长</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: TH.text }}>{sleepGoal.targetHours}h</Text>
            </View>
          </View>
        </View>

        {/* ── Ritual Entrance ── */}
        <View style={{ borderRadius: 20, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 24, alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Moon size={28} color={TH.primary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: TH.text }}>调眠仪轨</Text>
          <Text style={{ fontSize: 14, color: TH.sub }}>选择仪轨时长</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {[15, 20, 30].map(min => (
              <TouchableOpacity key={min} onPress={() => onStartBarrier(min)}
                style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: TH.border }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text }}>{min}分钟</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onQuickGratitude} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 8 }}>
            <Heart size={16} color={TH.sub} />
            <Text style={{ fontSize: 15, color: TH.sub }}>快速感恩</Text>
          </TouchableOpacity>
        </View>

        {/* ── TrendChart ── */}
        <View style={{ borderRadius: 20, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: TH.text, marginBottom: 12 }}>
            本周趋势{avgDuration > 0 ? ` · 平均 ${Math.floor(avgDuration / 60)}h${avgDuration % 60}m` : ''}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, gap: 4 }}>
            {trendData.map((d, i) => {
              const barH = d.durationMin > 0 ? (d.durationMin / maxDuration) * 70 : 4;
              const color = barColor(d.durationMin, d.quality);
              return (
                <TouchableOpacity key={d.date} onPress={() => setTrendDetail(d)} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '100%', height: barH, borderRadius: 4, backgroundColor: color, minHeight: 4 }} />
                  <Text style={{ fontSize: 10, color: TH.sub }}>{['日', '一', '二', '三', '四', '五', '六'][i]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── StreakBar ── */}
        {sleepStreak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ fontSize: 28 }}>🔥</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#F59E0B' }}>连续记录 {sleepStreak} 天</Text>
          </View>
        )}

        {/* ── History Button ── */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: TH.border, padding: 14, marginBottom: 8 }}
          onPress={() => nav.navigate('SleepHistory' as never)}
        >
          <BarChart3 size={18} color={TH.primary} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: TH.primary }}>查看睡眠历史</Text>
          <ChevronRight size={18} color={TH.primary} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bedtime Reminder Modal ── */}
      <BedtimeReminderModal
        visible={showBedtimeModal}
        theme={TH}
        bedtime={sleepGoal.targetBedtime}
        onStartRitual={(min) => {
          onDismissBedtimeModal();
          onStartBarrier(min);
        }}
        onSnooze={() => {
          onDismissBedtimeModal();
          onSnooze?.();
        }}
        onSkipTonight={() => {
          onDismissBedtimeModal();
          onSkipTonight?.();
        }}
        onDismiss={onDismissBedtimeModal}
      />

      {/* ── Body Clock Detail Modal ── */}
      {clockDetail && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setClockDetail(null)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }} activeOpacity={1} onPress={() => setClockDetail(null)}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: TH.primary, textAlign: 'center' }}>{clockDetail.nameZh}</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: TH.text, textAlign: 'center', marginTop: 4 }}>{clockDetail.organ}</Text>
              <Text style={{ fontSize: 15, color: TH.sub, textAlign: 'center', marginTop: 12 }}>{clockDetail.advice}</Text>
              <View style={{ height: 1, backgroundColor: TH.border, marginVertical: 16 }} />
              <Text style={{ fontSize: 14, color: TH.sub, textAlign: 'center' }}>{`${clockDetail.startHour}:00 - ${(clockDetail.startHour + 1) % 24}:00`}</Text>
              <TouchableOpacity onPress={() => setClockDetail(null)} style={{ marginTop: 20, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: TH.card }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: TH.primary }}>关闭</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── Sleep Goal Edit Modal ── */}
      {showGoalModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowGoalModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TH.primary, textAlign: 'center', marginBottom: 20 }}>{T('sleepGoalEditTitle')}</Text>
              <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 8 }}>{T('sleepGoalBedtime')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowGoalModal(false);
                  setGoalPickerType('bedtime');
                }}
                style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}
              >
                <Text style={{ fontSize: 16, color: editBedtime ? TH.text : TH.sub, fontWeight: '600' }}>
                  {editBedtime || '23:00'}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 8 }}>{T('sleepGoalWake')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowGoalModal(false);
                  setGoalPickerType('wake');
                }}
                style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}
              >
                <Text style={{ fontSize: 16, color: editWake ? TH.text : TH.sub, fontWeight: '600' }}>
                  {editWake || '07:00'}
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: TH.sub }}>{T('sleepGoalHours')}</Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: `${TH.primary}15` }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: TH.primary }}>{computedGoalHours}h</Text>
                </View>
                <Text style={{ fontSize: 12, color: TH.sub, opacity: 0.7 }}>（自动计算）</Text>
              </View>

              {/* 高级设置折叠区 */}
              <TouchableOpacity onPress={() => setShowAdvanced(!showAdvanced)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: TH.sub, fontWeight: '600' }}>高级设置</Text>
                <Text style={{ fontSize: 12, color: TH.sub }}>{showAdvanced ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showAdvanced && (
                <View style={{ marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: TH.card }}>
                  <Text style={{ fontSize: 13, color: TH.sub, marginBottom: 8 }}>周末目标（可选）</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 4 }}>周末入睡</Text>
                      <TouchableOpacity
                        onPress={() => { setShowGoalModal(false); setGoalPickerType('weekendBedtime'); }}
                        style={{ backgroundColor: TH.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: TH.border }}
                      >
                        <Text style={{ fontSize: 14, color: editWeekendBedtime ? TH.text : TH.sub }}>{editWeekendBedtime || '不设'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 4 }}>周末起床</Text>
                      <TouchableOpacity
                        onPress={() => { setShowGoalModal(false); setGoalPickerType('weekendWake'); }}
                        style={{ backgroundColor: TH.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: TH.border }}
                      >
                        <Text style={{ fontSize: 14, color: editWeekendWake ? TH.text : TH.sub }}>{editWeekendWake || '不设'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: TH.sub, marginBottom: 8 }}>提醒阶段</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[60, 30, 15, 5].map(min => {
                      const selected = editStages.includes(min);
                      return (
                        <TouchableOpacity
                          key={min}
                          onPress={() => setEditStages(prev =>
                            selected ? prev.filter(m => m !== min) : [...prev, min].sort((a, b) => b - a)
                          )}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: selected ? TH.primary : TH.border, backgroundColor: selected ? `${TH.primary}20` : 'transparent' }}
                        >
                          <Text style={{ fontSize: 13, color: selected ? TH.primary: TH.sub }}>{min}分钟前</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowGoalModal(false)} style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: TH.sub }}>{T('commonCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveGoal} style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: TH.primary }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{T('commonSave')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Goal Time Picker Modal ── */}
      <TimePickerModal
        visible={goalPickerType != null}
        value={
          goalPickerType === 'wake' ? (editWake || '07:00')
          : goalPickerType === 'weekendBedtime' ? (editWeekendBedtime || '23:00')
          : goalPickerType === 'weekendWake' ? (editWeekendWake || '07:00')
          : (editBedtime || '23:00')
        }
        onConfirm={(time) => {
          if (goalPickerType === 'bedtime') setEditBedtime(time);
          else if (goalPickerType === 'wake') setEditWake(time);
          else if (goalPickerType === 'weekendBedtime') setEditWeekendBedtime(time);
          else if (goalPickerType === 'weekendWake') setEditWeekendWake(time);
          setGoalPickerType(null);
          setShowGoalModal(true);
        }}
        onClose={() => {
          setGoalPickerType(null);
          setShowGoalModal(true);
        }}
      />

      {/* ── Trend Detail Modal ── */}
      {trendDetail && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setTrendDetail(null)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }} activeOpacity={1} onPress={() => setTrendDetail(null)}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: TH.primary, textAlign: 'center', marginBottom: 16 }}>{trendDetail.date}</Text>
              {trendDetail.durationMin > 0 ? (
                <View>
                  <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 4 }}>{T('sleepDuration')}</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: TH.text, marginBottom: 16 }}>{`${Math.floor(trendDetail.durationMin / 60)}h${trendDetail.durationMin % 60}m`}</Text>
                  <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 4 }}>{T('sleepQuality')}</Text>
                  <Text style={{ fontSize: 20, color: '#F59E0B' }}>{trendDetail.quality > 0 ? `${'★'.repeat(trendDetail.quality)}${'☆'.repeat(5 - trendDetail.quality)}` : T('sleepTrendNoRating')}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: TH.sub, textAlign: 'center' }}>{T('sleepTrendNoRecord')}</Text>
              )}
              <TouchableOpacity onPress={() => setTrendDetail(null)} style={{ marginTop: 20, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: TH.card }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: TH.primary }}>{T('commonClose')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <DiaryModal visible={showDiary} onClose={() => onSetShowDiary(false)} />
    </SafeAreaView>
  );
}