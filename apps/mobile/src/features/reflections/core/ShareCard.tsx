import {MIND_COLORS_EXTENDED, FONT_BODY, FONT_SMALL, formatDate, FONT_HERO} from '@egoless-do/core';
import { File as FSFile, Directory as FSDirectory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { X, Download, Share2, MessageSquare } from 'lucide-react-native';
import React, { useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import type { ViewShotRef } from 'react-native-view-shot';

import { useT } from '../../../components/UI';


interface ShareCardProps {
  visible: boolean;
  onClose: () => void;
  reflection: {
    content: string;
    tags: string[];
    mood?: string;
    timestamp: number;
    colors?: readonly [string, string];
  } | null;
  onTextShare?: () => void;
}

export default function ShareCard({ visible, onClose, reflection, onTextShare }: ShareCardProps) {
  const T = useT();
  const viewShotRef = useRef<ViewShotRef>(null);
  const [capturing, setCapturing] = useState(false);

  const parsedColors = useMemo(() => {
    if (!reflection) return null;
    if (typeof reflection.colors === 'string') {
      try {
        return JSON.parse(reflection.colors) as readonly [string, string];
      } catch {
        return null;
      }
    }
    return reflection.colors;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, [reflection?.colors]);

  const { bgColor, timeStr } = useMemo(() => {
    if (!reflection) return { bgColor: MIND_COLORS_EXTENDED[0][0], timeStr: '' };
    const bgIdx = MIND_COLORS_EXTENDED.findIndex(c => c[0] === (parsedColors?.[0]));
    const bgColor = MIND_COLORS_EXTENDED[bgIdx >= 0 ? bgIdx : 0]?.[0] ?? MIND_COLORS_EXTENDED[0][0];
    const timeStr = formatDate(new Date(reflection.timestamp ?? 0), 'zh', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });
    return { bgColor, timeStr };
  }, [reflection, parsedColors]);

  if (!visible || !reflection) return null;

  const doCapture = async (): Promise<string> => {
    if (!viewShotRef.current) throw new Error('view not ready');
    return viewShotRef.current.capture();
  };

  const handleCapture = async () => {
    try {
      setCapturing(true);
      const uri = await doCapture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: T('shareCardShare') });
      } else {
        Alert.alert(T('shareCardUnavailable'), T('shareCardUnavailableMsg'));
      }
    } catch (e) {
      Alert.alert(T('shareCardError'), T('shareCardErrorMsg'));
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    try {
      setCapturing(true);
      const uri = await doCapture();
      // New API: StorageAccessFramework is unavailable; use directory picker instead.
      // (pickDirectoryAsync returns the base Directory type; infer rather than annotate.)
      let dir: Awaited<ReturnType<typeof FSDirectory.pickDirectoryAsync>>;
      try {
        dir = await FSDirectory.pickDirectoryAsync();
      } catch {
        // User cancelled the picker — silently abort (legacy returned granted:false).
        return;
      }
      const base64 = await new FSFile(uri).base64();
      const file = dir.createFile(`reflection-${Date.now()}.png`, 'image/png');
      file.write(base64, { encoding: 'base64' });
      Alert.alert(T('shareCardSaved'), T('shareCardSavedMsg'));
    } catch (e) {
      Alert.alert(T('shareCardError'), T('shareCardSaveErrorMsg'));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.8)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 9999 }}>
        {/* Close button */}
        <View style={{ position: 'absolute', top: 60, right: 24, zIndex: 10 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Card preview */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <View style={{
            width: 320, overflow: 'hidden',
            backgroundColor: bgColor,
          }}>
          {/* Decorative circles */}
          <View style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.08)' }} />
          <View style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,.05)' }} />

          <View style={{ padding: 28 }}>
            {/* Quote mark */}
            <Text style={{ color: 'rgba(255,255,255,.2)', fontSize: FONT_HERO(), lineHeight: 52, marginBottom: -8 }}>「</Text>

            {/* Content */}
            <Text style={{ color: '#fff', fontSize: FONT_BODY() + 2, lineHeight: 28, marginBottom: 8, fontWeight: '500' }}>
              {reflection.content}
            </Text>

            {/* Closing quote */}
            <Text style={{ color: 'rgba(255,255,255,.2)', fontSize: FONT_HERO(), lineHeight: 52, marginTop: -16, marginBottom: 12, textAlign: 'right' }}>」</Text>

            {/* Tags + Mood */}
            {(reflection.tags.length > 0 || reflection.mood) && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {reflection.tags.map(tag => (
                  <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.2)' }}>
                    <Text style={{ color: 'rgba(255,255,255,.9)', fontSize: FONT_SMALL() }}>{tag}</Text>
                  </View>
                ))}
                {reflection.mood && (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.15)' }}>
                    <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: FONT_SMALL() }}>💭 {reflection.mood}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Footer */}
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL() }}>📅 {timeStr}</Text>
              <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_SMALL() }}>❤️ 心流纪 · Egoless Do</Text>
            </View>
          </View>
        </View>
        </ViewShot>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          {onTextShare && (
            <TouchableOpacity onPress={() => { onClose(); onTextShare(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 }}>
              <MessageSquare size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: '600' }}>{T('shareTextShare')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleCapture} disabled={capturing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, opacity: capturing ? 0.5 : 1 }}>
            <Share2 size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: '600' }}>{T('shareImageShare')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={capturing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, opacity: capturing ? 0.5 : 1 }}>
            <Download size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: '600' }}>{T('shareCardSave')}</Text>
          </TouchableOpacity>
        </View>
    </View>
  );
}
