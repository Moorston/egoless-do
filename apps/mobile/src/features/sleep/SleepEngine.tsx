// ─── SleepEngine — Sleep ritual page state machine ───────────────
// Routes between home/barrier/gratitude/report pages using hooks.

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../components/UI';
import { dateStr } from '@egoless-do/core';
import { getCurrentPeriod, getNextSleepPeriod, formatSleepDuration, BODY_CLOCK } from '@egoless-do/core';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Moon, Sun, Clock, Heart, ChevronRight, BarChart3 } from 'lucide-react-native';
import DiaryModal from './DiaryModal';
import { useSleepNotifications } from './useSleepNotifications';
import { useBarrierTimer } from './hooks/useBarrierTimer';
import { styles } from './sleepStyles';
import SleepBarrierPage from './pages/SleepBarrierPage';
import SleepGratitudePage from './pages/SleepGratitudePage';
import SleepReportPage from './pages/SleepReportPage';

type Page = 'home' | 'barrier' | 'gratitude' | 'report';

export default function SleepEngine() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { getTodaySleep, completeBarrier, sleepGoal, sleepHistory, saveSleepDiary, addReflection, autoSyncHabits } = useShallowStore(s => ({ getTodaySleep: s.getTodaySleep, completeBarrier: s.completeBarrier, sleepGoal: s.sleepGoal, sleepHistory: s.sleepHistory, saveSleepDiary: s.saveSleepDiary, addReflection: s.addReflection, autoSyncHabits: s.autoSyncHabits }));
  const { showBedtimeModal, dismissBedtimeModal } = useSleepNotifications();

  const [page, setPage] = useState<Page>('home');
  const [quality, setQuality] = useState<number>(0);
  const [gratitude, setGratitude] = useState<string[]>(['']);
  const [noteText, setNoteText] = useState('');
  const [showDiary, setShowDiary] = useState(false);

  const currentPeriod = getCurrentPeriod();
  const nextSleep = getNextSleepPeriod();
  const todaySleep = getTodaySleep();

  // Barrier timer hook — manages barrier countdown, away time, practice tracking
  const barrier = useBarrierTimer({
    page,
    onComplete: (data) => {
      completeBarrier(data);
      setQuality(0);
      setGratitude(['']);
      setNoteText('');
      setPage('gratitude');
    },
  });

  const handleStartBarrier = useCallback((min: number) => {
    barrier.startBarrier(min);
    setPage('barrier');
  }, [barrier]);

  const handleChoosePractice = useCallback((type: string) => {
    if (type === 'breathing') nav.navigate('Breathing' as never);
    else if (type === 'meditation') nav.navigate('Meditation' as never);
    else if (type === 'mantra') nav.navigate('Mantra' as never);
    barrier.addPractice(type);
  }, [nav, barrier]);

  const handleSkipToGratitude = useCallback(() => {
    barrier.skipToGratitude();
  }, [barrier]);

  const handleQuickGratitude = useCallback(() => {
    setQuality(0);
    setGratitude(['']);
    setNoteText('');
    setPage('gratitude');
  }, []);

  const handleSaveGratitude = useCallback(() => {
    const validGratitude = gratitude.filter(g => g.trim());
    saveSleepDiary({
      quality: quality as 1 | 2 | 3 | 4 | 5 || undefined,
      gratitude: validGratitude,
      note: noteText.trim() || undefined,
    });
    validGratitude.forEach(text => {
      addReflection({ content: text, tags: ['感恩', '睡前'], mood: '' });
    });
    autoSyncHabits?.();
    setPage('report');
  }, [gratitude, quality, noteText]);

  const handleFinish = useCallback(() => {
    setPage('home');
    barrier.resetBarrier();
  }, [barrier]);

  // Compute streak
  const sleepStreak = useMemo(() => {
    const history = (sleepHistory ?? []).filter(s => !s.deleted).sort((a, b) => b.date.localeCompare(a.date));
    if (history.length === 0) return 0;
    let streak = 0;
    const checkDate = new Date();
    if (history[0].date !== dateStr()) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (history.some(h => h.date === ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [sleepHistory]);

  const recentRecords = useMemo(() => {
    return (sleepHistory ?? [])
      .filter(s => !s.deleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [sleepHistory]);

  // ── Page routing ──────────────────────────────────────────────

  if (page === 'barrier') {
    return (
      <SleepBarrierPage
        currentPeriod={currentPeriod}
        remainingSec={barrier.remainingSec}
        barrierDuration={barrier.barrierDuration}
        glowAnim={barrier.glowAnim}
        completedPractice={barrier.completedPractice}
        awayMin={barrier.awayMin}
        onChoosePractice={handleChoosePractice}
        onSkipToGratitude={handleSkipToGratitude}
      />
    );
  }

  if (page === 'gratitude') {
    return (
      <SleepGratitudePage
        quality={quality}
        setQuality={setQuality}
        gratitude={gratitude}
        setGratitude={setGratitude}
        noteText={noteText}
        setNoteText={setNoteText}
        onFinish={handleFinish}
        onSave={handleSaveGratitude}
      />
    );
  }

  if (page === 'report') {
    return (
      <SleepReportPage
        barrierDuration={barrier.barrierDuration}
        barrierElapsed={barrier.barrierElapsed}
        awayMin={barrier.awayMin}
        quality={quality}
        gratitude={gratitude}
        completedPractice={barrier.completedPractice}
        sleepStreak={sleepStreak}
        onFinish={handleFinish}
        onViewHistory={() => { handleFinish(); nav.navigate('SleepHistory' as never); }}
      />
    );
  }

  // ── Home Page (stays in main file) ─────────────────────────────
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Sleep" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Body Clock */}
        <View style={[styles.clockCard, { borderColor: `${TH.primary}30` }]}>
          <Text style={[styles.clockTitle, { color: TH.primary }]}>{T('sleepBodyClock')}</Text>
          <View style={styles.clockCurrent}>
            <Text style={[styles.clockPeriod, { color: TH.text }]}>{currentPeriod.nameZh}</Text>
            <Text style={[styles.clockOrgan, { color: TH.primary }]}>{currentPeriod.organ}</Text>
          </View>
          <Text style={[styles.clockAdvice, { color: TH.text }]}>{currentPeriod.advice}</Text>
          <View style={styles.clockTimeline}>
            {BODY_CLOCK.map((p) => {
              const isCurrent = p.key === currentPeriod.key;
              const isSleep = p.key === 'zi' || p.key === 'hai';
              return (
                <View key={p.key} style={[styles.clockDot, {
                  backgroundColor: isCurrent ? TH.primary : isSleep ? '#8B5CF6' : `${TH.sub}40`,
                }]}>
                  <Text style={[styles.clockDotLabel, { color: isCurrent ? '#fff' : TH.sub }]}>
                    {p.nameZh.charAt(0)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.clockNext, { color: TH.sub }]}>
            ⏰ 距{nextSleep.period.nameZh}还有 {Math.floor(nextSleep.minutesUntil / 60)}小时{nextSleep.minutesUntil % 60}分
          </Text>
        </View>

        {/* Sleep Goal Card */}
        <View style={[styles.goalCard, { borderColor: `${TH.primary}30` }]}>
          <Text style={[styles.goalTitle, { color: TH.text }]}>{T('sleepGoal') || '睡眠目标'}</Text>
          <View style={styles.goalRow}>
            <View style={styles.goalItem}>
              <Moon size={16} color="#8B5CF6" />
              <Text style={[styles.goalLabel, { color: TH.sub }]}>{T('sleepGoalBedtime') || '目标入睡'}</Text>
              <Text style={[styles.goalValue, { color: TH.text }]}>{sleepGoal.targetBedtime}</Text>
            </View>
            <View style={styles.goalItem}>
              <Sun size={16} color="#F59E0B" />
              <Text style={[styles.goalLabel, { color: TH.sub }]}>{T('sleepGoalWake') || '目标起床'}</Text>
              <Text style={[styles.goalValue, { color: TH.text }]}>{sleepGoal.targetWake}</Text>
            </View>
            <View style={styles.goalItem}>
              <Clock size={16} color="#10B981" />
              <Text style={[styles.goalLabel, { color: TH.sub }]}>{T('sleepGoalHours') || '目标时长'}</Text>
              <Text style={[styles.goalValue, { color: TH.text }]}>{sleepGoal.targetHours}h</Text>
            </View>
          </View>
        </View>

        {/* Today's Diary */}
        <View style={[styles.diaryCard, { borderColor: `${TH.primary}30` }]}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('sleepDiary') || '今日日记'}</Text>
          {todaySleep ? (
            <View>
              <View style={styles.diarySummary}>
                {todaySleep.barrierDone && <Text style={[styles.diaryTag, { backgroundColor: '#10B98120', color: '#10B981' }]}>✅ 仪轨</Text>}
                {todaySleep.quality && <Text style={[styles.diaryTag, { backgroundColor: '#F59E0B20', color: '#F59E0B' }]}>{'★'.repeat(todaySleep.quality)}</Text>}
                {todaySleep.durationMin && <Text style={[styles.diaryTag, { backgroundColor: '#8B5CF620', color: '#8B5CF6' }]}>{formatSleepDuration(todaySleep.durationMin)}</Text>}
                {todaySleep.gratitude && <Text style={[styles.diaryTag, { backgroundColor: '#EF444420', color: '#EF4444' }]}>感恩×{todaySleep.gratitude.length}</Text>}
              </View>
              <TouchableOpacity onPress={() => setShowDiary(true)}>
                <Text style={[styles.diaryLink, { color: TH.primary }]}>查看详情 →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.diaryHint, { color: TH.sub }]}>记录昨晚的睡眠状态和今天的工作/身心状态</Text>
              <TouchableOpacity
                style={[styles.diaryBtn, { backgroundColor: `${TH.primary}15`, borderColor: `${TH.primary}30` }]}
                onPress={() => setShowDiary(true)}
              >
                <Text style={[styles.diaryBtnText, { color: TH.primary }]}>📝 {T('sleepDiaryTitle') || '填写今日日记'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ritual Entry */}
        <View style={[styles.ritualCard, { backgroundColor: '#1a1040' }]}>
          <Moon size={28} color="#8B5CF6" />
          <Text style={styles.ritualTitle}>{T('sleepBarrier')}</Text>
          <Text style={styles.ritualSub}>{T('sleepBarrierSelect') || '选择仪轨时长'}</Text>
          <View style={styles.ritualBtnRow}>
            {[15, 20, 30].map(min => (
              <TouchableOpacity key={min} style={styles.ritualBtn} onPress={() => handleStartBarrier(min)}>
                <Text style={styles.ritualBtnText}>{min}{T('sleepMinutes')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.quickGratitudeBtn} onPress={handleQuickGratitude}>
            <Heart size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.quickGratitudeText}>{T('sleepQuickGratitude') || '快速感恩'}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Records */}
        {recentRecords.length > 0 && (
          <View style={[styles.recentCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('sleepRecentRecords') || '最近记录'}</Text>
            {recentRecords.map((r, i) => (
              <View key={r.id} style={[styles.recentRow, i < recentRecords.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${TH.border}30` }]}>
                <Text style={[styles.recentDate, { color: TH.sub }]}>{r.date.slice(5)}</Text>
                {r.barrierDone && <Text style={[styles.recentTag, { color: '#10B981' }]}>✅</Text>}
                {r.durationMin && <Text style={[styles.recentValue, { color: TH.text }]}>{formatSleepDuration(r.durationMin)}</Text>}
                {r.quality && <Text style={[styles.recentStars, { color: '#F59E0B' }]}>{'★'.repeat(r.quality)}</Text>}
                {r.gratitude && r.gratitude.length > 0 && <Text style={[styles.recentGratitude, { color: TH.sub }]}>感恩×{r.gratitude.length}</Text>}
                {r.practice && r.practice.length > 0 && <Text style={[styles.recentPractice, { color: '#8B5CF6' }]}>{r.practice.join('✓ ')}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* History Button */}
        <TouchableOpacity
          style={[styles.historyBtn, { borderColor: `${TH.primary}30` }]}
          onPress={() => nav.navigate('SleepHistory' as never)}
        >
          <BarChart3 size={18} color={TH.primary} />
          <Text style={[styles.historyBtnText, { color: TH.primary }]}>{T('sleepViewHistory') || '查看睡眠历史'}</Text>
          <ChevronRight size={18} color={TH.primary} />
        </TouchableOpacity>

        {/* Streak */}
        {sleepStreak > 0 && (
          <Text style={[styles.streakText, { color: TH.sub }]}>
            🔥 连续记录 {sleepStreak} 天
          </Text>
        )}
      </ScrollView>

      {/* Bedtime Reminder Modal */}
      {showBedtimeModal && (
        <Modal visible transparent animationType="fade">
          <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
            <View style={styles.barrierCenter}>
              <Moon size={60} color="#8B5CF6" />
              <Text style={[styles.barrierTime, { marginTop: 24 }]}>现在是 {sleepGoal.targetBedtime}</Text>
              <Text style={[styles.barrierLabel, { fontSize: 18, marginTop: 8 }]}>该入睡了 🌙</Text>
              <Text style={[styles.barrierAwayText, { color: 'rgba(255,255,255,0.4)', marginTop: 8 }]}>
                1 分钟无操作将自动记录入睡
              </Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 32 }}>
                <TouchableOpacity
                  style={[styles.ritualBtn, { paddingHorizontal: 32, paddingVertical: 14 }]}
                  onPress={() => { dismissBedtimeModal(); handleStartBarrier(30); }}
                >
                  <Text style={styles.ritualBtnText}>开始仪轨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ritualBtn, { paddingHorizontal: 32, paddingVertical: 14, borderColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={dismissBedtimeModal}
                >
                  <Text style={[styles.ritualBtnText, { color: 'rgba(255,255,255,0.5)' }]}>忽略</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      <DiaryModal visible={showDiary} onClose={() => setShowDiary(false)} />
    </SafeAreaView>
  );
}
