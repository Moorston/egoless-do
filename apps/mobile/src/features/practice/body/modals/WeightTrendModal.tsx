import { FONT_TITLE, FONT_BODY, FONT_SMALL, type CheckinEntry, type Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';

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
      <View style={{ flex: 1, backgroundColor: TH.cardSolid }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: TH.border }}>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyWeightTrend')}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
        </View>

        {/* WeightTrendChart - scrollable */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <WeightTrendChart TH={TH} T={T} checkins={checkins} />
        </ScrollView>
      </View>
    </Modal>
  );
}
