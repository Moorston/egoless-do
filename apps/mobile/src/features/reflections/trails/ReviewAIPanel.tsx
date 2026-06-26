import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Brain, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_SMALL, FONT_BODY } from '@egoless-do/core';
import { SegmentBar } from '../shared/SegmentBar';
import type { TrailInsightCache, TrailReviewCache } from '@egoless-do/core';

interface ReviewAIPanelProps {
  insightCache?: TrailInsightCache;
  reviewCache?: TrailReviewCache;
  onGenerateInsight: () => Promise<void>;
  onGenerateReview: () => Promise<void>;
  onStartWrite: (question?: string) => void;
  insightStale?: boolean;
  reviewStale?: boolean;
}

export function ReviewAIPanel({
  insightCache,
  reviewCache,
  onGenerateInsight,
  onGenerateReview,
  onStartWrite,
  insightStale,
  reviewStale,
}: ReviewAIPanelProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  // 默认子 tab：有 insightCache → 0，仅有 reviewCache → 1，都没有 → 0
  const defaultTab = insightCache ? 0 : reviewCache ? 1 : 0;
  const [subTab, setSubTab] = useState(defaultTab);
  const [expanded, setExpanded] = useState(true);
  const FIXED_HEIGHT = 160;
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);

  const prevInsightRef = useRef(insightCache);
  const prevReviewRef = useRef(reviewCache);

  useEffect(() => {
    if (!prevInsightRef.current && insightCache) {
      setSubTab(0);
      setExpanded(true);
    }
    prevInsightRef.current = insightCache;
  }, [insightCache]);

  useEffect(() => {
    if (!prevReviewRef.current && reviewCache) {
      setSubTab(1);
      setExpanded(true);
    }
    prevReviewRef.current = reviewCache;
  }, [reviewCache]);

  const handleGenerateInsight = useCallback(async () => {
    setLoadingInsight(true);
    try {
      await onGenerateInsight();
    } finally {
      setLoadingInsight(false);
    }
  }, [onGenerateInsight]);

  const handleGenerateReview = useCallback(async () => {
    setLoadingReview(true);
    try {
      await onGenerateReview();
    } finally {
      setLoadingReview(false);
    }
  }, [onGenerateReview]);

  const hasInsight = !!insightCache;
  const hasReview = !!reviewCache;
  const hasAny = hasInsight || hasReview;

  // 空状态：两个都不存在
  if (!hasAny) {
    return (
      <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.emptyHeader}>
          <Brain size={18} color={P} />
          <Text style={[styles.title, { color: TH.text }]}>AI 分析</Text>
        </View>
        <View style={styles.emptyButtons}>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: P }]}
            onPress={handleGenerateInsight}
            disabled={loadingInsight}
          >
            {loadingInsight ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>{T('trailInsightGenerate')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: P }]}
            onPress={handleGenerateReview}
            disabled={loadingReview}
          >
            {loadingReview ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>{T('trailReviewGenerate')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Header with collapse */}
      <TouchableOpacity onPress={() => setExpanded(prev => !prev)} activeOpacity={0.8}>
        <View style={styles.header}>
          <Brain size={18} color={P} />
          <Text style={[styles.title, { color: TH.text }]}>AI 分析</Text>
          <View style={styles.headerRight}>
            {!expanded && (
              <Text style={[styles.preview, { color: TH.sub }]} numberOfLines={1}>
                {subTab === 0 && insightCache ? insightCache.summary :
                 subTab === 1 && reviewCache ? (reviewCache.observations ?? [])[0] : ''}
              </Text>
            )}
            {expanded
              ? <ChevronUp size={16} color={TH.sub} />
              : <ChevronDown size={16} color={TH.sub} />
            }
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Sub tabs */}
          <SegmentBar
            segments={['洞察', '复盘思路']}
            selectedIndex={subTab}
            onSelect={setSubTab}
          />

          {/* Fixed height content area */}
          <ScrollView
            style={[styles.fixedContent, { height: FIXED_HEIGHT }]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >

          {/* 洞察子 tab */}
          {subTab === 0 && (
            <View style={styles.subContent}>
              {loadingInsight ? (
                <View style={styles.skeletonContainer}>
                  <View style={[styles.skeletonLine, { width: '80%', backgroundColor: TH.sub + '20' }]} />
                  <View style={[styles.skeletonLine, { width: '60%', backgroundColor: TH.sub + '20' }]} />
                  <View style={[styles.skeletonLine, { width: '90%', backgroundColor: TH.sub + '15' }]} />
                  <Text style={[styles.loadingText, { color: TH.sub }]}>
                    {T('trailInsightGenerating')}
                  </Text>
                </View>
              ) : insightCache ? (
                <>
                  <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                    {T('trailInsightSummary')}
                  </Text>
                  <Text style={[styles.contentText, { color: TH.text }]}>
                    {insightCache.summary}
                  </Text>

                  {insightCache.keyPoints.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                        {T('trailInsightKeyPoints')}
                      </Text>
                      {insightCache.keyPoints.map((point, i) => (
                        <Text key={i} style={[styles.bulletText, { color: TH.text }]}>
                          • {point}
                        </Text>
                      ))}
                    </>
                  )}

                  {insightCache.turningPoints.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                        {T('trailInsightTurningPoints')}
                      </Text>
                      {insightCache.turningPoints.map((point, i) => (
                        <Text key={i} style={[styles.bulletText, { color: TH.text }]}>
                          • {point}
                        </Text>
                      ))}
                    </>
                  )}

                  {insightCache.suggestions.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                        {T('trailInsightSuggestions')}
                      </Text>
                      {insightCache.suggestions.map((s, i) => (
                        <Text key={i} style={[styles.bulletText, { color: TH.text }]}>
                          • {s}
                        </Text>
                      ))}
                    </>
                  )}

                  {insightStale && (
                    <View style={styles.staleRow}>
                      <Text style={[styles.staleText, { color: '#F59E0B' }]}>
                        已有洞察（可能已过期）
                      </Text>
                      <TouchableOpacity onPress={handleGenerateInsight} disabled={loadingInsight}>
                        <Text style={[styles.actionText, { color: P }]}>
                          {T('trailInsightRegenerate')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.generateButton, { backgroundColor: P }]}
                  onPress={handleGenerateInsight}
                  disabled={loadingInsight}
                >
                  <Text style={styles.generateButtonText}>{T('trailInsightGenerate')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 引导子 tab */}
          {subTab === 1 && (
            <View style={styles.subContent}>
              {loadingReview ? (
                <View style={styles.skeletonContainer}>
                  <View style={[styles.skeletonLine, { width: '75%', backgroundColor: TH.sub + '20' }]} />
                  <View style={[styles.skeletonLine, { width: '55%', backgroundColor: TH.sub + '20' }]} />
                  <View style={[styles.skeletonLine, { width: '85%', backgroundColor: TH.sub + '15' }]} />
                  <Text style={[styles.loadingText, { color: TH.sub }]}>
                    {T('trailReviewGenerating')}
                  </Text>
                </View>
              ) : reviewCache ? (
                <>
                  {((reviewCache as any).perspectives ?? (reviewCache as any).questions ?? []).length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                        复盘思路
                      </Text>
                      {((reviewCache as any).perspectives ?? (reviewCache as any).questions ?? []).map((p: string, i: number) => (
                        <View key={i} style={[styles.perspectiveItem, { borderColor: TH.border }]}>
                          <Text style={[styles.perspectiveText, { color: TH.text }]}>
                            {p}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {(reviewCache.observations ?? []).length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                        {T('trailReviewObservations')}
                      </Text>
                      {(reviewCache.observations ?? []).map((obs, i) => (
                        <Text key={i} style={[styles.contentText, { color: TH.text }]}>
                          • {obs}
                        </Text>
                      ))}
                    </>
                  )}

                  {(reviewCache.suggestions ?? []).length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                        建议
                      </Text>
                      {(reviewCache.suggestions ?? []).map((s, i) => (
                        <Text key={i} style={[styles.contentText, { color: TH.text }]}>
                          • {s}
                        </Text>
                      ))}
                    </>
                  )}

                  {reviewStale && (
                    <View style={styles.staleRow}>
                      <Text style={[styles.staleText, { color: '#F59E0B' }]}>
                        已有复盘（可能已过期）
                      </Text>
                      <TouchableOpacity onPress={handleGenerateReview} disabled={loadingReview}>
                        <Text style={[styles.actionText, { color: P }]}>
                          {T('trailReviewRegenerate')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.generateButton, { backgroundColor: P }]}
                  onPress={handleGenerateReview}
                  disabled={loadingReview}
                >
                  <Text style={styles.generateButtonText}>{T('trailReviewGenerate')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          </ScrollView>

          {/* Fixed footer */}
          <View style={styles.footerRow}>
            {subTab === 0 && insightCache && (
              <>
                <TouchableOpacity
                  style={[styles.writeButton, { backgroundColor: P }]}
                  onPress={() => onStartWrite()}
                >
                  <Text style={styles.writeButtonText}>
                    {T('trailReviewStart')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGenerateInsight} disabled={loadingInsight}>
                  <Text style={[styles.actionText, { color: P }]}>
                    {T('trailInsightRegenerate')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.timeText, { color: TH.sub }]}>
                  {new Date(insightCache.generatedAt).toLocaleString()}
                </Text>
              </>
            )}
            {subTab === 1 && reviewCache && (
              <>
                <TouchableOpacity
                  style={[styles.writeButton, { backgroundColor: P }]}
                  onPress={() => onStartWrite()}
                >
                  <Text style={styles.writeButtonText}>
                    {T('trailReviewStart')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGenerateReview} disabled={loadingReview}>
                  <Text style={[styles.actionText, { color: P }]}>
                    {T('trailReviewRegenerate')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  preview: {
    fontSize: FONT_SMALL,
    flex: 1,
    textAlign: 'right',
  },
  content: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  fixedContent: {
    overflow: 'hidden',
  },
  subContent: {
    marginTop: 8,
  },
  skeletonContainer: {
    marginTop: 8,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  loadingText: {
    fontSize: FONT_SMALL,
    marginTop: 12,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  contentText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
    marginLeft: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_SMALL,
  },
  perspectiveItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    borderLeftWidth: 3,
  },
  perspectiveText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
  },
  staleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245,158,11,0.3)',
  },
  staleText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  actionText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  timeText: {
    fontSize: FONT_SMALL,
  },
  writeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  writeButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  generateButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
});
