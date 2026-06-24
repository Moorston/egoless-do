'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  maxHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  emptyStyle?: React.CSSProperties;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  maxHeight = 400,
  renderItem,
  keyExtractor,
  emptyMessage,
  emptyStyle,
}: VirtualListProps<T>) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(maxHeight);

  // 动态计算列表高度
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100;
        setListHeight(Math.min(maxHeight, Math.max(200, availableHeight)));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [maxHeight]);

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return (
      <div style={style} key={keyExtractor(item, index)}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, renderItem, keyExtractor]);

  if (items.length === 0) {
    if (emptyMessage) {
      return (
        <div style={{
          textAlign: 'center',
          padding: 24,
          color: '#888',
          fontSize: 14,
          ...emptyStyle,
        }}>
          {emptyMessage}
        </div>
      );
    }
    return null;
  }

  // 如果列表项少于阈值，直接渲染（避免虚拟化的开销）
  const VIRTUALIZATION_THRESHOLD = 20;
  if (items.length <= VIRTUALIZATION_THRESHOLD) {
    return (
      <div ref={containerRef}>
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <List
        ref={listRef}
        height={listHeight}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}
