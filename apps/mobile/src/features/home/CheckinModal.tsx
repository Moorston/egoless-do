import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT, Toggle, ThemedInput, PrimaryButton, OutlineButton } from '../../components/UI';
import { COLORS, dateStr, getTodayFoodLog } from '@egoless-do/core';

export default function CheckinModal({ onClose }: { onClose: () => void }) {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();

  // Calculate today's total calories from foodLog
  const totalCal = useMemo(
    () => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + (f.calories ?? f.cal ?? 0), 0),
    [store.foodLog],
  );

  const [weight, setWeight]       = useState('65');
  const [fasted, setFasted]       = useState(false);
  const [water, setWater]         = useState(() => {
    const waterMl = store.waterMl ?? 0;
    if (waterMl >= 2000) return '>2000ml';
    if (waterMl >= 1500) return '2000ml';
    if (waterMl >= 1000) return '1500ml';
    if (waterMl >= 500) return '1000ml';
    if (waterMl > 0) return '500ml';
    return '';
  });
  const [practices, setPractices] = useState({ sit:false, stand:false, chant:false });
  const [note, setNote]           = useState('');
  const [freeItems, setFreeItems] = useState<{ id:string; name:string }[]>([]);
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>({});
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});
  const [localDone, setLocalDone] = useState<boolean | null>(null);

  const submit = () => {
    if (localDone === null) return;
    const today = dateStr();
    // Process habit checkins
    Object.entries(habitCheckins).forEach(([id, checked]) => {
      if (checked) store.checkinHabit(id, today);
    });
    // Set water amount (not add, but set to the selected value)
    const waterMap: Record<string, number> = { '500ml': 500, '1000ml': 1000, '1500ml': 1500, '2000ml': 2000, '>2000ml': 2500 };
    if (water && waterMap[water]) {
      // Reset water first, then add the selected amount
      store.resetWater();
      store.addWater(waterMap[water]);
    }
    // Build enhanced note with practices and free items
    const parts = [note];
    if (practices.sit) parts.push(`🧘${T('checkinSit')}`);
    if (practices.stand) parts.push(`🧍${T('checkinStand')}`);
    if (practices.chant) parts.push(`📿${T('checkinSutra')}`);
    freeItems.forEach(item => {
      if (freeCheckins[item.id] && item.name) parts.push(`✓${item.name}`);
    });
    if (totalCal > 0) parts.push(`🍽${totalCal}kcal`);
    const weightNum = weight ? parseFloat(weight) : undefined;
    store.submitCheckin(localDone, parts.filter(Boolean).join(' · '), undefined, weightNum);
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex:1, justifyContent:'flex-end' }}
      >
        <View style={{
          backgroundColor: TH.cardSolid, borderTopLeftRadius:24,
          borderTopRightRadius:24, paddingHorizontal:24,
          paddingBottom:40, maxHeight:'90%',
        }}>
          <View style={{
            flexDirection:'row', justifyContent:'space-between',
            alignItems:'center', paddingTop:20, paddingBottom:4,
          }}>
            <Text style={{ color:TH.text, fontWeight:'700', fontSize:18 }}>{T('checkinTitle')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color:TH.sub, fontSize:26 }}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color:TH.sub, fontSize:16, textAlign:'center', marginBottom:20 }}>
            {T('checkinSubtitle')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Weight */}
            <Text style={{ color:TH.sub, fontSize:16, marginBottom:6 }}>{T('checkinWeight')}</Text>
            <View style={{
              flexDirection:'row', alignItems:'center',
              borderWidth:1, borderColor:TH.border, borderRadius:10,
              backgroundColor:TH.card, marginBottom:14,
            }}>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="..."
                placeholderTextColor={TH.sub}
                keyboardType="numeric"
                style={{ flex:1, alignItems:'center', paddingVertical:8, color:TH.text, fontWeight:'600', fontSize:16, textAlign:'center' }}
              />
              <View style={{ flex:1, alignItems:'center', paddingVertical:8 }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('checkinKg')}</Text>
              </View>
            </View>

            {/* Fasted */}
            <RowItem label={T('checkinAbstinence')} icon="🙏"
              right={<Toggle on={fasted} onChange={() => setFasted(v => !v)} />} />

            {/* Today's food calories display */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:18 }}>🍽</Text>
                  <Text style={{ color:TH.text }}>{T('checkinFood')}</Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'baseline', gap:4 }}>
                  <Text style={{ fontSize:18, fontWeight:'600', color:P }}>{totalCal}</Text>
                  <Text style={{ color:TH.sub, fontSize:14 }}>kcal</Text>
                </View>
              </View>
            </View>

            {/* Water */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <Text style={{ fontSize:18 }}>💧</Text>
                <Text style={{ color:TH.text }}>{T('checkinWater')}</Text>
              </View>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                {['500ml','1000ml','1500ml','2000ml','>2000ml'].map(v => (
                  <TouchableOpacity key={v} onPress={() => setWater(v)}
                    style={{
                      paddingHorizontal:10, paddingVertical:6, borderRadius:8,
                      borderWidth:1, borderColor: water===v ? P : TH.border,
                      backgroundColor: water===v ? `${P}30` : 'transparent',
                    }}>
                    <Text style={{ color: water===v ? '#fff' : TH.sub, fontSize:16 }}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Practices */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <Text style={{ fontSize:18 }}>⭐</Text>
                <Text style={{ fontWeight:'600', color:TH.text }}>{T('checkinPractice')}</Text>
              </View>
              {([
                { key:'sit' as const,   icon:'🧘', label:T('checkinSit') },
                { key:'stand' as const, icon:'🧍', label:T('checkinStand') },
                { key:'chant' as const, icon:'📿', label:T('checkinSutra') },
              ]).map(({ key, icon, label }) => (
                <View key={key} style={{
                  flexDirection:'row', alignItems:'center',
                  justifyContent:'space-between', paddingVertical:14,
                  borderBottomWidth:1, borderBottomColor:TH.border,
                }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    <Text style={{ fontSize:20 }}>{icon}</Text>
                    <Text style={{ color:TH.text, fontSize:16 }}>{label}</Text>
                  </View>
                  <Toggle on={practices[key]} onChange={() => setPractices(p => ({ ...p, [key]:!p[key] }))} />
                </View>
              ))}
            </View>

            {/* Habit checkin */}
            {(store.habits ?? []).filter(h => h.status==='inProgress').length > 0 && (
              <>
                <Text style={{ color:TH.sub, fontSize:16, fontWeight:'600', marginTop:16, marginBottom:8 }}>
                  {T('checkinHabitCheck')}
                </Text>
                {(store.habits ?? []).filter(h => h.status==='inProgress').map(h => (
                  <View key={h.id} style={{
                    flexDirection:'row', alignItems:'center',
                    justifyContent:'space-between', paddingVertical:10,
                    borderBottomWidth:1, borderBottomColor:TH.border,
                  }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                      <Text style={{ fontSize:16 }}>◇</Text>
                      <View>
                        <Text style={{ color:TH.text, fontSize:16 }}>{h.name}</Text>
                        <Text style={{ color:TH.sub, fontSize:16 }}>{h.streak} {T('checkinStreak')}</Text>
                      </View>
                    </View>
                    <Toggle on={!!habitCheckins[h.id]} onChange={() => setHabitCheckins(c => ({ ...c, [h.id]:!c[h.id] }))} />
                  </View>
                ))}
              </>
            )}

            {/* Free checkin */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:18 }}>✎</Text>
                  <Text style={{ fontWeight:'600', color:TH.text }}>{T('checkinCustom')}</Text>
                </View>
                <TouchableOpacity onPress={() => setFreeItems(f => [...f, { id:String(Date.now()), name:'' }])}
                  style={{ width:28, height:28, borderRadius:14, backgroundColor:P, alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ color:'#fff', fontSize:18 }}>+</Text>
                </TouchableOpacity>
              </View>
              {freeItems.map((item, idx) => (
                <View key={item.id} style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Toggle on={!!freeCheckins[item.id]} onChange={() => setFreeCheckins(c => ({ ...c, [item.id]:!c[item.id] }))} />
                  <ThemedInput
                    value={item.name}
                    onChangeText={v => setFreeItems(f => f.map(x => x.id===item.id ? {...x,name:v} : x))}
                    placeholder={`${T('checkinFree')} ${idx+1}`}
                    style={{ flex:1, padding:7 }}
                  />
                </View>
              ))}
            </View>

            {/* Note */}
            <View style={{ paddingVertical:14 }}>
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:8 }}>{T('checkinNote')}</Text>
              <ThemedInput value={note} onChangeText={setNote} placeholder={T('checkinNotePlaceholder')} multiline numberOfLines={3} />
            </View>

            {/* Done / Not Done */}
            <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
              <TouchableOpacity onPress={() => setLocalDone(false)}
                style={{
                  flex:1, padding:13, borderRadius:12, alignItems:'center',
                  borderWidth:2,
                  borderColor: localDone===false ? COLORS.RED : TH.border,
                  backgroundColor: localDone===false ? 'rgba(239,68,68,.15)' : 'transparent',
                }}>
                <Text style={{ fontWeight:'700', fontSize:16, color: localDone===false ? COLORS.RED : TH.sub }}>✗ {T('checkinNotDone')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLocalDone(true)}
                style={{
                  flex:1, padding:13, borderRadius:12, alignItems:'center',
                  borderWidth:2,
                  borderColor: localDone===true ? COLORS.GREEN : TH.border,
                  backgroundColor: localDone===true ? 'rgba(16,185,129,.15)' : 'transparent',
                }}>
                <Text style={{ fontWeight:'700', fontSize:16, color: localDone===true ? COLORS.GREEN : TH.sub }}>✓ {T('checkinDone')}</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              label={localDone===true ? T('checkinSubmit') : localDone===false ? T('checkinSave') : T('checkinSelectStatus')}
              onPress={submit}
              color={localDone===true ? COLORS.GREEN : localDone===false ? COLORS.RED : P}
            />
            <OutlineButton label={T('commonCancel')} onPress={onClose} style={{ marginTop:10 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RowItem({ label, icon, right, last }: { label:string; icon:string; right:React.ReactNode; last?:boolean }) {
  const TH = useTheme();
  return (
    <View style={{
      flexDirection:'row', alignItems:'center', justifyContent:'space-between',
      paddingVertical:13,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: TH.border,
    }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
        <Text style={{ fontSize:18 }}>{icon}</Text>
        <Text style={{ color:TH.text, fontSize:16 }}>{label}</Text>
      </View>
      {right}
    </View>
  );
}
