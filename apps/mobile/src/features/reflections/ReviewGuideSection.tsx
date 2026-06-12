import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL, FONT_BODY } from '@egoless-do/core';
import type { TrailReviewCache } from '@egoless-do/core';

interface ReviewGuideSectionProps {
  reviewCache?: TrailReviewCache;
  onGenerate: () => Promise<void>;
  onStartWrite: (question?: string) => void;
}

export function ReviewGuideSection({ reviewCache, onGenerate, onStartWrite }: ReviewGuideSectionProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  }, [onGenerate]);

  // 无内容时显示生成按钮
  if (!reviewCache) {
    return (
      <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.header}>
          <MessageCircle size={18} color={P} />
          <Text style={[styles.title, { color: TH.text }]}>复盘引导</Text>
        </View>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={P} />
            <Text style={[styles.loadingText, { color: TH.sub }]}>
              {T('trailReviewGenerating')}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: P }]}
            onPress={handleGenerate}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {T('trailReviewGenerate')}
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
        <MessageCircle size={18} color={P} />
        <Text style={[styles.title, { color: TH.text }]}>复盘引导</Text>
        <View style={styles.headerRight}>
          {!expanded && reviewCache.observations.length > 0 && (
            <Text style={[styles.preview, { color: TH.sub }]} numberOfLines={1}>
              {reviewCache.observations[0]}
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
          {reviewCache.observations.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                {T('trailReviewObservations')}
              </Text>
              {reviewCache.observations.map((obs, i) => (
                <Text key={i} style={[styles.contentText, { color: TH.text }]}>
                  • {obs}
                </Text>
              ))}
            </>
          )}

          {reviewCache.questions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                {T('trailReviewQuestions')}
              </Text>
              {reviewCache.questions.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.questionItem, { borderColor: TH.border }]}
                  onPress={() => onStartWrite(q)}
                >
                  <Text style={[styles.questionText, { color: TH.text }]}>
                    {i + 1}. {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {reviewCache.suggestions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                建议
              </Text>
              {reviewCache.suggestions.map((s, i) => (
                <Text key={i} style={[styles.contentText, { color: TH.text }]}>
                  • {s}
                </Text>
              ))}
            </>
          )}

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.writeButton, { backgroundColor: P }]}
              onPress={() => onStartWrite()}
            >
              <Text style={styles.writeButtonText}>
                {T('trailReviewStart')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleGenerate} disabled={loading}>
              <Text style={[styles.actionText, { color: P }]}>
                {T('trailReviewRegenerate')}
              </Text>
            </TouchableOpacity>
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: FONT_SMALL,
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
  questionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
  },
  questionText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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
  actionText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
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
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
});
