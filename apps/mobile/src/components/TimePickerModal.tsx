import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from './UI';
import { FONT_TITLE, FONT_SUB, FONT_BODY, FONT_BUTTON } from '@egoless-do/core';

interface Props {
  visible: boolean;
  value: string; // HH:MM
  onConfirm: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10,...55

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
      // Scroll to selected positions after a short delay
      setTimeout(() => {
        hourRef.current?.scrollTo({ y: h * 44, animated: false });
        minuteRef.current?.scrollTo({ y: (m / 5) * 44, animated: false });
      }, 100);
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
      style={{ maxHeight: 200 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={44}
      decelerationRate="fast"
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onSelect(item)}
            style={{
              height: 44,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isSelected ? `${TH.primary}20` : 'transparent',
              borderRadius: 8,
            }}
          >
            <Text style={{
              fontSize: FONT_BODY,
              fontWeight: isSelected ? '700' : '400',
              color: isSelected ? TH.primary : TH.text,
            }}>
              {format(item)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 20 }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, textAlign: 'center', marginBottom: 20 }}>
            选择提醒时间
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
            {/* Hour column */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>时</Text>
              {renderColumn(HOURS, hour, setHour, hourRef as any)}
            </View>
            
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, alignSelf: 'center', marginTop: 20 }}>:</Text>
            
            {/* Minute column */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>分</Text>
              {renderColumn(MINUTES, minute, setMinute, minuteRef as any)}
            </View>
          </View>

          {/* Preview */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
              {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}
              style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: TH.primary, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}