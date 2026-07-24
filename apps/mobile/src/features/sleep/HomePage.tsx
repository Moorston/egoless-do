// ─── HomePage — Sleep home page (extracted from SleepEngine) ─────
// Displays: body clock, sleep goal, diary, ritual entry, trend, streak

import { getCurrentPeriod, getNextSleepPeriod, BODY_CLOCK, type BodyClockPeriod, FONT_TITLE } from '@egoless-do/core';
import type { SleepEntry } from '@egoless-do/core';
import { Moon, Sun, Clock, Heart, ChevronRight, BarChart3, Star } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRootNavigation } from '../../navigation/hooks';
import { styles } from './sleepStyles';
import DiaryModal from './DiaryModal';

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
  onSaveQuickDiary?: (quality: number) => void;
}

export default function HomePage(props: HomePageProps) {
  const { todaySleep, sleepGoal, sleepStreak, showBedtimeModal, showDiary,
    onStartBarrier, onQuickGratitude, onSetShowDiary, onDismissBedtimeModal, onStartBarrierFromModal, onSaveQuickDiary } = props;
  const nav = useRootNavigation();

  const currentPeriod = getCurrentPeriod();
  const nextSleep = getNextSleepPeriod();

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

  // ── Quick diary state ──
  const [quickQuality, setQuickQuality] = useState(0);

  const handleQuickSave = () => {
    if (quickQuality > 0 && onSaveQuickDiary) {
      onSaveQuickDiary(quickQuality);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* ── SleepSummaryCard ── */}
        <View style={{ borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#8B5CF6', marginBottom: 12 }}>昨晚睡眠</Text>
          {todaySleep ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontSize: 48, fontWeight: '900', color: '#fff' }}>
                  {todaySleep.durationMin ? `${Math.floor(todaySleep.durationMin / 60)}h${todaySleep.durationMin % 60}m` : '--'}
                </Text>
                {todaySleep.quality && (
                  <Text style={{ fontSize: 20, color: '#F59E0B' }}>
                    {'★'.repeat(todaySleep.quality)}{'☆'.repeat(5 - todaySleep.quality)}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                {todaySleep.bedtimeAt && (
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    🛌 {new Date(todaySleep.bedtimeAt).getHours().toString().padStart(2, '0')}:{new Date(todaySleep.bedtimeAt).getMinutes().toString().padStart(2, '0')}
                  </Text>
                )}
                {todaySleep.wakeAt && (
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    ☀️ {new Date(todaySleep.wakeAt).getHours().toString().padStart(2, '0')}:{new Date(todaySleep.wakeAt).getMinutes().toString().padStart(2, '0')}
                  </Text>
                )}
                {todaySleep.barrierDone && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.2)' }}>
                    <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>✅ 仪轨</Text>
                  </View>
                )}
              </View>
              {todaySleep.gratitude && todaySleep.gratitude.length > 0 && (
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>感恩 ×{todaySleep.gratitude.length}</Text>
              )}
              <TouchableOpacity onPress={() => onSetShowDiary(true)} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 15, color: '#8B5CF6', fontWeight: '600' }}>编辑日记 →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>还没有昨晚的记录</Text>
              <TouchableOpacity
                style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', padding: 14, alignItems: 'center', backgroundColor: 'rgba(139,92,246,0.12)' }}
                onPress={() => onSetShowDiary(true)}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#8B5CF6' }}>📝 填写今日日记</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── BodyClockCard ── */}
        <View style={{ borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#8B5CF6', marginBottom: 12 }}>十二时辰</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{currentPeriod.nameZh}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>{currentPeriod.organ}</Text>
          </View>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>{currentPeriod.advice}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            {BODY_CLOCK.map((p) => {
              const isCurrent = p.key === currentPeriod.key;
              const isSleep = p.key === 'zi' || p.key === 'hai';
              return (
                <TouchableOpacity key={p.key} onPress={() => setClockDetail(p)} style={{ alignItems: 'center', width: 22 }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: isCurrent ? '#8B5CF6' : isSleep ? '#6366F1' : 'rgba(255,255,255,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isCurrent ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                      {p.nameZh.charAt(0)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 12, textAlign: 'center' }}>
            ⏰ 距{nextSleep.period.nameZh}还有 {Math.floor(nextSleep.minutesUntil / 60)}小时{nextSleep.minutesUntil % 60}分
          </Text>
        </View>

        {/* ── SleepGoalCard ── */}
        <View style={{ borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>睡眠目标</Text>
            <TouchableOpacity onPress={() => nav.navigate('Settings' as never)}>
              <Text style={{ fontSize: 14, color: '#8B5CF6', fontWeight: '600' }}>编辑</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Moon size={16} color="#8B5CF6" />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>目标入睡</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{sleepGoal.targetBedtime}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Sun size={16} color="#F59E0B" />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>目标起床</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{sleepGoal.targetWake}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Clock size={16} color="#10B981" />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>目标时长</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{sleepGoal.targetHours}h</Text>
            </View>
          </View>
        </View>

        {/* ── QuickDiary ── */}
        <View style={{ borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>快速记录</Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>昨晚睡得怎么样？</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setQuickQuality(i)}>
                <Star size={28} color={i <= quickQuality ? '#F59E0B' : 'rgba(255,255,255,0.15)'} fill={i <= quickQuality ? '#F59E0B' : 'transparent'} />
              </TouchableOpacity>
            ))}
          </View>
          {quickQuality > 0 && (
            <TouchableOpacity onPress={handleQuickSave}
              style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>保存</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onSetShowDiary(true)}>
            <Text style={{ fontSize: 15, color: '#8B5CF6', fontWeight: '600' }}>打开完整日记 →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Ritual Entrance ── */}
        <View style={{ borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', padding: 24, alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Moon size={28} color="#8B5CF6" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>调眠仪轨</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>选择仪轨时长</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {[15, 20, 30].map(min => (
              <TouchableOpacity key={min} onPress={() => onStartBarrier(min)}
                style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{min}分钟</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onQuickGratitude} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 8 }}>
            <Heart size={16} color="rgba(255,255,255,0.5)" />
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>快速感恩</Text>
          </TouchableOpacity>
        </View>

        {/* ── TrendChart ── */}
        <View style={{ borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
            本周趋势{avgDuration > 0 ? ` · 平均 ${Math.floor(avgDuration / 60)}h${avgDuration % 60}m` : ''}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, gap: 4 }}>
            {trendData.map((d, i) => {
              const barH = d.durationMin > 0 ? (d.durationMin / maxDuration) * 70 : 4;
              const color = barColor(d.durationMin, d.quality);
              return (
                <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '100%', height: barH, borderRadius: 4, backgroundColor: color, minHeight: 4 }} />
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{['日', '一', '二', '三', '四', '五', '六'][i]}</Text>
                </View>
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
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', padding: 14, marginBottom: 8 }}
          onPress={() => nav.navigate('SleepHistory' as never)}
        >
          <BarChart3 size={18} color="#8B5CF6" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>查看睡眠历史</Text>
          <ChevronRight size={18} color="#8B5CF6" />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bedtime Reminder Modal ── */}
      {showBedtimeModal && (
        <Modal visible transparent animationType="fade">
          <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
            <View style={styles.barrierCenter}>
              <Moon size={60} color="#8B5CF6" />
              <Text style={[styles.barrierTime, { marginTop: 24 }]}>现在是 {sleepGoal.targetBedtime}</Text>
              <Text style={[styles.barrierLabel, { fontSize: FONT_TITLE(), marginTop: 8 }]}>该入睡了 🌙</Text>
              <Text style={[styles.barrierAwayText, { color: 'rgba(255,255,255,0.7)', marginTop: 8 }]}>1 分钟无操作将自动记录入睡</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 32 }}>
                <TouchableOpacity
                  style={[styles.ritualBtn, { paddingHorizontal: 32, paddingVertical: 14 }]}
                  onPress={() => { onDismissBedtimeModal(); onStartBarrierFromModal(); }}
                >
                  <Text style={styles.ritualBtnText}>开始仪轨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ritualBtn, { paddingHorizontal: 32, paddingVertical: 14, borderColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={onDismissBedtimeModal}
                >
                  <Text style={[styles.ritualBtnText, { color: 'rgba(255,255,255,0.5)' }]}>忽略</Text>
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
            <View style={{ backgroundColor: '#1a1a2e', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#8B5CF6', textAlign: 'center' }}>{clockDetail.nameZh}</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 }}>{clockDetail.organ}</Text>
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 12 }}>{clockDetail.advice}</Text>
              <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.2)', marginVertical: 16 }} />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{clockDetail.startHour}:00 - {(clockDetail.startHour + 1) % 24}:00</Text>
              <TouchableOpacity onPress={() => setClockDetail(null)} style={{ marginTop: 20, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.15)' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>关闭</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <DiaryModal visible={showDiary} onClose={() => onSetShowDiary(false)} />
    </View>
  );
}