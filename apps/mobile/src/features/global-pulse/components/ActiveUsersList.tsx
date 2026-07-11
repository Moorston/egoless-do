/**
 * 在线用户列表组件
 * 按类型分组显示，每组标题（图标 + 类型名 + 人数），当前用户置顶
 */

import {ActiveSession, CheckinType , FONT_SUB, FONT_TITLE, FONT_BODY, FONT_SMALL} from '@egoless-do/core';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import { getCheckinTypeIcon, getCheckinTypeColor } from '../services/globalPulseApi';

import { ActiveUserItem } from './ActiveUserItem';


interface ActiveUsersListProps {
  sessions: ActiveSession[];
  onlineCount: { exercise: number; meditation: number; fasting: number; total: number };
  onUserPress?: (session: ActiveSession) => void;
}

interface Section {
  title: string;
  icon: string;
  color: string;
  count: number;
  type: CheckinType;
  data: ActiveSession[];
}

const TYPE_ORDER: CheckinType[] = ['exercise', 'meditation', 'fasting'];

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  sessions,
  onlineCount,
  onUserPress,
}) => {
  const theme = useTheme();
  const t = useT();
  const currentUserHash = useAppStore(s => s.auth.user?.id || '');

  const sections = useMemo<Section[]>(() => {
    const grouped = new Map<CheckinType, ActiveSession[]>();
    for (const type of TYPE_ORDER) {
      grouped.set(type, []);
    }
    for (const s of sessions) {
      grouped.get(s.type)?.push(s);
    }

    return TYPE_ORDER
      .map(type => ({
        title: t(`globalPulse.activeType.${type}`),
        icon: getCheckinTypeIcon(type),
        color: getCheckinTypeColor(type),
        count: onlineCount[type],
        type,
        data: grouped.get(type) || [],
      }))
      .filter(s => s.data.length > 0);
  }, [sessions, onlineCount, t]);

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{section.icon}</Text>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {section.title}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: `${section.color}20` }]}>
        <Text style={[styles.countText, { color: section.color }]}>
          {section.count}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: ActiveSession }) => (
    <ActiveUserItem
      session={item}
      isCurrentUser={item.user_hash === currentUserHash}
      onPress={onUserPress}
    />
  );

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.sub }]}>
          {t('globalPulse.noActiveUsers')}
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      keyExtractor={(item) => item.session_id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    fontSize: FONT_TITLE(),
  },
  sectionTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SUB(),
  },
});

export default ActiveUsersList;
