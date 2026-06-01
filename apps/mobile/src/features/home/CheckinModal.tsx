import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT, Toggle, ThemedInput, PrimaryButton, OutlineButton } from '../../components/UI';
import { COLORS, dateStr, getTodayFoodLog, getActivePlan, getTodayItems, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_LABEL } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import {
  Hand, Utensils, Droplets, Star, PersonStanding, Sparkles,
  ClipboardList, CheckCircle2, Circle, Pencil, X, Check,
} from 'lucide-react-native';

function parseExistingNote(raw: string): { userNote: string; practices: string[]; customs: string[]; fasted: boolean; waterMl: number; habits: string[] } {
  if (!raw) return { userNote: '', practices: [], customs: [], fasted: false, waterMl: 0, habits: [] };
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      return {
        userNote: data.note ?? '',
        practices: data.practices ?? [],
        customs: data.customs ?? [],
        fasted: !!data.fasted,
        waterMl: typeof data.water === 'number' ? data.water : 0,
        habits: data.habits ?? [],
      };
    }
  } catch {
    // legacy format
  }
  return { userNote: raw, practices: [], customs: [], fasted: false, waterMl: 0, habits: [] };
}

export default function CheckinModal({ onClose }: { onClose: () => void }) {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const weightUnit = useAppStore(s => s.weightUnit);
  const today = dateStr();

  // Load existing checkin for re-edit support
  const existing = useMemo(() =>
    (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today),
    [store.checkinHistory, today],
  );
  const parsed = useMemo(() => parseExistingNote(existing?.note ?? ''), [existing]);

  const totalCal = useMemo(
    () => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + f.calories, 0),
    [store.foodLog],
  );

  // Today's plan items
  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const todayPlanItems = useMemo(() => {
    if (!activePlan) return [];
    return getTodayItems(store.planItems ?? [], activePlan, today);
  }, [store.planItems, activePlan, today]);
  const planCheckins = store.planItemCheckins ?? [];
  const [planToggles, setPlanToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (!activePlan) return initial;
    const items = (store.planItems ?? []).filter(i => !i.deleted && i.planId === activePlan.id);
    items.forEach(item => {
      if (item.link === 'manual') {
        initial[item.id] = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
      }
    });
    return initial;
  });

  // Pre-fill from existing checkin
  const [weight, setWeight] = useState(() => existing?.weight != null ? String(existing.weight) : '65');
  const [fasted, setFasted] = useState(() => parsed.fasted);
  const [waterMl, setWaterMl] = useState(() => parsed.waterMl || (store.waterMl ?? 0));
  const [showFoodAdd, setShowFoodAdd] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [practices, setPractices] = useState(() => ({
    sit: parsed.practices.includes('sit'),
    stand: parsed.practices.includes('stand'),
    chant: parsed.practices.includes('chant'),
  }));
  const [note, setNote] = useState(() => parsed.userNote);
  const [freeItems, setFreeItems] = useState<{ id: string; name: string }[]>(
    () => parsed.customs.map((name, i) => ({ id: `existing-${i}`, name })),
  );
  const [freeCheckins, setFreeCheckins] = useState<Record<string, boolean>>(
    () => Object.fromEntries(parsed.customs.map((_, i) => [`existing-${i}`, true])),
  );
  const [habitCheckins, setHabitCheckins] = useState<Record<string, boolean>>({});
  const [localDone, setLocalDone] = useState<boolean | null>(() => existing?.done ?? null);

  const submit = useCallback(() => {
    if (localDone === null) return;
    // Process habit checkins
    Object.entries(habitCheckins).forEach(([id, checked]) => {
      if (checked) store.checkinHabit(id, today);
    });
    // Save plan item toggles
    Object.entries(planToggles).forEach(([itemId, desired]) => {
      const current = planCheckins.some(c => c.planItemId === itemId && c.date === today && c.done);
      if (desired && !current) store.checkinPlanItem(itemId);
      if (!desired && current) store.uncheckinPlanItem(itemId);
    });
    // Set water amount directly
    if (waterMl > 0) {
      store.resetWater();
      store.addWater(waterMl);
    }
    // Build structured JSON note (same format as web)
    const noteData: Record<string, unknown> = {};
    if (note) noteData.note = note;
    if (fasted) noteData.fasted = true;
    if (waterMl > 0) noteData.water = waterMl;
    const pr: string[] = [];
    if (practices.sit) pr.push('sit');
    if (practices.stand) pr.push('stand');
    if (practices.chant) pr.push('chant');
    if (pr.length) noteData.practices = pr;
    const customs = freeItems.filter(item => freeCheckins[item.id] && item.name).map(item => item.name);
    if (customs.length) noteData.customs = customs;
    const checkedHabits = Object.entries(habitCheckins)
      .filter(([, checked]) => checked)
      .map(([id]) => (store.habits ?? []).find(h => h.id === id)?.name)
      .filter(Boolean);
    if (checkedHabits.length) noteData.habits = checkedHabits;
    if (totalCal > 0) noteData.food = totalCal;
    const weightNum = weight ? parseFloat(weight) : undefined;
    store.submitCheckin(localDone, JSON.stringify(noteData), undefined, weightNum);
    onClose();
  }, [localDone, habitCheckins, planToggles, planCheckins, today, waterMl, note, fasted, practices, freeItems, freeCheckins, totalCal, weight, store, onClose]);

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
            <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('checkinTitle')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={26} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <Text style={{ color:TH.sub, fontSize:FONT_BODY, textAlign:'center', marginBottom:20 }}>
            {T('checkinSubtitle')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Weight */}
            <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:6 }}>{T('checkinWeight')}</Text>
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
                style={{ flex:1, alignItems:'center', paddingVertical:8, color:TH.text, fontWeight:'600', fontSize:FONT_BODY, textAlign:'center' }}
              />
              <View style={{ flex:1, alignItems:'center', paddingVertical:8 }}>
                <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</Text>
              </View>
            </View>

            {/* Fasted */}
            <RowItem label={T('checkinAbstinence')} icon={<Hand size={18} color={TH.text} />}
              right={<Toggle on={fasted} onChange={() => setFasted(v => !v)} />} />

            {/* Today's food calories display + add */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Utensils size={18} color={TH.text} />
                  <Text style={{ color:TH.text }}>{T('checkinFood')}</Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:FONT_TITLE, fontWeight:'600', color:P }}>{totalCal}</Text>
                  <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>kcal</Text>
                  <TouchableOpacity onPress={() => setShowFoodAdd(!showFoodAdd)}
                    style={{ width:24, height:24, borderRadius:12, backgroundColor:P, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ color:'#fff', fontSize:FONT_BUTTON }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showFoodAdd && (
                <View style={{ marginTop:10, padding:10, backgroundColor:TH.card, borderRadius:10, borderWidth:1, borderColor:TH.border }}>
                  <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
                    <ThemedInput value={foodName} onChangeText={setFoodName} placeholder={T('foodName')} style={{ flex:2, padding:7 }} />
                    <ThemedInput value={foodCal} onChangeText={setFoodCal} placeholder={T('calories2')} keyboardType="numeric" style={{ flex:1, padding:7 }} />
                  </View>
                  <View style={{ flexDirection:'row', gap:8 }}>
                    <TouchableOpacity onPress={() => { if (foodName.trim()) { store.addFood({ name: foodName, calories: +foodCal || 0, note: foodNote, timestamp: Date.now() }); setFoodName(''); setFoodCal(''); setFoodNote(''); setShowFoodAdd(false); } }}
                      style={{ flex:1, padding:8, borderRadius:8, backgroundColor:P, alignItems:'center' }}>
                      <Text style={{ color:'#fff', fontWeight:'600', fontSize:FONT_BUTTON }}>{T('confirm')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowFoodAdd(false); setFoodName(''); setFoodCal(''); }}
                      style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                      <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{T('commonCancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Water */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <Droplets size={18} color={TH.text} />
                <Text style={{ color:TH.text }}>{T('checkinWater')}</Text>
              </View>
              <View style={{
                flexDirection:'row', alignItems:'center',
                borderWidth:1, borderColor:TH.border, borderRadius:10,
                backgroundColor:TH.card,
              }}>
                <TextInput
                  value={waterMl ? String(waterMl) : ''}
                  onChangeText={v => setWaterMl(Math.max(0, parseInt(v) || 0))}
                  placeholder="0"
                  placeholderTextColor={TH.sub}
                  keyboardType="numeric"
                  style={{ flex:1, alignItems:'center', paddingVertical:8, color:TH.text, fontWeight:'600', fontSize:FONT_BODY, textAlign:'center' }}
                />
                <View style={{ flex:1, alignItems:'center', paddingVertical:8 }}>
                  <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>ml</Text>
                </View>
              </View>
            </View>

            {/* Practices */}
            <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <Star size={18} color={TH.text} />
                <Text style={{ fontWeight:'600', color:TH.text, fontSize:FONT_LABEL }}>{T('checkinPractice')}</Text>
              </View>
              {([
                { key:'sit' as const,   icon:<PersonStanding size={20} color={TH.text} />, label:T('checkinSit') },
                { key:'stand' as const, icon:<PersonStanding size={20} color={TH.text} />, label:T('checkinStand') },
                { key:'chant' as const, icon:<Sparkles size={20} color={TH.text} />, label:T('checkinSutra') },
              ]).map(({ key, icon, label }) => (
                <View key={key} style={{
                  flexDirection:'row', alignItems:'center',
                  justifyContent:'space-between', paddingVertical:14,
                  borderBottomWidth:1, borderBottomColor:TH.border,
                }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    {icon}
                    <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{label}</Text>
                  </View>
                  <Toggle on={practices[key]} onChange={() => setPractices(p => ({ ...p, [key]:!p[key] }))} />
                </View>
              ))}
            </View>

            {/* Today's plan items */}
            {todayPlanItems.length > 0 && (
              <View style={{ paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                  <ClipboardList size={18} color={TH.text} />
                  <Text style={{ fontWeight:'600', color:TH.text, fontSize:FONT_LABEL }}>{T('planTodoList')}</Text>
                </View>
                {todayPlanItems.map(item => {
                  const done = planCheckins.some(c => c.planItemId === item.id && c.date === today && c.done);
                  const isManual = item.link === 'manual';
                  return (
                    <View key={item.id} style={{
                      flexDirection:'row', alignItems:'center',
                      justifyContent:'space-between', paddingVertical:10,
                      borderBottomWidth:1, borderBottomColor:TH.border,
                    }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                        <ClipboardList size={16} color={TH.text} />
                        <View>
                          <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{item.name}</Text>
                          <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>
                            {isManual ? T('planLinkManual') : T(`planLink${item.link.charAt(0).toUpperCase() + item.link.slice(1)}`)}
                          </Text>
                        </View>
                      </View>
                      {isManual ? (
                        <Toggle on={!!planToggles[item.id]} onChange={() => setPlanToggles(c => ({ ...c, [item.id]: !c[item.id] }))} />
                      ) : (
                        done ? <CheckCircle2 size={16} color={COLORS.GREEN} /> : <Circle size={16} color={TH.sub} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Habit checkin */}
            {(store.habits ?? []).filter(h => h.status==='inProgress').length > 0 && (
              <>
                <Text style={{ color:TH.sub, fontSize:FONT_LABEL, fontWeight:'600', marginTop:16, marginBottom:8 }}>
                  {T('checkinHabitCheck')}
                </Text>
                {(store.habits ?? []).filter(h => h.status==='inProgress').map(h => (
                  <View key={h.id} style={{
                    flexDirection:'row', alignItems:'center',
                    justifyContent:'space-between', paddingVertical:10,
                    borderBottomWidth:1, borderBottomColor:TH.border,
                  }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                      <Star size={16} color={TH.text} />
                      <View>
                        <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{h.name}</Text>
                        <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{h.streak} {T('checkinStreak')}</Text>
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
                  <Pencil size={18} color={TH.text} />
                  <Text style={{ fontWeight:'600', color:TH.text, fontSize:FONT_LABEL }}>{T('checkinCustom')}</Text>
                </View>
                <TouchableOpacity onPress={() => setFreeItems(f => [...f, { id:String(Date.now()), name:'' }])}
                  style={{ width:28, height:28, borderRadius:14, backgroundColor:P, alignItems:'center', justifyContent:'center' }}>
                  <Text style={{ color:'#fff', fontSize:FONT_TITLE }}>+</Text>
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
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('checkinNote')}</Text>
              <ThemedInput value={note} onChangeText={setNote} placeholder={T('checkinNotePlaceholder')} multiline numberOfLines={3} />
            </View>

            {/* Done / Not Done */}
            <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
              <TouchableOpacity onPress={() => setLocalDone(false)}
                style={{
                  flex:1, padding:13, borderRadius:12, alignItems:'center',
                  borderWidth:2,
                  borderColor: localDone===false ? '#C53364' : TH.border,
                  backgroundColor: 'transparent',
                }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <X size={16} color={localDone===false ? '#C53364' : TH.sub} />
                  <Text style={{ fontWeight:'700', fontSize:FONT_BUTTON, color: localDone===false ? '#C53364' : TH.sub }}>{T('checkinNotDone')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLocalDone(true)}
                style={{
                  flex:1, padding:13, borderRadius:12, alignItems:'center',
                  borderWidth:2,
                  borderColor: localDone===true ? '#17EAD9' : TH.border,
                  backgroundColor: 'transparent',
                }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <Check size={16} color={localDone===true ? '#17EAD9' : TH.sub} />
                  <Text style={{ fontWeight:'700', fontSize:FONT_BUTTON, color: localDone===true ? '#17EAD9' : TH.sub }}>{T('checkinDone')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {localDone===false ? (
              <TouchableOpacity onPress={submit} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#622774', '#C53364']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 12, padding: 15, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('checkinSave')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : localDone===true ? (
              <TouchableOpacity onPress={submit} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#17EAD9', '#6078EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 12, padding: 15, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{T('checkinSubmit')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <PrimaryButton
                label={T('checkinSelectStatus')}
                onPress={submit}
                color={P}
              />
            )}
            <OutlineButton label={T('commonCancel')} onPress={onClose} style={{ marginTop:10 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RowItem({ label, icon, right, last }: { label:string; icon:React.ReactNode; right:React.ReactNode; last?:boolean }) {
  const TH = useTheme();
  return (
    <View style={{
      flexDirection:'row', alignItems:'center', justifyContent:'space-between',
      paddingVertical:13,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: TH.border,
    }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
        {typeof icon === 'string' ? <Text style={{ fontSize:FONT_TITLE }}>{icon}</Text> : icon}
        <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{label}</Text>
      </View>
      {right}
    </View>
  );
}
