import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useAppStore, THEMES, t, LANG_LIST } from '@egoless/core';

export default function SettingsScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const setThemeName = useAppStore((s) => s.setThemeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const T = (k: string) => t(k, lang);

  const [remindOn, setRemindOn] = useState(true);
  const [healthSync, setHealthSync] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const RowItem = ({ label, right, sub, icon, last, onClick }: { label: string; right: React.ReactNode; sub?: string; icon?: string; last?: boolean; onClick?: () => void }) => (
    <TouchableOpacity onPress={onClick}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: TH.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? <Text style={{ fontSize: 18 }}>{icon}</Text> : null}
        <View>
          <Text style={{ fontSize: 14, color: TH.text }}>{label}</Text>
          {sub ? <Text style={{ fontSize: 11, color: TH.sub, marginTop: 1 }}>{sub}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {typeof right === 'string' ? <Text style={{ color: TH.sub, fontSize: 13 }}>{right}</Text> : right}
      </View>
    </TouchableOpacity>
  );

  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <TouchableOpacity onPress={onChange}
      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: on ? P : 'rgba(128,128,128,.3)', position: 'relative' }}>
      <View style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
    </TouchableOpacity>
  );

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: any }) => (
    <View style={[{ backgroundColor: TH.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: TH.border }, style]}>
      {children}
    </View>
  );

  const sections = [
    { title: '打卡提醒', rows: [
      { label: T('remindOn'), right: <Toggle on={remindOn} onChange={() => setRemindOn((v) => !v)} /> },
      { label: T('remindTime'), right: '21:00', last: true },
    ]},
    { title: '数据记录', rows: [
      { label: T('statsData'), icon: '📊', right: '›', onClick: () => {} },
      { label: T('history'), icon: '📅', right: '›', onClick: () => {} },
      { label: T('foodLog'), icon: '🍽', right: '›', last: true, onClick: () => {} },
    ]},
    { title: '通用设置', rows: [
      { label: T('language'), right: '🇨🇳 简体中文 ›', onClick: () => setShowLangPicker(true) },
      { label: T('theme'), right: `${THEMES[themeName].name} ›`, onClick: () => setShowThemePicker(true) },
      { label: '体重单位', right: '公斤 ›', last: true },
    ]},
    { title: '数据同步', rows: [
      { label: T('appleHealth'), sub: '未启用', right: <Toggle on={healthSync} onChange={() => setHealthSync((v) => !v)} />, last: true },
    ]},
    { title: '关于', rows: [
      { label: T('shareApp'), icon: '🧘', right: '›' },
      { label: T('version'), right: '1.0.0' },
      { label: T('privacy'), right: '›' },
      { label: T('resetWelcome'), icon: '🔄', sub: '重新显示用户协议', right: '›', last: true },
    ]},
  ];

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: TH.text, marginBottom: 16 }}>{T('settings')}</Text>
        {sections.map(({ title, rows }) => (
          <View key={title} style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TH.sub, paddingTop: 14, paddingBottom: 6 }}>{title}</Text>
            <Card>
              {rows.map((r, i) => <RowItem key={i} {...r} />)}
            </Card>
          </View>
        ))}
      
      </ScrollView>

      {/* Language Picker */}
      <Modal visible={showLangPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={[s.flexRow, { marginBottom: 16 }]}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: TH.text }}>{T('language')}</Text>
              <TouchableOpacity onPress={() => setShowLangPicker(false)}>
                <Text style={{ fontSize: 22, color: TH.sub }}>×</Text>
              </TouchableOpacity>
            </View>
            {LANG_LIST.map((l) => (
              <TouchableOpacity key={l.code} onPress={() => { setLang(l.code); setShowLangPicker(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 22 }}>{l.flag}</Text>
                  <Text style={{ fontSize: 15, color: TH.text }}>{l.name}</Text>
                </View>
                {l.code === lang ? <Text style={{ color: P, fontSize: 18 }}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Theme Picker */}
      <Modal visible={showThemePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={[s.flexRow, { marginBottom: 16 }]}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: TH.text }}>{T('theme')}</Text>
              <TouchableOpacity onPress={() => setShowThemePicker(false)}>
                <Text style={{ fontSize: 22, color: TH.sub }}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(THEMES).map(([key, th]) => (
                <TouchableOpacity key={key} onPress={() => { setThemeName(key); setShowThemePicker(false); }}
                  style={{ width: '30%', borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: themeName === key ? th.primary : 'transparent' }}>
                  <View style={{ backgroundColor: th.bg, height: 56, justifyContent: 'flex-end', padding: 8 }}>
                    <View style={{ width: '60%', height: 5, borderRadius: 3, backgroundColor: th.primary, marginBottom: 3 }} />
                    <View style={{ width: '40%', height: 3, borderRadius: 2, backgroundColor: th.card }} />
                  </View>
                  <View style={{ backgroundColor: TH.card, padding: 5, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: TH.text }}>{th.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
