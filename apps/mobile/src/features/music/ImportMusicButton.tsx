import React, { useCallback } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Upload } from 'lucide-react-native';
import { FONT_BODY } from '@egoless-do/core';
import { useMusicStore } from './useMusicStore';

interface Props {
  T: (key: string) => string;
  primaryColor: string;
}

export default function ImportMusicButton({ T, primaryColor }: Props) {
  const addUserTrack = useMusicStore(s => s.addUserTrack);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await addUserTrack(asset.name, asset.uri);
    } catch (e) {
      console.warn('Import failed:', e);
    }
  }, [addUserTrack]);

  return (
    <TouchableOpacity onPress={handleImport}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.1)' }}>
      <Upload size={14} color={primaryColor} />
      <Text style={{ fontSize: FONT_BODY, color: primaryColor }}>{T('musicImport')}</Text>
    </TouchableOpacity>
  );
}
