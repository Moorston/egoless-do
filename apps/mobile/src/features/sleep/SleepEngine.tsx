// ─── SleepEngine — Sleep ritual page state machine ───────────────
// Routes between home/barrier/gratitude/report pages using hooks.

import { dateStr, getCurrentPeriod } from '@egoless-do/core';
import React, { useState, useCallback, useMemo } from 'react';

import { useShallowStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';

import HomePage from './HomePage';
import { useBarrierTimer } from './hooks/useBarrierTimer';
import SleepBarrierPage from './pages/SleepBarrierPage';
import SleepGratitudePage from './pages/SleepGratitudePage';
import SleepReportPage from './pages/SleepReportPage';
import { useSleepNotifications } from './useSleepNotifications';

type Page = 'home' | 'barrier' | 'gratitude' | 'report';

export default function SleepEngine() {
  const nav = useRootNavigation();
  const { getTodaySleep, completeBarrier, sleepGoal, sleepHistory, saveSleepDiary, addReflection, autoSyncHabits, setSleepGoal } = useShallowStore(s => ({ getTodaySleep: s.getTodaySleep, completeBarrier: s.completeBarrier, sleepGoal: s.sleepGoal, sleepHistory: s.sleepHistory, saveSleepDiary: s.saveSleepDiary, addReflection: s.addReflection, autoSyncHabits: s.autoSyncHabits, setSleepGoal: s.setSleepGoal }));
  const { showBedtimeModal, dismissBedtimeModal } = useSleepNotifications();

  const [page, setPage] = useState<Page>('home');
  const [quality, setQuality] = useState<number>(0);
  const [gratitude, setGratitude] = useState<string[]>(['']);
  const [noteText, setNoteText] = useState('');
  const [showDiary, setShowDiary] = useState(false);

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

  // ── Page routing ──────────────────────────────────────────────

  if (page === 'barrier') {
    return (
      <SleepBarrierPage
        currentPeriod={getCurrentPeriod()}
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

  // ── Home Page ───────────────────────────────────────────────────
  return (
    <HomePage
      todaySleep={todaySleep}
      sleepGoal={sleepGoal}
      sleepHistory={sleepHistory}
      sleepStreak={sleepStreak}
      showBedtimeModal={showBedtimeModal}
      showDiary={showDiary}
      onStartBarrier={handleStartBarrier}
      onQuickGratitude={handleQuickGratitude}
      onSetShowDiary={setShowDiary}
      onDismissBedtimeModal={dismissBedtimeModal}
      onStartBarrierFromModal={() => handleStartBarrier(30)}
      onSaveQuickDiary={(quality, workState) => saveSleepDiary({ quality: quality as 1 | 2 | 3 | 4 | 5, workState })}
      onSetSleepGoal={setSleepGoal}
    />
  );
}

