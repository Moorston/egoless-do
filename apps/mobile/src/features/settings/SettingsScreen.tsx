import { THEMES, LANG_LIST, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_CLOSE, createLogger, formatDate , FONT_STAT_CARD } from '@egoless-do/core';
import type { ThemeName } from '@egoless-do/core';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import {
  BarChart3, CalendarDays, Utensils, Shield, HeartCrack,
  Heart, RefreshCw, Hand, PersonStanding, Trash2,
  Check, X, ChevronRight, Bell, Clock, Globe, Palette,
  Cloud, CloudUpload, History, Info, Lock, ClipboardList,
  Music, Binary, Brain, Dumbbell, Timer,
} from 'lucide-react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SyncConflictPanel } from '../../components/SyncConflictPanel';
import TimePickerModal from '../../components/TimePickerModal';
import {
  Card, useTheme, useT, ScreenHeader, RowItem, Toggle,
} from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useAppStore, useShallowStore } from '../../store/useAppStore';


const log = createLogger('Settings');

import { useRootNavigation } from '../../navigation/hooks';
import {
  requestNotificationPermission, scheduleDailyReminder, cancelAllReminders,
} from '../notifications/NotificationService';

export default function SettingsScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const {
    theme, setTheme, language, setLanguage,
    auth, userProfile, streak,
    remindEnabled, remindTime, setRemindEnabled, setRemindTime,
  } = useShallowStore(s => ({
    theme: s.theme,
    setTheme: s.setTheme,
    language: s.language,
    setLanguage: s.setLanguage,
    auth: s.auth,
    userProfile: s.userProfile,
    streak: s.streak,
    remindEnabled: s.remindEnabled,
    remindTime: s.remindTime,
    setRemindEnabled: s.setRemindEnabled,
    setRemindTime: s.setRemindTime,
  }));
  const nav   = useRootNavigation();

  const healthSyncEnabled = useShallowStore(s => s.healthSyncEnabled);
  const setHealthSyncEnabled = useShallowStore(s => s.setHealthSyncEnabled);
  const [showTheme, setShowTheme]         = useState(false);
  const [showLang, setShowLang]           = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeEdit, setTimeEdit]           = useState(remindTime);
  const [clearing, setClearing]           = useState(false);

  // Schedule reminder on mount if enabled
  useEffect(() => {
    if (remindEnabled) {
      const [h, m] = remindTime.split(':').map(Number);
      scheduleDailyReminder(h, m).catch((e) => log.error(e));
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
      log.warn('[Sync] Error:', e);
    }
    syncingRef.current = false;
    setSyncing(false);
  }, []);

  // Periodic sync (fallback when realtime connection is not active)
  const SYNC_FALLBACK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const onlineRef = useRef(online);
  useEffect(() => { onlineRef.current = online; }, [online]);
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (onlineRef.current) void runSync();
    }, SYNC_FALLBACK_INTERVAL);
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current); };
  }, [runSync]);

  const triggerSync = () => {
    if (!online) return;
    void runSync();
  };

  const sections = [
    {
      title: T('settingsRemind'),
      rows: [
        {
          label: T('settingsRemindOn'), icon: <Bell size={20} color={P} />,
          right: <Toggle on={remindEnabled} onChange={async () => {
            try {
              const next = !remindEnabled;
              if (next) {
                const granted = await requestNotificationPermission();
                if (!granted) { Alert.alert(T('notifPermDenied'), T('notifPermDeniedMsg')); return; }
                const [h, m] = remindTime.split(':').map(Number);
                await scheduleDailyReminder(h, m);
              } else {
                await cancelAllReminders();
              }
              setRemindEnabled(next);
            } catch (e) { log.error(e, { message: 'Reminder toggle error' }); }
          }} />,
        },
        {
          label: T('settingsRemindTime'), icon: <Clock size={20} color={P} />,
          right: (
            <TouchableOpacity accessibilityLabel={T('settingsRemindTime')} onPress={() => { setTimeEdit(remindTime); setShowTimePicker(true); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{remindTime} {T('commonEdit')}</Text>
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
          label: T('meditationHistory'), icon: <Binary size={20} color={P} />,
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
            <TouchableOpacity accessibilityLabel={T('settingsSelectTheme')} onPress={() => setShowTheme(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{THEMES[theme].name}</Text>
                <ChevronRight size={14} color={TH.sub} />
              </View>
            </TouchableOpacity>
          ),
        },
        {
          label: T('settingsLanguage'), icon: <Globe size={20} color={P} />,
          right: (
            <TouchableOpacity accessibilityLabel={T('settingsSelectLang')} onPress={() => setShowLang(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                  {LANG_LIST.find(l => l.code === language)?.flag ?? '🇨🇳'}{' '}
                  {LANG_LIST.find(l => l.code === language)?.name ?? T('settingsLanguage')}
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
          onPress: () => nav.navigate('AISettings'),
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
            } catch (e) { log.error(e, { message: 'Health sync toggle error' }); }
          }} />,
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
          right: <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{pendingCount} {T('settingsPendingUnit')}</Text>,
        },
        {
          label: T('settingsLastSync'), icon: <History size={20} color={P} />,
          right: (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
              {lastSyncAt
                ? formatDate(new Date(lastSyncAt), language, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : T('settingsNeverSync')}
            </Text>
          ),
        },
        {
          label: T('settingsManualSync'),
          icon: <RefreshCw size={20} color={P} />,
          right: (
            <TouchableOpacity accessibilityLabel={T('settingsManualSync')} onPress={triggerSync} disabled={syncing || !online}>
              <Text style={{ color: P, fontSize: FONT_SUB() }}>
                {syncing ? T('settingsSyncing') : T('settingsSyncNow')}
              </Text>
            </TouchableOpacity>
          ),
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
          right: <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>v1.0.0</Text>,
        },
        {
          label: T('settingsPrivacy'), icon: <Lock size={20} color={P} />,
          right: <ChevronRight size={18} color={TH.sub} />,
          onPress: () => nav.navigate('PrivacyPolicy'),
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
          <TouchableOpacity accessibilityLabel={T('profileAccount')} onPress={() => auth.isSignedIn && nav.navigate('Profile')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: `${P}30`,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {userProfile.avatar ? (
                  <Image source={{ uri: userProfile.avatar }} style={{ width: 56, height: 56, borderRadius: 28 }} contentFit="cover" />
                ) : (
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: P }}>
                    {(userProfile.nickname ?? auth.user?.name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE() }}>
                  {userProfile.nickname ?? auth.user?.name ?? T('settingsDefaultName')}
                </Text>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB(), marginTop: 3 }}>
                  {streak} {T('checkinStreak')} · {auth.isSignedIn ? T('settingsConnected') : T('settingsOffline')}
                </Text>
              </View>
              {auth.isSignedIn ? (
                <View style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 12, backgroundColor: `${P}20`,
                }}>
                  <Text style={{ color: P, fontSize: FONT_SUB(), fontWeight: '600' }}>{T('settingsFreePlan')}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  accessibilityLabel={T('settingsLogin')}
                  onPress={() => nav.navigate('Login')}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8,
                    borderRadius: 12, backgroundColor: P,
                  }}>
                  <Text style={{ color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '700' }}>{T('settingsLogin')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={T('musicTitle')}
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
            <Text style={{ color: TH.text, fontSize: FONT_BODY(), flex: 1 }}>{T('musicTitle')}</Text>
            <ChevronRight size={18} color={TH.sub} />
          </TouchableOpacity>
        </Card>

        <SyncConflictPanel />

        {sections.map(({ title, rows }) => (
          <View key={title} style={{ marginBottom: 4 }}>
            <Text style={{
              color: TH.sub, fontSize: FONT_SUB(), fontWeight: '600',
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

        {/* Footer brand */}
        <Text style={{
          textAlign: 'center', color: TH.sub,
          fontSize: FONT_SUB(), paddingVertical: 16,
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
            setRemindTime(time);
            setShowTimePicker(false);
            if (remindEnabled) {
              const [h, m] = time.split(':').map(Number);
              await scheduleDailyReminder(h, m);
            }
          } catch (e) { log.error(e, { message: 'Time picker error' }); }
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
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE() }}>{T('settingsSelectTheme')}</Text>
              <TouchableOpacity accessibilityLabel={T('commonClose')} onPress={() => setShowTheme(false)}>
                <X size={26} color={TH.sub} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {(Object.keys(THEMES) as ThemeName[]).map(key => {
                const th = THEMES[key];
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityLabel={th.name}
                    onPress={() => { setTheme(key); setShowTheme(false); }}
                    style={{
                      width: '30%', borderRadius: 14, overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: theme === key ? th.primary : 'transparent',
                    }}
                  >
                    <View style={{ height: 60, backgroundColor: th.bg, justifyContent: 'flex-end', padding: 8 }}>
                      <View style={{ width: '60%', height: 5, borderRadius: 3, backgroundColor: th.primary, marginBottom: 4 }} />
                      <View style={{ width: '40%', height: 3, borderRadius: 2, backgroundColor: th.card }} />
                    </View>
                    <View style={{ backgroundColor: TH.card, padding: 6, alignItems: 'center' }}>
                      <Text style={{ color: TH.text, fontSize: FONT_SUB() }}>{th.name}</Text>
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
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE() }}>{T('settingsSelectLang')}</Text>
              <TouchableOpacity accessibilityLabel={T('commonClose')} onPress={() => setShowLang(false)}>
                <X size={26} color={TH.sub} />
              </TouchableOpacity>
            </View>
            {LANG_LIST.map(l => (
              <TouchableOpacity
                key={l.code}
                accessibilityLabel={l.name}
                onPress={() => { setLanguage(l.code); setShowLang(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: TH.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: FONT_CLOSE() }}>{l.flag}</Text>
                  <Text style={{ color: TH.text, fontSize: FONT_BODY() }}>{l.name}</Text>
                </View>
                {l.code === language && (
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
