import {FONT_TITLE, FONT_BODY, FONT_SMALL, type Theme} from '@egoless-do/core';
import { RefreshCw, SkipForward, ArrowLeftRight, Settings, X } from 'lucide-react-native';
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  dayLabel: string;
  isRest: boolean;
  hasOverride: boolean;
  onSwap: () => void;
  onSkip: () => void;
  onSwapDays: () => void;
  onAdjust: () => void;
  TH: Theme;
  T: (key: string) => string;
}

export default function DayActionSheet({ visible, onClose, dayLabel, isRest, hasOverride, onSwap, onSkip, onSwapDays, onAdjust, TH, T }: Props) {
  const actions = [
    {
      icon: <RefreshCw size={18} color="#f59e0b" />,
      label: T('bodySwapExercise'),
      onPress: () => { onClose(); onSwap(); },
      color: '#f59e0b',
    },
    {
      icon: <SkipForward size={18} color="#ef4444" />,
      label: isRest ? (T('bodyRestoreDay')) : (T('bodyMarkRest')),
      onPress: () => { onClose(); onSkip(); },
      color: '#ef4444',
    },
    {
      icon: <ArrowLeftRight size={18} color="#6366f1" />,
      label: T('bodySwapDays'),
      onPress: () => { onClose(); onSwapDays(); },
      color: '#6366f1',
    },
    {
      icon: <Settings size={18} color="#8b5cf6" />,
      label: T('bodyEditDayExercises'),
      onPress: () => { onClose(); onAdjust(); },
      color: '#8b5cf6',
      hide: isRest,
    },
  ].filter(a => !a.hide);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{dayLabel}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Override indicator */}
          {hasOverride && (
            <View style={{ backgroundColor: '#f59e0b15', borderRadius: 8, padding: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b' }}>{T('bodyHasOverride')}</Text>
            </View>
          )}

          {/* Actions */}
          {actions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={action.onPress}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: idx < actions.length - 1 ? 1 : 0, borderBottomColor: TH.border }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: action.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                {action.icon}
              </View>
              <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600', flex: 1 }}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}
