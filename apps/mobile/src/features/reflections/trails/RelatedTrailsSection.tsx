import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import type { ThoughtTrail } from '@egoless-do/core';

interface RelatedTrailItem {
  trail: ThoughtTrail;
  similarity: number;
}

interface RelatedTrailsSectionProps {
  relatedTrails: RelatedTrailItem[];
  onNavigateToTrail: (trailId: string) => void;
}

export function RelatedTrailsSection({
  relatedTrails,
  onNavigateToTrail,
}: RelatedTrailsSectionProps) {
  const TH = useTheme();
  const T = useT();

  // 无内容时隐藏
  if (relatedTrails.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <Text style={[styles.sectionTitle, { color: TH.text }]}>
        🔗 {T('trailRelated')}
      </Text>

      {relatedTrails.map(({ trail, similarity }) => (
        <TouchableOpacity
          key={trail.id}
          style={[styles.trailItem, { borderColor: TH.border }]}
          onPress={() => onNavigateToTrail(trail.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.trailName, { color: TH.text }]} numberOfLines={1}>
            {trail.name}
          </Text>
          <Text style={[styles.similarityText, { color: TH.primary }]}>
            {T('trailRelatedOverlap').replace('{percent}', String(Math.round(similarity * 100)))}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
    marginBottom: 8,
  },
  trailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trailName: {
    fontSize: FONT_SMALL,
    flex: 1,
    marginRight: 8,
  },
  similarityText: {
    fontSize: FONT_TINY,
    fontWeight: '600',
  },
});
