import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../../store/useAppStore';
import {
  Card, useTheme, useT, ScreenHeader, RowItem, Toggle,
} from '../../components/UI';
import { THEMES, LANG_LIST, COLORS } from '@egoless-do/core';
import type { ThemeName } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';
import {
  requestNotificationPermission, scheduleDailyReminder, cancelAllReminders,
} from '../notifications/NotificationService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useNavigation<Nav>();

  const [healthSync, setHealthSync]       = useState(false);
  const [showTheme, setShowTheme]         = useState(false);
  const [showLang, setShowLang]           = useState(false);
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

  // Periodic sync (15 min)
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (online) runSync();
    }, 15 * 60 * 1000);
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current); };
  }, [online]);

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { runSync: runSyncService } = await import('../sync/SyncService');
      await runSyncService();
      setLastSyncAt(Date.now());
      setPendingCount(0);
    } catch (e) {
      console.warn('[Sync] Error:', e);
    }
    setSyncing(false);
  };

  const triggerSync = () => {
    if (!online) return;
    runSync();
  };

  const sections = [
    {
      title: T('settingsRemind'),
      rows: [
        {
          label: T('settingsRemindOn'),
          right: <Toggle on={store.remindEnabled} onChange={async () => {
            const next = !store.remindEnabled;
            if (next) {
              const granted = await requestNotificationPermission();
              if (!granted) { Alert.alert('需要通知权限', '请在系统设置中允许通知'); return; }
              const [h, m] = store.remindTime.split(':').map(Number);
              await scheduleDailyReminder(h, m);
            } else {
              await cancelAllReminders();
            }
            store.setRemindEnabled(next);
          }} />,
        },
        {
          label: T('settingsRemindTime'),
          right: (
            <TouchableOpacity onPress={() => { setTimeEdit(store.remindTime); setShowTimePicker(true); }}>
              <Text style={{ color: TH.sub, fontSize: 14 }}>{store.remindTime} {T('commonEdit')} ›</Text>
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
          label: T('settingsStats'), icon: '📊',
          right: <Text style={{ color: TH.sub }}>›</Text>,
          onPress: () => nav.navigate('Stats'),
        },
        {
          label: T('settingsHistory'), icon: '📅',
          right: <Text style={{ color: TH.sub }}>›</Text>,
          onPress: () => (nav as any).navigate('CheckinHistory'),
        },
        {
          label: T('settingsFoodLog'), icon: '🍽',
          right: <Text style={{ color: TH.sub }}>›</Text>,
          onPress: () => (nav as any).navigate('FoodLog'),
        },
        {
          label: T('settingsFreeze'), icon: '❄️', sub: T('settingsFreezeDesc'),
          right: <Text style={{ color: TH.sub }}>›</Text>,
        },
        {
          label: T('settingsGrace'), icon: '🛡', sub: T('settingsGraceDesc'),
          right: <Text style={{ color: TH.sub }}>›</Text>,
          onPress: () => (nav as any).navigate('Grace'),
        },
        {
          label: T('settingsStreakBreak'), icon: '❤️', sub: T('settingsStreakBreakDesc'),
          right: <Text style={{ color: TH.sub }}>›</Text>,
          last: true,
        },
      ],
    },
    {
      title: T('settingsGeneral'),
      rows: [
        {
          label: T('settingsLanguage'),
          right: (
            <TouchableOpacity onPress={() => setShowLang(true)}>
              <Text style={{ color: TH.sub, fontSize: 14 }}>
                {LANG_LIST.find(l => l.code === store.language)?.flag ?? '🇨🇳'}{' '}
                {LANG_LIST.find(l => l.code === store.language)?.name ?? T('settingsLanguage')} ›
              </Text>
            </TouchableOpacity>
          ),
        },
        {
          label: T('settingsTheme'),
          right: (
            <TouchableOpacity onPress={() => setShowTheme(true)}>
              <Text style={{ color: TH.sub, fontSize: 14 }}>{THEMES[store.theme].name} ›</Text>
            </TouchableOpacity>
          ),
        },
        {
          label: T('settingsWeightUnit'),
          right: <Text style={{ color: TH.sub, fontSize: 14 }}>{T('settingsWeightUnit')} ›</Text>,
          last: true,
        },
      ],
    },
    {
      title: T('settingsSync'),
      rows: [
        {
          label: T('settingsAppleHealth'),
          sub: healthSync ? T('settingsConnected') : T('settingsNotEnabled'),
          icon: '❤️',
          right: <Toggle on={healthSync} onChange={() => setHealthSync(v => !v)} />,
        },
        {
          label: T('settingsSyncStatus'),
          sub: online ? (syncing ? T('settingsSyncing') : T('settingsConnected')) : T('settingsOffline'),
          right: (
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: online ? (syncing ? COLORS.YELLOW : COLORS.GREEN) : '#6B7280',
            }} />
          ),
        },
        {
          label: T('settingsPending'),
          right: <Text style={{ color: TH.sub, fontSize: 14 }}>{pendingCount} {T('settingsPendingUnit')}</Text>,
        },
        {
          label: T('settingsLastSync'),
          right: (
            <Text style={{ color: TH.sub, fontSize: 14 }}>
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : T('settingsNeverSync')}
            </Text>
          ),
        },
        {
          label: T('settingsManualSync'),
          icon: '🔄',
          right: (
            <TouchableOpacity onPress={triggerSync} disabled={syncing || !online}>
              <Text style={{ color: P, fontSize: 14 }}>
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
          label: T('settingsShareFriend'), icon: '🤝',
          sub: T('settingsShareDesc'),
          right: <Text style={{ color: TH.sub }}>›</Text>,
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
          label: T('settingsShare'), icon: '🧘',
          right: <Text style={{ color: TH.sub }}>›</Text>,
        },
        {
          label: T('settingsVersion'),
          right: <Text style={{ color: TH.sub, fontSize: 14 }}>v1.0.0 (MVP)</Text>,
        },
        {
          label: T('settingsPrivacy'),
          right: <Text style={{ color: TH.sub }}>›</Text>,
        },
        {
          label: T('settingsResetWelcome'), icon: '🔄',
          sub: T('settingsResetWelcomeDesc'),
          right: <Text style={{ color: TH.sub }}>›</Text>,
          last: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Profile card */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: `${P}30`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 26 }}>🧘</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: TH.text, fontWeight: '700', fontSize: 17 }}>
              {store.auth.user?.name ?? T('settingsDefaultName')}
            </Text>
            <Text style={{ color: TH.sub, fontSize: 14, marginTop: 3 }}>
              {store.streak} {T('checkinStreak')} · {store.auth.isSignedIn ? T('settingsConnected') : T('settingsOffline')}
            </Text>
          </View>
          {store.auth.isSignedIn ? (
            <View style={{
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 12, backgroundColor: `${P}20`,
            }}>
              <Text style={{ color: P, fontSize: 14, fontWeight: '600' }}>{T('settingsFreePlan')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => (nav as any).navigate('Login')}
              style={{
                paddingHorizontal: 16, paddingVertical: 8,
                borderRadius: 12, backgroundColor: P,
              }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{T('settingsLogin')}</Text>
            </TouchableOpacity>
          )}
        </Card>

        {sections.map(({ title, rows }) => (
          <View key={title} style={{ marginBottom: 4 }}>
            <Text style={{
              color: TH.sub, fontSize: 14, fontWeight: '600',
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
                  onPress={() => {
                    Alert.alert(T('settingsClearData'), T('settingsClearConfirm'), [
                      { text: T('commonCancel'), style: 'cancel' },
                      { text: T('commonConfirm'), style: 'destructive', onPress: () => store.resetData() },
                    ]);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: TH.border }}
                >
                  <Text style={{ fontSize: 18, marginRight: 12 }}>🗑</Text>
                  <Text style={{ color: '#EF4444', fontSize: 15, flex: 1 }}>{T('settingsClearData')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { store.logout(); (nav as any).reset({ index: 0, routes: [{ name: 'Login' }] }); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
                >
                  <Text style={{ fontSize: 18, marginRight: 12 }}>🚪</Text>
                  <Text style={{ color: '#EF4444', fontSize: 15, flex: 1 }}>{T('settingsLogout')}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* Footer brand */}
        <Text style={{
          textAlign: 'center', color: TH.sub,
          fontSize: 14, paddingVertical: 16,
        }}>
          Egoless Do · {T('settingsFooter')}
        </Text>
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 17, color: TH.text, marginBottom: 16 }}>{T('settingsSetReminder')}</Text>
            <TextInput
              value={timeEdit}
              onChangeText={setTimeEdit}
              placeholder="HH:MM"
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                borderWidth: 1, borderColor: TH.border,
                backgroundColor: TH.card, color: TH.text,
                fontSize: 22, fontWeight: '700', textAlign: 'center',
                marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: 14 }}>{T('commonCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                store.setRemindTime(timeEdit);
                setShowTimePicker(false);
                if (store.remindEnabled) {
                  const [h, m] = timeEdit.split(':').map(Number);
                  await scheduleDailyReminder(h, m);
                }
              }}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{T('commonSave')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme picker */}
      <Modal visible={showTheme} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.6)' }}>
          <View style={{
            backgroundColor: TH.cardSolid,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 48,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: 18 }}>{T('settingsSelectTheme')}</Text>
              <TouchableOpacity onPress={() => setShowTheme(false)}>
                <Text style={{ color: TH.sub, fontSize: 26 }}>×</Text>
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
                      <Text style={{ color: TH.text, fontSize: 14 }}>{th.name}</Text>
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
              <Text style={{ color: TH.text, fontWeight: '700', fontSize: 18 }}>{T('settingsSelectLang')}</Text>
              <TouchableOpacity onPress={() => setShowLang(false)}>
                <Text style={{ color: TH.sub, fontSize: 26 }}>×</Text>
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
                  <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                  <Text style={{ color: TH.text, fontSize: 15 }}>{l.name}</Text>
                </View>
                {l.code === store.language && (
                  <Text style={{ color: P, fontSize: 20 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
