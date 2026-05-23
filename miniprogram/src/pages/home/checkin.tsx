import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useStore } from '../../utils/store';
import { COLORS, dateStr, t } from '../../core';
import { getPrimaryColor } from '../../utils/theme';

export default function CheckinPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const lang = store.language;
  const [weight, setWeight] = useState('65');
  const [fasted, setFasted] = useState(false);
  const [water, setWater] = useState('');
  const [practices, setPractices] = useState({ sit: false, stand: false, chant: false });
  const [note, setNote] = useState('');
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>([]);
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>({});
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});
  const [localDone, setLocalDone] = useState<boolean | null>(null);

  const submit = () => {
    if (localDone === null) { Taro.showToast({ title: t('checkinSelectStatus', lang), icon: 'none' }); return; }
    const today = dateStr();
    // Process habit checkins
    Object.entries(habitCheckins).forEach(([id, checked]) => { if (checked) store.checkinHabit(id, today); });
    // Add water if selected
    const waterMap: Record<string, number> = { '500ml': 500, '1000ml': 1000, '1500ml': 1500, '2000ml': 2000, '>2000ml': 2500 };
    if (water && waterMap[water]) store.addWater(waterMap[water]);
    // Build enhanced note with practices and free items
    const parts = [note];
    if (practices.sit) parts.push(`🧘${t('checkinSit', lang)}`);
    if (practices.stand) parts.push(`🧍${t('checkinStand', lang)}`);
    if (practices.chant) parts.push(`📿${t('checkinSutra', lang)}`);
    freeItems.forEach(item => {
      if (freeCheckins[item.id] && item.name) parts.push(`✓${item.name}`);
    });
    const weightNum = weight ? parseFloat(weight) : undefined;
    store.submitCheckin(localDone, parts.filter(Boolean).join(' · '), undefined, weightNum);
    Taro.navigateBack();
  };

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      {/* Header */}
      <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '28rpx' }}>
        <Text onClick={() => Taro.navigateBack()} style={{ color: '#fff', fontSize: '44rpx' }}>←</Text>
        <Text style={{ fontWeight: '700', fontSize: '40rpx', color: '#fff' }}>{t('checkinTitle', lang)}</Text>
      </View>

      {/* Weight */}
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '12rpx' }}>{t('checkinWeight', lang)}</Text>
      <View style={{ display: 'flex', alignItems: 'center', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', background: 'rgba(255,255,255,.07)', marginBottom: '28rpx' }}>
        <Input type="number" value={weight} onInput={e => setWeight(e.detail.value)}
          style={{ flex: 1, textAlign: 'center', fontSize: '40rpx', fontWeight: '600', color: '#fff', padding: '16rpx 0' }} />
        <Text style={{ flex: 1, textAlign: 'center', color: 'rgba(255,255,255,.45)', fontSize: '40rpx', padding: '16rpx 0' }}>{t('checkinKg', lang)}</Text>
      </View>

      {/* Fasted */}
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
          <Text style={{ fontSize: '40rpx' }}>🙏</Text>
          <Text style={{ color: '#fff', fontSize: '40rpx' }}>{t('checkinAbstinence', lang)}</Text>
        </View>
        <View onClick={() => setFasted(v => !v)} style={{ width: '88rpx', height: '52rpx', borderRadius: '26rpx', background: fasted ? P : 'rgba(128,128,128,.3)', justifyContent: 'center', padding: '4rpx' }}>
          <View style={{ width: '44rpx', height: '44rpx', borderRadius: '22rpx', background: '#fff', alignSelf: fasted ? 'flex-end' : 'flex-start' }} />
        </View>
      </View>

      {/* Water */}
      <View style={{ padding: '26rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '20rpx' }}>
          <Text style={{ fontSize: '40rpx' }}>💧</Text>
          <Text style={{ color: '#fff', fontSize: '40rpx' }}>{t('checkinWater', lang)}</Text>
        </View>
        <View style={{ display: 'flex', gap: '12rpx', flexWrap: 'wrap' }}>
          {['500ml', '1000ml', '1500ml', '2000ml', '>2000ml'].map(v => (
            <View key={v} onClick={() => setWater(v)} style={{ padding: '12rpx 20rpx', borderRadius: '16rpx', border: `2rpx solid ${water === v ? P : 'rgba(255,255,255,.2)'}`, background: water === v ? `${P}30` : 'transparent' }}>
              <Text style={{ color: water === v ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Practices */}
      <View style={{ padding: '26rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '20rpx' }}>
          <Text style={{ fontSize: '40rpx' }}>⭐</Text>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx' }}>{t('checkinPractice', lang)}</Text>
        </View>
        {([{ key: 'sit' as const, icon: '🧘', label: t('checkinSit', lang) }, { key: 'stand' as const, icon: '🧍', label: t('checkinStand', lang) }, { key: 'chant' as const, icon: '📿', label: t('checkinSutra', lang) }]).map(({ key, icon, label }) => (
          <View key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
              <Text style={{ fontSize: '40rpx' }}>{icon}</Text>
              <Text style={{ color: '#fff', fontSize: '40rpx' }}>{label}</Text>
            </View>
            <View onClick={() => setPractices(p => ({ ...p, [key]: !p[key] }))} style={{ width: '88rpx', height: '52rpx', borderRadius: '26rpx', background: practices[key] ? P : 'rgba(128,128,128,.3)', justifyContent: 'center', padding: '4rpx' }}>
              <View style={{ width: '44rpx', height: '44rpx', borderRadius: '22rpx', background: '#fff', alignSelf: practices[key] ? 'flex-end' : 'flex-start' }} />
            </View>
          </View>
        ))}
      </View>

      {/* Habit checkin */}
      {store.habits.filter(h => h.status === 'inProgress').length > 0 && (
        <View style={{ padding: '26rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
          <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '20rpx' }}>
            <Text style={{ fontSize: '40rpx' }}>◇</Text>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx' }}>{t('checkinHabitCheck', lang)}</Text>
          </View>
          {store.habits.filter(h => h.status === 'inProgress').map(h => (
            <View key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
              <View>
                <Text style={{ color: '#fff', fontSize: '40rpx', display: 'block' }}>{h.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block' }}>{h.streak} {t('checkinStreak', lang)}</Text>
              </View>
              <View onClick={() => setHabitCheckins(c => ({ ...c, [h.id]: !c[h.id] }))} style={{ width: '88rpx', height: '52rpx', borderRadius: '26rpx', background: habitCheckins[h.id] ? P : 'rgba(128,128,128,.3)', justifyContent: 'center', padding: '4rpx' }}>
                <View style={{ width: '44rpx', height: '44rpx', borderRadius: '22rpx', background: '#fff', alignSelf: habitCheckins[h.id] ? 'flex-end' : 'flex-start' }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Free checkin */}
      <View style={{ padding: '26rpx 0', borderBottom: '1rpx solid rgba(255,255,255,.09)' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20rpx' }}>
          <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
            <Text style={{ fontSize: '40rpx' }}>✎</Text>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: '40rpx' }}>{t('checkinCustom', lang)}</Text>
          </View>
          <View onClick={() => setFreeItems(f => [...f, { id: String(Date.now()), name: '' }])}
            style={{ width: '52rpx', height: '52rpx', borderRadius: '26rpx', background: P, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: '40rpx' }}>+</Text>
          </View>
        </View>
        {freeItems.map((item, idx) => (
          <View key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16rpx', marginBottom: '16rpx' }}>
            <View onClick={() => setFreeCheckins(c => ({ ...c, [item.id]: !c[item.id] }))} style={{ width: '88rpx', height: '52rpx', borderRadius: '26rpx', background: freeCheckins[item.id] ? P : 'rgba(128,128,128,.3)', justifyContent: 'center', padding: '4rpx' }}>
              <View style={{ width: '44rpx', height: '44rpx', borderRadius: '22rpx', background: '#fff', alignSelf: freeCheckins[item.id] ? 'flex-end' : 'flex-start' }} />
            </View>
            <Input value={item.name} onInput={e => setFreeItems(f => f.map(x => x.id === item.id ? { ...x, name: e.detail.value } : x))}
              placeholder={`${t('checkinFree', lang)} ${idx + 1}`}
              style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '20rpx', padding: '14rpx 20rpx', color: '#fff', fontSize: '40rpx' }} />
          </View>
        ))}
      </View>

      {/* Note */}
      <View style={{ padding: '28rpx 0' }}>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '16rpx' }}>{t('checkinNote', lang)}</Text>
        <Textarea value={note} onInput={e => setNote(e.detail.value)} placeholder={t('checkinNotePlaceholder', lang)} autoHeight
          style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.1)', borderRadius: '24rpx', padding: '20rpx 24rpx', color: '#fff', fontSize: '40rpx', minHeight: '120rpx', boxSizing: 'border-box' }} />
      </View>

      {/* Done / Not Done */}
      <View style={{ display: 'flex', gap: '16rpx', marginBottom: '24rpx' }}>
        <View onClick={() => setLocalDone(false)} style={{ flex: 1, padding: '26rpx', borderRadius: '24rpx', alignItems: 'center', border: `4rpx solid ${localDone === false ? COLORS.RED : 'rgba(255,255,255,.2)'}`, background: localDone === false ? 'rgba(239,68,68,.15)' : 'transparent' }}>
          <Text style={{ fontWeight: '700', fontSize: '40rpx', color: localDone === false ? COLORS.RED : 'rgba(255,255,255,.5)', textAlign: 'center', display: 'block' }}>✗ {t('checkinNotDone', lang)}</Text>
        </View>
        <View onClick={() => setLocalDone(true)} style={{ flex: 1, padding: '26rpx', borderRadius: '24rpx', alignItems: 'center', border: `4rpx solid ${localDone === true ? COLORS.GREEN : 'rgba(255,255,255,.2)'}`, background: localDone === true ? 'rgba(16,185,129,.15)' : 'transparent' }}>
          <Text style={{ fontWeight: '700', fontSize: '40rpx', color: localDone === true ? COLORS.GREEN : 'rgba(255,255,255,.5)', textAlign: 'center', display: 'block' }}>✓ {t('checkinDone', lang)}</Text>
        </View>
      </View>

      {/* Submit */}
      <View onClick={submit} style={{ background: localDone === true ? COLORS.GREEN : localDone === false ? COLORS.RED : P, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '20rpx' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>
          {localDone === true ? t('checkinSubmit', lang) : localDone === false ? t('checkinSave', lang) : t('checkinSelectStatus', lang)}
        </Text>
      </View>

      {/* Cancel */}
      <View onClick={() => Taro.navigateBack()} style={{ border: '1rpx solid rgba(255,255,255,.2)', borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '60rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{t('commonCancel', lang)}</Text>
      </View>
    </ScrollView>
  );
}

