// ─── FilterDropdown ────────────────────────────────────────────────
// QuickCreateTrailScreen 三个同构 dropdown（时间范围/标签/心情）的参数化收敛。
// 差异显式参数化（不推断）：activeColor（primary vs 紫）/ itemStyle 三态
// （plain 无 checkbox；checkbox vs checkboxMood 为两个同名 StyleSheet key，
// 值相同但逐字保留不合并）/ scrollable（固定菜单 vs 滚动菜单）/ onClear
// 有无（标签/心情有"全部"清空项，时间无）。
// onSelect 后是否关闭 dropdown 是调用方行为：时间 handler 自行关闭
// （单选），标签/心情不关（多选保持展开）——组件不预设。
import { FONT_SMALL } from '@egoless-do/core';
import { Check, ChevronDown } from 'lucide-react-native';
import React from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';


import { useTheme } from '../../../components/UI';

export interface FilterDropdownOption {
  key: string;
  /** 已本地化的显示文案（心情项含 icon 前缀） */
  label: string;
}

export interface FilterDropdownProps {
  /** 已本地化的触发文案（含计数） */
  triggerLabel: string;
  /** 决定 trigger 高亮（时间: timeRange !== 'month'；标签/心情: 有选中项） */
  isActive: boolean;
  /** 高亮色（标签系 TH.primary，心情系 '#8B5CF6'） */
  activeColor: string;
  options: FilterDropdownOption[];
  /** 选中项 key 集合（时间单选传 [timeRange]） */
  activeKeys: string[];
  onSelect: (key: string) => void;
  /** 传入则渲染"全部"清空项 */
  onClear?: () => void;
  /** "全部"项文案（已本地化） */
  allLabel?: string;
  /** plain=无 checkbox（时间）；checkbox/checkboxMood=带勾选框（逐字对应原两个 StyleSheet key） */
  itemStyle: 'plain' | 'checkbox' | 'checkboxMood';
  /** false=固定高度菜单（时间）；true=可滚动菜单（标签/心情） */
  scrollable: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDropdown({
  triggerLabel, isActive, activeColor, options, activeKeys,
  onSelect, onClear, allLabel, itemStyle, scrollable, isOpen, onOpenChange,
}: FilterDropdownProps) {
  const TH = useTheme();

  const items = (
    <>
      {onClear && allLabel && (
        <TouchableOpacity
          onPress={onClear}
          style={[
            styles.dropdownItem,
            { backgroundColor: activeKeys.length === 0 ? `${activeColor}15` : 'transparent' },
          ]}
        >
          <View style={[
            itemStyle === 'checkboxMood' ? styles.checkboxMood : styles.checkbox,
            {
              borderColor: activeKeys.length === 0 ? activeColor : TH.border,
              backgroundColor: activeKeys.length === 0 ? activeColor : 'transparent',
            },
          ]}>
            {activeKeys.length === 0 && <Check size={12} color="#fff" />}
          </View>
          <Text style={[styles.smallText, { color: TH.text }]}>{allLabel}</Text>
        </TouchableOpacity>
      )}
      {options.map(opt => {
        const active = activeKeys.includes(opt.key);
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={[
              styles.dropdownItem,
              { backgroundColor: active ? `${activeColor}15` : 'transparent' },
            ]}
          >
            {itemStyle !== 'plain' && (
              <View style={[
                itemStyle === 'checkboxMood' ? styles.checkboxMood : styles.checkbox,
                {
                  borderColor: active ? activeColor : TH.border,
                  backgroundColor: active ? activeColor : 'transparent',
                },
              ]}>
                {active && <Check size={12} color="#fff" />}
              </View>
            )}
            {/* 时间版（plain）active 文本取 activeColor；标签/心情版（checkbox 系）恒 TH.text——逐字保留原差异 */}
            <Text style={[styles.smallText, { color: itemStyle === 'plain' && active ? activeColor : TH.text }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  return (
    <View style={styles.relativeFlex1}>
      <TouchableOpacity
        onPress={() => onOpenChange(!isOpen)}
        style={[
          styles.dropdownTrigger,
          {
            backgroundColor: isActive ? `${activeColor}15` : TH.card,
            borderColor: isActive ? activeColor : TH.border,
          },
        ]}
      >
        <Text style={[styles.smallText, { color: TH.text }]}>{triggerLabel}</Text>
        <ChevronDown size={14} color={TH.sub} />
      </TouchableOpacity>
      {isOpen && (
        <View
          style={[
            scrollable ? styles.dropdownMenuScrollable : styles.dropdownMenu,
            { backgroundColor: TH.card, borderColor: TH.border },
          ]}
        >
          {scrollable ? <ScrollView>{items}</ScrollView> : items}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  relativeFlex1: { position: 'relative', flex: 1 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownMenuScrollable: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 240,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMood: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: { fontSize: FONT_SMALL() },
});
