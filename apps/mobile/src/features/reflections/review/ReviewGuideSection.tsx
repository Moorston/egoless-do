import { FONT_SMALL, FONT_BODY } from '@egoless-do/core';
import type { TrailReviewCache } from '@egoless-do/core';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface ReviewGuideSectionProps {
  reviewCache?: TrailReviewCache;
  onGenerate: () => Promise<void>;
  onStartWrite: (question?: string) => void;
  stale?: boolean;
}

export function ReviewGuideSection({ reviewCache, onGenerate, onStartWrite, stale }: ReviewGuideSectionProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevCacheRef = useRef(reviewCache);

  useEffect(() => {
    if (!prevCacheRef.current && reviewCache) {
      setExpanded(true);
    }
    prevCacheRef.current = reviewCache;
  }, [reviewCache]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  }, [onGenerate]);

  // Inline review answers state
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [openQuestionIdx, setOpenQuestionIdx] = useState<number | null>(null);

  const handleToggleQuestion = useCallback((idx: number) => {
    setOpenQuestionIdx(prev => prev === idx ? null : idx);
  }, []);

  const handleAnswerChange = useCallback((idx: number, text: string) => {
    setAnswers(prev => ({ ...prev, [idx]: text }));
  }, []);

  const questions = reviewCache?.questions ?? [];
  const answeredCount = questions.filter((_, i) => answers[i]?.trim()).length;

  // 无内容时显示生成按钮
  if (!reviewCache) {
    return (
      <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.header}>
          <MessageCircle size={18} color={P} />
          <Text style={[styles.title, { color: TH.text }]}>复盘引导</Text>
        </View>
        {loading ? (
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: '75%', backgroundColor: TH.sub + '20' }]} />
            <View style={[styles.skeletonLine, { width: '55%', backgroundColor: TH.sub + '20' }]} />
            <View style={[styles.skeletonLine, { width: '85%', backgroundColor: TH.sub + '15' }]} />
            <View style={[styles.skeletonLine, { width: '40%', backgroundColor: TH.sub + '15' }]} />
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

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <TouchableOpacity
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
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Progress bar */}
          {questions.length > 0 && (
            <View style={styles.progressRow}>
              <View style={[styles.progressBar, { backgroundColor: TH.sub + '20' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: P,
                      width: `${(answeredCount / questions.length) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: TH.sub }]}>
                已回答 {answeredCount}/{questions.length}
              </Text>
            </View>
          )}

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

          {questions.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                {T('trailReviewQuestions')}
              </Text>
              {questions.map((q, i) => {
                const isOpen = openQuestionIdx === i;
                const hasAnswer = !!answers[i]?.trim();
                return (
                  <View key={i}>
                    <TouchableOpacity
                      style={[
                        styles.questionItem,
                        { borderColor: hasAnswer ? P : TH.border },
                      ]}
                      onPress={() => handleToggleQuestion(i)}
                    >
                      <Text style={[styles.questionText, { color: TH.text }]}>
                        {i + 1}. {q}
                      </Text>
                      <Text style={[styles.questionIndicator, { color: hasAnswer ? P : TH.sub }]}>
                        {hasAnswer ? '✓' : '✎'}
                      </Text>
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={[styles.answerInputWrapper, { backgroundColor: TH.bg }]}>
                        <TextInput
                          value={answers[i] ?? ''}
                          onChangeText={t => handleAnswerChange(i, t)}
                          placeholder="输入你的回答..."
                          placeholderTextColor={TH.sub}
                          multiline
                          style={[styles.answerInput, { color: TH.text }]}
                          autoFocus
                        />
                      </View>
                    )}
                  </View>
                );
              })}
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

          {stale && (
            <View style={styles.staleRow}>
              <Text style={[styles.staleText, { color: '#F59E0B' }]}>
                已有复盘（可能已过期）
              </Text>
              <TouchableOpacity onPress={handleGenerate} disabled={loading}>
                <Text style={[styles.actionText, { color: P }]}>
                  {T('trailReviewRegenerate')}
                </Text>
              </TouchableOpacity>
            </View>
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
    fontSize: FONT_SMALL,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  contentText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
  },
  questionText: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
    flex: 1,
  },
  questionIndicator: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
    marginLeft: 8,
  },
  answerInputWrapper: {
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
    padding: 8,
  },
  answerInput: {
    fontSize: FONT_SMALL,
    lineHeight: 20,
    minHeight: 60,
    textAlignVertical: 'top',
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
