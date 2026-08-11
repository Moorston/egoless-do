// ─── 睡眠定时器 Modal（共享组件） ───────────────────────────────

import { COLORS, FONT_BODY } from '@egoless-do/core';
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import { useMusicStore } from '../useMusicStore';
import { SLEEP_PRESETS } from '../utils/constants';

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryColor: string;
}

export default function SleepTimerModal({ visible, onClose, primaryColor }: Props) {
  const TH = useTheme();
  const T = useT();

  const sleepTimerMinutes = useMusicStore(s => s.sleepTimerMinutes);
  const setSleepTimer = useMusicStore(s => s.setSleepTimer);

  const handleSelect = useCallback((minutes: number | null) => {
    setSleepTimer(minutes);
    onClose();
  }, [setSleepTimer, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY(), color: TH.text, marginBottom: 16, textAlign: 'center' }}>{T('musicSleepTimer')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {SLEEP_PRESETS.map(min => (
              <TouchableOpacity key={min} onPress={() => handleSelect(min)}
                style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: sleepTimerMinutes === min ? primaryColor : TH.card }}>
                <Text style={{ color: sleepTimerMinutes === min ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{min}分钟</Text>
              </TouchableOpacity>
            ))}
            {sleepTimerMinutes && (
              <TouchableOpacity onPress={() => handleSelect(null)}
                style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,.15)', width: '100%', alignItems: 'center' }}>
                <Text style={{ color: COLORS.RED, fontWeight: '600', fontSize: FONT_BODY() }}>{T('musicSleepTimerOff')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}