import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, AppState, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, dateStr, createLogger } from '@egoless-do/core';
import { getCurrentPeriod, getNextSleepPeriod, formatSleepDuration, BODY_CLOCK } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Moon, Sun, Wind, Brain, ChevronRight, X, Check, Clock, Heart } from 'lucide-react-native';

const log = createLogger('Sleep');

type Page = 'home' | 'barrier' | 'gratitude' | 'report';

const BARRIER_DURATION_MIN = 30;

export default function SleepScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const store = useAppStore();

  const [page, setPage] = useState<Page>('home');
  const [gratitude, setGratitude] = useState(['', '', '']);

  // Barrier state
  const [barrierStartAt, setBarrierStartAt] = useState(0);
  const [barrierElapsed, setBarrierElapsed] = useState(0);
  const [awayMs, setAwayMs] = useState(0);
  const awayStartRef = useRef<number | null>(null);
  const barrierTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const currentPeriod = getCurrentPeriod();
  const nextSleep = getNextSleepPeriod();

  // AppState tracking for away time
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (page !== 'barrier') return;
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && nextState !== 'active') {
        // User left the app
        awayStartRef.current = Date.now();
      } else if (prev !== 'active' && nextState === 'active') {
        // User came back
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
    if (page === 'barrier' && barrierElapsed >= BARRIER_DURATION_MIN * 60) {
      if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
      setPage('gratitude');
    }
  }, [barrierElapsed, page]);

  const handleStartBarrier = useCallback(() => {
    setBarrierStartAt(Date.now());
    setBarrierElapsed(0);
    setAwayMs(0);
    setGratitude(['', '', '']);
    setPage('barrier');
  }, []);

  const handleChoosePractice = useCallback((type: 'breathing' | 'meditation') => {
    if (type === 'breathing') nav.navigate('Breathing' as never);
    else nav.navigate('Meditation' as never);
  }, [nav]);

  const handleSkipToGratitude = useCallback(() => {
    if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
    setPage('gratitude');
  }, []);

  const handleSaveGratitude = useCallback(() => {
    const validGratitude = gratitude.filter(g => g.trim());
    // Save to sleep record (via store or AsyncStorage for now)
    const record = {
      date: dateStr(),
      barrierStartedAt: barrierStartAt,
      barrierDurationMin: BARRIER_DURATION_MIN,
      barrierAwayMin: Math.round(awayMs / 60000),
      barrierCompleted: barrierElapsed >= BARRIER_DURATION_MIN * 60,
      gratitude: validGratitude,
    };
    // Save gratitude as reflections with tags
    validGratitude.forEach(text => {
      store.addReflection({ content: text, tags: ['感恩', '睡前'], mood: '' });
    });
    // TODO: save sleep record to sleep_records entity
    log.info('Sleep ritual saved', record);
    setPage('report');
  }, [gratitude, barrierStartAt, barrierElapsed, awayMs]);

  const handleFinish = useCallback(() => {
    setPage('home');
    setBarrierElapsed(0);
    setAwayMs(0);
  }, []);

  const remainingSec = Math.max(0, BARRIER_DURATION_MIN * 60 - barrierElapsed);
  const barrierProgress = barrierElapsed / (BARRIER_DURATION_MIN * 60);
  const awayMin = Math.round(awayMs / 60000);

  // ── Home Page ──
  if (page === 'home') {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
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
              {BODY_CLOCK.map((p, i) => {
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
          </View>

          {/* Start Barrier */}
          <TouchableOpacity
            style={[styles.barrierBtn, { backgroundColor: '#1a1040' }]}
            onPress={handleStartBarrier}
          >
            <Moon size={28} color="#8B5CF6" />
            <Text style={styles.barrierBtnTitle}>{T('sleepBarrier')}</Text>
            <Text style={styles.barrierBtnSub}>{BARRIER_DURATION_MIN}{T('sleepMinutes')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Barrier Page ──
  if (page === 'barrier') {
    const min = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;

    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
        <View style={styles.barrierCenter}>
          <Text style={styles.barrierPeriod}>{currentPeriod.nameZh} · {currentPeriod.organ}</Text>

          <View style={styles.barrierCircle}>
            <Text style={styles.barrierTime}>{min}:{String(sec).padStart(2, '0')}</Text>
            <Text style={styles.barrierLabel}>{T('sleepBarrierActive')}</Text>
          </View>

          {/* Choose practice */}
          <Text style={styles.barrierStepTitle}>{T('sleepStep1')}</Text>
          <View style={styles.barrierChoiceRow}>
            <TouchableOpacity style={styles.barrierChoiceBtn} onPress={() => handleChoosePractice('breathing')}>
              <Wind size={24} color="#8B5CF6" />
              <Text style={styles.barrierChoiceLabel}>{T('sleepChooseBreath')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.barrierChoiceBtn} onPress={() => handleChoosePractice('meditation')}>
              <Brain size={24} color="#8B5CF6" />
              <Text style={styles.barrierChoiceLabel}>{T('sleepChooseMeditate')}</Text>
            </TouchableOpacity>
          </View>

          {/* Skip to gratitude */}
          <TouchableOpacity style={styles.barrierSkipBtn} onPress={handleSkipToGratitude}>
            <Text style={styles.barrierSkipText}>{T('sleepStep2')} →</Text>
          </TouchableOpacity>

          {/* Away time indicator */}
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
          <Text style={[styles.gratitudeTitle, { color: TH.text }]}>{T('sleepGratitude')}</Text>
          {[0, 1, 2].map(i => (
            <TextInput
              key={i}
              value={gratitude[i]}
              onChangeText={v => { const g = [...gratitude]; g[i] = v; setGratitude(g); }}
              placeholder={`${T('sleepGratitudePlaceholder')}${i + 1}`}
              placeholderTextColor={TH.sub}
              style={[styles.gratitudeInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TH.primary }]}
            onPress={handleSaveGratitude}
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
    const completed = barrierElapsed >= BARRIER_DURATION_MIN * 60;
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
            <View style={styles.reportRow}>
              <Clock size={16} color={TH.sub} />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepDuration')}</Text>
              <Text style={[styles.reportValue, { color: TH.text }]}>{formatSleepDuration(Math.floor(barrierElapsed / 60))}</Text>
            </View>
            <View style={styles.reportRow}>
              <Moon size={16} color={TH.sub} />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepAwayTime')}</Text>
              <Text style={[styles.reportValue, { color: awayMin > 5 ? '#EF4444' : '#10B981' }]}>
                {awayMin}{T('sleepMinutes')}
              </Text>
            </View>
            <View style={styles.reportRow}>
              <Heart size={16} color={TH.sub} />
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('sleepGratitude')}</Text>
              <Text style={[styles.reportValue, { color: TH.text }]}>
                {gratitude.filter(g => g.trim()).length}{T('sleepCompleted')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: TH.primary, marginTop: 24 }]}
            onPress={handleFinish}
          >
            <Text style={styles.saveBtnText}>{T('commonDone')}</Text>
          </TouchableOpacity>
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
  barrierBtn: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  barrierBtnTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    color: '#fff',
  },
  barrierBtnSub: {
    fontSize: FONT_SUB,
    color: 'rgba(255,255,255,0.6)',
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
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  barrierStepTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  barrierChoiceRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  barrierChoiceBtn: {
    width: 120,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    alignItems: 'center',
    gap: 8,
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
  gratitudeTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 16,
  },
  gratitudeInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: FONT_BODY,
    marginBottom: 10,
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
});
