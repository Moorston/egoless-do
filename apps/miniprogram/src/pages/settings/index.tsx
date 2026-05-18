import { useState } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useAppStore, THEMES, t, LANG_LIST } from '@egoless/core';
import { Card, Btn, Modal, RowItem, Toggle } from '../../components/helpers';

const THEME_LIST = [
  { key: 'dark', name: '暗夜', color: '#0F0A1E' },
  { key: 'light', name: '白昼', color: '#F8F6F2' },
  { key: 'ocean', name: '海洋', color: '#0C1E3D' },
  { key: 'forest', name: '森林', color: '#0A1E14' },
  { key: 'rose', name: '玫瑰', color: '#1E0A14' },
  { key: 'cosmos', name: '宇宙', color: '#0A0A1E' },
];

export default function Settings() {
  const themeName = useAppStore((s) => s.themeName);
  const setThemeName = useAppStore((s) => s.setThemeName);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const TH = THEMES[themeName];
  const T = (k: string) => t(k, lang);

  const remindEnabled = useAppStore((s) => s.remindEnabled);
  const setRemindEnabled = useAppStore((s) => s.setRemindEnabled);
  const remindTime = useAppStore((s) => s.remindTime);
  const setRemindTime = useAppStore((s) => s.setRemindTime);

  const [showLangs, setShowLangs] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showRemindTime, setShowRemindTime] = useState(false);
  const [remindTimeInput, setRemindTimeInput] = useState(remindTime);

  function handleRemindTimeSave() {
    setRemindTime(remindTimeInput);
    setShowRemindTime(false);
  }

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg } as any}>
      {/* Check-in Reminder */}
      <Card>
        <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 8, display: 'block' }}>
          ⏰ 打卡提醒
        </Text>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: TH.sub }}>启用提醒</Text>
          <Toggle value={remindEnabled} onChange={setRemindEnabled} />
        </View>
        {remindEnabled && (
          <RowItem label="提醒时间" value={remindTime} onClick={() => { setRemindTimeInput(remindTime); setShowRemindTime(true); }} />
        )}
      </Card>

      {/* Data Records */}
      <Card>
        <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 8, display: 'block' }}>
          📊 数据记录
        </Text>
        <RowItem label="统计数据" onClick={() => { T('stats') }} />
        <RowItem label="打卡历史" onClick={() => {}} />
        <RowItem label="饮食记录" onClick={() => {}} />
      </Card>

      {/* General */}
      <Card>
        <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 8, display: 'block' }}>
          ⚙️ 通用
        </Text>
        <RowItem label="语言" value={LANG_LIST.find((l: any) => l.key === lang)?.label || '简体中文'} onClick={() => setShowLangs(true)} />
        <RowItem label="主题" value={THEME_LIST.find((t) => t.key === themeName)?.name || '暗夜'} onClick={() => setShowThemes(true)} />
      </Card>

      {/* Health Sync */}
      <Card>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text }}>🔄 健康同步</Text>
            <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2, display: 'block' }}>同步数据到微信运动</Text>
          </View>
          <Toggle value={false} onChange={() => {}} />
        </View>
      </Card>

      {/* About */}
      <Card>
        <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 8, display: 'block' }}>
          ℹ️ 关于
        </Text>
        <RowItem label="分享给好友" onClick={() => {}} />
        <RowItem label="版本" value="1.0.0" />
        <RowItem label="隐私政策" onClick={() => {}} />
      </Card>

      <Text style={{ textAlign: 'center', fontSize: 11, color: TH.sub, marginTop: 8, marginBottom: 40, display: 'block' }}>
        心流纪 Egoless Do v1.0.0
      </Text>

      {/* Language Modal */}
      <Modal show={showLangs} onClose={() => setShowLangs(false)} title="语言 / Language">
        <View style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LANG_LIST.map((l: any) => (
            <View key={l.key} onClick={() => { setLang(l.key); setShowLangs(false); }}
              style={{
                padding: '12px 14px', borderRadius: 8,
                background: lang === l.key ? TH.primary : 'transparent',
                color: lang === l.key ? '#fff' : '#E0E0E0', fontSize: 14,
              }}>
              <Text>{l.label}</Text>
            </View>
          ))}
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal show={showThemes} onClose={() => setShowThemes(false)} title="主题 / Theme">
        <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {THEME_LIST.map((t) => (
            <View key={t.key} onClick={() => { setThemeName(t.key); setShowThemes(false); }}
              style={{
                padding: 16, borderRadius: 12, textAlign: 'center',
                background: t.color,
                border: themeName === t.key ? '2px solid #7C3AED' : '2px solid transparent',
              }}>
              <Text style={{
                fontSize: 13, fontWeight: '600',
                color: t.key === 'light' ? '#333' : '#E0E0E0',
              }}>{t.name}</Text>
            </View>
          ))}
        </View>
      </Modal>

      {/* Remind Time Modal */}
      <Modal show={showRemindTime} onClose={() => setShowRemindTime(false)} title="设置提醒时间">
        <Input
          value={remindTimeInput}
          onInput={(e) => setRemindTimeInput(e.detail.value)}
          style={{
            height: 40, background: 'rgba(255,255,255,.06)', borderRadius: 8,
            padding: '0 10px', color: TH.text, textAlign: 'center', fontSize: 18,
          }}
        />
        <Text style={{ textAlign: 'center', fontSize: 12, color: TH.sub, margin: '8px 0', display: 'block' }}>
          格式: HH:MM（例如 21:00）
        </Text>
        <Btn onClick={handleRemindTimeSave}>确认</Btn>
      </Modal>
    </ScrollView>
  );
}
