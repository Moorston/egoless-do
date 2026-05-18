import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Platform } from 'react-native';
import { useAppStore, THEMES, t, ORANGE, YELLOW, GREEN, BLUE, RED } from '@egoless/core';

export default function HomeScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
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

  const totalCal = foodLog.reduce((a, f) => a + f.calories, 0);

  // Check-in modal state
  const [showCheckin, setShowCheckin] = useState(false);
  const [weight, setWeight] = useState('65');
  const [fasted, setFasted] = useState(false);
  const [water, setWater] = useState('');
  const [practices, setPractices] = useState({ sit: false, stand: false, chant: false });
  const [note, setNote] = useState('');
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>([]);
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>({});
  const [localCheckinDone, setLocalCheckinDone] = useState<boolean | null>(null);

  // Habit checkins local state
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});

  // Food modal state
  const [showAddFood, setShowAddFood] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodNote, setFoodNote] = useState('');

  // Water goal modal
  const [showWaterGoal, setShowWaterGoal] = useState(false);
  const [waterGoalInput, setWaterGoalInput] = useState(String(waterGoal));

  // Cal goal modal
  const [showCalGoal, setShowCalGoal] = useState(false);
  const [calGoalInput, setCalGoalInput] = useState(String(calGoal));

  function submitCheckin() {
    addCheckin({ date: new Date().toISOString().slice(0, 10), done: localCheckinDone ?? false, note, streak });
    setShowCheckin(false);
  }

  function addFoodItem() {
    if (!foodName.trim()) return;
    addFood({ name: foodName, calories: +foodCal || 0, note: foodNote, timestamp: Date.now() });
    setFoodName('');
    setFoodCal('');
    setFoodNote('');
    setShowAddFood(false);
  }

  const QUICK_FOODS = [
    { name: '米饭（一碗）', cal: 200 },
    { name: '面条（一碗）', cal: 250 },
    { name: '馒头（一个）', cal: 180 },
    { name: '面包（一片）', cal: 80 },
  ];

  const inp = {
    backgroundColor: TH.card,
    borderWidth: 1,
    borderColor: TH.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TH.text,
    fontSize: 14,
    width: '100%' as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20 }}>
          <View>
            <Text style={{ fontSize: 11, color: TH.sub, letterSpacing: 3, fontWeight: '500' }}>Egoless Do</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: TH.text, marginTop: 2 }}>{T('appName')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: TH.sub }}>{T('streak')}</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: P }}>{streak} <Text style={{ fontSize: 16 }}>{T('days')} 🔥</Text></Text>
          </View>
        </View>

        {/* Today check-in banner */}
        <TouchableOpacity onPress={() => { setLocalCheckinDone(checkinDone); setShowCheckin(true); }}
          style={{ borderRadius: 16, backgroundColor: '#16A34A', padding: 18, marginBottom: 12 }}>
          <Text style={{ fontWeight: '700', fontSize: 17, color: '#fff', textAlign: 'center' }}>{T('todayCheckin')}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', textAlign: 'center', marginTop: 3, marginBottom: 14 }}>今天朝目标迈进了吗？</Text>
          <View style={{ borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,.6)', backgroundColor: 'rgba(255,255,255,.18)', padding: 11, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {checkinDone === null ? T('openCheckin') : checkinDone ? '✓ ' + T('done') + ' · 修改' : '✗ ' + T('notDone') + ' · 修改'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Streak card */}
        <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={{ fontSize: 34, textAlign: 'center' }}>🔷</Text>
          <Text style={{ fontSize: 13, color: TH.sub, textAlign: 'center', marginTop: 6 }}>{T('streak')}</Text>
          <Text style={{ fontSize: 52, fontWeight: '800', color: ORANGE, textAlign: 'center', lineHeight: 60 }}>{streak}</Text>
          <Text style={{ fontSize: 13, color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('days')}</Text>
          <Text style={{ fontSize: 11, color: TH.sub, textAlign: 'center', marginTop: 8 }}>允许1天宽限，偶尔忘记不会中断连胜</Text>
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {[
            { icon: '📅', label: '累计完成', value: `${streak + 1}`, unit: T('days'), bg: ORANGE },
            { icon: '🏆', label: '最长连续', value: `${streak + 1}`, unit: T('days'), bg: YELLOW },
            { icon: '💪', label: '节省卡路里', value: '4500', unit: '千卡', bg: '#FF8A65' },
            { icon: '🍽', label: '节省餐数', value: `${streak + 1}`, unit: '顿', bg: BLUE },
          ].map((item) => (
            <View key={item.label} style={[s.statCard, { backgroundColor: item.bg }]}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
              <Text style={s.statValue}>{item.value} <Text style={{ fontSize: 12 }}>{item.unit}</Text></Text>
            </View>
          ))}
        </View>

        {/* Water */}
        <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text }}>{T('water')}</Text>
            <TouchableOpacity onPress={() => { setWaterGoalInput(String(waterGoal)); setShowWaterGoal(true); }}>
              <Text style={{ color: TH.sub, fontSize: 12 }}><Text style={{ fontWeight: '600', color: P }}>{waterMl}</Text> ml / {waterGoal}ml ✏️</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.progressBg, { backgroundColor: TH.border }]}>
            <View style={[s.progressFill, { backgroundColor: BLUE, width: `${Math.min(waterMl / waterGoal * 100, 100)}%` as any }]} />
          </View>
          <TouchableOpacity onPress={() => addWater(250)} style={[s.blueBtn, { backgroundColor: BLUE }]}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>+ 250ml</Text>
          </TouchableOpacity>
        </View>

        {/* Calories */}
        <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: ORANGE }}>今日卡路里</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: ORANGE }}>{totalCal}</Text>
            <Text style={{ color: TH.sub, fontSize: 13 }}>/ {calGoal} kcal</Text>
            <TouchableOpacity onPress={() => { setCalGoalInput(String(calGoal)); setShowCalGoal(true); }}>
              <Text style={{ fontSize: 14 }}>✏️</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.progressBg, { backgroundColor: TH.border, marginTop: 8, height: 4 }]}>
            <View style={{ height: 4, backgroundColor: ORANGE, borderRadius: 2, width: `${Math.min(totalCal / calGoal * 100, 100)}%` as any }} />
          </View>
        </View>

        {/* Add food button */}
        <TouchableOpacity onPress={() => setShowAddFood(true)}
          style={{ width: '100%', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: TH.border, backgroundColor: 'transparent', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: P, fontWeight: '600', fontSize: 14 }}>{T('addFoodBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Check-in Modal */}
      <Modal visible={showCheckin} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={[s.flexRow, { marginBottom: 4 }]}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: TH.text }}>{T('todayCheckin')}</Text>
              <TouchableOpacity onPress={() => setShowCheckin(false)}>
                <Text style={{ fontSize: 22, color: TH.sub }}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: TH.sub, fontSize: 12, textAlign: 'center', marginBottom: 18 }}>诚实记录，养成习惯</Text>

            {/* Weight */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 6 }}>今日体重</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: TH.border, borderRadius: 10, padding: 8, backgroundColor: TH.card }}>
                <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad"
                  style={{ flex: 1, borderWidth: 0, fontSize: 16, fontWeight: '600', color: TH.text, padding: 0 }} />
                <Text style={{ color: TH.sub, fontSize: 13 }}>公斤</Text>
                <Text style={{ color: TH.sub }}>▼</Text>
              </View>
            </View>

            {/* Fasted toggle */}
            <View style={[s.rowItem, { borderBottomWidth: 1, borderBottomColor: TH.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🙏</Text>
                <Text style={{ fontSize: 14, color: TH.text }}>今日禁欲</Text>
              </View>
              <TouchableOpacity onPress={() => setFasted((v) => !v)}
                style={[s.toggle, { backgroundColor: fasted ? P : 'rgba(128,128,128,.3)' }]}>
                <View style={[s.toggleDot, { left: fasted ? 22 : 2 }]} />
              </TouchableOpacity>
            </View>

            {/* Water */}
            <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <Text style={{ marginBottom: 10 }}><Text style={{ fontSize: 18 }}>💧</Text><Text style={{ fontSize: 14, color: TH.text }}> 今日饮水</Text></Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['500ml', '1000ml', '1500ml', '2000ml', '>2000ml'].map((v) => (
                  <TouchableOpacity key={v} onPress={() => setWater(v)}
                    style={{ padding: 6, borderRadius: 8, borderWidth: 1, borderColor: water === v ? P : TH.border, backgroundColor: water === v ? `${P}30` : 'transparent' }}>
                    <Text style={{ fontSize: 12, color: water === v ? '#fff' : TH.sub }}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Practices */}
            <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <Text style={{ marginBottom: 10 }}><Text style={{ fontSize: 18 }}>⭐</Text><Text style={{ fontWeight: '600', fontSize: 14, color: TH.text }}> 修行记录</Text></Text>
              {[
                { key: 'sit' as const, icon: '🧘', label: '打坐' },
                { key: 'stand' as const, icon: '🧍', label: '站桩' },
                { key: 'chant' as const, icon: '📿', label: '诵经' },
              ].map(({ key, icon, label }, i, arr) => (
                <View key={key} style={[s.rowItem, i < arr.length - 1 ? { borderBottomWidth: 1, borderBottomColor: TH.border } : {}]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                    <Text style={{ fontSize: 14, color: TH.text }}>{label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPractices((p) => ({ ...p, [key]: !p[key] }))}
                    style={[s.toggle, { backgroundColor: practices[key] ? P : 'rgba(128,128,128,.3)' }]}>
                    <View style={[s.toggleDot, { left: practices[key] ? 22 : 2 }]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Habit checkins */}
            {habits.filter((h) => h.status === 'inProgress').length > 0 ? (
              <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                <Text style={{ marginBottom: 10 }}><Text style={{ fontSize: 18 }}>◇</Text><Text style={{ fontWeight: '600', fontSize: 14, color: TH.text }}> 习惯打卡</Text></Text>
                {habits.filter((h) => h.status === 'inProgress').map((h, i, arr) => (
                  <View key={h.id} style={[s.rowItem, i < arr.length - 1 ? { borderBottomWidth: 1, borderBottomColor: TH.border } : {}]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 16 }}>◇</Text>
                      <View>
                        <Text style={{ fontSize: 14, color: TH.text }}>{h.name}</Text>
                        <Text style={{ fontSize: 11, color: TH.sub }}>连续 {h.streak} 天</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setHabitCheckins((c) => ({ ...c, [h.id]: !c[h.id] }))}
                      style={[s.toggle, { backgroundColor: habitCheckins[h.id] ? P : 'rgba(128,128,128,.3)' }]}>
                      <View style={[s.toggleDot, { left: habitCheckins[h.id] ? 22 : 2 }]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Free checkin */}
            <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <View style={[s.flexRow, { marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>✎</Text>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: TH.text }}>{T('freeCheckin')}</Text>
                </View>
                <TouchableOpacity onPress={() => setFreeItems((f) => [...f, { id: String(Date.now()), name: '' }])}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: P, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 18 }}>+</Text>
                </TouchableOpacity>
              </View>
              {freeItems.map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setFreeCheckins((c) => ({ ...c, [item.id]: !c[item.id] }))}
                    style={[s.toggle, { backgroundColor: freeCheckins[item.id] ? P : 'rgba(128,128,128,.3)' }]}>
                    <View style={[s.toggleDot, { left: freeCheckins[item.id] ? 22 : 2 }]} />
                  </TouchableOpacity>
                  <TextInput value={item.name} onChangeText={(v) => setFreeItems((f) => f.map((x) => x.id === item.id ? { ...x, name: v } : x))}
                    placeholder={`自定义项目 ${freeItems.indexOf(item) + 1}`} placeholderTextColor={TH.sub}
                    style={[inp, { flex: 1, paddingVertical: 7 }]} />
                  <TouchableOpacity onPress={() => setFreeItems((f) => f.filter((x) => x.id !== item.id))}>
                    <Text style={{ color: RED, fontSize: 16 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Note */}
            <View style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 8 }}>{T('note')}</Text>
              <TextInput value={note} onChangeText={setNote} placeholder="今天有什么想说的..." placeholderTextColor={TH.sub}
                multiline style={{ width: '100%', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, borderRadius: 12, padding: 12, color: TH.text, fontSize: 14, minHeight: 72, textAlignVertical: 'top' }} />
            </View>

            {/* Done/Not Done buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setLocalCheckinDone(false)}
                style={{ flex: 1, padding: 13, borderRadius: 12, fontWeight: '700', fontSize: 15, borderWidth: 2, borderColor: localCheckinDone === false ? RED : TH.border, backgroundColor: localCheckinDone === false ? 'rgba(239,68,68,.15)' : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: localCheckinDone === false ? RED : TH.sub, fontWeight: '700' }}>✗ {T('notDone')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLocalCheckinDone(true)}
                style={{ flex: 1, padding: 13, borderRadius: 12, fontWeight: '700', fontSize: 15, borderWidth: 2, borderColor: localCheckinDone === true ? GREEN : TH.border, backgroundColor: localCheckinDone === true ? 'rgba(16,185,129,.15)' : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: localCheckinDone === true ? GREEN : TH.sub, fontWeight: '700' }}>✓ {T('done')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { setCheckinDone(localCheckinDone); submitCheckin(); }}
              style={{ width: '100%', padding: 14, borderRadius: 12, borderWidth: 0, marginBottom: 10, backgroundColor: localCheckinDone === true ? GREEN : localCheckinDone === false ? RED : P, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                {localCheckinDone === true ? T('submit') : localCheckinDone === false ? T('save') : '请选择完成状态'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Food Modal */}
      <Modal visible={showAddFood} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignSelf: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 16, color: TH.text }}>{T('addFood')}</Text>
            <TextInput value={foodName} onChangeText={setFoodName} placeholder={T('foodName')} placeholderTextColor={TH.sub}
              style={[inp, { marginBottom: 10, borderWidth: 2, borderColor: P }]} />
            <TextInput value={foodCal} onChangeText={setFoodCal} keyboardType="number-pad" placeholder={T('calories2')} placeholderTextColor={TH.sub}
              style={[inp, { marginBottom: 10 }]} />
            <TextInput value={foodNote} onChangeText={setFoodNote} placeholder="打卡感念" placeholderTextColor={TH.sub}
              multiline style={[inp, { marginBottom: 12, minHeight: 50, textAlignVertical: 'top' }]} />
            <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 8 }}>{T('quickAdd')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {QUICK_FOODS.map((f) => (
                <TouchableOpacity key={f.name} onPress={() => { setFoodName(f.name); setFoodCal(String(f.cal)); }}
                  style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: 12, color: TH.text }}>{f.name}</Text>
                  <Text style={{ fontSize: 11, color: P, marginTop: 2 }}>{f.cal}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowAddFood(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: 14 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addFoodItem}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 0, backgroundColor: ORANGE, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Water Goal Modal */}
      <Modal visible={showWaterGoal} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignSelf: 'center', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 17, marginBottom: 6, color: TH.text }}>设置每日饮水目标</Text>
            <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 16 }}>请输入500-3000之间的数值</Text>
            <TextInput value={waterGoalInput} onChangeText={setWaterGoalInput} keyboardType="number-pad"
              style={[inp, { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20, borderWidth: 2, borderColor: BLUE }]} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowWaterGoal(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: 14 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setWaterGoal(Math.max(500, Math.min(3000, +waterGoalInput || 2000))); setShowWaterGoal(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 0, backgroundColor: BLUE, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cal Goal Modal */}
      <Modal visible={showCalGoal} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignSelf: 'center', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 17, marginBottom: 6, color: TH.text }}>设置每日卡路里目标</Text>
            <Text style={{ fontSize: 12, color: TH.sub, marginBottom: 16 }}>请输入500-10000之间的数值</Text>
            <TextInput value={calGoalInput} onChangeText={setCalGoalInput} keyboardType="number-pad"
              style={[inp, { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20, borderWidth: 2, borderColor: GREEN }]} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCalGoal(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: 14 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setCalGoal(Math.max(500, Math.min(10000, +calGoalInput || 2000))); setShowCalGoal(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 0, backgroundColor: GREEN, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  statCard: { width: '48%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,.78)', textAlign: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', color: '#fff' },
  progressBg: { height: 6, borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  blueBtn: { borderRadius: 10, padding: 12, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  toggle: { width: 44, height: 24, borderRadius: 12, position: 'relative' },
  toggleDot: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
});
