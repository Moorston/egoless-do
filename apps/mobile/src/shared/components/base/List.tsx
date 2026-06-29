// ─── List Components ─────────────────────────────────────────────
import React from 'react';
import {
  FlatList,
  SectionList,
  View,
  Text,
  StyleSheet,
  type FlatListProps,
  type SectionListProps as RNSectionListProps,
  type ViewStyle,
} from 'react-native';

// FlatList wrapper with common defaults
export interface ListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  renderItem: (item: T, index: number) => React.ReactElement | null;
  emptyMessage?: string;
  containerStyle?: ViewStyle;
}

export function List<T>({
  renderItem,
  emptyMessage = '暂无数据',
  containerStyle,
  ...props
}: ListProps<T>) {
  return (
    <FlatList
      {...props}
      renderItem={({ item, index }) => renderItem(item, index)}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
      contentContainerStyle={[
        props.data?.length === 0 && styles.emptyList,
        containerStyle,
      ]}
    />
  );
}

// SectionList wrapper
export interface Section<T> {
  title: string;
  data: T[];
}

export interface CustomSectionListProps<T> extends Omit<RNSectionListProps<T>, 'renderItem' | 'renderSectionHeader'> {
  renderItem: (item: T, index: number) => React.ReactElement | null;
  renderSectionHeader?: (title: string) => React.ReactNode;
  emptyMessage?: string;
  containerStyle?: ViewStyle;
}

export function CustomSectionList<T>({
  renderItem,
  renderSectionHeader,
  emptyMessage = '暂无数据',
  containerStyle,
  ...props
}: CustomSectionListProps<T>) {
  return (
    <SectionList
      {...props}
      renderItem={({ item, index }) => renderItem(item, index)}
      renderSectionHeader={renderSectionHeader ? (({ section }: any) =>
        renderSectionHeader(section.title) as React.ReactElement | null) : undefined}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
      contentContainerStyle={[
        props.sections?.length === 0 && styles.emptyList,
        containerStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
