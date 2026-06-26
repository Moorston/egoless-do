import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Brain } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { useTheme, useT } from '../../../components/UI';
import { FONT_BODY, FONT_SMALL } from '@egoless-do/core';

interface Props {
  onPress: () => void;
}

export default function MindTrailEntryCard({ onPress }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const thoughtTrails = useMemo(() => 
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const trailCount = thoughtTrails.length;

  const getDescription = () => {
    if (trailCount === 0) {
      return '串联感念・梳理脉络';
    }
    return `串联感念・梳理脉络 · ${trailCount} 条脉络`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}
    >
      {/* 左侧紫色装饰条 */}
      <View style={[styles.decorator, { backgroundColor: '#8B5CF6' }]} />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Brain size={20} color="#8B5CF6" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: TH.text }]}>
            {T('mindTrail')}
          </Text>
          <Text style={[styles.description, { color: TH.sub }]}>
            {getDescription()}
          </Text>
        </View>
        
        <Text style={[styles.action, { color: '#8B5CF6' }]}>
          {trailCount > 0 ? '查看 →' : '开始 →'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  decorator: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: FONT_SMALL,
  },
  action: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
    marginLeft: 8,
  },
});
