import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../../components/UI';
import { FONT_SMALL, FONT_BODY, FONT_TINY } from '@egoless-do/core';
import { getMoodIcon } from '@egoless-do/core';
import type { TrailNote } from '@egoless-do/core';

interface ReviewNoteCardProps {
  note: TrailNote;
  onDelete: (id: string) => void;
  onEdit: (note: TrailNote) => void;
}

export function ReviewNoteCard({ note, onDelete, onEdit }: ReviewNoteCardProps) {
  const TH = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isGuided = note.source === 'guided';
  const borderColor = isGuided ? TH.primary : '#10B981';

  // 标题格式: 反思复盘-MMDD
  const dateObj = new Date(note.createdAt);
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const title = `反思复盘-${month}${day}`;

  const dateStr = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const sourceLabel = isGuided ? '引导式' : '自由反思';

  const isLongContent = note.content.length > 80;
  const displayContent = expanded ? note.content : (isLongContent ? note.content.slice(0, 80) + '...' : note.content);

  return (
    <View style={[styles.card, { borderColor: TH.border, backgroundColor: TH.card, borderLeftColor: borderColor }]}>
      {/* Header: Title + Actions */}
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: TH.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => onEdit(note)} style={styles.actionButton}>
            <Pencil size={16} color={TH.sub} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(note.id)} style={styles.actionButton}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subtitle: date + time + source */}
      <Text style={[styles.subtitle, { color: TH.sub }]}>
        {dateStr} {timeStr} · {sourceLabel}
      </Text>

      {/* Content area - clickable for expand/collapse */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => setExpanded(!expanded)}>
        {/* Guided question */}
        {isGuided && note.guidedQuestion && (
          <Text style={[styles.guidedQuestion, { color: TH.sub }]} numberOfLines={2}>
            💭 {note.guidedQuestion}
          </Text>
        )}

        {/* Content */}
        <Text style={[styles.content, { color: TH.text }]} numberOfLines={expanded ? undefined : 2}>
          {displayContent}
        </Text>

        {/* Expand hint */}
        {isLongContent && (
          <Text style={[styles.expandHint, { color: TH.sub }]}>
            {expanded ? '收起 ▴' : '展开 ▾'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Tags + mood */}
      {(note.tags.length > 0 || note.mood) && (
        <View style={styles.tagsRow}>
          <View style={styles.tagsList}>
            {note.tags.slice(0, 3).map(tag => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: TH.primary + '15' }]}>
                <Text style={[styles.tagPillText, { color: TH.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
          {note.mood && (
            <Text style={styles.moodIcon}>{getMoodIcon(note.mood)}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    paddingRight: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: FONT_BODY,
    fontWeight: '600',
    lineHeight: 22,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  subtitle: {
    fontSize: FONT_TINY,
    marginBottom: 8,
  },
  guidedQuestion: {
    fontSize: FONT_SMALL,
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 18,
  },
  content: {
    fontSize: FONT_BODY,
    lineHeight: 22,
    marginBottom: 4,
  },
  expandHint: {
    fontSize: FONT_TINY,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  moodIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
});
