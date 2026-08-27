import type { MindReflection, Plan, PlanItem, PlanItemCheckin, ThoughtTrail, Vision } from '@egoless-do/core';
import { MS_PER_DAY } from '@egoless-do/core';
import { BarChart2, ChevronDown, ChevronRight, ClipboardList, Link, Link2, ListChecks, MessageCircle, Route, Target } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import PlanCountdown from '../../../components/PlanCountdown';
import { Card, useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { styles } from '../styles';

import { Heatmap } from './Heatmap';
import { ProgressRing } from './ProgressRing';
import { StatusLabel } from './StatusBadge';

export interface DetailTabContentProps {
  plan: Plan;
  planId: string;
  items: PlanItem[];
  sortedItems: PlanItem[];
  checkins: PlanItemCheckin[];
  today: string;
  planProgress: number;
  visions: Vision[];
  relatedReflections: { items: MindReflection[]; total: number };
  relatedTrails: ThoughtTrail[];
  renderItemRow: (props: { item: PlanItem; index: number }) => React.ReactElement;
  // heatmap state
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean | ((prev: boolean) => boolean)) => void;
  // related content state
  showRelated: boolean;
  setShowRelated: (v: boolean | ((prev: boolean) => boolean)) => void;
}

// DetailTabContent 为详情标签页主体（hero/goal/items/related/heatmap），条件分支较多，暂禁用行数限制
// eslint-disable-next-line max-lines-per-function
export function DetailTabContent({
  plan,
  planId,
  items,
  sortedItems,
  checkins,
  today,
  planProgress,
  visions,
  relatedReflections,
  relatedTrails,
  renderItemRow,
  showHeatmap,
  setShowHeatmap,
  showRelated,
  setShowRelated,
}: DetailTabContentProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const nav = useRootNavigation();

  // Derived values that require `plan` to be non-null
  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / MS_PER_DAY) + 1;
  const elapsed = Math.max(0, Math.round((new Date(today > plan.endDate ? plan.endDate : today).getTime() - new Date(plan.startDate).getTime()) / MS_PER_DAY) + 1);

  return (
    <>
      {/* Plan hero card */}
      <Card>
        {/* Plan name with icon */}
        <View style={styles.sectionHeaderRow}>
          <ClipboardList size={18} color={P} />
          <Text style={[styles.textBodyBold, { color: TH.text }]} numberOfLines={1}>{plan.name}</Text>
          <StatusLabel status={plan.status} T={T} />
        </View>


        {/* Progress ring + stats */}
        <View style={styles.statsRow}>
          <ProgressRing progress={planProgress} color={P} />
          <View style={styles.statsCol}>
            <View style={styles.statRow}>
              <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planStartDate')}</Text>
              <Text style={[styles.textSubDim, { color: TH.text }]}>{plan.startDate}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planEndDate')}</Text>
              <Text style={[styles.textSubDim, { color: TH.text }]}>{plan.endDate}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planProgress')}</Text>
              <Text style={[styles.textSubBold, { color: TH.text }]}>{elapsed}/{totalDays} {T('planDays')}</Text>
            </View>
          </View>
        </View>

        {/* Linear progress bar */}
        <View style={[styles.planProgressTrack, { backgroundColor: TH.border }]}>
          <View style={[styles.planProgressFill, { width: `${planProgress}%`, backgroundColor: P }]} />
        </View>

        {/* Countdown */}
        <PlanCountdown plan={plan} />
      </Card>

      {/* Goal + Vision (merged) */}
      <Card>
        <View style={styles.sectionHeaderRow}>
          <Target size={18} color={P} />
          <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planGoal')}</Text>
        </View>
        <Text style={[styles.textGoal, { color: TH.text }]}>{plan.goal}</Text>

        {plan.visionId && (() => {
          const linkedVision = (visions ?? []).find((v: Vision) => v.id === plan.visionId && !v.deleted);
          if (!linkedVision) return null;
          return (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={{ fontSize: 16 }}>🎯</Text>
                <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planLinkedVision')}</Text>
              </View>
              <Text style={[styles.textGoal, { color: '#8B5CF6', marginTop: 4 }]}>{linkedVision.text}</Text>
            </View>
          );
        })()}

        {plan.slogan ? (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planSlogan')}</Text>
            </View>
            <Text style={[styles.textGoal, { color: TH.text, marginTop: 4 }]}>{plan.slogan}</Text>
          </View>
        ) : null}
      </Card>

      {/* Items */}
      <Card>
        <View style={styles.itemsHeaderRow}>
          <View style={styles.sectionHeaderRow}>
            <ListChecks size={18} color={P} />
            <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planItems')}</Text>
          </View>
          <Text style={[styles.textSubDim, { color: TH.sub }]}>{String(items.length)}</Text>
        </View>
        {items.length === 0 ? (
          <Text style={[styles.textNoItems, { color: TH.sub }]}>{T('planNoItems')}</Text>
        ) : (
          sortedItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {renderItemRow({ item, index })}
            </React.Fragment>
          ))
        )}
      </Card>

      {/* Related Reflections, Trails & Vision */}
      {(relatedReflections.total > 0 || relatedTrails.length > 0 || plan?.visionId) && (
        <Card>
          {/* Collapsible header with stats */}
          <TouchableOpacity
            onPress={() => setShowRelated(v => !v)}
            activeOpacity={0.7}
            style={styles.relatedToggleRow}
            accessibilityLabel={showRelated ? '收起关联内容' : '展开关联内容'}
          >
            <View style={styles.flex1}>
              <View style={styles.sectionHeaderRowMb8}>
                <Link2 size={18} color={P} />
                <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planLinkedContent')}</Text>
              </View>
              <View style={styles.relatedCountsRow}>
                {relatedReflections.total > 0 && (
                  <View style={styles.inlineRowGap4}>
                    <MessageCircle size={14} color={P} />
                    <Text style={[styles.textSubDim, { color: TH.sub }]}>
                      {String(relatedReflections.total)} {T('planRelatedReflections')}
                    </Text>
                  </View>
                )}
                {relatedTrails.length > 0 && (
                  <View style={styles.inlineRowGap4}>
                    <Route size={14} color={P} />
                    <Text style={[styles.textSubDim, { color: TH.sub }]}>
                      {String(relatedTrails.length)} {T('planRelatedTrails')}
                    </Text>
                  </View>
                )}
                {plan?.visionId && (() => {
                  const v = (visions ?? []).find((x: Vision) => x.id === plan.visionId && !x.deleted);
                  if (!v) return null;
                  return (
                    <View style={styles.inlineRowGap4}>
                      <Text style={{ fontSize: 14 }}>🎯</Text>
                      <Text style={[styles.textSubDim, { color: TH.sub }]}>
                        {T('planLinkVision')}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
            {showRelated
              ? <ChevronDown size={18} color={TH.sub} />
              : <ChevronRight size={18} color={TH.sub} />}
          </TouchableOpacity>

          {/* Expanded content */}
          {showRelated && (
            <View style={styles.expandedContent}>
              {/* Related Reflections */}
              {relatedReflections.items.map(r => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => nav.navigate('ReflectionDetail', { reflectionId: r.id })}
                  style={[styles.relatedItemCard, { backgroundColor: `${TH.card}80`, borderColor: TH.border }]}
                  accessibilityLabel={`查看关联感悟: ${r.content?.substring(0, 20) ?? ''}`}
                >
                  <Text style={[styles.textBodyDim, { color: TH.text }]} numberOfLines={2}>{r.content}</Text>
                  <Text style={[styles.textSubDimMt4, { color: TH.sub }]}>
                    {new Date(r.timestamp).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Related Trails */}
              {relatedTrails.map(trail => (
                <TouchableOpacity
                  key={trail.id}
                  onPress={() => nav.navigate('ThoughtTrailDetail', { trailId: trail.id })}
                  style={[styles.relatedItemCard, { backgroundColor: `${TH.card}80`, borderColor: TH.border }]}
                  accessibilityLabel={`查看关联脉络: ${trail.name}`}
                >
                  <Text style={[styles.textBodySemiBold, { color: TH.text }]}>{trail.name}</Text>
                  <Text style={[styles.textSubDimMt4, { color: TH.sub }]}>
                    {String((trail.reflectionIds ?? []).length)} {T('planTrailReflectionCount')}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Linked Vision */}
              {plan?.visionId && (() => {
                const v = (visions ?? []).find((x: Vision) => x.id === plan.visionId && !x.deleted);
                if (!v) return null;
                return (
                  <TouchableOpacity
                    key={plan.visionId}
                    onPress={() => nav.navigate('Vow' as never)}
                    style={[styles.relatedItemCard, { backgroundColor: `${TH.card}80`, borderColor: TH.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  >
                    <Text style={{ fontSize: 18 }}>🎯</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.textBodySemiBold, { color: TH.text }]}>{T('planLinkedVision')}</Text>
                      <Text style={[styles.textDim, { color: TH.sub, marginTop: 2 }]} numberOfLines={2}>{v.text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* Show "more" hint if reflections were truncated */}
              {relatedReflections.total > 3 && (
                <TouchableOpacity onPress={() => nav.navigate('MindTrail')} accessibilityLabel={`查看更多关联感悟 (+${relatedReflections.total - 3})`}>
                  <Text style={[styles.textMoreLink, { color: TH.sub }]}>
                    +{String(relatedReflections.total - 3)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>
      )}

      {/* Relation Map Entry */}
      <TouchableOpacity
        onPress={() => nav.navigate('RelationMap', { context: { type: 'plan', id: planId } })}
        style={[styles.relationMapButton, { backgroundColor: TH.card, borderColor: TH.border }]}
        accessibilityLabel={T('planRelationMap')}
      >
        <Link size={18} color={P} />
        <View style={styles.flex1}>
          <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planRelationMap')}</Text>
          <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planRelationMapDesc')}</Text>
        </View>
        <ChevronRight size={18} color={TH.sub} />
      </TouchableOpacity>

      {/* Heatmap */}
      <Card>
        <TouchableOpacity
          onPress={() => setShowHeatmap(v => !v)}
          style={styles.heatmapHeaderRow}
          accessibilityLabel={showHeatmap ? '收起热力图' : '展开热力图'}
        >
          <View style={styles.sectionHeaderRow}>
            <BarChart2 size={18} color={P} />
            <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planHeatmap')}</Text>
          </View>
          {showHeatmap
            ? <ChevronDown size={18} color={TH.sub} />
            : <ChevronRight size={18} color={TH.sub} />}
        </TouchableOpacity>
        {showHeatmap && (
          <View style={styles.heatmapContent}>
            <Heatmap checkins={checkins} items={items} plan={plan} TH={TH} T={T} />
          </View>
        )}
      </Card>
    </>
  );
}
