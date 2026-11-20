import {FONT_SMALL} from '@egoless-do/core';
import type { TrailInsightCache, TrailReviewCache } from '@egoless-do/core';
import {Brain, ChevronDown, ChevronUp} from 'lucide-react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import type { DimensionValue } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { SegmentBar } from '../shared/SegmentBar';


type ThemeTokens = ReturnType<typeof useTheme>;
type TranslateFn = ReturnType<typeof useT>;

function EmptyState({
  TH, P, T,
  onGenerateInsight, onGenerateReview,
  loadingInsight, loadingReview,
}: {
  TH: ThemeTokens; P: string; T: TranslateFn;
  onGenerateInsight: () => void; onGenerateReview: () => void;
  loadingInsight: boolean; loadingReview: boolean;
}) {
  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <View style={styles.emptyHeader}>
        <Brain size={18} color={P} />
        <Text style={[styles.title, { color: TH.text }]}>{T('trailAIAnalysis')}</Text>
      </View>
      <View style={styles.emptyButtons}>
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: P }]}
          onPress={onGenerateInsight}
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
          onPress={onGenerateReview}
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


function PanelFooter({
  subTab, insightCache, reviewCache,
  TH, P, T,
  onStartWrite, onRegenerateInsight, onRegenerateReview,
  loadingInsight, loadingReview,
}: {
  subTab: number;
  insightCache?: TrailInsightCache;
  reviewCache?: TrailReviewCache;
  TH: ThemeTokens; P: string; T: TranslateFn;
  onStartWrite: (question?: string) => void;
  onRegenerateInsight: () => void;
  onRegenerateReview: () => void;
  loadingInsight: boolean;
  loadingReview: boolean;
}) {
  return (
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
          <TouchableOpacity onPress={onRegenerateInsight} disabled={loadingInsight}>
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
          <TouchableOpacity onPress={onRegenerateReview} disabled={loadingReview}>
            <Text style={[styles.actionText, { color: P }]}>
              {T('trailReviewRegenerate')}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}


// ── 骨架屏（洞察/复盘两 tab 共用，widths + labelKey 参数化） ──
function SkeletonBlock({
  widths, labelKey, TH, T,
}: {
  widths: [DimensionValue, DimensionValue, DimensionValue];
  labelKey: string;
  TH: ThemeTokens; T: TranslateFn;
}) {
  return (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonLine, { width: widths[0], backgroundColor: TH.sub + '20' }]} />
      <View style={[styles.skeletonLine, { width: widths[1], backgroundColor: TH.sub + '20' }]} />
      <View style={[styles.skeletonLine, { width: widths[2], backgroundColor: TH.sub + '15' }]} />
      <Text style={[styles.loadingText, { color: TH.sub }]}>
        {T(labelKey)}
      </Text>
    </View>
  );
}


// ── 单条 section 内容（itemStyle 4 态 → 渲染形态映射，样式差异逐字保留） ──
function SectionItem({
  text, itemStyle, TH,
}: {
  text: string; itemStyle: SectionItemStyle; TH: ThemeTokens;
}) {
  if (itemStyle === 'card') {
    return (
      <View style={[styles.perspectiveItem, { borderColor: TH.border }]}>
        <Text style={[styles.perspectiveText, { color: TH.text }]}>
          {text}
        </Text>
      </View>
    );
  }
  if (itemStyle === 'bullet' || itemStyle === 'text') {
    return (
      <Text style={[itemStyle === 'bullet' ? styles.bulletText : styles.contentText, { color: TH.text }]}>
        • {text}
      </Text>
    );
  }
  // 'prose'：无前缀
  return (
    <Text style={[styles.contentText, { color: TH.text }]}>
      {text}
    </Text>
  );
}


type SectionItemStyle = 'prose' | 'bullet' | 'text' | 'card';

interface TabSection {
  label: string;            // 已翻译文本（T() 在构建时调用）
  items: string[];
  itemStyle: SectionItemStyle;
}

interface AiResultTabProps {
  loading: boolean;
  sections: TabSection[];   // 空数组 = 无 cache（触发生成按钮态）
  stale: boolean;
  staleLabel: string;
  skeletonWidths: [DimensionValue, DimensionValue, DimensionValue];  // '80%' 等，两 tab 差异显式化
  skeletonLabelKey: string;  // trailInsightGenerating / trailReviewGenerating
  generateLabelKey: string;
  regenerateLabelKey: string;  // stale 行重新生成文案，两 tab 各异
  onGenerate: () => void;
  onRegenerate: () => void;
  TH: ThemeTokens; P: string; T: TranslateFn;
}


// ── sections 构建（模块级纯函数，构建时过滤空 section——等价原 length > 0 条件渲染） ──
function buildInsightSections(cache: TrailInsightCache, T: TranslateFn): TabSection[] {
  const sections: TabSection[] = [
    // summary 段 [cache.summary] 恒非空，永不过滤（原代码无条件渲染 summary）
    { label: T('trailInsightSummary'), items: [cache.summary], itemStyle: 'prose' },
    { label: T('trailInsightKeyPoints'), items: cache.keyPoints ?? [], itemStyle: 'bullet' },
    { label: T('trailInsightTurningPoints'), items: cache.turningPoints ?? [], itemStyle: 'bullet' },
    { label: T('trailInsightSuggestions'), items: cache.suggestions ?? [], itemStyle: 'bullet' },
  ];
  return sections.filter(s => s.items.length > 0);
}

