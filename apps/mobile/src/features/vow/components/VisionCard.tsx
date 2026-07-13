import type {Vision, VisionTimeFrame, Plan, PlanItem, PlanItemStatus, Theme} from '@egoless-do/core';
import { VISION_TIME_FRAMES, SHORT_TIME_FRAMES, LONG_TIME_FRAMES, FONT_BODY, FONT_SUB, FONT_BADGE, dateStr , FONT_SMALL, scaleFontSize } from '@egoless-do/core';
import { Flag, Target, Star, ChevronRight, ChevronDown, Calendar, CheckCircle, RefreshCw, Pause, Clock, Circle, X, List } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { ProgressBar } from '../../../components/UI';

const TF_MONTHS: Record<VisionTimeFrame, number> = {
  '3months': 3, '6months': 6, '1year': 12,
  '2years': 24, '3years': 36, '5years': 60, '10years': 120,
};

function computeEndDate(start: string, tf: VisionTimeFrame): string {
  const d = new Date(start);
  d.setMonth(d.getMonth() + TF_MONTHS[tf]);
  return dateStr(d);
}

interface Props {
  vision: Vision;
  TH: Theme;
  T: (key: string) => string;
  pct: number;
  planDone?: number;
  planTotal?: number;
  taskDone?: number;
  taskTotal?: number;
  onEdit: (v: Vision) => void;
  onAchieve: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete?: (id: string) => void;
  onTimeFrameChange?: (visionId: string, tf: VisionTimeFrame) => void;
  linkedPlans?: Plan[];
  planItems?: PlanItem[];
  onNavigateToPlan?: (planId: string) => void;
}

const TYPE_ICON: Record<string, any> = { lifetime: Star, long: Flag, short: Target };

const STATUS_ICON: Record<PlanItemStatus, { icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  completed: { icon: CheckCircle, color: '#10B981' },
  in_progress: { icon: RefreshCw, color: '#3B82F6' },
  paused: { icon: Pause, color: '#F59E0B' },
  delayed: { icon: Clock, color: '#EF4444' },
  not_started: { icon: Circle, color: '#9CA3AF' },
  cancelled: { icon: X, color: '#9CA3AF' },
};

const STATUS_I18N: Record<PlanItemStatus, string> = {
  completed: 'planStatusCompleted',
  in_progress: 'planStatusInProgress',
  paused: 'planStatusPaused',
  delayed: 'planStatusDelayed',
  not_started: 'planStatusNotStarted',
  cancelled: 'planStatusCancelled',
};

