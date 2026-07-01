import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, AppState, StyleSheet, Animated, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, dateStr } from '@egoless-do/core';
import { getCurrentPeriod, getNextSleepPeriod, formatSleepDuration, BODY_CLOCK } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Moon, Sun, Wind, Brain, ChevronRight, X, Check, Clock, Heart, Star, BellRing, BookOpen, BarChart3 } from 'lucide-react-native';
import DiaryModal from './DiaryModal';
import { useSleepNotifications } from './useSleepNotifications';

type Page = 'home' | 'barrier' | 'gratitude' | 'report';

export default function SleepScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const store = useAppStore();
  const { showBedtimeModal, dismissBedtimeModal, startRitualFromModal } = useSleepNotifications();

  const [page, setPage] = useState<Page>('home');
  const [quality, setQuality] = useState<number>(0);
  const [gratitude, setGratitude] = useState<string[]>(['']);
  const [noteText, setNoteText] = useState('');
  const [showDiary, setShowDiary] = useState(false);

  // Barrier state
  const [barrierDuration, setBarrierDuration] = useState(30);
  const [barrierElapsed, setBarrierElapsed] = useState(0);
  const [awayMs, setAwayMs] = useState(0);
  const [completedPractice, setCompletedPractice] = useState<string[]>([]);
  const awayStartRef = useRef<number | null>(null);
  const barrierTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Breathing glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  const currentPeriod = getCurrentPeriod();
  const nextSleep = getNextSleepPeriod();
  const todaySleep = store.getTodaySleep();

  // Breathing glow animation loop
  useEffect(() => {
    if (page !== 'barrier') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [page, glowAnim]);

  // AppState tracking for away time
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (page !== 'barrier') return;
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev === 'active' && nextState !== 'active') {
        awayStartRef.current = Date.now();
      } else if (prev !== 'active' && nextState === 'active') {
        if (awayStartRef.current) {
          setAwayMs(s => s + (Date.now() - awayStartRef.current!));
          awayStartRef.current = null;
        }
      }
    });
    return () => sub.remove();
  }, [page]);

  // Barrier timer
  useEffect(() => {
    if (page !== 'barrier') {
      if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
      return;
    }
    barrierTimerRef.current = setInterval(() => {
      setBarrierElapsed(s => s + 1);
    }, 1000);
    return () => { if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; } };
  }, [page]);

  // Check if barrier complete
  useEffect(() => {
    if (page === 'barrier' && barrierElapsed >= barrierDuration * 60) {
      if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
      store.completeBarrier({ barrierMin: barrierDuration, awayMin: Math.round(awayMs / 60000), practice: completedPractice });
      setQuality(0);
      setGratitude(['']);
      setNoteText('');
      setPage('gratitude');
    }
  }, [barrierElapsed, page, barrierDuration, awayMs, completedPractice]);

  const handleStartBarrier = useCallback((min: number) => {
    setBarrierDuration(min);
    setBarrierElapsed(0);
    setAwayMs(0);
    setCompletedPractice([]);
    setPage('barrier');
  }, []);

  const handleChoosePractice = useCallback((type: string) => {
    if (type === 'breathing') nav.navigate('Breathing' as never);
    else if (type === 'meditation') nav.navigate('Meditation' as never);
    // Track practice when user navigates away
    if (!completedPractice.includes(type)) {
      setCompletedPractice(prev => [...prev, type]);
    }
  }, [nav, completedPractice]);

  const handleSkipToGratitude = useCallback(() => {
    if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
    store.completeBarrier({ barrierMin: barrierElapsed, awayMin: Math.round(awayMs / 60000), practice: completedPractice });
    setQuality(0);
    setGratitude(['']);
    setNoteText('');
    setPage('gratitude');
  }, [barrierElapsed, awayMs, completedPractice]);

  const handleQuickGratitude = useCallback(() => {
    setQuality(0);
    setGratitude(['']);
    setNoteText('');
    setPage('gratitude');
  }, []);

  const handleSaveGratitude = useCallback(() => {
    const validGratitude = gratitude.filter(g => g.trim());
    // Save sleep diary
    store.saveSleepDiary({
      quality: quality as 1 | 2 | 3 | 4 | 5 || undefined,
      gratitude: validGratitude,
      note: noteText.trim() || undefined,
    });
    // Save gratitude as reflections with tags
    validGratitude.forEach(text => {
      store.addReflection({ content: text, tags: ['感恩', '睡前'], mood: '' });
    });
    // Trigger habit auto-sync
    store.autoSyncHabits?.();
    setPage('report');
  }, [gratitude, quality, noteText]);

  const handleFinish = useCallback(() => {
    setPage('home');
    setBarrierElapsed(0);
    setAwayMs(0);
  }, []);

  const remainingSec = Math.max(0, barrierDuration * 60 - barrierElapsed);
  const awayMin = Math.round(awayMs / 60000);

  // Compute streak
  const sleepStreak = useMemo(() => {
    const history = (store.sleepHistory ?? []).filter(s => !s.deleted).sort((a, b) => b.date.localeCompare(a.date));
    if (history.length === 0) return 0;
    let streak = 0;
    let checkDate = new Date();
    // If no record today, start from yesterday
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
  }, [store.sleepHistory]);

  // Recent records (last 3)
  const recentRecords = useMemo(() => {
    return (store.sleepHistory ?? [])
      .filter(s => !s.deleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [store.sleepHistory]);

  // ── Home Page ──
  if (page === 'home') {
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
                <Text style={[styles.goalValue, { color: TH.text }]}>{store.sleepGoal.targetBedtime}</Text>
              </View>
              <View style={styles.goalItem}>
                <Sun size={16} color="#F59E0B" />
                <Text style={[styles.goalLabel, { color: TH.sub }]}>{T('sleepGoalWake') || '目标起床'}</Text>
                <Text style={[styles.goalValue, { color: TH.text }]}>{store.sleepGoal.targetWake}</Text>
              </View>
              <View style={styles.goalItem}>
                <Clock size={16} color="#10B981" />
                <Text style={[styles.goalLabel, { color: TH.sub }]}>{T('sleepGoalHours') || '目标时长'}</Text>
                <Text style={[styles.goalValue, { color: TH.text }]}>{store.sleepGoal.targetHours}h</Text>
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
                <TouchableOpacity
                  key={min}
                  style={styles.ritualBtn}
                  onPress={() => handleStartBarrier(min)}
                >
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

        <DiaryModal visible={showDiary} onClose={() => setShowDiary(false)} />
      </SafeAreaView>
    );
  }

  // ── Barrier Page ──
  if (page === 'barrier') {
    const min = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;
    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
    const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
        <View style={styles.barrierCenter}>
          <Text style={styles.barrierPeriod}>{currentPeriod.nameZh} · {currentPeriod.organ}</Text>

          <Animated.View style={[styles.barrierCircle, {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
            borderColor: '#8B5CF6',
          }]}>
            <View style={[styles.barrierCircleInner, { borderColor: '#8B5CF6' }]}>
              <Text style={styles.barrierTime}>{min}:{String(sec).padStart(2, '0')}</Text>
              <Text style={styles.barrierLabel}>{T('sleepBarrierActive')}</Text>
            </View>
          </Animated.View>

          {/* Practice progress */}
          {completedPractice.length > 0 && (
            <View style={styles.practiceProgress}>
              <Text style={styles.practiceProgressTitle}>{T('sleepPracticeProgress') || '修行进度'}</Text>
              {completedPractice.map(p => (
                <Text key={p} style={styles.practiceProgressItem}>✓ {p}</Text>
              ))}
            </View>
          )}

          {/* Choose practice */}
          <Text style={styles.barrierStepTitle}>{T('sleepStep1')}</Text>
          <View style={styles.barrierChoiceRow}>
            {[
              { type: 'breathing', Icon: Wind, label: T('sleepChooseBreath') },
              { type: 'meditation', Icon: Brain, label: T('sleepChooseMeditate') },
              { type: 'mantra', Icon: BellRing, label: '持咒' },
              { type: 'reading', Icon: BookOpen, label: '阅读' },
            ].map(({ type, Icon, label }) => (
              <TouchableOpacity key={type} style={styles.barrierChoiceBtn} onPress={() => handleChoosePractice(type)}>
                <Icon size={24} color="#8B5CF6" />
                <Text style={styles.barrierChoiceLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.barrierSkipBtn} onPress={handleSkipToGratitude}>
            <Text style={styles.barrierSkipText}>{T('sleepStep2')} →</Text>
          </TouchableOpacity>

          {awayMin > 0 && (
            <Text style={styles.barrierAwayText}>{T('sleepBarrierAway')} {awayMin}{T('sleepMinutes')}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Gratitude Page ──
  if (page === 'gratitude') {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.prepHeader}>
          <Text style={[styles.prepTitle, { color: TH.text }]}>{T('sleepStep2')}</Text>
          <TouchableOpacity onPress={handleFinish}>
            <X size={22} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Quality Rating */}
          <Text style={[styles.qualityLabel, { color: TH.text }]}>今晚睡得怎么样？</Text>
          <View style={styles.qualityRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setQuality(i)}>
                <Star
                  size={36}
                  color={i <= quality ? '#F59E0B' : `${TH.sub}40`}
                  fill={i <= quality ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Dynamic Gratitude */}
          <Text style={[styles.gratitudeTitle, { color: TH.text }]}>{T('sleepGratitude')}</Text>
          {gratitude.map((g, i) => (
            <TextInput
              key={i}
              value={g}
              onChangeText={v => { const arr = [...gratitude]; arr[i] = v; setGratitude(arr); }}
              placeholder={`${T('sleepGratitudePlaceholder')}${i + 1}`}
              placeholderTextColor={TH.sub}
              style={[styles.gratitudeInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />
          ))}
          <TouchableOpacity onPress={() => setGratitude([...gratitude, ''])}>
            <Text style={[styles.addGratitudeBtn, { color: TH.primary }]}>+ 添加更多</Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={[styles.noteLabel, { color: TH.text }]}>今日感悟（可选）</Text>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="写下今天的感悟..."
            placeholderTextColor={TH.sub}
            multiline
            style={[styles.noteInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: quality > 0 ? TH.primary : `${TH.primary}50` }]}
            onPress={handleSaveGratitude}
            disabled={quality === 0}
          >
            <Check size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{T('commonDone')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Report Page ──
  if (page === 'report') {
    const completed = barrierElapsed >= barrierDuration * 60;
    const validGratitude = gratitude.filter(g => g.trim());
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.prepHeader}>
          <Text style={[styles.prepTitle, { color: TH.text }]}>{T('sleepReport')}</Text>
          <TouchableOpacity onPress={handleFinish}>
            <X size={22} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <View style={[styles.reportCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.reportTitle, { color: TH.primary }]}>
              {completed ? `🌙 ${T('sleepBarrierComplete')}` : `🌙 ${T('sleepRitual')}`}
            </Text>
            {barrierElapsed > 0 && (
              <View style={styles.reportRow}>
                <Clock size={16} color={TH.sub} />
                <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepDuration')}</Text>
                <Text style={[styles.reportValue, { color: TH.text }]}>{formatSleepDuration(Math.floor(barrierElapsed / 60))}</Text>
              </View>
            )}
            {awayMin > 0 && (
              <View style={styles.reportRow}>
                <Moon size={16} color={TH.sub} />
                <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepAwayTime')}</Text>
                <Text style={[styles.reportValue, { color: awayMin > 5 ? '#EF4444' : '#10B981' }]}>
                  {awayMin}{T('sleepMinutes')}
                </Text>
              </View>
            )}
            {quality > 0 && (
              <View style={styles.reportRow}>
                <Star size={16} color="#F59E0B" />
                <Text style={[styles.reportLabel, { color: TH.sub }]}>睡眠质量</Text>
                <Text style={[styles.reportValue, { color: '#F59E0B' }]}>{'★'.repeat(quality)}</Text>
              </View>
            )}
            {validGratitude.length > 0 && (
              <View style={styles.reportRow}>
                <Heart size={16} color={TH.sub} />
                <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepGratitude')}</Text>
                <Text style={[styles.reportValue, { color: TH.text }]}>
                  {validGratitude.length}{T('sleepCompleted')}
                </Text>
              </View>
            )}
            {completedPractice.length > 0 && (
              <View style={styles.reportRow}>
                <Wind size={16} color="#8B5CF6" />
                <Text style={[styles.reportLabel, { color: TH.sub }]}>修行记录</Text>
                <Text style={[styles.reportValue, { color: '#8B5CF6' }]}>{completedPractice.join(', ')}</Text>
              </View>
            )}
            {sleepStreak > 0 && (
              <View style={styles.reportRow}>
                <Text style={{ fontSize: 16 }}>🔥</Text>
                <Text style={[styles.reportLabel, { color: TH.sub }]}>连续天数</Text>
                <Text style={[styles.reportValue, { color: '#EF4444' }]}>{sleepStreak} 天</Text>
              </View>
            )}
          </View>

          <View style={styles.reportBtnRow}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: TH.primary, flex: 1 }]}
              onPress={handleFinish}
            >
              <Text style={styles.saveBtnText}>回到首页</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: `${TH.primary}15`, flex: 1, borderWidth: 1, borderColor: `${TH.primary}30` }]}
              onPress={() => { handleFinish(); nav.navigate('SleepHistory' as never); }}
            >
              <Text style={[styles.saveBtnText, { color: TH.primary }]}>查看历史</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Bedtime Reminder Modal ──
  if (showBedtimeModal) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
        <View style={styles.barrierCenter}>
          <Moon size={60} color="#8B5CF6" />
          <Text style={[styles.barrierTime, { marginTop: 24 }]}>现在是 {store.sleepGoal.targetBedtime}</Text>
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
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Home page
  clockCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  clockTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
    marginBottom: 12,
  },
  clockCurrent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  clockPeriod: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
  },
  clockOrgan: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  clockAdvice: {
    fontSize: FONT_BODY,
    marginBottom: 12,
  },
  clockTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clockDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockDotLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  clockNext: {
    fontSize: FONT_BODY,
    marginTop: 12,
    textAlign: 'center',
  },

  // Goal card
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
    marginBottom: 12,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalItem: {
    alignItems: 'center',
    gap: 4,
  },
  goalLabel: {
    fontSize: 11,
  },
  goalValue: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
  },

  // Diary card
  diaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
    marginBottom: 12,
  },
  diarySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  diaryTag: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  diaryLink: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginTop: 4,
  },
  diaryHint: {
    fontSize: FONT_BODY,
    marginBottom: 12,
  },
  diaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  diaryBtnText: {
    fontSize: FONT_BODY,
    fontWeight: '700',
  },

  // Ritual card
  ritualCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ritualTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    color: '#fff',
  },
  ritualSub: {
    fontSize: FONT_SUB,
    color: 'rgba(255,255,255,0.6)',
  },
  ritualBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  ritualBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  ritualBtnText: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    color: '#fff',
  },
  quickGratitudeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
  },
  quickGratitudeText: {
    fontSize: FONT_BODY,
    color: 'rgba(255,255,255,0.6)',
  },

  // Recent records
  recentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  recentDate: {
    fontSize: FONT_BODY,
    width: 50,
  },
  recentTag: {
    fontSize: 14,
  },
  recentValue: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  recentStars: {
    fontSize: 12,
  },
  recentGratitude: {
    fontSize: 12,
  },
  recentPractice: {
    fontSize: 12,
  },

  // History button
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  historyBtnText: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  streakText: {
    fontSize: FONT_BODY,
    textAlign: 'center',
    marginTop: 4,
  },

  // Barrier page
  barrierCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  barrierPeriod: {
    fontSize: FONT_SUB,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  barrierCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  barrierCircleInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a1a',
  },
  barrierTime: {
    fontSize: FONT_STAT_SECTION,
    fontWeight: '900',
    color: '#fff',
  },
  barrierLabel: {
    fontSize: FONT_SUB,
    color: 'rgba(255,255,255,0.6)',
  },
  practiceProgress: {
    alignItems: 'center',
    marginBottom: 16,
  },
  practiceProgressTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  practiceProgressItem: {
    fontSize: FONT_BODY,
    color: '#10B981',
  },
  barrierStepTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  barrierChoiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  barrierChoiceBtn: {
    width: 100,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    alignItems: 'center',
    gap: 6,
  },
  barrierChoiceLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    color: '#fff',
  },
  barrierSkipBtn: {
    padding: 12,
  },
  barrierSkipText: {
    fontSize: FONT_BODY,
    color: 'rgba(255,255,255,0.5)',
  },
  barrierAwayText: {
    fontSize: FONT_SUB,
    color: '#EF4444',
    marginTop: 16,
  },

  // Gratitude
  prepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  prepTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  qualityLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  gratitudeTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
  },
  gratitudeInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: FONT_BODY,
    marginBottom: 10,
  },
  addGratitudeBtn: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: FONT_BODY,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FONT_BODY,
    fontWeight: '700',
  },

  // Report
  reportCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  reportLabel: {
    fontSize: FONT_BODY,
    flex: 1,
  },
  reportValue: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  reportBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
