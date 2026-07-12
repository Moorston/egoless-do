import {COLORS, FONT_TITLE, FONT_BODY, FONT_SUB,
  createLogger, FONT_LABEL, scaleFontSize, apiChangePassword, validatePassword} from '@egoless-do/core';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Pencil, Flame, Target, CalendarDays, Brain, Scale, Droplets,
  Database, LogOut, ChevronRight, Check, X, Camera, Lock,
  Trophy, Timer, Utensils, Quote, Footprints, ClipboardList, ListChecks,
} from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore, type MobileStore } from '../../store/useAppStore';



const log = createLogger('Profile');

export default function ProfileScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const {
    userProfile, auth, checkinHistory, habits, reflections,
    exerciseLog, fastingHistory, plans, planItems,
    waterGoal, streak, totalMedMinutes,
  } = useShallowStore(s => ({
    userProfile: s.userProfile,
    auth: s.auth,
    checkinHistory: s.checkinHistory,
    habits: s.habits,
    reflections: s.reflections,
    exerciseLog: s.exerciseLog,
    fastingHistory: s.fastingHistory,
    plans: s.plans,
    planItems: s.planItems,
    waterGoal: s.waterGoal,
    streak: s.streak,
    totalMedMinutes: s.totalMedMinutes,
  }));
  const nav = useRootNavigation();

  // Typed helper to avoid ESLint no-unsafe-* warnings on getStore()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const getStore = () => useAppStore.getState() as MobileStore;

  const [editNickname, setEditNickname] = useState(userProfile.nickname ?? '');
  const [editingNickname, setEditingNickname] = useState(false);
  const [editMotto, setEditMotto] = useState(userProfile.motto ?? '');
  const [editingMotto, setEditingMotto] = useState(false);
  const [editWeight, setEditWeight] = useState(userProfile.weight != null ? String(userProfile.weight) : '');
  const [editHeight, setEditHeight] = useState(userProfile.height != null ? String(userProfile.height) : '');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'private'>(userProfile.gender ?? 'private');
  const [editWaterGoal, setEditWaterGoal] = useState(String(waterGoal));
  const [clearing, setClearing] = useState(false);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdChanging, setPwdChanging] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const weightUnit = useShallowStore(s => s.weightUnit);
  const setWeightUnit = useShallowStore(s => s.setWeightUnit);

  const profileStats = useMemo(() => {
    const totalCheckinDays = (checkinHistory ?? []).filter(c => c.done && !c.deleted).length;
    const activeHabits = (habits ?? []).filter(h => !h.deleted && h.status !== 'archived').length;
    const totalReflections = (reflections ?? []).filter(r => !r.deleted).length;
    return { totalCheckinDays, activeHabits, totalReflections };
  }, [checkinHistory, habits, reflections]);

  const journeyStats = useMemo(() => {
    const createdAt = auth.user?.createdAt;
    const joinedDays = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt) / 86400000)) : 0;
    // Longest streak
    const history = (checkinHistory ?? []).filter(c => !c.deleted);
    let longestStreak = 0, current = 0;
    for (const c of history) { if (c.done) { current++; longestStreak = Math.max(longestStreak, current); } else { current = 0; } }
    // Total exercise hours
    const totalExerciseSec = (exerciseLog ?? []).filter(e => !e.deleted).reduce((s, e) => s + e.durationSec, 0);
    const totalExerciseHours = Math.round(totalExerciseSec / 3600);
    // Total fasting hours
    const totalFastingMs = (fastingHistory ?? []).filter(f => !f.deleted && f.endedAt).reduce((s, f) => s + ((f.endedAt ?? 0) - f.startedAt), 0);
    const totalFastingHours = Math.round(totalFastingMs / 3600000);
    // Plans & tasks
    const totalPlans = (plans ?? []).filter(p => !p.deleted).length;
    const totalPlanItems = (planItems ?? []).filter(i => !i.deleted).length;
    return { joinedDays, longestStreak, totalExerciseHours, totalFastingHours, totalPlans, totalPlanItems };
  }, [auth.user?.createdAt, checkinHistory, exerciseLog, fastingHistory, plans, planItems]);

  const displayName = userProfile.nickname ?? auth.user?.name ?? T('settingsDefaultName');
  const avatarUri = userProfile.avatar;

  const pickAvatar = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const status = permResult.status;
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
        getStore().updateUserProfile({ avatar: base64 });
      }
    } catch (e) {
      log.error(e, { message: 'Avatar pick error' });
    }
  };

  const removeAvatar = () => {
    getStore().updateUserProfile({ avatar: undefined });
  };

  const saveNickname = () => {
    getStore().updateUserProfile({ nickname: editNickname.trim() || undefined });
    setEditingNickname(false);
  };

  const saveMotto = () => {
    getStore().updateUserProfile({ motto: editMotto.trim() || undefined });
    setEditingMotto(false);
  };

  const saveWeight = useCallback((val: string) => {
    setEditWeight(val);
    const num = val ? parseFloat(val) : undefined;
    if (num !== undefined && !isNaN(num)) {
      getStore().updateUserProfile({ weight: num });
    }
  }, []);

  const saveHeight = useCallback((val: string) => {
    setEditHeight(val);
    const num = val ? parseFloat(val) : undefined;
    if (num !== undefined && !isNaN(num)) {
      getStore().updateUserProfile({ height: num });
    }
  }, []);

  const handleGenderChange = useCallback((gender: 'male' | 'female' | 'private') => {
    setEditGender(gender);
    getStore().updateUserProfile({ gender });
  }, []);

  const saveWaterGoal = useCallback((val: string) => {
    setEditWaterGoal(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) getStore().setWaterGoal(num);
  }, []);

  const handleChangePassword = useCallback(async () => {
    setPwdError('');
    if (!currentPassword) { setPwdError(T('profilePwdCurrentRequired')); return; }
    if (!newPassword) { setPwdError(T('profilePwdNewRequired')); return; }
    const validationError = validatePassword(newPassword);
    if (validationError) { setPwdError(validationError); return; }
    if (newPassword !== confirmPassword) { setPwdError(T('profilePwdNotMatch')); return; }
    setPwdChanging(true);
    try {
      const token = getStore().auth.token;
      if (!token) { setPwdError(T('profilePwdAuthError')); setPwdChanging(false); return; }
      await apiChangePassword(token, currentPassword, newPassword);
      setPwdModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        T('commonSuccess'),
        T('profilePwdChanged'),
        [{ text: T('commonOk'), onPress: () => { nav.reset({ index: 0, routes: [{ name: 'Login' }] }); } }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : T('profilePwdChangeFailed');
      setPwdError(msg);
    } finally {
      setPwdChanging(false);
    }
  }, [currentPassword, newPassword, confirmPassword, T, nav]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Profile" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + Name */}
        <Card style={{ marginBottom: 12 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <TouchableOpacity accessibilityLabel={'更换头像'} onPress={pickAvatar} onLongPress={avatarUri ? removeAvatar : undefined}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: `${P}30`,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80, borderRadius: 40 }} contentFit="cover" />
                ) : (
                  <Text style={{ fontSize: scaleFontSize(32), fontWeight: '700', color: P }}>
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
                    color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
                  }}
                />
                <TouchableOpacity accessibilityLabel={T('commonSave')} onPress={saveNickname} style={{ padding: 8 }}>
                  <Check size={22} color={COLORS.GREEN} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel={T('commonCancel')} onPress={() => { setEditingNickname(false); setEditNickname(userProfile.nickname ?? ''); }} style={{ padding: 8 }}>
                  <X size={22} color={TH.sub} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity accessibilityLabel={'编辑昵称'} onPress={() => setEditingNickname(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE() }}>{displayName}</Text>
                <Pencil size={14} color={TH.sub} />
              </TouchableOpacity>
            )}

            <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
              {auth.user?.email ?? ''}
            </Text>

            {/* Motto — in user card */}
            {editingMotto ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                <TextInput
                  value={editMotto}
                  onChangeText={setEditMotto}
                  placeholder={T('profileMottoPlaceholder')}
                  placeholderTextColor={TH.sub}
                  style={{
                    flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 10,
                    color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
                    fontStyle: 'italic',
                  }}
                />
                <TouchableOpacity accessibilityLabel={T('commonSave')} onPress={saveMotto} style={{ padding: 6 }}>
                  <Check size={20} color={COLORS.GREEN} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel={T('commonCancel')} onPress={() => { setEditingMotto(false); setEditMotto(userProfile.motto ?? ''); }} style={{ padding: 6 }}>
                  <X size={20} color={TH.sub} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity accessibilityLabel={'编辑座右铭'} onPress={() => setEditingMotto(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Quote size={14} color={P} />
                <Text style={{ color: userProfile.motto ? TH.text : TH.sub, fontSize: FONT_SUB(), fontStyle: 'italic', flex: 1 }}>
                  {userProfile.motto || T('profileMottoPlaceholder')}
                </Text>
                <Pencil size={10} color={TH.sub} />
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Body data */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB(), fontWeight: '600', marginBottom: 12 }}>
            {T('profileBodyData')}
          </Text>

          {/* Weight */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <Scale size={18} color={P} />
            <Text style={{ color: TH.text, fontSize: FONT_BODY(), width: 60 }}>{T('profileWeight')}</Text>
            <TextInput
              value={editWeight}
              onChangeText={saveWeight}
              placeholder="—"
              placeholderTextColor={TH.sub}
              keyboardType="numeric"
              style={{
                flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 10,
                color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
                textAlign: 'center',
              }}
            />
            <TouchableOpacity
              accessibilityLabel={T('settingsSelectWeightUnit')}
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
              <Text style={{ color: P, fontSize: FONT_SUB(), fontWeight: '600' }}>{weightUnit}</Text>
            </TouchableOpacity>
          </View>

          {/* Height */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <View style={{ width: 18, alignItems: 'center' }}><Text style={{ fontSize: FONT_LABEL(), color: P }}>📏</Text></View>
            <Text style={{ color: TH.text, fontSize: FONT_BODY(), width: 60 }}>{T('profileHeight')}</Text>
            <TextInput
              value={editHeight}
              onChangeText={saveHeight}
              placeholder="—"
              placeholderTextColor={TH.sub}
              keyboardType="numeric"
              style={{
                flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 10,
                color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
                textAlign: 'center',
              }}
            />
            <Text style={{ color: TH.sub, fontSize: FONT_SUB(), width: 30, textAlign: 'left' }}>cm</Text>
          </View>

          {/* Gender */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <View style={{ width: 18, alignItems: 'center' }}><Text style={{ fontSize: FONT_LABEL(), color: P }}>⚤</Text></View>
            <Text style={{ color: TH.text, fontSize: FONT_BODY(), width: 60 }}>{T('profileGender')}</Text>
            <TouchableOpacity
              accessibilityLabel={T('profileGender')}
              onPress={() => Alert.alert(T('profileGender'), '', [
                { text: T('profileGenderPrivate'), onPress: () => handleGenderChange('private') },
                { text: T('profileGenderMale'), onPress: () => handleGenderChange('male') },
                { text: T('profileGenderFemale'), onPress: () => handleGenderChange('female') },
                { text: T('commonCancel'), style: 'cancel' },
              ])}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: TH.bg, borderWidth: 1, borderColor: TH.border,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: editGender ? TH.text : TH.sub, fontSize: FONT_BODY() }}>
                {editGender ? T(`profileGender${editGender.charAt(0).toUpperCase() + editGender.slice(1)}`) : '—'}
              </Text>
              <ChevronRight size={16} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Water goal */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Droplets size={18} color="#3B82F6" />
            <Text style={{ color: TH.text, fontSize: FONT_BODY(), width: 60 }}>{T('profileWaterGoal')}</Text>
            <TextInput
              value={editWaterGoal}
              onChangeText={saveWaterGoal}
              keyboardType="numeric"
              style={{
                flex: 1, backgroundColor: TH.bg, borderRadius: 10, padding: 10,
                color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
                textAlign: 'center',
              }}
            />
            <Text style={{ color: TH.sub, fontSize: FONT_SUB(), width: 30 }}>ml</Text>
          </View>
        </Card>

        {/* Journey */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB(), fontWeight: '600', marginBottom: 12 }}>
            {T('profileJourney')}
          </Text>
          <View style={{ height: 1, backgroundColor: TH.border, marginBottom: 12 }} />
          {/* Stats rows */}
          {[
            { icon: <CalendarDays size={16} color="#10B981" />, value: `${journeyStats.joinedDays} ${T('calendarDays')}`, label: T('profileJoinedDays') },
            { icon: <Flame size={16} color="#F59E0B" />, value: `${streak} ${T('calendarDays')}`, label: T('checkinStreak') },
            { icon: <Trophy size={16} color="#F59E0B" />, value: `${journeyStats.longestStreak} ${T('calendarDays')}`, label: T('profileLongestStreak') },
            { icon: <CalendarDays size={16} color="#10B981" />, value: `${profileStats.totalCheckinDays} ${T('calendarDays')}`, label: T('globalPulse.totalDays') },
            { icon: <Target size={16} color={P} />, value: `${profileStats.activeHabits}`, label: T('habits') },
            { icon: <Brain size={16} color="#8B5CF6" />, value: `${profileStats.totalReflections}`, label: T('reflections') },
            { icon: <ClipboardList size={16} color="#3B82F6" />, value: `${journeyStats.totalPlans}`, label: T('plan') },
            { icon: <ListChecks size={16} color="#3B82F6" />, value: `${journeyStats.totalPlanItems}`, label: T('planTodoList') },
            { icon: <Timer size={16} color="#8B5CF6" />, value: `${totalMedMinutes} ${T('medMinutes')}`, label: T('accMed') },
            { icon: <Footprints size={16} color={P} />, value: `${journeyStats.totalExerciseHours} ${T('medMinutes')}`, label: T('profileTotalExercise') },
            { icon: <Utensils size={16} color="#EF4444" />, value: `${journeyStats.totalFastingHours} ${T('medMinutes')}`, label: T('profileTotalFasting') },
          ].map((s, i, arr) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
              {s.icon}
              <Text style={{ color: TH.text, fontSize: FONT_BODY(), flex: 1, marginLeft: 10 }}>{s.label}</Text>
              <Text style={{ color: P, fontSize: FONT_BODY(), fontWeight: '600' }}>{s.value}</Text>
            </View>
          ))}
        </Card>

        {/* Account */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: TH.sub, fontSize: FONT_SUB(), fontWeight: '600', marginBottom: 8 }}>
            {T('profileAccount')}
          </Text>
          <TouchableOpacity
            accessibilityLabel={T('profileChangePassword')}
            onPress={() => setPwdModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            <Lock size={18} color={P} style={{ marginRight: 12 }} />
            <Text style={{ color: P, fontSize: FONT_BODY(), flex: 1 }}>{T('profileChangePassword')}</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: TH.border }} />
          <TouchableOpacity
            accessibilityLabel={T('settingsClearData')}
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
                        await getStore().clearLocalData();
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
            <Text style={{ color: clearing ? TH.sub : '#F59E0B', fontSize: FONT_BODY(), flex: 1 }}>
              {clearing ? T('clearDataLoading') : T('settingsClearData')}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: TH.border }} />
          <TouchableOpacity
            accessibilityLabel={T('settingsLogout')}
            onPress={async () => { await getStore().logout(); nav.reset({ index: 0, routes: [{ name: 'Login' }] }); }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            <LogOut size={18} color="#EF4444" style={{ marginRight: 12 }} />
            <Text style={{ color: '#EF4444', fontSize: FONT_BODY(), flex: 1 }}>{T('settingsLogout')}</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Password Change Modal */}
      <Modal visible={pwdModalVisible} transparent animationType="fade" onRequestClose={() => setPwdModalVisible(false)}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
          padding: 24,
        }}>
          <View style={{
            backgroundColor: TH.card, borderRadius: 16, padding: 24,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
            elevation: 8,
          }}>
            <Text style={{ color: TH.text, fontSize: FONT_TITLE(), fontWeight: '700', marginBottom: 20, textAlign: 'center' }}>
              {T('profileChangePassword')}
            </Text>

            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={T('profilePwdCurrent')}
              placeholderTextColor={TH.sub}
              secureTextEntry
              style={{
                backgroundColor: TH.bg, borderRadius: 10, padding: 14, marginBottom: 12,
                color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
              }}
            />

            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={T('profilePwdNew')}
              placeholderTextColor={TH.sub}
              secureTextEntry
              style={{
                backgroundColor: TH.bg, borderRadius: 10, padding: 14, marginBottom: 12,
                color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
              }}
            />

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={T('profilePwdConfirm')}
              placeholderTextColor={TH.sub}
              secureTextEntry
              style={{
                backgroundColor: TH.bg, borderRadius: 10, padding: 14, marginBottom: 12,
                color: TH.text, fontSize: FONT_BODY(), borderWidth: 1, borderColor: TH.border,
              }}
            />

            {pwdError ? (
              <Text style={{ color: '#EF4444', fontSize: FONT_SUB(), marginBottom: 12, textAlign: 'center' }}>{pwdError}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                accessibilityLabel={T('commonCancel')}
                onPress={() => { setPwdModalVisible(false); setPwdError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                disabled={pwdChanging}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 10,
                  backgroundColor: TH.bg, alignItems: 'center',
                }}
              >
                <Text style={{ color: TH.text, fontSize: FONT_BODY(), fontWeight: '600' }}>{T('commonCancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={T('profilePwdSubmit')}
                onPress={handleChangePassword}
                disabled={pwdChanging}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 10,
                  backgroundColor: P, alignItems: 'center',
                  opacity: pwdChanging ? 0.6 : 1,
                }}
              >
                {pwdChanging
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: '600' }}>{T('profilePwdSubmit')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
