import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Brain } from 'lucide-react-native';
import { useTheme } from '../../../components/UI';
import { FONT_SMALL } from '@egoless-do/core';

interface Props {
  insights: string[];
}

export default function InsightsPanel({ insights }: Props) {
  const TH = useTheme();
  const P = TH.primary;

  if (insights.length === 0) return null;

  return (
    <View style={[styles.insightsPanel, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <View style={styles.insightsHeader}>
        <Brain size={16} color={P} />
        <Text style={[styles.insightsTitle, { color: TH.text }]}>关联洞察</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {insights.map((insight, idx) => (
          <View key={idx} style={[styles.insightCard, { borderColor: TH.border }]}>
            <Text style={[styles.insightText, { color: TH.text }]}>{insight}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  insightsPanel: { padding: 12, borderTopWidth: 1 },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  insightsTitle: { fontSize: FONT_SMALL, fontWeight: '600' },
  insightCard: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  insightText: { fontSize: FONT_SMALL },
});
