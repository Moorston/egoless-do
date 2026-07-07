// ─── Sleep styles — shared StyleSheet for SleepEngine pages ──────
//
// This module exports a single `styles` StyleSheet used across all Sleep
// feature pages: the home clock, goal card, diary card, ritual card,
// recent-records list, history button, barrier countdown circle, practice
// progress, gratitude form inputs, and the session report card.
//
// Organizing styles here avoids duplication between SleepBarrierPage,
// SleepGratitudePage, SleepReportPage, and the main SleepScreen.
// Font sizes reference shared constants (FONT_TITLE, FONT_BODY, etc.)
// from @egoless-do/core so typography stays consistent with the rest
// of the app.

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION } from '@egoless-do/core';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
