/**
 * @module breathStyles
 *
 * Shared `StyleSheet` used across all BreathingEngine page components:
 *   - {@link BreathPreparePage} — pre-session preparation UI (prep*, info*, phase*, distress*, startBtn*, audioToggle*, toggle*)
 *   - {@link BreathActivePage}  — active session UI (active*, bubble*, phaseText, phaseCountdown, cycleText, timeText, pauseBtn, ring*, holdHint)
 *   - {@link BreathReportPage}  — post-session report UI (reportCard, reportName, reportRow, reportLabel, reportValue)
 *
 * Centralising styles here avoids duplication between the three pages that share
 * the same visual language (cards, distress scales, phase bars, toggle switches).
 *
 * Styles are grouped by section with inline comments for quick navigation.
 */

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION } from '@egoless-do/core';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Preparation page
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
  prepSubtitle: {
    fontSize: FONT_SUB,
    marginBottom: 16,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoBody: {
    fontSize: FONT_BODY,
    lineHeight: 22,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    flexWrap: 'wrap',
  },
  phaseItem: {
    alignItems: 'center',
    gap: 4,
  },
  phaseBar: {
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseBarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  phaseLabel: {
    fontSize: 11,
  },

  // Distress
  distressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  distressValue: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
    textAlign: 'center',
  },
  distressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distressBtn: {
    width: 32,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distressBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#fff',
    fontSize: FONT_BODY,
    fontWeight: '700',
  },

  // Active page
  activeHeader: {
    alignItems: 'center',
    padding: 16,
  },
  activeTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  activeSubtitle: {
    fontSize: FONT_SUB,
    marginTop: 2,
  },
  activeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  phaseCountdown: {
    fontSize: FONT_STAT_SECTION,
    fontWeight: '900',
    marginTop: 4,
  },
  cycleText: {
    fontSize: FONT_SUB,
    marginTop: 16,
  },
  timeText: {
    fontSize: FONT_SUB,
    marginTop: 4,
  },
  activeContainer: {
    flex: 1,
  },
  activeControls: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  pauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
  },
  ringBg: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ringFill: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#fff',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  holdHint: {
    fontSize: FONT_SUB,
  },

  // Report
  // unused — reportTitle is defined but never referenced by any component
  reportTitle: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  reportName: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  reportLabel: {
    fontSize: FONT_BODY,
  },
  reportValue: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  audioToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioToggleLabel: {
    fontSize: FONT_BODY,
    flex: 1,
  },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});
