import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useStore } from '../../utils/store';
import { THEMES, LANG_LIST, COLORS, t } from '../../core';
import type { ThemeName } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import { useAuthStore } from '../../store/useAuthStore';
import FabButton from '../../components/FabButton';

export default function SettingsPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const [showTheme, setShowTheme] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [healthSync, setHealthSync] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const lang = store.language;


  const triggerSync = () => {
    if (syncing) return;
    setSyncing(true);
    setTimeout(() => { setLastSyncAt(Date.now()); setPendingCount(0); setSyncing(false); }, 1000);
  };

  const sections = [
    {
      title: t('settingsRemind', lang),
      rows: [
        { label: t('settingsRemindOn', lang), right: <ToggleMini on={store.remindEnabled} onChange={() => store.setRemindEnabled(!store.remindEnabled)} /> },
        { label: t('settingsRemindTime', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{store.remindTime} {t('commonEdit', lang)} ›</Text>, last: true },
      ],
    },
    {
      title: t('settingsData', lang),
      rows: [
        { label: t('settingsStats', lang), icon: '📊', right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, onPress: () => Taro.navigateTo({ url: '/pages/stats/index' }) },
        { label: t('settingsHistory', lang), icon: '📅', right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, onPress: () => Taro.navigateTo({ url: '/pages/home/checkin-history' }) },
        { label: t('settingsFoodLog', lang), icon: '🍽', right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, onPress: () => Taro.navigateTo({ url: '/pages/home/foodlog' }) },
        { label: t('settingsFreeze', lang), icon: '❄️', sub: t('settingsFreezeDesc', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text> },
        { label: t('settingsGrace', lang), icon: '🛡', sub: t('settingsGraceDesc', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, onPress: () => Taro.navigateTo({ url: '/pages/home/grace' }) },
        { label: t('settingsStreakBreak', lang), icon: '❤️', sub: t('settingsStreakBreakDesc', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, last: true },
      ],
    },
    {
      title: t('settingsGeneral', lang),
      rows: [
        { label: t('settingsLanguage', lang), right: <Text onClick={() => setShowLang(true)} style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{LANG_LIST.find(l => l.code === store.language)?.flag ?? '🇨🇳'} {LANG_LIST.find(l => l.code === store.language)?.name ?? t('settingsLanguage', lang)} ›</Text> },
        { label: t('settingsTheme', lang), right: <Text onClick={() => setShowTheme(true)} style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{THEMES[store.theme].name} ›</Text> },
        { label: t('settingsWeightUnit', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{t('settingsWeightUnit', lang)} ›</Text>, last: true },
      ],
    },
    {
      title: t('settingsSync', lang),
      rows: [
        { label: t('settingsAppleHealth', lang), sub: healthSync ? t('settingsConnected', lang) : t('settingsNotEnabled', lang), icon: '❤️', right: <ToggleMini on={healthSync} onChange={() => setHealthSync(v => !v)} /> },
        { label: t('settingsSyncStatus', lang), sub: online ? (syncing ? t('settingsSyncing', lang) : t('settingsConnected', lang)) : t('settingsOffline', lang), right: <View style={{ width: '16rpx', height: '16rpx', borderRadius: '8rpx', background: online ? (syncing ? COLORS.YELLOW : COLORS.GREEN) : '#6B7280' }} /> },
        { label: t('settingsPending', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{pendingCount} {t('settingsPendingUnit', lang)}</Text> },
        { label: t('settingsLastSync', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>{lastSyncAt ? new Date(lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('settingsNeverSync', lang)}</Text> },
        { label: t('settingsManualSync', lang), icon: '🔄', right: <Text onClick={triggerSync} style={{ color: P, fontSize: '40rpx' }}>{syncing ? t('settingsSyncing', lang) : t('settingsSyncNow', lang)}</Text>, last: true },
      ],
    },
    {
      title: t('settingsAbout', lang),
      rows: [
        { label: t('settingsShareFriend', lang), icon: '🤝', sub: t('settingsShareDesc', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, onPress: () => { Taro.showShareMenu({}); } },
        { label: t('settingsShare', lang), icon: '🧘', right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text> },
        { label: t('settingsVersion', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>v1.0.0</Text> },
        { label: t('settingsPrivacy', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text> },
        { label: t('settingsResetWelcome', lang), icon: '🔄', sub: t('settingsResetWelcomeDesc', lang), right: <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>, last: true },
      ],
    },
  ];

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold', display: 'block', marginBottom: '32rpx' }}>{t('settingsGeneral', lang)}</Text>

      {/* Profile card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '28rpx', display: 'flex', alignItems: 'center', gap: '24rpx', marginBottom: '32rpx' }}>
        <View style={{ width: '100rpx', height: '100rpx', borderRadius: '50rpx', background: `${P}30`, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
          <Text style={{ fontSize: '52rpx' }}>🧘</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx', display: 'block' }}>{t('settingsDefaultName', lang)}</Text>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '6rpx' }}>{store.streak} {t('checkinStreak', lang)} · 微信小程序</Text>
        </View>
        <View style={{ paddingHorizontal: '24rpx', paddingVertical: '12rpx', borderRadius: '24rpx', background: `${P}20` }}>
          <Text style={{ color: P, fontSize: '40rpx', fontWeight: '600' }}>{t('settingsFreePlan', lang)}</Text>
        </View>
      </View>

      {sections.map(({ title, rows }) => (
        <View key={title} style={{ marginBottom: '8rpx' }}>
          <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', fontWeight: '600', paddingVertical: '24rpx', textTransform: 'uppercase', letterSpacing: '4rpx', display: 'block' }}>{title}</Text>
          <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '0 32rpx' }}>
            {rows.map((r: any, i: number) => (
              <View key={r.label} onClick={r.onPress} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingVertical: '26rpx', borderBottom: (r.last ?? i === rows.length - 1) ? 'none' : '1rpx solid rgba(255,255,255,.09)' }}>
                <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
                  {r.icon && <Text style={{ fontSize: '40rpx' }}>{r.icon}</Text>}
                  <View>
                    <Text style={{ color: '#fff', fontSize: '40rpx', display: 'block' }}>{r.label}</Text>
                    {r.sub && <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>{r.sub}</Text>}
                  </View>
                </View>
                <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>{r.right}</View>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Other section */}
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', fontWeight: '600', paddingVertical: '24rpx', textTransform: 'uppercase', letterSpacing: '4rpx', display: 'block', marginTop: '32rpx' }}>{t('settingsClearData', lang)}</Text>
      <View onClick={() => {
        Taro.showModal({
          title: t('settingsClearData', lang),
          content: t('settingsClearConfirm', lang),
          success: (res) => { if (res.confirm) store.resetData(); },
        });
      }} style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '28rpx', padding: '0 32rpx', marginBottom: '32rpx' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingVertical: '26rpx' }}>
          <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
            <Text style={{ fontSize: '40rpx' }}>🗑</Text>
            <View>
              <Text style={{ color: '#fff', fontSize: '40rpx', display: 'block' }}>{t('settingsClearData', lang)}</Text>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '4rpx' }}>{t('settingsClearDataDesc', lang)}</Text>
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,.45)' }}>›</Text>
        </View>
      </View>

      {/* Logout */}
      <View onClick={() => {
        Taro.showModal({
          title: '退出登录',
          content: '确定要退出登录吗？',
          success: (res) => {
            if (res.confirm) {
              useAuthStore.getState().logout();
              Taro.reLaunch({ url: '/pages/login/index' });
            }
          },
        });
      }} style={{ background: 'rgba(239,68,68,.1)', border: '1rpx solid rgba(239,68,68,.3)', borderRadius: '28rpx', padding: '0 32rpx', marginBottom: '32rpx' }}>
        <View style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingVertical: '26rpx' }}>
          <Text style={{ color: '#EF4444', fontSize: '40rpx', fontWeight: '600' }}>退出登录</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: '40rpx', paddingVertical: '32rpx', display: 'block' }}>
        Egoless Do · {t('settingsFooter', lang)}
      </Text>

      {/* Theme picker */}
      {showTheme && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <View style={{ background: '#1A1030', borderRadius: '48rpx 48rpx 0 0', padding: '48rpx 40rpx', paddingBottom: '96rpx', width: '100%' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40rpx' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx' }}>{t('settingsSelectTheme', lang)}</Text>
              <Text onClick={() => setShowTheme(false)} style={{ color: 'rgba(255,255,255,.4)', fontSize: '52rpx' }}>×</Text>
            </View>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '24rpx' }}>
              {(Object.keys(THEMES) as ThemeName[]).map(key => {
                const th = THEMES[key];
                return (
                  <View key={key} onClick={() => { store.setTheme(key); setShowTheme(false); }}
                    style={{ width: '30%', borderRadius: '28rpx', overflow: 'hidden', border: `4rpx solid ${store.theme === key ? th.primary : 'transparent'}` }}>
                    <View style={{ height: '120rpx', background: th.bg, padding: '16rpx' }}>
                      <View style={{ width: '60%', height: '10rpx', borderRadius: '5rpx', background: th.primary, marginBottom: '8rpx' }} />
                      <View style={{ width: '40%', height: '6rpx', borderRadius: '3rpx', background: 'rgba(255,255,255,.2)' }} />
                    </View>
                    <View style={{ background: 'rgba(255,255,255,.07)', padding: '12rpx', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: '40rpx' }}>{th.name}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Language picker */}
      {showLang && (
        <View style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <View style={{ background: '#1A1030', borderRadius: '48rpx 48rpx 0 0', padding: '48rpx 40rpx', paddingBottom: '96rpx', width: '100%', maxHeight: '70vh' }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40rpx' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx' }}>{t('settingsSelectLang', lang)}</Text>
              <Text onClick={() => setShowLang(false)} style={{ color: 'rgba(255,255,255,.4)', fontSize: '52rpx' }}>×</Text>
            </View>
            {LANG_LIST.map(l => (
              <View key={l.code} onClick={() => { store.setLanguage(l.code); setShowLang(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingVertical: '28rpx', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
                <View style={{ display: 'flex', alignItems: 'center', gap: '24rpx' }}>
                  <Text style={{ fontSize: '48rpx' }}>{l.flag}</Text>
                  <Text style={{ color: '#fff', fontSize: '40rpx' }}>{l.name}</Text>
                </View>
                {l.code === store.language && <Text style={{ color: P, fontSize: '40rpx' }}>✓</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function ToggleMini({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <View onClick={onChange} style={{ width: '88rpx', height: '52rpx', borderRadius: '26rpx', background: on ? P : 'rgba(128,128,128,.3)', justifyContent: 'center', padding: '4rpx' }}>
      <View style={{ width: '44rpx', height: '44rpx', borderRadius: '22rpx', background: '#fff', alignSelf: on ? 'flex-end' : 'flex-start' }} />
    </View>
  );
}

