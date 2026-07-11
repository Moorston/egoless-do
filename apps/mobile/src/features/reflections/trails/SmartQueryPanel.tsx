import { FONT_SMALL, FONT_BUTTON } from '@egoless-do/core';
import type { SmartQueryResult } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { SmartQueryBubble } from '../insights/SmartQueryBubble';


interface Props {
  show: boolean;
  onClose: () => void;
  smartResult: SmartQueryResult | null;
  onSmartAnswer: (answer: string) => void;
  onSmartQuery: () => void;
  isSmartParsing: boolean;
  queryResults: Array<{ id: string }>;
  onQuickCreate: (selectedIds: string[]) => void;
  chatHistory: unknown[];
}

export default function SmartQueryPanel({
  show, onClose,
  smartResult, onSmartAnswer, onSmartQuery,
  isSmartParsing, queryResults, onQuickCreate,
  chatHistory,
}: Props) {
  const TH = useTheme();
  const T = useT();

  if (!show) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: TH.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: FONT_SMALL(), color: TH.primary, fontWeight: '600' }}>
          🔍 智能查询
        </Text>
        <TouchableOpacity onPress={onClose}>
          <X size={18} color={TH.sub} />
        </TouchableOpacity>
      </View>

      {/* Smart query bubble */}
      {smartResult?.question && chatHistory.length < 3 && (
        <SmartQueryBubble
          question={smartResult.question}
          onAnswer={onSmartAnswer}
          onSkip={() => {
            onSmartQuery();
          }}
        />
      )}

      {/* Loading indicator */}
      {isSmartParsing && (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>🧠 智能解析中...</Text>
        </View>
      )}

      {/* Query results */}
      {!isSmartParsing && queryResults.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 8 }}>
            找到 {queryResults.length} 条相关感念
          </Text>
          <TouchableOpacity
            onPress={() => {
              onClose();
              onQuickCreate(queryResults.map(r => r.id));
            }}
            style={{
              backgroundColor: TH.primary,
              borderRadius: 10, paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '600' }}>
              快速创建脉络 →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No results */}
      {!isSmartParsing && queryResults.length === 0 && !smartResult?.question && (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>未找到匹配的感念</Text>
        </View>
      )}
    </View>
  );
}
