import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExternalLink, Link } from 'lucide-react-native';
import { MIND_COLORS_EXTENDED, FONT_BODY, FONT_SMALL, FONT_TINY, REFLECTION_CATEGORIES, highlightSearchMatch } from '@egoless-do/core';
import { useTheme, useT } from '../../components/UI';
import type { MindReflection } from '@egoless-do/core';

interface PlanItem {
  id: string;
  planId: string;
  name: string;
}

interface Props {
  reflection: MindReflection;
  linkedPlanItem?: PlanItem | null;
  searchQuery?: string;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  onNavigateToPlan?: (planId: string) => void;
  index?: number;
}

function ReflectionCardComponent({
  reflection: r,
  linkedPlanItem,
  searchQuery,
  onPress,
  onLongPress,
  onNavigateToPlan,
  index = 0,
}: Props) {
  const TH = useTheme();
  const P = TH.primary;
  const [expanded, setExpanded] = useState(false);

  const displayContent = useMemo(() => {
    if (expanded || r.content.length <= 100) return r.content;
    return r.content.slice(0, 100) + '...';
  }, [r.content, expanded]);

  const colors = useMemo<[string, string]>(() => {
    const c = typeof r.colors === 'string' ? (() => { try { return JSON.parse(r.colors); } catch { return null; } })() : r.colors;
    return [c?.[0] || MIND_COLORS_EXTENDED[0][0], c?.[1] || MIND_COLORS_EXTENDED[0][1]];
  }, [r.colors]);

  const handlePress = useCallback(() => {
    if (r.content.length > 100 && !expanded) {
      setExpanded(true);
    } else {
      onPress(r.id);
    }
  }, [r.id, r.content.length, expanded, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(r.id);
  }, [r.id, onLongPress]);

  const handleLinkPress = useCallback(() => {
    if (r.link) Linking.openURL(r.link).catch(console.error);
  }, [r.link]);

  const handlePlanPress = useCallback(() => {
    if (linkedPlanItem && onNavigateToPlan) {
      onNavigateToPlan(linkedPlanItem.planId);
    }
  }, [linkedPlanItem, onNavigateToPlan]);

  const content = (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.timeText}>
          {new Date(r.timestamp ?? 0).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={styles.badges}>
          {linkedPlanItem && (
            <TouchableOpacity
              onPress={handlePlanPress}
              style={[styles.badge, { backgroundColor: `${P}30` }]}
            >
              <ExternalLink size={10} color="#fff" />
              <Text style={styles.badgeText}>{linkedPlanItem.name.slice(0, 6)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {searchQuery?.trim() ? (
        <Text style={styles.contentText}>
          {highlightSearchMatch(displayContent, searchQuery).map((seg, i) =>
            seg.highlight ? (
              <Text key={i} style={styles.highlight}>{seg.text}</Text>
            ) : (
              <Text key={i}>{seg.text}</Text>
            )
          )}
        </Text>
      ) : (
        <Text style={styles.contentText}>{displayContent}</Text>
      )}

      {/* Link */}
      {r.link && (
        <TouchableOpacity onPress={handleLinkPress} style={styles.linkContainer}>
          <Link size={12} color="rgba(255,255,255,.7)" />
          <Text style={styles.linkText} numberOfLines={1}>{r.link}</Text>
        </TouchableOpacity>
      )}

      {/* Tags */}
      {(r.tags.length > 0 || r.mood) && (
        <View style={styles.tagsContainer}>
          {r.tags.map((tag) => {
            const category = REFLECTION_CATEGORIES.find((c) => `#${c.label}` === tag);
            return (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>
                  {category ? `${category.icon} ` : ''}{tag}
                </Text>
              </View>
            );
          })}
          {r.mood && (
            <View style={styles.moodPill}>
              <Text style={styles.moodText}>{r.mood}</Text>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  );

  return (
    <View style={[styles.container, { marginBottom: 10 }]}>
      <View style={[styles.card, { borderColor: TH.border }]}>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.85}
        >
          {content}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gradient: {
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: 'rgba(255,255,255,.7)',
    fontSize: FONT_SMALL,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: FONT_TINY,
    color: '#fff',
    fontWeight: '500',
  },
  contentText: {
    color: '#fff',
    fontSize: FONT_BODY,
    lineHeight: 26,
    marginBottom: 8,
  },
  highlight: {
    backgroundColor: 'rgba(255,255,0,.3)',
    color: '#fff',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  linkText: {
    color: 'rgba(255,255,255,.7)',
    fontSize: FONT_SMALL,
    textDecorationLine: 'underline',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: 'rgba(255,255,255,.9)',
    fontSize: FONT_SMALL,
  },
  moodPill: {
    backgroundColor: 'rgba(255,255,255,.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    color: 'rgba(255,255,255,.8)',
    fontSize: FONT_SMALL,
  },
});

const ReflectionCard = React.memo(ReflectionCardComponent);
export default ReflectionCard;
