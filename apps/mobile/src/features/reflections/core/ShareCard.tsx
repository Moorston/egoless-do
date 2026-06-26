import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../../components/UI';
import { MIND_COLORS_EXTENDED, FONT_BODY, FONT_SUB, FONT_SMALL, REFLECTION_CATEGORIES } from '@egoless-do/core';
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
  const viewShotRef = useRef<any>(null);

  if (!reflection) return null;

  const parsedColors = typeof reflection.colors === 'string' ? (() => { try { return JSON.parse(reflection.colors); } catch { return null; } })() : reflection.colors;
  const bgIdx = MIND_COLORS_EXTENDED.findIndex(c => c[0] === (parsedColors?.[0]));
  const bgColor = MIND_COLORS_EXTENDED[bgIdx >= 0 ? bgIdx : 0]?.[0] ?? MIND_COLORS_EXTENDED[0][0];
  const bgColor2 = MIND_COLORS_EXTENDED[bgIdx >= 0 ? bgIdx : 0]?.[1] ?? MIND_COLORS_EXTENDED[0][1];

  const category = REFLECTION_CATEGORIES.find(c => reflection.tags?.includes(`#${c.label}`));
  const timeStr = new Date(reflection.timestamp ?? 0).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  const handleCapture = async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '分享' });
      } else {
        Alert.alert('提示', '当前设备不支持分享');
      }
    } catch (e) {
      Alert.alert('错误', '截图失败，请重试');
    }
  };

  const handleSave = async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;

      const { status } = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (status === 'granted') {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          FileSystem.cacheDirectory ?? '',
          `reflection-${Date.now()}`,
          'image/png',
        );
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('成功', '图片已保存');
      }
    } catch (e) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.8)', justifyContent:'center', alignItems:'center', padding:24 }}>
        <View style={{ position:'absolute', top:60, right:24, zIndex:10 }}>
          <TouchableOpacity onPress={onClose} style={{ padding:8 }}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {ViewShot ? (
          <ViewShot ref={viewShotRef} options={{ format:'png', quality:1 }}>
            <View style={{
              width:320, borderRadius:24, overflow:'hidden',
              backgroundColor: bgColor,
            }}>
              {/* Decorative circles */}
              <View style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,.08)' }} />
              <View style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,.05)' }} />

              <View style={{ padding:28 }}>
                {/* Category badge */}
                {category && (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:16 }}>
                    <View style={{ paddingHorizontal:12, paddingVertical:4, borderRadius:12, backgroundColor:`${category.color}30` }}>
                      <Text style={{ color:category.color, fontSize:FONT_SMALL, fontWeight:'600' }}>{category.icon} {category.label}</Text>
                    </View>
                  </View>
                )}

                {/* Content */}
                <Text style={{ color:'#fff', fontSize:FONT_BODY + 2, lineHeight:28, marginBottom:20, fontWeight:'500' }}>
                  {reflection.content}
                </Text>

                {/* Tags */}
                {reflection.tags.length > 0 && (
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                    {reflection.tags.map(tag => (
                      <View key={tag} style={{ paddingHorizontal:12, paddingVertical:4, borderRadius:12, backgroundColor:'rgba(255,255,255,.2)' }}>
                        <Text style={{ color:'rgba(255,255,255,.9)', fontSize:FONT_SMALL }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Mood */}
                {reflection.mood && (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:20 }}>
                    <View style={{ paddingHorizontal:12, paddingVertical:4, borderRadius:12, backgroundColor:'rgba(255,255,255,.15)' }}>
                      <Text style={{ color:'rgba(255,255,255,.8)', fontSize:FONT_SMALL }}>{reflection.mood}</Text>
                    </View>
                  </View>
                )}

                {/* Footer */}
                <View style={{ borderTopWidth:1, borderTopColor:'rgba(255,255,255,.15)', paddingTop:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <Text style={{ color:'rgba(255,255,255,.5)', fontSize:FONT_SMALL }}>{timeStr}</Text>
                  <Text style={{ color:'rgba(255,255,255,.4)', fontSize:10 }}>Egoless Do · 感念</Text>
                </View>
              </View>
            </View>
          </ViewShot>
        ) : (
          <View style={{ width:320, borderRadius:24, overflow:'hidden', backgroundColor:bgColor, padding:28, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontSize:FONT_BODY }}>加载中...</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection:'row', gap:16, marginTop:24 }}>
          <TouchableOpacity onPress={handleCapture}
            style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(255,255,255,.15)', paddingHorizontal:24, paddingVertical:12, borderRadius:24 }}>
            <Share2 size={18} color="#fff" />
            <Text style={{ color:'#fff', fontSize:FONT_BODY, fontWeight:'600' }}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}
            style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(255,255,255,.15)', paddingHorizontal:24, paddingVertical:12, borderRadius:24 }}>
            <Download size={18} color="#fff" />
            <Text style={{ color:'#fff', fontSize:FONT_BODY, fontWeight:'600' }}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
