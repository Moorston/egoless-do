import { FONT_SMALL, FONT_BODY } from '@egoless-do/core';
import type { TrailInsightCache } from '@egoless-do/core';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface InsightSectionProps {
  insightCache?: TrailInsightCache;
  onGenerate: () => Promise<void>;
  stale?: boolean;
}

export function InsightSection({ insightCache, onGenerate, stale }: InsightSectionProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevCacheRef = useRef(insightCache);

  useEffect(() => {
    if (!prevCacheRef.current && insightCache) {
      setExpanded(true);
    }
    prevCacheRef.current = insightCache;
  }, [insightCache]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  }, [onGenerate]);

  // 无内容时显示生成按钮
  if (!insightCache) {
    return (
      <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.header}>
          <Brain size={18} color={P} />
          <Text style={[styles.title, { color: TH.text }]}>AI 洞察</Text>
        </View>
        {loading ? (
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: '80%', backgroundColor: TH.sub + '20' }]} />
            <View style={[styles.skeletonLine, { width: '60%', backgroundColor: TH.sub + '20' }]} />
            <View style={[styles.skeletonLine, { width: '90%', backgroundColor: TH.sub + '15' }]} />
            <View style={[styles.skeletonLine, { width: '45%', backgroundColor: TH.sub + '15' }]} />
            <Text style={[styles.loadingText, { color: TH.sub }]}>
              {T('trailInsightGenerating')}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: P }]}
            onPress={handleGenerate}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {T('trailInsightGenerate')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 有内容时可折叠
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}
      onPress={() => setExpanded(prev => !prev)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Brain size={18} color={P} />
        <Text style={[styles.title, { color: TH.text }]}>AI 洞察</Text>
        <View style={styles.headerRight}>
          {!expanded && (
            <Text style={[styles.preview, { color: TH.sub }]} numberOfLines={1}>
              {insightCache.summary}
            </Text>
          )}
          {expanded
            ? <ChevronUp size={16} color={TH.sub} />
            : <ChevronDown size={16} color={TH.sub} />
          }
        </View>
      </View>

      {expanded && (
        <View style={styles.content}>
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

          {stale && (
            <View style={styles.staleRow}>
              <Text style={[styles.staleText, { color: '#F59E0B' }]}>
                已有洞察（可能已过期）
              </Text>
              <TouchableOpacity onPress={handleGenerate} disabled={loading}>
                <Text style={[styles.actionText, { color: P }]}>
                  {T('trailInsightRegenerate')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleGenerate} disabled={loading}>
              <Text style={[styles.actionText, { color: P }]}>
                {T('trailInsightRegenerate')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.timeText, { color: TH.sub }]}>
              {new Date(insightCache.generatedAt).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: FONT_SMALL(),
    marginTop: 12,
    textAlign: 'center',
  },
  skeletonContainer: {
    marginTop: 12,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
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
  generateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
});