function buildReviewSections(cache: TrailReviewCache, T: TranslateFn): TabSection[] {
  const sections: TabSection[] = [
    // perspectives 类型上必填；?? questions 链是 SQLite 旧数据缺字段的运行时防御
    { label: T('trailReviewQuestions'), items: cache.perspectives ?? cache.questions ?? [], itemStyle: 'card' },
    { label: T('trailReviewObservations'), items: cache.observations ?? [], itemStyle: 'text' },
    { label: T('trailReviewSuggestions'), items: cache.suggestions ?? [], itemStyle: 'text' },
  ];
  return sections.filter(s => s.items.length > 0);
}


// ── AI 结果子 tab 三态机（loading → 骨架 / sections 非空 → 内容+stale 行 / 否则 → 生成按钮） ──
function AiResultTab({
  loading, sections, stale, staleLabel,
  skeletonWidths, skeletonLabelKey, generateLabelKey, regenerateLabelKey,
  onGenerate, onRegenerate,
  TH, P, T,
}: AiResultTabProps) {
  return (
    <View style={styles.subContent}>
      {loading ? (
        <SkeletonBlock widths={skeletonWidths} labelKey={skeletonLabelKey} TH={TH} T={T} />
      ) : sections.length > 0 ? (
        <>
          {sections.map(section => (
            <React.Fragment key={section.label}>
              <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                {section.label}
              </Text>
              {section.items.map((item, i) => (
                <SectionItem key={i} text={item} itemStyle={section.itemStyle} TH={TH} />
              ))}
            </React.Fragment>
          ))}
          {stale && (
            <View style={styles.staleRow}>
              <Text style={[styles.staleText, { color: '#F59E0B' }]}>
                {staleLabel}
              </Text>
              <TouchableOpacity onPress={onRegenerate} disabled={loading}>
                <Text style={[styles.actionText, { color: P }]}>
                  {T(regenerateLabelKey)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: P }]}
          onPress={onGenerate}
          disabled={loading}
        >
          <Text style={styles.generateButtonText}>{T(generateLabelKey)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


// ── Header（折叠态预览三元链 + chevron 随迁） ──
function PanelHeader({
  expanded, subTab, insightCache, reviewCache,
  TH, P, T, onToggle,
}: {
  expanded: boolean;
  subTab: number;
  insightCache?: TrailInsightCache;
  reviewCache?: TrailReviewCache;
  TH: ThemeTokens; P: string; T: TranslateFn;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <View style={styles.header}>
        <Brain size={18} color={P} />
        <Text style={[styles.title, { color: TH.text }]}>{T('trailAIAnalysis')}</Text>
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
  );
}

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
      <EmptyState
        TH={TH} P={P} T={T}
        onGenerateInsight={handleGenerateInsight}
        onGenerateReview={handleGenerateReview}
        loadingInsight={loadingInsight}
        loadingReview={loadingReview}
      />
    );
  }

  // sections 构建（cache 不存在 → 空数组 = 生成按钮态）
  const insightSections = insightCache ? buildInsightSections(insightCache, T) : [];
  const reviewSections = reviewCache ? buildReviewSections(reviewCache, T) : [];

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Header with collapse */}
      <PanelHeader
        expanded={expanded}
        subTab={subTab}
        insightCache={insightCache}
        reviewCache={reviewCache}
        TH={TH} P={P} T={T}
        onToggle={() => setExpanded(prev => !prev)}
      />

      {expanded && (
        <View style={styles.content}>
          {/* Sub tabs */}
          <SegmentBar
            segments={[T('trailInsightTab'), T('trailReviewQuestions')]}
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
            <AiResultTab
              loading={loadingInsight}
              sections={insightSections}
              stale={!!insightStale}
              staleLabel={T('trailInsightStale')}
              skeletonWidths={['80%', '60%', '90%']}
              skeletonLabelKey="trailInsightGenerating"
              generateLabelKey="trailInsightGenerate"
              regenerateLabelKey="trailInsightRegenerate"
              onGenerate={handleGenerateInsight}
              onRegenerate={handleGenerateInsight}
              TH={TH} P={P} T={T}
            />
          )}

          {/* 引导子 tab */}
          {subTab === 1 && (
            <AiResultTab
              loading={loadingReview}
              sections={reviewSections}
              stale={!!reviewStale}
              staleLabel={T('trailReviewStale')}
              skeletonWidths={['75%', '55%', '85%']}
              skeletonLabelKey="trailReviewGenerating"
              generateLabelKey="trailReviewGenerate"
              regenerateLabelKey="trailReviewRegenerate"
              onGenerate={handleGenerateReview}
              onRegenerate={handleGenerateReview}
              TH={TH} P={P} T={T}
            />
          )}
          </ScrollView>

          {/* Fixed footer */}
          <PanelFooter
            subTab={subTab}
            insightCache={insightCache}
            reviewCache={reviewCache}
            TH={TH} P={P} T={T}
            onStartWrite={onStartWrite}
            onRegenerateInsight={handleGenerateInsight}
            onRegenerateReview={handleGenerateReview}
            loadingInsight={loadingInsight}
            loadingReview={loadingReview}
          />
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
    fontSize: FONT_SMALL(),
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
    fontSize: FONT_SMALL(),
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
    fontSize: FONT_SMALL(),
    marginTop: 12,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  contentText: {
    fontSize: FONT_SMALL(),
    lineHeight: 20,
  },
  bulletText: {
    fontSize: FONT_SMALL(),
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
    fontSize: FONT_SMALL(),
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
    fontSize: FONT_SMALL(),
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
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  actionText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  timeText: {
    fontSize: FONT_SMALL(),
  },
  writeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  writeButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL(),
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
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
});
