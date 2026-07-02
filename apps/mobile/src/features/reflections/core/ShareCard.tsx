import React, { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme, useT } from '../../../components/UI';
import { MIND_COLORS_EXTENDED, FONT_BODY, FONT_SUB, FONT_SMALL } from '@egoless-do/core';
import { X, Download, Share2 } from 'lucide-react-native';

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
}

export default function ShareCard({ visible, onClose, reflection }: ShareCardProps) {
  const TH = useTheme();
  const T = useT();
  const viewShotRef = useRef<any>(null);
  const [capturing, setCapturing] = useState(false);

  if (!reflection) return null;

  const parsedColors = typeof reflection.colors === 'string' ? (() => { try { return JSON.parse(reflection.colors); } catch { return null; } })() : reflection.colors;
  const bgIdx = MIND_COLORS_EXTENDED.findIndex(c => c[0] === (parsedColors?.[0]));
  const bgColor = MIND_COLORS_EXTENDED[bgIdx >= 0 ? bgIdx : 0]?.[0] ?? MIND_COLORS_EXTENDED[0][0];
  const bgColor2 = MIND_COLORS_EXTENDED[bgIdx >= 0 ? bgIdx : 0]?.[1] ?? MIND_COLORS_EXTENDED[0][1];

  const timeStr = new Date(reflection.timestamp ?? 0).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  const handleCapture = async () => {
    try {
      setCapturing(true);
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
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
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if ((result as any).granted || (result as any).status === 'granted') {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          FileSystem.cacheDirectory ?? '',
          `reflection-${Date.now()}`,
          'image/png',
        );
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert(T('shareCardSaved'), T('shareCardSavedMsg'));
      }
    } catch (e) {
      Alert.alert(T('shareCardError'), T('shareCardSaveErrorMsg'));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.8)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        {/* Close button */}
        <View style={{ position: 'absolute', top: 60, right: 24, zIndex: 10 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Card preview */}
        {ViewShot ? (
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
                <Text style={{ color: 'rgba(255,255,255,.2)', fontSize: 48, lineHeight: 52, marginBottom: -8 }}>「</Text>

                {/* Content */}
                <Text style={{ color: '#fff', fontSize: FONT_BODY + 2, lineHeight: 28, marginBottom: 8, fontWeight: '500' }}>
                  {reflection.content}
                </Text>

                {/* Closing quote */}
                <Text style={{ color: 'rgba(255,255,255,.2)', fontSize: 48, lineHeight: 52, marginTop: -16, marginBottom: 12, textAlign: 'right' }}>」</Text>

                {/* Tags + Mood */}
                {(reflection.tags.length > 0 || reflection.mood) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {reflection.tags.map(tag => (
                      <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.2)' }}>
                        <Text style={{ color: 'rgba(255,255,255,.9)', fontSize: FONT_SMALL }}>{tag}</Text>
                      </View>
                    ))}
                    {reflection.mood && (
                      <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.15)' }}>
                        <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: FONT_SMALL }}>💭 {reflection.mood}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Footer */}
                <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>📅 {timeStr}</Text>
                  <Text style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>❤️ 心流纪 · Egoless Do</Text>
                </View>
              </View>
            </View>
          </ViewShot>
        ) : (
          <View style={{ width: 320, overflow: 'hidden', backgroundColor: bgColor, padding: 28, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: FONT_BODY }}>{T('shareCardLoading')}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
          <TouchableOpacity onPress={handleCapture} disabled={capturing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, opacity: capturing ? 0.5 : 1 }}>
            <Share2 size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '600' }}>{T('shareCardShare')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={capturing}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, opacity: capturing ? 0.5 : 1 }}>
            <Download size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '600' }}>{T('shareCardSave')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
