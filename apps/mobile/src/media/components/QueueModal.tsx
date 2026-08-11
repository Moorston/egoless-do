// ─── 播放队列管理 Modal ─────────────────────────────────────────

import { FONT_BODY, FONT_SUB, FONT_TITLE } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { X, Trash2, Play } from 'lucide-react-native';
import React from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity } from 'react-native';

import AnimatedMusicIcon from '../../components/AnimatedMusicIcon';
import { useTheme, useT } from '../../components/UI';
import { useMusicStore } from '../useMusicStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryColor: string;
}

export default function QueueModal({ visible, onClose, primaryColor }: Props) {
  const TH = useTheme();
  const T = useT();

  const queue = useMusicStore(s => s.queue);
  const queueIndex = useMusicStore(s => s.queueIndex);
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const play = useMusicStore(s => s.play);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const setQueue = useMusicStore(s => s.setQueue);
  const removeFromQueue = useMusicStore(s => s.removeFromQueue);

  const handlePlayTrack = (index: number) => {
    const track = queue[index];
    if (!track) return;
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      setQueue(queue, index);
      play(track);
    }
    onClose();
  };

  const renderItem = ({ item, index }: { item: MusicTrack; index: number }) => {
    const isCurrent = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        onPress={() => handlePlayTrack(index)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}
      >
        <AnimatedMusicIcon isPlaying={isCurrent && isPlaying} color={isCurrent ? primaryColor : TH.text} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_BODY(), color: isCurrent ? primaryColor : TH.text, fontWeight: isCurrent ? '600' : '400' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>
            {index === queueIndex ? T('musicPlaying') : `#${index + 1}`}
          </Text>
        </View>
        {isCurrent ? (
          <Play size={16} color={primaryColor} />
        ) : (
          <TouchableOpacity onPress={() => removeFromQueue(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
            <Trash2 size={16} color={TH.sub} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 40, maxHeight: '70%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('musicQueue')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 6 }}>
              <X size={20} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {queue.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('musicNoTracks')}</Text>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: TH.border, marginHorizontal: 16 }} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}