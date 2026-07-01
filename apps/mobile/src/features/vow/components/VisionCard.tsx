import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flag, Target, Star, ChevronRight } from 'lucide-react-native';
import type { Vision } from '@egoless-do/core';
import { VISION_TIME_FRAMES, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import { ProgressBar } from '../../../components/UI';

interface Props {
  vision: Vision;
  TH: any;
  T: (key: string) => string;
  pct: number;
  onEdit: (v: Vision) => void;
  onAchieve: (id: string) => void;
  onArchive: (id: string) => void;
}

const TYPE_ICON: Record<string, any> = { lifetime: Star, long: Flag, short: Target };

export default function VisionCard({ vision, TH, T, pct, onEdit, onAchieve, onArchive }: Props) {
  const Icon = TYPE_ICON[vision.type] ?? Flag;
  const typeColor = vision.type === 'lifetime' ? '#F59E0B' : vision.type === 'long' ? '#8B5CF6' : '#10B981';

  const timeFrameLabel = useMemo(() => {
    if (!vision.timeFrame) return null;
    const tf = VISION_TIME_FRAMES.find(f => f.key === vision.timeFrame);
    return tf ? T(tf.labelKey) : vision.timeFrame;
  }, [vision.timeFrame, T]);

  const deadlineText = vision.deadline
    ? vision.deadline
    : null;

  return (
    <View style={{
      backgroundColor: TH.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: typeColor,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon size={14} color={typeColor} />
            <Text style={{ fontSize: FONT_BADGE, color: typeColor, fontWeight: '600' }}>
              {T(vision.type === 'lifetime' ? 'vowLifetime' : vision.type === 'long' ? 'vowLong' : 'vowShort')}
            </Text>
            {timeFrameLabel && (
              <Text style={{
                fontSize: 11, color: TH.sub,
                backgroundColor: `${TH.border}60`,
                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
              }}>
                {timeFrameLabel}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 22 }}>{vision.text}</Text>
          {deadlineText && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
              {T('vowDeadline')}: {deadlineText}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onEdit(vision)} style={{ padding: 6 }}>
          <Text style={{ fontSize: FONT_BADGE, color: '#8B5CF6', fontWeight: '600' }}>{T('vowEdit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('vowProgress')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: '#8B5CF6', fontWeight: '600' }}>{pct}%</Text>
        </View>
        <ProgressBar pct={pct} color="#8B5CF6" />
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {vision.status === 'active' && (
          <>
            <TouchableOpacity
              onPress={() => onAchieve(vision.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingVertical: 4, paddingHorizontal: 10,
                backgroundColor: '#10B98120', borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: FONT_BADGE, color: '#10B981', fontWeight: '600' }}>{T('vowAchieve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onArchive(vision.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingVertical: 4, paddingHorizontal: 10,
                backgroundColor: `${TH.border}60`, borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('vowArchive')}</Text>
            </TouchableOpacity>
          </>
        )}
        {vision.status === 'achieved' && (
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
            backgroundColor: '#10B98115',
          }}>
            <Text style={{ fontSize: FONT_BADGE, color: '#10B981', fontWeight: '600' }}>{T('vowAchieved')}</Text>
          </View>
        )}
        {vision.status === 'archived' && (
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
            backgroundColor: `${TH.border}40`,
          }}>
            <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('vowArchived')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