function VisionCard({ vision, TH, T, pct, planDone = 0, planTotal = 0, taskDone = 0, taskTotal = 0, onEdit, onAchieve, onArchive, onDelete, onTimeFrameChange, linkedPlans = [], planItems = [], onNavigateToPlan }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showTfPicker, setShowTfPicker] = useState(false);
  const Icon = TYPE_ICON[vision.type] ?? Flag;
  const typeColor = vision.type === 'lifetime' ? '#F59E0B' : vision.type === 'long' ? '#8B5CF6' : '#10B981';

  const timeFrameLabel = useMemo(() => {
    if (!vision.timeFrame) return null;
    const tf = VISION_TIME_FRAMES.find(f => f.key === vision.timeFrame);
    return tf ? T(tf.labelKey) : vision.timeFrame;
  }, [vision.timeFrame, T]);

  const availableTimeFrames = useMemo(() => {
    if (vision.type === 'short') return SHORT_TIME_FRAMES;
    if (vision.type === 'long') return LONG_TIME_FRAMES;
    return [];
  }, [vision.type]);

  const deadlineText = vision.deadline ?? null;

  const dateRange = useMemo(() => {
    if (vision.type === 'lifetime') return null;
    const start = vision.startDate;
    if (!start) return null;
    const end = deadlineText ?? (vision.timeFrame ? computeEndDate(start, vision.timeFrame) : null);
    return end ? `${start} ~ ${end}` : start;
  }, [vision.startDate, vision.timeFrame, vision.type, deadlineText]);

  return (
    <View style={[styles.card, { borderLeftColor: typeColor, backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.leftColumn}>
          <View style={styles.typeBadgeRow}>
            <Icon size={14} color={typeColor} />
            <Text style={{ fontSize: FONT_BADGE(), color: typeColor, fontWeight: '600' }}>
              {T(vision.type === 'lifetime' ? 'vowLifetime' : vision.type === 'long' ? 'vowLong' : 'vowShort')}
            </Text>
            {vision.type !== 'lifetime' && (
              onTimeFrameChange && vision.status === 'active' ? (
                <TouchableOpacity
                  onPress={() => setShowTfPicker(prev => !prev)}
                  style={styles.tfBadge}
                >
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
                    {timeFrameLabel ?? T('vowTimeRange')}
                  </Text>
                  <ChevronDown size={10} color={TH.sub} />
                </TouchableOpacity>
              ) : timeFrameLabel ? (
                <Text style={styles.tfLabel}>{timeFrameLabel}</Text>
              ) : null
            )}
          </View>
          <Text style={{ fontSize: FONT_BODY(), color: TH.text, lineHeight: 22 }}>{vision.text}</Text>
          {dateRange && (
            <View style={styles.dateRow}>
              <Calendar size={12} color={TH.sub} />
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{dateRange}</Text>
            </View>
          )}
          {/* TimeFrame picker dropdown */}
          {showTfPicker && onTimeFrameChange && (
            <View style={styles.tfPickerRow}>
              {availableTimeFrames.map(tfKey => {
                const tf = VISION_TIME_FRAMES.find(f => f.key === tfKey);
                if (!tf) return null;
                const active = vision.timeFrame === tfKey;
                return (
                  <TouchableOpacity
                    key={tfKey}
                    onPress={() => {
                      onTimeFrameChange(vision.id, tfKey);
                      setShowTfPicker(false);
                    }}
                    style={[styles.tfChip, {
                      backgroundColor: active ? '#8B5CF620' : TH.card,
                      borderColor: active ? '#8B5CF6' : TH.border,
                    }]}
                  >
                    <Text style={{ fontSize: FONT_BADGE(), color: active ? '#8B5CF6' : TH.sub, fontWeight: active ? '600' : '400' }}>
                      {T(tf.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => onEdit(vision)} style={[styles.editButton, { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}>
          <Text style={{ fontSize: FONT_BADGE(), color: '#8B5CF6', fontWeight: '700' }}>{T('vowEdit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar — not for lifetime visions */}
      {vision.type !== 'lifetime' && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowProgress')}</Text>
            <Text style={{ fontSize: FONT_SUB(), color: '#8B5CF6', fontWeight: '600' }}>{pct}%</Text>
          </View>
          <ProgressBar pct={pct} color="#8B5CF6" />
        </View>
      )}

      {/* Plan & Task progress indicators */}
      {(planTotal > 0 || taskTotal > 0) && (
        <View style={styles.planTaskRow}>
          {planTotal > 0 && (
            <View style={styles.progressItem}>
              <Text style={{ fontSize: FONT_SUB() }}>📋</Text>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowPlanProgress')}</Text>
              <Text style={{ fontSize: FONT_SUB(), color: TH.text, fontWeight: '600' }}>{planDone}/{planTotal}</Text>
            </View>
          )}
          {taskTotal > 0 && (
            <View style={styles.progressItem}>
              <Text style={{ fontSize: FONT_SUB() }}>✅</Text>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowTaskProgress')}</Text>
              <Text style={{ fontSize: FONT_SUB(), color: TH.text, fontWeight: '600' }}>{taskDone}/{taskTotal}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        {vision.status === 'active' && (
          <>
            <TouchableOpacity onPress={() => onAchieve(vision.id)} style={[styles.actionBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
              <Text style={{ fontSize: FONT_BADGE(), color: '#fff', fontWeight: '700' }}>{T('vowAchieve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onArchive(vision.id)} style={[styles.actionBtn, { backgroundColor: TH.card, borderColor: TH.border }]}>
              <Text style={{ fontSize: FONT_BADGE(), color: TH.sub, fontWeight: '600' }}>{T('vowArchive')}</Text>
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity onPress={() => onDelete(vision.id)} style={[styles.actionBtn, { backgroundColor: TH.card, borderColor: '#EF444440' }]}>
                <Text style={{ fontSize: FONT_BADGE(), color: '#EF4444', fontWeight: '600' }}>{T('vowDelete')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {vision.status === 'achieved' && (
          <View style={[styles.statusBadge, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
            <Text style={{ fontSize: FONT_BADGE(), color: '#10B981', fontWeight: '700' }}>{T('vowAchieved')}</Text>
          </View>
        )}
        {vision.status === 'archived' && (
          <View style={[styles.statusBadge, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={{ fontSize: FONT_BADGE(), color: TH.sub, fontWeight: '600' }}>{T('vowArchived')}</Text>
          </View>
        )}
      </View>

      {/* Linked Plans - Collapsible */}
      {linkedPlans.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => setExpanded(prev => !prev)}
            style={styles.linkedPlansToggle}
          >
            {expanded
              ? <ChevronDown size={14} color={TH.sub} />
              : <ChevronRight size={14} color={TH.sub} />}
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, fontWeight: '600' }}>
              {T('vowLinkedPlans')} ({linkedPlans.length})
            </Text>
          </TouchableOpacity>

          {expanded && linkedPlans.map(plan => {
            const items = planItems.filter(i => i.planId === plan.id && !i.deleted);
            const done = items.filter(i => i.status === 'completed').length;
            const planPct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => onNavigateToPlan?.(plan.id)}
                activeOpacity={0.7}
                style={[styles.planItemCard, { backgroundColor: TH.card, borderColor: TH.border }]}
              >
                <View style={styles.planItemHeader}>
                  <Text style={styles.planItemName} numberOfLines={1}>
                    <List size={14} color={TH.text} /> {plan.name}
                  </Text>
                  <View style={styles.planItemRight}>
                    <Text style={styles.planItemPct}>{planPct}%</Text>
                    <ChevronRight size={14} color={TH.sub} />
                  </View>
                </View>

                {/* Plan progress bar */}
                <View style={{ marginBottom: 8 }}>
                  <ProgressBar pct={planPct} color="#8B5CF6" />
                </View>

                {/* Plan stats: completed/total */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: items.length > 0 ? 8 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} color="#10B981" />
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{done}/{items.length}</Text>
                  </View>
                </View>

                {items.length > 0 && (
                  <View style={styles.planItemsContainer}>
                    {items.sort((a, b) => a.order - b.order).map(item => {
                      const st = STATUS_ICON[item.status] ?? STATUS_ICON.not_started;
                      const itemPct = item.progress ?? 0;
                      return (
                        <View key={item.id} style={styles.taskItemRow}>
                          <View style={styles.planItemRow}>
                            {React.createElement(st.icon, { size: 14, color: st.color })}
                            <Text style={{ fontSize: FONT_SUB(), color: TH.text, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                            <Text style={{ fontSize: FONT_SMALL(), color: st.color, fontWeight: '500' }}>{T(STATUS_I18N[item.status])}</Text>
                          </View>
                          {item.status !== 'not_started' && item.status !== 'cancelled' && (
                            <View style={styles.progressBarBg}>
                              <View style={[styles.progressBarFill, { width: `${itemPct}%`, backgroundColor: st.color }]} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftColumn: {
    flex: 1,
    marginRight: 12,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tfLabel: {
    fontSize: FONT_SMALL(),
    color: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tfPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tfChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  planTaskRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkedPlansToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  planItemCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
  },
  planItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planItemName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    flex: 1,
  },
  planItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planItemPct: {
    fontSize: FONT_BADGE(),
    color: '#8B5CF6',
    fontWeight: '600',
  },
  planItemsContainer: {
    gap: 6,
  },
  taskItemRow: {
    gap: 2,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIcon: {
    fontSize: FONT_SMALL(),
  },
  progressBarBg: {
    marginLeft: 22,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
});

export default React.memo(VisionCard, (prev, next) => {
  return prev.vision.id === next.vision.id
    && prev.pct === next.pct
    && prev.planDone === next.planDone
    && prev.planTotal === next.planTotal
    && prev.taskDone === next.taskDone
    && prev.taskTotal === next.taskTotal
    && prev.linkedPlans?.length === next.linkedPlans?.length;
});