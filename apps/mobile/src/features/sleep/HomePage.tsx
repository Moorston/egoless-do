// ─── HomePage — Sleep home page (extracted from SleepEngine) ─────
// Displays: body clock, sleep goal, diary, ritual entry, trend, streak

import { getCurrentPeriod, getNextSleepPeriod, BODY_CLOCK, type BodyClockPeriod, FONT_TITLE, type SleepGoal, type WorkState, SleepEntry } from '@egoless-do/core';
import { Moon, Sun, Clock, Heart, ChevronRight, BarChart3 } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';

import DiaryModal from './DiaryModal';
import SleepSummaryCard from './SleepSummaryCard';
import { styles } from './sleepStyles';

interface HomePageProps {
  todaySleep: SleepEntry | null | undefined;
  sleepGoal: { targetBedtime: string; targetWake: string; targetHours: number; enabled: boolean; reminderBeforeMin: number };
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
}

// eslint-disable-next-line max-lines-per-function -- large screen component; splitting into sub-components is a separate refactor
export default function HomePage(props: HomePageProps) {
  const { todaySleep, sleepGoal, sleepStreak, showBedtimeModal, showDiary,
    onStartBarrier, onQuickGratitude, onSetShowDiary, onDismissBedtimeModal, onStartBarrierFromModal, onSaveQuickDiary, onSetSleepGoal } = props;
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();

  const currentPeriod = getCurrentPeriod();
  const nextSleep = getNextSleepPeriod();

  // ── Sleep Goal Edit Modal ──
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editBedtime, setEditBedtime] = useState('');
  const [editWake, setEditWake] = useState('');
  const [editHours, setEditHours] = useState('');

  const openGoalModal = () => {
    setEditBedtime(sleepGoal.targetBedtime);
    setEditWake(sleepGoal.targetWake);
    setEditHours(String(sleepGoal.targetHours));
    setShowGoalModal(true);
  };

  // Validate HH:MM time format
  const isValidTime = (v: string) => /^\d{1,2}:\d{2}$/.test(v);

  const saveGoal = () => {
    if (onSetSleepGoal) {
      const hours = parseInt(editHours, 10);
      if (!isValidTime(editBedtime) || !isValidTime(editWake)) {
        return;
      }
      const validHours = isNaN(hours) ? sleepGoal.targetHours : Math.max(1, Math.min(24, hours));
      onSetSleepGoal({
        ...sleepGoal,
        targetBedtime: editBedtime,
        targetWake: editWake,
        targetHours: validHours,
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
        <View style={{ borderRadius: 20, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: TH.primary, marginBottom: 12 }}>十二时辰</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: TH.text }}>{currentPeriod.nameZh}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: TH.primary }}>{currentPeriod.organ}</Text>
          </View>
          <Text style={{ fontSize: 15, color: TH.text, marginBottom: 12 }}>{currentPeriod.advice}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            {BODY_CLOCK.map((p) => {
              const isCurrent = p.key === currentPeriod.key;
              const isSleep = p.key === 'zi' || p.key === 'hai';
              return (
                <TouchableOpacity key={p.key} onPress={() => setClockDetail(p)} style={{ alignItems: 'center', width: 22 }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: isCurrent ? TH.primary : isSleep ? '#6366F1' : TH.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isCurrent ? '#fff' : TH.sub }}>
                      {p.nameZh.charAt(0)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 15, color: TH.sub, marginTop: 12, textAlign: 'center' }}>
            {`⏰ 距${nextSleep.period.nameZh}还有 ${Math.floor(nextSleep.minutesUntil / 60)}小时${nextSleep.minutesUntil % 60}分`}
          </Text>
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
      {showBedtimeModal && (
        <Modal visible transparent animationType="fade">
          <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
            <View style={styles.barrierCenter}>
              <Moon size={60} color={TH.primary} />
              <Text style={[styles.barrierTime, { marginTop: 24 }]}>现在是 {sleepGoal.targetBedtime}</Text>
              <Text style={[styles.barrierLabel, { fontSize: FONT_TITLE(), marginTop: 8 }]}>该入睡了 🌙</Text>
              <Text style={[styles.barrierAwayText, { color: TH.sub, marginTop: 8 }]}>1 分钟无操作将自动记录入睡</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 32 }}>
                <TouchableOpacity
                  style={[styles.ritualBtn, { paddingHorizontal: 32, paddingVertical: 14 }]}
                  onPress={() => { onDismissBedtimeModal(); onStartBarrierFromModal(); }}
                >
                  <Text style={styles.ritualBtnText}>开始仪轨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ritualBtn, { paddingHorizontal: 32, paddingVertical: 14, borderColor: TH.border }]}
                  onPress={onDismissBedtimeModal}
                >
                  <Text style={[styles.ritualBtnText, { color: TH.sub }]}>忽略</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

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
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }} activeOpacity={1} onPress={() => setShowGoalModal(false)}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TH.primary, textAlign: 'center', marginBottom: 20 }}>{T('sleepGoalEditTitle')}</Text>
              <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 8 }}>{T('sleepGoalBedtime')}</Text>
              <TextInput value={editBedtime} onChangeText={setEditBedtime} placeholder="23:00" placeholderTextColor={TH.sub} style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: 16, marginBottom: 16 }} />
              <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 8 }}>{T('sleepGoalWake')}</Text>
              <TextInput value={editWake} onChangeText={setEditWake} placeholder="07:00" placeholderTextColor={TH.sub} style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: 16, marginBottom: 16 }} />
              <Text style={{ fontSize: 14, color: TH.sub, marginBottom: 8 }}>{T('sleepGoalHours')}</Text>
              <TextInput value={editHours} onChangeText={setEditHours} placeholder="8" placeholderTextColor={TH.sub} keyboardType="numeric" style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: 16, marginBottom: 20 }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowGoalModal(false)} style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: TH.sub }}>{T('commonCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveGoal} style={{ flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: TH.primary }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{T('commonSave')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

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