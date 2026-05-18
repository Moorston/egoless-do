import { useState } from 'react';
import { View, Text, ScrollView, Input, Button } from '@tarojs/components';
import { useAppStore, THEMES, t, ORANGE, GREEN, BLUE, RED, YELLOW, ALL_SPORTS, QUICK_FOODS } from '@egoless/core';
import { Card, Btn, Modal } from '../../components/helpers';

export default function Index() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const streak = useAppStore((s) => s.streak);
  const waterMl = useAppStore((s) => s.waterMl);
  const waterGoal = useAppStore((s) => s.waterGoal);
  const calGoal = useAppStore((s) => s.calGoal);
  const foodLog = useAppStore((s) => s.foodLog);
  const addWater = useAppStore((s) => s.addWater);
  const checkinDone = useAppStore((s) => s.checkinDone);
  const setCheckinDone = useAppStore((s) => s.setCheckinDone);
  const addCheckin = useAppStore((s) => s.addCheckin);
  const habits = useAppStore((s) => s.habits);
  const checkInHabit = useAppStore((s) => s.checkInHabit);
  const addFood = useAppStore((s) => s.addFood);
  const setWaterGoal = useAppStore((s) => s.setWaterGoal);
  const setCalGoal = useAppStore((s) => s.setCalGoal);

  const totalCal = foodLog.reduce((a: any, f: any) => a + f.calories, 0);
  const waterPct = waterGoal > 0 ? Math.min(100, Math.round(waterMl / waterGoal * 100)) : 0;
  const calPct = calGoal > 0 ? Math.min(100, Math.round(totalCal / calGoal * 100)) : 0;

  const [showCheckin, setShowCheckin] = useState(false);
  const [weight, setWeight] = useState('65');
  const [fasted, setFasted] = useState(false);
  const [water, setWater] = useState('');
  const [practices, setPractices] = useState({ sit: false, stand: false, chant: false });
  const [note, setNote] = useState('');
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>([]);
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>({});
  const [localCheckinDone, setLocalCheckinDone] = useState<boolean | null>(null);
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});
  const [showAddFood, setShowAddFood] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [showWaterGoal, setShowWaterGoal] = useState(false);
  const [showCalGoal, setShowCalGoal] = useState(false);
  const [waterGoalInput, setWaterGoalInput] = useState(String(waterGoal));
  const [calGoalInput, setCalGoalInput] = useState(String(calGoal));

  function handleCheckinDone(v: boolean) {
    setLocalCheckinDone(v);
    const dateStr = new Date().toISOString().slice(0, 10);
    addCheckin({
      date: dateStr, done: v, note,
      weight: Number(weight), fasted, water: Number(water) || Math.round(waterMl / 250) * 250,
      practices: { sit: practices.sit, stand: practices.stand, chant: practices.chant },
    } as any);
    setCheckinDone(v);
    if (v) useAppStore.getState().setStreak?.(streak + 1);
    setTimeout(() => setShowCheckin(false), 300);
  }

  function handleAddFood() {
    if (!foodName || !foodCal) return;
    addFood({ name: foodName, calories: Number(foodCal), note: foodNote });
    setFoodName(''); setFoodCal(''); setFoodNote('');
    setShowAddFood(false);
  }

  function quickAddFood(name: string, cal: number) {
    addFood({ name, calories: cal, note: '' });
  }

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg }}>
      {/* Check-in Banner */}
      <View
        onClick={() => { setShowCheckin(true); setLocalCheckinDone(null); }}
        style={{
          background: `linear-gradient(135deg, ${TH.primary}, ${TH.primary}88)`,
          borderRadius: 16, padding: 18, marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
            {checkinDone ? '✅ 已完成打卡' : checkinDone === false ? '❌ 今日未打卡' : '📋 今日打卡'}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 4, display: 'block' }}>
            {T('clickToCheckIn')}
          </Text>
        </View>
        <Text style={{ fontSize: 28 }}>{'>'}</Text>
      </View>

      {/* Streak Card */}
      <Card>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: TH.text }}>🔥 {T('streak')}</Text>
            <Text style={{ fontSize: 12, color: TH.sub, marginTop: 2, display: 'block' }}>连续打卡天数</Text>
          </View>
          <Text style={{ fontSize: 36, fontWeight: '800', color: ORANGE }}>{streak}</Text>
        </View>
        <View style={{ fontSize: 11, color: TH.sub, marginTop: 8, display: 'flex', gap: 4 }}>
          <Text>💡 拥有1天「宽限期」，中断后可恢复</Text>
        </View>
      </Card>

      {/* Stats Grid */}
      <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: '累计完成', value: '142天', color: GREEN },
          { label: '最长记录', value: '66天', color: BLUE },
          { label: '节省热量', value: '3,240大卡', color: ORANGE },
          { label: '节省餐食', value: '18餐', color: YELLOW },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text style={{ fontSize: 11, color: TH.sub }}>{s.label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: s.color }}>{s.value}</Text>
          </Card>
        ))}
      </View>

      {/* Water Tracker */}
      <Card>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text }}>💧 {T('waterIntake')}</Text>
          <Text style={{ fontSize: 12, color: TH.sub }} onClick={() => setShowWaterGoal(true)}>
            {waterMl}/{waterGoal}ml
          </Text>
        </View>
        <View style={{ height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
          <View style={{ width: `${waterPct}%`, height: '100%', background: BLUE, borderRadius: 4 }} />
        </View>
        <Button
          onClick={() => addWater(250)}
          style={{
            width: '100%', height: 36, borderRadius: 18, background: 'rgba(255,255,255,.08)',
            border: 'none', color: TH.text, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: '36px',
          }}
        >+ 250ml</Button>
      </Card>

      {/* Calorie Tracker */}
      <Card>
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text }}>🍱 {T('calorieIntake')}</Text>
          <Text style={{ fontSize: 12, color: TH.sub }} onClick={() => setShowCalGoal(true)}>
            {totalCal}/{calGoal}kcal
          </Text>
        </View>
        <View style={{ height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
          <View style={{ width: `${calPct}%`, height: '100%', background: ORANGE, borderRadius: 4 }} />
        </View>
        <View style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {foodLog.slice(0, 3).map((f: any) => (
            <View key={f.id} style={{
              background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Text style={{ fontSize: 11, color: TH.text }}>{f.name}</Text>
              <Text style={{ fontSize: 10, color: TH.sub }}>{f.calories}kcal</Text>
            </View>
          ))}
        </View>
        <Button
          onClick={() => setShowAddFood(true)}
          style={{
            width: '100%', height: 36, borderRadius: 18, background: 'rgba(255,255,255,.08)',
            border: 'none', color: TH.text, fontSize: 13, lineHeight: '36px',
          }}
        >+ {T('addFood')}</Button>
      </Card>

      {/* Check-in Modal */}
      <Modal show={showCheckin} onClose={() => setShowCheckin(false)} title="📋 今日打卡">
        <View style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <View style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: TH.sub }}>体重</Text>
            <Input
              value={weight} onInput={(e) => setWeight(e.detail.value)}
              style={{ flex: 1, height: 36, borderBottom: '1px solid rgba(255,255,255,.15)', padding: '0 4px', color: TH.text }}
              type="digit"
            />
            <Text style={{ fontSize: 12, color: TH.sub }}>kg</Text>
          </View>
          <View style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'fasted', label: '禁食', state: fasted, set: () => setFasted(!fasted) },
              { key: 'sit', label: '坐禅', state: practices.sit, set: () => setPractices({ ...practices, sit: !practices.sit }) },
              { key: 'stand', label: '站桩', state: practices.stand, set: () => setPractices({ ...practices, stand: !practices.stand }) },
              { key: 'chant', label: '持咒', state: practices.chant, set: () => setPractices({ ...practices, chant: !practices.chant }) },
            ].map((p) => (
              <View key={p.key} onClick={p.set} style={{
                padding: '6px 14px', borderRadius: 16,
                background: p.state ? TH.primary : 'rgba(255,255,255,.08)',
                color: p.state ? '#fff' : TH.sub, fontSize: 12,
              }}>
                <Text>{p.label}</Text>
              </View>
            ))}
          </View>
          {habits.filter((h: any) => h.createTag).map((h: any) => (
            <View key={h.id} onClick={() => {
              setHabitCheckins((prev: any) => ({ ...prev, [h.id]: !prev[h.id] }));
              checkInHabit(h.id, new Date().toISOString().slice(0, 10));
            }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
            }}>
              <View style={{
                width: 20, height: 20, borderRadius: 4, border: '2px solid',
                borderColor: habitCheckins[h.id] ? TH.primary : 'rgba(255,255,255,.2)',
                background: habitCheckins[h.id] ? TH.primary : 'transparent',
              }} />
              <Text style={{ fontSize: 13, color: TH.text }}>☑ {h.name}</Text>
            </View>
          ))}
          <Input
            placeholder="备注（选填）"
            value={note} onInput={(e) => setNote(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text, fontSize: 13 }}
          />
          <View style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn onClick={() => handleCheckinDone(true)} style={{ flex: 1, background: GREEN }}>✅ 已完成</Btn>
            <Btn onClick={() => handleCheckinDone(false)} style={{ flex: 1, background: RED }}>❌ 未完成</Btn>
          </View>
        </View>
      </Modal>

      {/* Add Food Modal */}
      <Modal show={showAddFood} onClose={() => setShowAddFood(false)} title="🍱 添加饮食">
        <View style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input placeholder="食物名称" value={foodName} onInput={(e) => setFoodName(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} />
          <Input placeholder="热量 (kcal)" value={foodCal} onInput={(e) => setFoodCal(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} type="digit" />
          <Input placeholder="备注" value={foodNote} onInput={(e) => setFoodNote(e.detail.value)}
            style={{ height: 36, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text }} />
          <View style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {QUICK_FOODS.map((f: any) => (
              <View key={f.key} onClick={() => quickAddFood(f.name, f.cal)}
                style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(255,255,255,.06)', fontSize: 11, color: TH.sub }}>
                <Text>{f.icon}{f.name} {f.cal}kcal</Text>
              </View>
            ))}
          </View>
          <Btn onClick={handleAddFood} style={{ background: TH.primary, marginTop: 8 }}>添加</Btn>
        </View>
      </Modal>

      {/* Goal Modals */}
      <Modal show={showWaterGoal} onClose={() => setShowWaterGoal(false)} title="💧 饮水目标">
        <Input value={waterGoalInput} onInput={(e) => setWaterGoalInput(e.detail.value)}
          style={{ height: 40, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text, textAlign: 'center', fontSize: 18 }} type="digit" />
        <Text style={{ textAlign: 'center', fontSize: 12, color: TH.sub, margin: '8px 0', display: 'block' }}>ml</Text>
        <Btn onClick={() => { setWaterGoal(Number(waterGoalInput) || 2000); setShowWaterGoal(false); }}>确认</Btn>
      </Modal>
      <Modal show={showCalGoal} onClose={() => setShowCalGoal(false)} title="🍱 热量目标">
        <Input value={calGoalInput} onInput={(e) => setCalGoalInput(e.detail.value)}
          style={{ height: 40, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '0 10px', color: TH.text, textAlign: 'center', fontSize: 18 }} type="digit" />
        <Text style={{ textAlign: 'center', fontSize: 12, color: TH.sub, margin: '8px 0', display: 'block' }}>kcal</Text>
        <Btn onClick={() => { setCalGoal(Number(calGoalInput) || 2000); setShowCalGoal(false); }}>确认</Btn>
      </Modal>
    </ScrollView>
  );
}
