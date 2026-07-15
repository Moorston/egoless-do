import { FONT_TITLE, FONT_BODY, FONT_SMALL, type CheckinEntry, type Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

import WeightTrendChart from '../WeightTrendChart';

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  checkins: CheckinEntry[];
  onClose: () => void;
}

export default function WeightTrendModal({ visible, TH, T, checkins, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '80%',
          paddingTop: 16,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyWeightTrend') || '体重趋势'}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* WeightTrendChart */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <WeightTrendChart TH={TH} T={T} checkins={checkins} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
