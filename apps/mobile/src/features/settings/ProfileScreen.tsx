import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../store/useAppStore';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Card, useTheme, useT, RowItem } from '../../components/UI';
import {
  COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD,
  createLogger,
} from '@egoless-do/core';
import {
  Pencil, Flame, Target, CalendarDays, Brain, Scale, Droplets,
  Database, LogOut, ChevronRight, Check, X, Camera,
} from 'lucide-react-native';
import { useRootNavigation } from '../../navigation/hooks';

const log = createLogger('Profile');

export default function ProfileScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useRootNavigation();

  const [editNickname, setEditNickname] = useState(store.userProfile.nickname ?? '');
  const [editingNickname, setEditingNickname] = useState(false);
  const [editWeight, setEditWeight] = useState(store.userProfile.weight != null ? String(store.userProfile.weight) : '');
  const [editWaterGoal, setEditWaterGoal] = useState(String(store.waterGoal));
  const [clearing, setClearing] = useState(false);
  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weightRef = useRef(editWeight);
  const waterRef = useRef(editWaterGoal);

  // Flush pending saves on unmount
  useEffect(() => () => {
    if (weightTimer.current) { clearTimeout(weightTimer.current); }
    if (waterTimer.current) { clearTimeout(waterTimer.current); }
    // Final save with latest values
    const w = weightRef.current;
    const wn = w ? parseFloat(w) : undefined;
    store.updateUserProfile({ weight: wn });
    const wg = parseInt(waterRef.current, 10);
    if (!isNaN(wg) && wg > 0) store.setWaterGoal(wg);
  }, []);

  const weightUnit = useAppStore(s => s.weightUnit);
  const setWeightUnit = useAppStore(s => s.setWeightUnit);

  const profileStats = useMemo(() => {
    const totalCheckinDays = (store.checkinHistory ?? []).filter(c => c.done && !c.deleted).length;
    const activeHabits = (store.habits ?? []).filter(h => !h.deleted && h.status !== 'archived').length;
    const totalReflections = (store.reflections ?? []).filter(r => !r.deleted).length;
    return { totalCheckinDays, activeHabits, totalReflections };
  }, [store.checkinHistory, store.habits, store.reflections]);

  const displayName = store.userProfile.nickname ?? store.auth.user?.name ?? T('settingsDefaultName');
  const avatarUri = store.userProfile.avatar;

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(T('profilePermDenied'), T('profilePermDeniedMsg'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Resize to ~200x200 to keep base64 small for sync
        const base64 = `data:image/jpeg;base64,${asset.base64}`;
        store.updateUserProfile({ avatar: base64 });
      }
    } catch (e) {
      log.error(e, { message: 'Avatar pick error' });
    }
  };

  const removeAvatar = () => {
    store.updateUserProfile({ avatar: undefined });
  };

  const saveNickname = () => {
    store.updateUserProfile({ nickname: editNickname.trim() || undefined });
    setEditingNickname(false);
  };

  const saveWeight = () => {
    const num = editWeight ? parseFloat(editWeight) : undefined;
    store.updateUserProfile({ weight: num });
  };

  const debouncedSaveWeight = useCallback((val: string) => {
    setEditWeight(val);
    weightRef.current = val;
    if (weightTimer.current) clearTimeout(weightTimer.current);
    weightTimer.current = setTimeout(() => {
      weightTimer.current = null;
      const num = val ? parseFloat(val) : undefined;
      store.updateUserProfile({ weight: num });
    }, 800);
  }, []);

  const saveWaterGoal = () => {
    const num = parseInt(editWaterGoal, 10);
    if (!isNaN(num) && num > 0) store.setWaterGoal(num);
  };

  const debouncedSaveWaterGoal = useCallback((val: string) => {
    setEditWaterGoal(val);
    waterRef.current = val;
    if (waterTimer.current) clearTimeout(waterTimer.current);
    waterTimer.current = setTimeout(() => {
      waterTimer.current = null;
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) store.setWaterGoal(num);
    }, 800);
  }, []);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Profile" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <Card style={{ marginBottom: 12 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={pickAvatar} onLongPress={avatarUri ? removeAvatar : undefined}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: `${P}30`,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                ) : (
                  <Text style={{ fontSize: 32, fontWeight: '700', color: P }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              {/* Camera overlay */}
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: P, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: TH.card,
              }}>
                <Camera size={14} color="#fff" />
              </View>
            </TouchableOpacity>

            {editingNickname ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                <TextInput
                  value={editNickname}
                  onChangeText={setEditNickname}
                  placeholder={T('settingsNickname')}
                  placeholderTextColor={TH.sub}
                  style={{
                    flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 12,
                    color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border,
                  }}
                />
                <TouchableOpacity onPress={saveNickname} style={{ padding: 8 }}>
                  <Check size={22} color={COLORS.GREEN} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingNickname(false); setEditNickname(store.userProfile.nickname ?? ''); }} style={{ padding: 8 }}>
                  <X size={22} color={TH.sub} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingNickname(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE }}>{displayName}</Text>
                <Pencil size={14} color={TH.sub} />
              </TouchableOpacity>
            )}

            <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
              {store.auth.user?.email ?? ''}
            </Text>
          </View>
        </Card>

        {/* Stats */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB, fontWeight: '600', marginBottom: 12 }}>
            {T('profileStats')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { icon: <Flame size={16} color="#F59E0B" />, value: store.streak, label: T('checkinStreak') },
              { icon: <Target size={16} color={P} />, value: profileStats.activeHabits, label: T('habits') },
              { icon: <CalendarDays size={16} color="#10B981" />, value: profileStats.totalCheckinDays, label: T('globalPulse.totalDays') },
              { icon: <Brain size={16} color="#8B5CF6" />, value: profileStats.totalReflections, label: T('reflections') },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                {s.icon}
                <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: TH.text }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: TH.sub }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Body data */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB, fontWeight: '600', marginBottom: 12 }}>
            {T('profileBodyData')}
          </Text>

          {/* Weight */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <Scale size={18} color={P} />
            <Text style={{ color: TH.text, fontSize: FONT_BODY, width: 60 }}>{T('profileWeight')}</Text>
            <TextInput
              value={editWeight}
              onChangeText={debouncedSaveWeight}
              placeholder="—"
              placeholderTextColor={TH.sub}
              keyboardType="numeric"
              style={{
                flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 10,
                color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border,
                textAlign: 'center',
              }}
            />
            <TouchableOpacity
              onPress={() => Alert.alert(T('settingsWeightUnit'), '', [
                { text: T('weightUnitKg'), onPress: () => setWeightUnit('kg') },
                { text: T('weightUnitLb'), onPress: () => setWeightUnit('lb') },
                { text: T('commonCancel'), style: 'cancel' },
              ])}
              style={{
                paddingHorizontal: 12, paddingVertical: 10,
                backgroundColor: `${P}20`, borderRadius: 10,
              }}
            >
              <Text style={{ color: P, fontSize: FONT_SUB, fontWeight: '600' }}>{weightUnit}</Text>
            </TouchableOpacity>
          </View>

          {/* Water goal */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Droplets size={18} color="#3B82F6" />
            <Text style={{ color: TH.text, fontSize: FONT_BODY, width: 60 }}>{T('profileWaterGoal')}</Text>
            <TextInput
              value={editWaterGoal}
              onChangeText={debouncedSaveWaterGoal}
              keyboardType="numeric"
              style={{
                flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 10,
                color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border,
                textAlign: 'center',
              }}
            />
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, width: 30 }}>ml</Text>
          </View>
        </Card>

        {/* Account */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB, fontWeight: '600', marginBottom: 8 }}>
            {T('profileAccount')}
          </Text>
          <TouchableOpacity
            disabled={clearing}
            onPress={() => {
              Alert.alert(
                T('settingsClearData'),
                T('settingsClearConfirm'),
                [
                  { text: T('commonCancel'), style: 'cancel' },
                  {
                    text: T('settingsClearData'),
                    style: 'destructive',
                    onPress: async () => {
                      setClearing(true);
                      try {
                        await store.clearDataAndLogout();
                        nav.reset({ index: 0, routes: [{ name: 'Login' }] });
                      } catch {
                        Alert.alert(T('clearDataPushFail'));
                      }
                      setClearing(false);
                    },
                  },
                ],
              );
            }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            {clearing
              ? <ActivityIndicator size="small" color={TH.sub} style={{ marginRight: 12 }} />
              : <Database size={18} color="#F59E0B" style={{ marginRight: 12 }} />
            }
            <Text style={{ color: clearing ? TH.sub : '#F59E0B', fontSize: FONT_BODY, flex: 1 }}>
              {clearing ? T('clearDataLoading') : T('settingsClearData')}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: TH.border }} />
          <TouchableOpacity
            onPress={async () => { await store.logout(); nav.reset({ index: 0, routes: [{ name: 'Login' }] }); }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            <LogOut size={18} color="#EF4444" style={{ marginRight: 12 }} />
            <Text style={{ color: '#EF4444', fontSize: FONT_BODY, flex: 1 }}>{T('settingsLogout')}</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
