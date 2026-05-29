import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, useT, ScreenHeader } from '../../components/UI';
import { COLORS, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_EMPTY } from '@egoless-do/core';
import type { RecycleBinItem, RecycleBinEntityType } from '@egoless-do/core';
import {
  Trash2, RotateCcw, Target, Sparkles, Utensils, Dumbbell, ClipboardList, Clock,
} from 'lucide-react-native';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const ENTITY_ICONS: Record<RecycleBinEntityType, React.ComponentType<any>> = {
  habit: Target,
  reflection: Sparkles,
  food: Utensils,
  exercise: Dumbbell,
  plan: ClipboardList,
};

const ENTITY_COLORS: Record<RecycleBinEntityType, string> = {
  habit: COLORS.GREEN,
  reflection: '#7C3AED',
  food: COLORS.ORANGE,
  exercise: COLORS.BLUE,
  plan: '#E11D48',
};

function getItemName(item: RecycleBinItem): string {
  const d = item.data as any;
  switch (item.entityType) {
    case 'habit': return d.name ?? '习惯';
    case 'reflection': return (d.content ?? '').slice(0, 30) || '感念';
    case 'food': return d.name ?? '饮食';
    case 'exercise': return d.sportKey ?? '运动';
    case 'plan': return d.name ?? '计划';
    default: return '未知';
  }
}

function getDaysLeft(deletedAt: number): number {
  const remaining = EXPIRY_MS - (Date.now() - deletedAt);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export default function RecycleBinScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const nav = useNavigation();
  const store = useAppStore();
  const recycleBin = useAppStore(s => s.recycleBin ?? []);
  const restoreFromRecycleBin = useAppStore(s => s.restoreFromRecycleBin);
  const removeFromRecycleBin = useAppStore(s => s.removeFromRecycleBin);
  const emptyRecycleBin = useAppStore(s => s.emptyRecycleBin);

  const handleRestore = (id: string) => {
    Alert.alert(T('recycleBinRestore'), T('recycleBinRestoreConfirm'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), onPress: () => restoreFromRecycleBin(id) },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert(T('recycleBinDelete'), T('recycleBinDeleteConfirm'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => removeFromRecycleBin(id) },
    ]);
  };

  const handleEmptyAll = () => {
    Alert.alert(T('recycleBinEmptyAll'), T('recycleBinEmptyConfirm'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => emptyRecycleBin() },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <ScreenHeader title={T('recycleBinTitle')} compact onBack={() => nav.goBack()} />

        {recycleBin.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Trash2 size={48} color={TH.sub} />
            <Text style={{ color: TH.sub, fontSize: FONT_EMPTY, marginTop: 16 }}>{T('recycleBinEmpty')}</Text>
          </View>
        ) : (
          <>
            {/* Items */}
            {recycleBin.map(item => {
              const Icon = ENTITY_ICONS[item.entityType] ?? Trash2;
              const color = ENTITY_COLORS[item.entityType] ?? TH.sub;
              const daysLeft = getDaysLeft(item.deletedAt);

              return (
                <Card key={item.id} style={{ marginBottom: 10, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }} numberOfLines={1}>
                        {getItemName(item)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Clock size={12} color={TH.sub} />
                        <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                          {T('recycleBinDaysLeft').replace('{days}', String(daysLeft))}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleRestore(item.id)}
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: `${COLORS.GREEN}20`, alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <RotateCcw size={16} color={COLORS.GREEN} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: `${COLORS.RED}20`, alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={16} color={COLORS.RED} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })}

            {/* Empty All button */}
            <TouchableOpacity
              onPress={handleEmptyAll}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, paddingVertical: 12, marginTop: 8,
                borderRadius: 12, borderWidth: 1, borderColor: COLORS.RED,
              }}
            >
              <Trash2 size={16} color={COLORS.RED} />
              <Text style={{ color: COLORS.RED, fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('recycleBinEmptyAll')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Auto-delete hint */}
        <Text style={{
          color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', marginTop: 24,
        }}>
          {T('recycleBinAutoDelete')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
