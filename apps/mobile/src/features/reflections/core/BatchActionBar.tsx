import {FONT_BODY, FONT_BUTTON, FONT_SMALL, COLORS} from '@egoless-do/core';
import {Trash2, Pin, PinOff, Tag, X, CheckSquare, Square} from 'lucide-react-native';
import React, { useCallback } from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';

import {useTheme} from '../../../components/UI';

interface Props {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onAddTag: () => void;
  /** Legacy prop kept for backward-compat callers; not rendered. */
  _totalCount?: number;
}

function BatchActionBarComponent({
  selectedCount,
  _totalCount,
  onSelectAll,
  onDeselectAll,
  onCancel,
  onDelete,
  onPin,
  onUnpin,
  onAddTag,
}: Props) {
  const TH = useTheme();
  const P = TH.primary;

  const handleDelete = useCallback(() => {
    Alert.alert(
      '批量删除',
      `确定删除选中的 ${selectedCount} 条感念吗？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: onDelete },
      ]
    );
  }, [selectedCount, onDelete]);

  if (selectedCount === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: TH.cardSolid, borderTopColor: TH.border }]}>
      {/* Top row: selected count and actions */}
      <View style={styles.topRow}>
        <View style={styles.selectedInfo}>
          <Text style={[styles.selectedText, { color: TH.text }]}>
            已选 <Text style={{ color: P, fontWeight: '700' }}>{selectedCount}</Text> 项
          </Text>
        </View>
        <View style={styles.selectActions}>
          <TouchableOpacity onPress={onSelectAll} style={styles.selectButton}>
            <CheckSquare size={16} color={P} />
            <Text style={{ color: P, fontSize: FONT_SMALL() }}>全选</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeselectAll} style={styles.selectButton}>
            <Square size={16} color={TH.sub} />
            <Text style={{ color: TH.sub, fontSize: FONT_SMALL() }}>反选</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={styles.selectButton}>
            <X size={16} color={TH.sub} />
            <Text style={{ color: TH.sub, fontSize: FONT_SMALL() }}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom row: batch operations */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.actionButton, { backgroundColor: `${COLORS.RED}15`, borderColor: `${COLORS.RED}30` }]}
        >
          <Trash2 size={18} color={COLORS.RED} />
          <Text style={{ color: COLORS.RED, fontSize: FONT_BUTTON(), fontWeight: '600' }}>删除</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPin}
          style={[styles.actionButton, { backgroundColor: `${P}15`, borderColor: `${P}30` }]}
        >
          <Pin size={18} color={P} />
          <Text style={{ color: P, fontSize: FONT_BUTTON(), fontWeight: '600' }}>置顶</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onUnpin}
          style={[styles.actionButton, { backgroundColor: `${COLORS.ORANGE}15`, borderColor: `${COLORS.ORANGE}30` }]}
        >
          <PinOff size={18} color={COLORS.ORANGE} />
          <Text style={{ color: COLORS.ORANGE, fontSize: FONT_BUTTON(), fontWeight: '600' }}>取消置顶</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAddTag}
          style={[styles.actionButton, { backgroundColor: `${COLORS.GREEN}15`, borderColor: `${COLORS.GREEN}30` }]}
        >
          <Tag size={18} color={COLORS.GREEN} />
          <Text style={{ color: COLORS.GREEN, fontSize: FONT_BUTTON(), fontWeight: '600' }}>打标签</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  selectActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});

const BatchActionBar = React.memo(BatchActionBarComponent);
export default BatchActionBar;
