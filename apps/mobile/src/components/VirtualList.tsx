import { FlashList, FlashListProps } from '@shopify/flash-list';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VirtualListProps<T> extends Omit<FlashListProps<T>, 'renderItem' | 'data'> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactElement | null;
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  emptyStyle?: object;
}

export default function VirtualList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage,
  emptyStyle,
  ...rest
}: VirtualListProps<T>) {
  if (items.length === 0 && emptyMessage) {
    return (
      <View style={[styles.emptyContainer, emptyStyle]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      renderItem={({ item, index }) => renderItem(item, index)}
      keyExtractor={(item, index) => keyExtractor(item, index)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});
