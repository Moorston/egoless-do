import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from './UI';
import { FONT_HERO, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_BUTTON } from '@egoless-do/core';

interface Props {
  visible: boolean;
  value: string; // HH:MM
  onConfirm: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ITEM_HEIGHT = 52;

export default function TimePickerModal({ visible, value, onConfirm, onClose }: Props) {
  const TH = useTheme();
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && value) {
      const [h, m] = value.split(':').map(Number);
      setHour(h);
      setMinute(m);
      const timer = setTimeout(() => {
        hourRef.current?.scrollTo({ y: h * ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollTo({ y: (m / 5) * ITEM_HEIGHT, animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onConfirm(timeStr);
  };

  const renderColumn = (
    items: number[],
    selected: number,
    onSelect: (val: number) => void,
    ref: React.RefObject<ScrollView>,
    format: (val: number) => string = (v) => String(v).padStart(2, '0')
  ) => (
    <ScrollView
      ref={ref}
      style={{ height: ITEM_HEIGHT * 5 }}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <TouchableOpacity
            key={item}
            activeOpacity={0.7}
            onPress={() => onSelect(item)}
            style={{
              height: ITEM_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isSelected ? `${TH.primary}15` : 'transparent',
              borderRadius: 10,
              marginHorizontal: 8,
            }}
          >
            <Text style={{
              fontSize: isSelected ? 36 : 26,
              fontWeight: isSelected ? '700' : '400',
              color: isSelected ? TH.primary : `${TH.text}80`,
              letterSpacing: 1,
            }}>
              {format(item)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          {/* Handle bar */}
          <View style={{ width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16, backgroundColor: `${TH.text}20` }} />
          
          {/* Title */}
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', textAlign: 'center', marginBottom: 24, color: TH.text }}>选择提醒时间</Text>
          
          {/* Time picker */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            {/* Hour column */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', marginBottom: 12, color: TH.sub }}>时</Text>
              {renderColumn(HOURS, hour, setHour, hourRef as any)}
            </View>
            
            {/* Separator */}
            <View style={{ paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TH.primary, marginBottom: 12 }} />
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TH.primary }} />
            </View>
            
            {/* Minute column */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', marginBottom: 12, color: TH.sub }}>分</Text>
              {renderColumn(MINUTES, minute, setMinute, minuteRef as any)}
            </View>
          </View>

          {/* Preview */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 16, marginBottom: 24, backgroundColor: `${TH.primary}12` }}>
            <Text style={{ fontSize: 42, fontWeight: '700', color: TH.primary, letterSpacing: 2 }}>
              {String(hour).padStart(2, '0')}
            </Text>
            <Text style={{ fontSize: 42, fontWeight: '300', color: TH.primary, marginHorizontal: 4 }}>:</Text>
            <Text style={{ fontSize: 42, fontWeight: '700', color: TH.primary, letterSpacing: 2 }}>
              {String(minute).padStart(2, '0')}
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: TH.border, alignItems: 'center', marginRight: 6 }}>
              <Text style={{ fontSize: FONT_BUTTON, fontWeight: '600', color: TH.sub }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: TH.primary, alignItems: 'center', marginLeft: 6 }}>
              <Text style={{ fontSize: FONT_BUTTON, fontWeight: '700', color: '#fff' }}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
