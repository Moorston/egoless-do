import { COLORS, FONT_BADGE, FONT_BODY, FONT_EMPTY, FONT_SMALL, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_SUB, FONT_TITLE, FONT_TINY } from '@egoless-do/core';
import { StyleSheet } from 'react-native';

// Layout
export const styles = StyleSheet.create({
  // Layout
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  emptyCard: { alignItems: 'center', padding: 32 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderRowMb8: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  inlineRowGap4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  statsCol: { flex: 1, gap: 6 },
  expandedContent: { marginTop: 12, gap: 8 },
  relatedToggleRow: { flexDirection: 'row', alignItems: 'center' },
  relatedCountsRow: { flexDirection: 'row', gap: 16 },
  heatmapHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heatmapContent: { marginTop: 12 },

  // Tab
  tabContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },

  // Item row
  itemRow: { padding: 12, borderRadius: 10, borderWidth: 1 },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: undefined, borderWidth: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFillItem: { height: 4, borderRadius: 2 },
  heatmapToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  itemHeatmapContainer: { marginTop: 8 },
  textFrequency: { fontSize: FONT_BADGE(), marginTop: 4 },

  // Plan progress bar
  planProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  planProgressFill: { height: 6, borderRadius: 3 },

  // Slogan
  textSlogan: { fontSize: FONT_BODY(), fontStyle: 'italic', marginBottom: 12, lineHeight: 22 },

  // Goal
  textGoal: { fontSize: FONT_BODY(), lineHeight: 22 },

  // No items
  textNoItems: { fontSize: FONT_SUB(), textAlign: 'center', padding: 12 },

  // Related items
  relatedItemCard: { borderWidth: 1, borderRadius: 10, padding: 12 },
  textMoreLink: { fontSize: FONT_SUB(), textAlign: 'center', paddingVertical: 4 },

  // Relation map
  relationMapButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },

  // Today stats
  todayStatsCard: { alignItems: 'center', paddingVertical: 20 },
  todayStatsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  textBodyDimMb8: { fontSize: FONT_BODY(), marginBottom: 8 },
  textStatValue: { fontSize: FONT_STAT_SECTION(), fontWeight: '800' },
  textEmptyCentered: { fontSize: FONT_EMPTY(), textAlign: 'center', padding: 24 },

  // Todo items
  groupHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
  todoItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  checkboxTouchTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  autoCheckedBadge: { backgroundColor: `${COLORS.GREEN}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  autoCheckedBadgeText: { fontSize: FONT_TINY(), color: COLORS.GREEN, fontWeight: '600' },
  delayedBadge: { backgroundColor: `${COLORS.ORANGE}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  delayedBadgeText: { fontSize: FONT_TINY(), color: COLORS.ORANGE, fontWeight: '600' },
  todoContentCol: { flex: 1, minWidth: 0 },
  textFrequencyTiny: { fontSize: FONT_TINY(), marginTop: 1 },

  // Custom todos
  customTodoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
  customTodoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  customTodoContentCol: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteTodoTouchTarget: { padding: 4 },

  // Add todo
  addTodoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  addTodoInput: { flex: 1, height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: FONT_SUB() },
  recurringButton: { padding: 8, borderRadius: 8, borderWidth: 1 },
  addButton: { padding: 8, borderRadius: 8 },

  // Inactive card
  inactiveCard: { alignItems: 'center', paddingVertical: 20 },

  // History
  historySection: { marginTop: 24 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  textHistoryTitle: { fontWeight: '700', fontSize: FONT_TITLE() },
  historySummaryCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  historyStatItem: { flex: 1, alignItems: 'center' },
  textHistoryStatValue: { fontSize: FONT_STAT_CARD(), fontWeight: '800' },
  textHistoryStatLabel: { fontSize: FONT_SUB(), marginTop: 2 },
  textNoHistory: { fontSize: FONT_EMPTY(), textAlign: 'center', padding: 24 },
  timelineContainer: { position: 'relative', paddingLeft: 20 },
  timelineLine: { position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, borderRadius: 1 },
  timelineItem: { position: 'relative', marginBottom: 16 },
  timelineDot: { position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  historyItemCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  historyItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: undefined },
  historyItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textBodyDate: { fontSize: FONT_BODY(), fontWeight: '600' },
  textBodyDoneCount: { fontSize: FONT_BODY(), fontWeight: '700' },
  historyItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14 },
  historyCheckbox: { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  historyItemName: { fontSize: FONT_BODY(), flex: 1 },
  customTodoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  customTodoBadgeText: { fontSize: FONT_SMALL(), fontWeight: '500' },

  // Action buttons
  actionsContainer: { gap: 8, marginTop: 24 },
  actionButtonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionButtonOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  actionButtonFill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionButtonDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: `${COLORS.RED}15`, borderWidth: 1 },

  // Shared text styles
  textBodySemiBold: { fontSize: FONT_BODY(), fontWeight: '600', flex: 1 },
  textBodyBold: { fontSize: FONT_BODY(), fontWeight: '700' },
  textBodyMedium: { fontSize: FONT_BODY(), fontWeight: '500' },
  textDim: { fontSize: FONT_BODY() },
  textBodyDim: { fontSize: FONT_BODY() },
  textSubDim: { fontSize: FONT_SUB() },
  textSubDimMb6: { fontSize: FONT_SUB(), marginBottom: 6 },
  textSubDimMt4: { fontSize: FONT_SUB(), marginTop: 4 },
  textSubBold: { fontSize: FONT_SUB(), fontWeight: '600' },
  textSubSemiBold: { fontSize: FONT_SUB(), fontWeight: '600' },
  textBadgeDim: { fontSize: FONT_BADGE() },
  textBadgeDimMt2: { fontSize: FONT_BADGE(), marginTop: 2 },
  textBadgePrimary: { fontSize: FONT_BADGE() },
  textTabLabel: { fontSize: FONT_SUB() },
  textActionLabel: { fontSize: FONT_BODY(), fontWeight: '600' },
  textActionLabelWhite: { fontSize: FONT_BODY(), fontWeight: '600', color: '#fff' },
});
