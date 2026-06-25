import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../../store/useAppStore';
import SimpleHeader from '../../navigation/SimpleHeader';
import {
  Card, useTheme, useT, ScreenHeader, RowItem, Toggle,
} from '../../components/UI';
import TimePickerModal from '../../components/TimePickerModal';
import { THEMES, LANG_LIST, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_CLOSE } from '@egoless-do/core';
import type { ThemeName } from '@egoless-do/core';
import {
  BarChart3, CalendarDays, Utensils, Shield, HeartCrack,
  Heart, RefreshCw, Hand, PersonStanding, Trash2, LogOut,
  Check, X, ChevronRight, Scale, Bell, Clock, Globe, Palette,
  Cloud, CloudUpload,   History, Info, Lock, ClipboardList,
  Music, Brain, Dumbbell, Timer, Map,
} from 'lucide-react-native';
import { useRootNavigation } from '../../navigation/hooks';
import {
  requestNotificationPermission, scheduleDailyReminder, cancelAllReminders,
} from '../notifications/NotificationService';

export default function SettingsScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useRootNavigation();

  const healthSyncEnabled = useAppStore(s => s.healthSyncEnabled);
  const setHealthSyncEnabled = useAppStore(s => s.setHealthSyncEnabled);
  const weightUnit = useAppStore(s => s.weightUnit);
  const setWeightUnit = useAppStore(s => s.setWeightUnit);
  const [showTheme, setShowTheme]         = useState(false);
  const [showLang, setShowLang]           = useState(false);
  const [showWeightUnit, setShowWeightUnit] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeEdit, setTimeEdit]           = useState(store.remindTime);

  // Schedule reminder on mount if enabled
  useEffect(() => {
    if (store.remindEnabled) {
      const [h, m] = store.remindTime.split(':').map(Number);
      scheduleDailyReminder(h, m).catch((e) => console.error('[err]', e));
    }
  }, []);

  // Sync state
  const [online, setOnline]       = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const syncingRef = useRef(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Monitor connectivity
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOnline(state.isConnected ?? false);
    });
    return () => unsub();
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const { runSync: runSyncService } = await import('../sync/SyncService');
      await runSyncService();
      setLastSyncAt(Date.now());
      setPendingCount(0);
    } catch (e) {
      console.warn('[Sync] Error:', e);
    }
    syncingRef.current = false;
    setSyncing(false);
  }, []);

  // Periodic sync (15 min)
  const onlineRef = useRef(online);
  useEffect(() => { onlineRef.current = online; }, [online]);
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (onlineRef.current) runSync();
    }, 15 * 60 * 1000);
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current); };
  }, [runSync]);

  const triggerSync = () => {
    if (!online) return;
    runSync();
  };

  const sections = [
    {
      title: T('settingsRemind'),
      rows: [
        {
          label: T('settingsRemindOn'), icon: <Bell size={20} color={P} />,
          right: <Toggle on={store.remindEnabled} onChange={async () => {
            try {
              const next = !store.remindEnabled;
              if (next) {
                const granted = await requestNotificationPermission();
                if (!granted) { Alert.alert(T('notifPermDenied'), T('notifPermDeniedMsg')); return; }
                const [h, m] = store.remindTime.split(':').map(Number);
                await scheduleDailyReminder(h, m);
              } else {
                await cancelAllReminders();
              }
              store.setRemindEnabled(next);
            } catch (e) { console.error('[Settings] Reminder toggle error:', e); }
          }} />,
        },
        {
          label: T('settingsRemindTime'), icon: <Clock size={20} color={P} />,
          right: (
            <TouchableOpacity onPress={() => { setTimeEdit(store.remindTime); setShowTimePicker(true); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{store.remindTime} {T('commonEdit')}</Text>
                <ChevronRight size={14} color={TH.sub} />
              </View>
            </TouchableOpacity>
          ),
          last: true,
        },
      ],
    },
    {
      title: T('settingsData'),
      rows: [
        {
          label: T('settingsStats'), icon: <BarChart3 size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('Stats'),
        },
        {
          label: T('settingsHistory'), icon: <CalendarDays size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('CheckinHistory'),
        },
        {
          label: T('planHistory'), icon: <ClipboardList size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('PlanHistory'),
        },
        {
          label: T('exerciseHistory'), icon: <Dumbbell size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('ExerciseHistory'),
        },
        {
          label: T('meditationHistory'), icon: <Brain size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('MedHistory'),
        },
        {
          label: T('fastingHistory'), icon: <Timer size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('FastHistory'),
        },
        {
          label: T('settingsFoodLog'), icon: <Utensils size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('FoodLog'),
        },
        {
          label: T('settingsGrace'), icon: <Shield size={20} color={P} />, sub: T('settingsGraceDesc'),
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('Grace'),
        },
        {
          label: T('settingsStreakBreak'), icon: <HeartCrack size={20} color={P} />, sub: T('settingsStreakBreakDesc'),
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('StreakBreak'),
        },
        {
          label: T('recycleBin'), icon: <Trash2 size={20} color={P} />, sub: T('recycleBinDesc'),
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('RecycleBin'),
          last: true,
        },
      ],
    },
    {
      title: T('settingsGeneral'),
      rows: [
        {
          label: T('settingsTheme'), icon: <Palette size={20} color={P} />,
          right: (
            <TouchableOpacity onPress={() => setShowTheme(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{THEMES[store.theme].name}</Text>
                <ChevronRight size={14} color={TH.sub} />
              </View>
            </TouchableOpacity>
          ),
        },
        {
          label: T('settingsLanguage'), icon: <Globe size={20} color={P} />,
          right: (
            <TouchableOpacity onPress={() => setShowLang(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                  {LANG_LIST.find(l => l.code === store.language)?.flag ?? '🇨🇳'}{' '}
                  {LANG_LIST.find(l => l.code === store.language)?.name ?? T('settingsLanguage')}
                </Text>
                <ChevronRight size={14} color={TH.sub} />
              </View>
            </TouchableOpacity>
          ),
        },
        {
          label: T('settingsWeightUnit'),
          icon: <Scale size={20} color={P} />,
          right: (
            <TouchableOpacity onPress={() => setShowWeightUnit(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
                  {weightUnit === 'kg' ? T('weightUnitKg') : T('weightUnitLb')}
                </Text>
                <ChevronRight size={14} color={TH.sub} />
              </View>
            </TouchableOpacity>
          ),
        },
        {
          label: T('settingsAIModel'),
          sub: T('settingsAIModelDesc'),
          icon: <Brain size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('AISettings' as never),
          last: true,
        },
      ],
    },
    {
      title: T('settingsHealthSection'),
      rows: [
        {
          label: T('settingsAppleHealth'),
          sub: healthSyncEnabled ? T('settingsConnected') : T('settingsNotEnabled'),
          icon: <Heart size={20} color={P} />,
          right: <Toggle on={healthSyncEnabled} onChange={async () => {
            try {
              if (!healthSyncEnabled) {
                const { isHealthAvailable, requestHealthPermissions } = await import('../health/HealthService');
                if (!isHealthAvailable()) {
                  Alert.alert(T('healthUnavailable'), T('healthUnavailableMsg'));
                  return;
                }
                const granted = await requestHealthPermissions();
                if (!granted) {
                  Alert.alert(T('healthPermDenied'), T('healthPermDeniedMsg'));
                  return;
                }
                setHealthSyncEnabled(true);
              } else {
                setHealthSyncEnabled(false);
              }
            } catch (e) { console.error('[Settings] Health sync toggle error:', e); }
          }} />,
          last: true,
        },
      ],
    },
    {
      title: T('settingsGlobalPulse') || '全球脉动',
      rows: [
        {
          label: T('settingsShowOnMap') || '显示在全球地图',
          sub: T('settingsShowOnMapDesc') || '匿名分享你的打卡位置',
          icon: <Map size={20} color={P} />,
          right: <Toggle on={store.showOnGlobalMap ?? true} onChange={() => {
            const next = !(store.showOnGlobalMap ?? true);
            store.setShowOnGlobalMap?.(next);
            if (!next) {
              Alert.alert(
                T('settingsOptOutTitle') || '退出全球地图',
                T('settingsOptOutMessage') || '退出后，你的位置将不再显示在全球地图上。',
                [
                  { text: T('cancel') || '取消', style: 'cancel' },
                  { text: T('confirm') || '确认', onPress: () => {} }
                ]
              );
            }
          }} />,
        },
        {
          label: T('settingsDeleteGlobalData') || '删除全球地图数据',
          sub: T('settingsDeleteGlobalDataDesc') || '从全球地图上移除你的所有数据',
          icon: <Trash2 size={20} color="#EF4444" />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => {
            Alert.alert(
              T('settingsDeleteConfirmTitle') || '删除确认',
              T('settingsDeleteConfirmMessage') || '确定要删除你的全球地图数据吗？此操作不可撤销。',
              [
                { text: T('cancel') || '取消', style: 'cancel' },
                {
                  text: T('delete') || '删除',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { deleteGlobalData } = await import('../global-pulse/services/globalPulseApi');
                      const result = await deleteGlobalData();
                      if (result.success) {
                        Alert.alert(T('success') || '成功', T('settingsDeleteSuccess') || '数据已删除');
                      }
                    } catch (e) {
                      console.error('[Settings] Delete global data error:', e);
                    }
                  }
                }
              ]
            );
          },
          last: true,
        },
      ],
    },
    {
      title: T('settingsSync'),
      rows: [
        {
          label: T('settingsSyncStatus'), icon: <Cloud size={20} color={P} />,
          sub: online ? (syncing ? T('settingsSyncing') : T('settingsConnected')) : T('settingsOffline'),
          right: (
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: online ? (syncing ? COLORS.YELLOW : COLORS.GREEN) : '#6B7280',
            }} />
          ),
        },
        {
          label: T('settingsPending'), icon: <CloudUpload size={20} color={P} />,
          right: <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{pendingCount} {T('settingsPendingUnit')}</Text>,
        },
        {
          label: T('settingsLastSync'), icon: <History size={20} color={P} />,
          right: (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : T('settingsNeverSync')}
            </Text>
          ),
        },
        {
          label: T('settingsManualSync'),
          icon: <RefreshCw size={20} color={P} />,
          right: (
            <TouchableOpacity onPress={triggerSync} disabled={syncing || !online}>
              <Text style={{ color: P, fontSize: FONT_SUB }}>
                {syncing ? T('settingsSyncing') : T('settingsSyncNow')}
              </Text>
            </TouchableOpacity>
          ),
          last: true,
        },
      ],
    },
    {
      title: T('settingsAbout'),
      rows: [
        {
          label: T('settingsShareFriend'), icon: <Hand size={20} color={P} />,
          sub: T('settingsShareDesc'),
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: async () => {
            try {
              const Sharing = await import('expo-sharing');
              await Sharing.shareAsync('https://egoless-do.app', {
                dialogTitle: T('settingsShareFriend'),
              });
            } catch {
              // Sharing not available
            }
          },
        },
        {
          label: T('settingsVersion'), icon: <Info size={20} color={P} />,
          right: <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>v1.0.0</Text>,
        },
        {
          label: T('settingsPrivacy'), icon: <Lock size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('PrivacyPolicy' as never),
          last: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Settings" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Profile card */}
        <Card style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: `${P}30`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <PersonStanding size={26} color={P} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE }}>
                {store.auth.user?.name ?? T('settingsDefaultName')}
              </Text>
              <Text style={{ color: TH.sub, fontSize: FONT_SUB, marginTop: 3 }}>
                {store.streak} {T('checkinStreak')} · {store.auth.isSignedIn ? T('settingsConnected') : T('settingsOffline')}
              </Text>
            </View>
            {store.auth.isSignedIn ? (
              <View style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 12, backgroundColor: `${P}20`,
              }}>
                <Text style={{ color: P, fontSize: FONT_SUB, fontWeight: '600' }}>{T('settingsFreePlan')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => nav.navigate('Login')}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8,
                  borderRadius: 12, backgroundColor: P,
                }}>
                <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '700' }}>{T('settingsLogin')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => nav.navigate('Music')}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              marginTop: 14, paddingTop: 14,
              borderTopWidth: 1, borderTopColor: TH.border,
            }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: `${P}20`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Music size={18} color={P} />
            </View>
            <Text style={{ color: TH.text, fontSize: FONT_BODY, flex: 1 }}>{T('musicTitle')}</Text>
            <ChevronRight size={18} color={TH.sub} />
          </TouchableOpacity>
        </Card>

        {sections.map(({ title, rows }) => (
          <View key={title} style={{ marginBottom: 4 }}>
            <Text style={{
              color: TH.sub, fontSize: FONT_SUB, fontWeight: '600',
              paddingVertical: 12, textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {title}
            </Text>
            <Card style={{ padding: 0 }}>
              <View style={{ paddingHorizontal: 16 }}>
                {rows.map((r, i) => (
                  <RowItem key={r.label} {...r} last={r.last ?? i === rows.length - 1} />
                ))}
              </View>
            </Card>
          </View>
        ))}

        {/* Other section */}
        {/* Account section */}
        {store.auth.isSignedIn && (
          <View style={{ marginBottom: 4, marginTop: 16 }}>
            <Card style={{ padding: 0 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <TouchableOpacity
                  onPress={async () => { await store.logout(); nav.reset({ index: 0, routes: [{ name: 'Login' }] }); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
                >
                  <LogOut size={18} color="#EF4444" style={{ marginRight: 12 }} />
                  <Text style={{ color: '#EF4444', fontSize: FONT_BODY, flex: 1 }}>{T('settingsLogout')}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* Footer brand */}
        <Text style={{
          textAlign: 'center', color: TH.sub,
          fontSize: FONT_SUB, paddingVertical: 16,
        }}>
          {T('settingsFooter')}
        </Text>
      </ScrollView>

      {/* Time picker modal */}
      <TimePickerModal
        visible={showTimePicker}
        value={timeEdit}
        onConfirm={async (time) => {
          try {
            store.setRemindTime(time);
            setShowTimePicker(false);
            if (store.remindEnabled) {
              const [h, m] = time.split(':').map(Number);
              await scheduleDailyReminder(h, m);
            }
          } catch (e) { console.error('[Settings] Time picker error:', e); }
        }}
        onClose={() => setShowTimePicker(false)}
      />

      {/* Theme picker */}
      <Modal visible={showTheme} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.6)' }}>
          <View style={{
            backgroundColor: TH.cardSolid,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 48,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE }}>{T('settingsSelectTheme')}</Text>
              <TouchableOpacity onPress={() => setShowTheme(false)}>
                <X size={26} color={TH.sub} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {(Object.keys(THEMES) as ThemeName[]).map(key => {
                const th = THEMES[key];
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { store.setTheme(key); setShowTheme(false); }}
                    style={{
                      width: '30%', borderRadius: 14, overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: store.theme === key ? th.primary : 'transparent',
                    }}
                  >
                    <View style={{ height: 60, backgroundColor: th.bg, justifyContent: 'flex-end', padding: 8 }}>
                      <View style={{ width: '60%', height: 5, borderRadius: 3, backgroundColor: th.primary, marginBottom: 4 }} />
                      <View style={{ width: '40%', height: 3, borderRadius: 2, backgroundColor: th.card }} />
                    </View>
                    <View style={{ backgroundColor: TH.card, padding: 6, alignItems: 'center' }}>
                      <Text style={{ color: TH.text, fontSize: FONT_SUB }}>{th.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language picker */}
      <Modal visible={showLang} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.6)' }}>
          <View style={{
            backgroundColor: TH.cardSolid,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 48, maxHeight: '70%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE }}>{T('settingsSelectLang')}</Text>
              <TouchableOpacity onPress={() => setShowLang(false)}>
                <X size={26} color={TH.sub} />
              </TouchableOpacity>
            </View>
            {LANG_LIST.map(l => (
              <TouchableOpacity
                key={l.code}
                onPress={() => { store.setLanguage(l.code); setShowLang(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: TH.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: FONT_CLOSE }}>{l.flag}</Text>
                  <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{l.name}</Text>
                </View>
                {l.code === store.language && (
                  <Check size={20} color={P} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Weight unit picker */}
      <Modal visible={showWeightUnit} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.6)' }}>
          <View style={{
            backgroundColor: TH.cardSolid,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 48,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE }}>{T('settingsWeightUnit')}</Text>
              <TouchableOpacity onPress={() => setShowWeightUnit(false)}>
                <X size={26} color={TH.sub} />
              </TouchableOpacity>
            </View>
            {[
              { key: 'kg', label: T('weightUnitKg') },
              { key: 'lb', label: T('weightUnitLb') },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                onPress={() => { setWeightUnit(item.key as 'kg' | 'lb'); setShowWeightUnit(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: TH.border,
                }}
              >
                <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{item.label}</Text>
                {weightUnit === item.key && (
                  <Check size={20} color={P} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
