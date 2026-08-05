import { FONT_BODY, createLogger } from '@egoless-do/core';
import * as DocumentPicker from 'expo-document-picker';
import { Upload } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';

import { useTheme } from '../../components/UI';
import { useMusicStore } from '../useMusicStore';

const log = createLogger('Music');

interface Props {
  T: (key: string) => string;
  primaryColor: string;
}

export default function ImportMusicButton({ T, primaryColor }: Props) {
  const TH = useTheme();
  const addUserTrack = useMusicStore(s => s.addUserTrack);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setImporting(true);
      await addUserTrack(asset.name, asset.uri);
      Alert.alert(T('musicImportSuccess').replace('{name}', asset.name));
    } catch (e) {
      log.warn('Import failed:', e);
      Alert.alert(T('musicImportFailed'));
    } finally {
      setImporting(false);
    }
  }, [addUserTrack, T]);

  return (
    <TouchableOpacity onPress={handleImport} disabled={importing}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, opacity: importing ? 0.5 : 1 }}>
      <Upload size={14} color={primaryColor} />
      <Text style={{ fontSize: FONT_BODY(), color: primaryColor }}>{T('musicImport')}</Text>
    </TouchableOpacity>
  );
}
