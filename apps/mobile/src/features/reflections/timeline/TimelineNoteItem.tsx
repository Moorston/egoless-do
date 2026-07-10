import { FONT_SMALL, FONT_BODY, FONT_TINY , getMoodIcon, formatDate, formatTime } from '@egoless-do/core';
import type { TrailNote } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface TimelineNoteItemProps {
  note: TrailNote;
  primaryColor: string;
  isLast: boolean;
  onDelete: (id: string) => void;
  onCreatePlan: (id: string) => void;
}

function TimelineNoteItemComponent({
  note,
  primaryColor,
  isLast,
  onDelete,
  onCreatePlan,
}: TimelineNoteItemProps) {
  const TH = useTheme();
  const T = useT();
  const [expanded, setExpanded] = useState(false);

  const handleDelete = useCallback(() => {
    Alert.alert(
      T('trailNoteDelete'),
      T('trailNoteDeleteConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: () => onDelete(note.id) },
      ]
    );
  }, [note.id, onDelete, T]);

  const displayContent = expanded
    ? note.content
    : (note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content);

  const dateObj = new Date(note.createdAt);
  const month = formatDate(dateObj, 'zh', { month: 'short' });
  const day = dateObj.getDate();
  const time = formatTime(dateObj, 'zh', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* 左侧时间线 */}
      <View style={styles.timelineCol}>
        <View style={[styles.dot, { borderColor: primaryColor }]} />
        <Text style={[styles.dateLabel, { color: TH.sub }]}>{month}{day}日</Text>
        <Text style={[styles.timeLabel, { color: TH.sub }]}>{time}</Text>
        {!isLast && <View style={[styles.line, { backgroundColor: TH.border }]} />}
      </View>

      {/* 右侧卡片 */}
      <View style={[styles.cardWrapper, !isLast && { marginBottom: 10 }]}>
        <View style={[styles.card, { borderColor: TH.border }]}>
          {/* 引导问题 */}
          {note.guidedQuestion && (
            <View style={[styles.guidedQuestion, { borderColor: TH.border }]}>
              <Text style={[styles.guidedText, { color: TH.sub }]}>
                💭 {T('trailNoteGuidedBy')}: {note.guidedQuestion}
              </Text>
            </View>
          )}

          {/* 内容区 */}
          <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
            <View style={[styles.contentArea, { backgroundColor: `${primaryColor}10` }]}>
              <View style={styles.contentHeader}>
                {note.source === 'guided' && (
                  <Text style={[styles.sourceBadge, { color: primaryColor }]}>🤔 {T('trailNoteGuided')}</Text>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={handleDelete} style={styles.removeBtn}>
                  <X size={14} color={TH.sub} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.content, { color: TH.text }]}>
                {displayContent}
              </Text>

              {(note.tags.length > 0 || note.mood) && (
                <View style={styles.tagsRow}>
                  {note.tags.slice(0, 3).map(tag => (
                    <Text key={tag} style={[styles.tagText, { color: TH.sub }]}>
                      {tag}
                    </Text>
                  ))}
                  {note.mood && (
                    <Text style={styles.moodText}>{getMoodIcon(note.mood)}</Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const TimelineNoteItem = React.memo(TimelineNoteItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  timelineCol: {
    width: 52,
    alignItems: 'center',
    paddingTop: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  dateLabel: {
    fontSize: FONT_TINY,
    marginTop: 4,
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: FONT_TINY,
    marginTop: 1,
  },
  line: {
    width: 1,
    flex: 1,
    marginTop: 6,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourceBadge: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 4,
  },
  guidedQuestion: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  guidedText: {
    fontSize: FONT_SMALL,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  contentArea: {
    padding: 14,
  },
  content: {
    fontSize: FONT_BODY,
    lineHeight: 26,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagText: {
    fontSize: FONT_SMALL,
  },
  moodText: {
    fontSize: FONT_SMALL,
  },
});
