import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import {
  Card, useTheme, PrimaryButton, OutlineButton, Toggle,
  ScreenHeader, TagPill, ThemedInput, ProgressBar, RowItem, useT,
} from '../../components/UI';
import { COLORS, tomorrow, dateStr, daysInMonth, FONT_TITLE, FONT_BODY, FONT_BUTTON, FONT_SUB, FONT_LABEL, FONT_BADGE, FONT_STAT_CARD, FONT_CLOSE, FONT_EMPTY } from '@egoless-do/core';
import type { Habit, HabitStatus } from '@egoless-do/core';
import {
  Target, Pause, Play, X, Pencil, Trash2, ChevronRight, ChevronLeft, CheckCircle,
} from 'lucide-react-native';

const STATUS_LABELS: Record<HabitStatus, string> = {
  notStarted:'habitStatusNotStarted', inProgress:'habitStatusInProgress',
  paused:'habitStatusPaused', abandoned:'habitStatusAbandoned', completed:'habitStatusCompleted',
};
const STATUS_COLORS: Record<HabitStatus, string> = {
  notStarted:'#888', inProgress:COLORS.GREEN,
  paused:COLORS.YELLOW, abandoned:COLORS.RED, completed:'#7C3AED',
};
const STATUS_ORDER: Record<HabitStatus, number> = {
  inProgress:0, notStarted:1, paused:2, completed:3, abandoned:4,
};

const ALL_FILTERS: [string, string][] = [
  ['all','habitStatusAll'],['notStarted','habitStatusNotStarted'],['inProgress','habitStatusInProgress'],
  ['paused','habitStatusPaused'],['abandoned','habitStatusAbandoned'],['completed','habitStatusCompleted'],
];

const emptyForm = { name:'', startDate:tomorrow(), targetDays:21, goal:'', insight:'', createTag:false };

export default function HabitsScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const T     = useT();

  const [filter, setFilter]     = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [statusModal, setStatusModal] = useState<{id:string;ns:HabitStatus}|null>(null);
  const [reason, setReason]     = useState('');
  const [showCal, setShowCal]   = useState<string|null>(null);
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null);
  const [actionMenuHabit, setActionMenuHabit] = useState<Habit|null>(null);

  const allHabits = store.habits ?? [];
  const filtered = (filter==='all' ? allHabits : allHabits.filter(h => h.status===filter))
    .slice().sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (b.startDate.localeCompare(a.startDate)));

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allHabits.length };
    allHabits.forEach(h => { counts[h.status] = (counts[h.status] || 0) + 1; });
    return counts;
  }, [allHabits]);

  const openAdd = () => { setEditingId(null); setForm({...emptyForm}); setShowAdd(true); };
  const openEdit = (h: Habit) => {
    setEditingId(h.id);
    setForm({ name:h.name, startDate:h.startDate, targetDays:h.targetDays, goal:h.goal, insight:h.insight, createTag:h.createTag });
    setShowAdd(true);
  };
  const saveHabit = () => {
    if (!form.name.trim()) return;
    if (editingId) store.updateHabit(editingId, { ...form, targetDays:+form.targetDays });
    else store.addHabit({ ...form, targetDays:+form.targetDays });
    setShowAdd(false);
  };
  const changeStatus = (id: string, ns: HabitStatus) => {
    if (ns==='paused'||ns==='abandoned') { setStatusModal({id,ns}); setReason(''); return; }
    store.updateHabit(id, { status:ns });
  };
  const confirmStatus = () => {
    if (!statusModal) return;
    const patch: Partial<Habit> = { status:statusModal.ns };
    if (statusModal.ns==='paused')    patch.pauseReason   = reason;
    if (statusModal.ns==='abandoned') patch.abandonReason = reason;
    store.updateHabit(statusModal.id, patch);
    setStatusModal(null);
  };

  // Calendar data
  const calHabit = useMemo(() => store.habits.find(h => h.id===showCal), [store.habits, showCal]);
  const calDays = useMemo(() => daysInMonth(calYear, calMonth), [calYear, calMonth]);
  const firstDay = useMemo(() => new Date(calYear, calMonth, 1).getDay(), [calYear, calMonth]);

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor:TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        <ScreenHeader title={T('habitTitle')} compact
          right={
            <TouchableOpacity onPress={openAdd}
              style={{ backgroundColor:P, paddingHorizontal:16, paddingVertical:8, borderRadius:20 }}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>+ {T('habitAdd')}</Text>
            </TouchableOpacity>
          }
        />

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:14 }}>
          {ALL_FILTERS.map(([v,l]) => (
            <TagPill key={v} label={`${T(l)} ${filterCounts[v] ?? 0}`} active={filter===v} onPress={() => setFilter(v)} color={P} />
          ))}
        </ScrollView>

        {/* Timeline */}
        {filtered.map(h => {
          const sc = STATUS_COLORS[h.status];
          return (
            <View key={h.id}>
              {/* Timeline header */}
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:sc }} />
                <Text style={{ color:TH.sub, fontSize:FONT_SUB, fontWeight:'600' }}>{h.startDate}</Text>
                <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
              </View>
              {/* Card */}
              <TouchableOpacity onLongPress={() => setActionMenuHabit(h)} activeOpacity={0.9}>
              <Card style={{ padding:14, marginLeft:16, marginBottom:16 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE, flex:1, marginRight:8 }}>{h.name}</Text>
                  <View style={{ backgroundColor:`${sc}22`, borderRadius:8, paddingHorizontal:10, paddingVertical:4 }}>
                    <Text style={{ color:sc, fontSize:FONT_SUB, fontWeight:'600' }}>{T(STATUS_LABELS[h.status])}</Text>
                  </View>
                </View>

                {h.goal ? (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:6 }}>
                    <Target size={15} color={P} />
                    <Text style={{ color:TH.text, fontSize:FONT_TITLE, fontWeight:'700' }}>{h.goal}</Text>
                  </View>
                ) : null}

                <Text style={{ color:TH.sub, fontSize:FONT_SUB, marginBottom:8 }}>{T('habitStart')} {h.startDate} · {T('habitGoal')} {h.targetDays} {T('habitDays')}</Text>

                {h.insight ? <Text style={{ color:TH.sub, fontSize:FONT_SUB, marginBottom:8, fontStyle:'italic' }}>"{h.insight}"</Text> : null}
                {h.createTag && (
                  <View style={{ marginBottom:8, alignSelf:'flex-start', backgroundColor:`${P}30`, borderRadius:10, paddingHorizontal:10, paddingVertical:3 }}>
                    <Text style={{ color:P, fontSize:FONT_SUB }}>#{h.name}</Text>
                  </View>
                )}
                {h.pauseReason ? <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:4 }}><Pause size={14} color={COLORS.YELLOW} /><Text style={{ color:COLORS.YELLOW, fontSize:FONT_SUB }}>{h.pauseReason}</Text></View> : null}
                {h.abandonReason ? <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:4 }}><X size={14} color={COLORS.RED} /><Text style={{ color:COLORS.RED, fontSize:FONT_SUB }}>{h.abandonReason}</Text></View> : null}

                {/* Progress */}
                <View style={{ marginBottom:10 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                    <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{h.doneDays}/{h.targetDays} {T('habitDays')}</Text>
                    <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{Math.round(h.doneDays/Math.max(h.targetDays,1)*100)}%</Text>
                  </View>
                  <ProgressBar pct={h.doneDays/Math.max(h.targetDays,1)*100} color={P} />
                </View>

                {/* Stats */}
                <TouchableOpacity onPress={() => { setShowCal(h.id); setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }}>
                  <View style={{ flexDirection:'row', gap:20, marginBottom:12 }}>
                    {[
                      { v:h.doneDays, l:T('habitCumDays'), c:P },
                      { v:h.streak, l:T('habitStreakDays'), c:COLORS.ORANGE },
                      { v:h.interrupted, l:T('habitInterrupted'), c:COLORS.RED },
                      { v:Math.max(0,h.targetDays-h.doneDays), l:T('habitRemainDays'), c:COLORS.GREEN },
                    ].map(({ v,l,c }) => (
                      <View key={l} style={{ alignItems:'center' }}>
                        <Text style={{ fontSize:FONT_STAT_CARD, fontWeight:'800', color:c }}>{v}</Text>
                        <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginTop:2 }}>{l}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>

                {/* Start button only */}
                {h.status==='notStarted' && (
                  <TouchableOpacity onPress={() => changeStatus(h.id,'inProgress')} style={{ paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:COLORS.GREEN, alignItems:'center' }}>
                    <Text style={{ color:COLORS.GREEN, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitStartBtn')}</Text>
                  </TouchableOpacity>
                )}

                {/* Daily checkin button for inProgress */}
                {h.status==='inProgress' && (() => {
                  const today = dateStr();
                  const isCheckedToday = (h.checkedDates ?? []).includes(today);
                  if (isCheckedToday) {
                    return (
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:10, backgroundColor:`${P}20` }}>
                        <CheckCircle size={18} color={P} />
                        <Text style={{ color:P, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitChecked')}</Text>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity onPress={() => store.checkinHabit(h.id, today)} style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:10, backgroundColor:P }}>
                      <CheckCircle size={18} color="#fff" />
                      <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitCheckinBtn')}</Text>
                    </TouchableOpacity>
                  );
                })()}
              </Card>
              </TouchableOpacity>
            </View>
          );
        })}

        {filtered.length===0 && (
          <Text style={{ color:TH.sub, textAlign:'center', marginTop:60, fontSize:FONT_EMPTY }}>{T('habitEmpty')}</Text>
        )}
      </ScrollView>

      {/* Add/Edit modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'92%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:20 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{editingId ? T('habitEditTitle') : T('habitAddTitle')}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            <ScrollView>
              {[
                { label:T('habitName'), key:'name', ph:'例：每日冥想' },
                { label:T('habitGoal'), key:'goal', ph:'每天打坐5分钟' },
                { label:T('habitInsight'), key:'insight', ph:'每天进步一点点...' },
              ].map(({ label,key,ph }) => (
                <View key={key} style={{ marginBottom:14 }}>
                  <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:6 }}>{label}</Text>
                  <ThemedInput value={(form as any)[key]} onChangeText={v => setForm(f => ({...f,[key]:v}))} placeholder={ph} />
                </View>
              ))}
              <View style={{ marginBottom:14 }}>
                <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:6 }}>{T('habitTargetDays')}</Text>
                <ThemedInput value={String(form.targetDays)} onChangeText={v => setForm(f => ({...f,targetDays:v===''?0:+v}))} keyboardType="numeric" />
              </View>
              <RowItem label={T('habitAutoTag')} sub={T('habitAutoTagDesc')} last
                right={<Toggle on={form.createTag} onChange={() => setForm(f => ({...f,createTag:!f.createTag}))} />} />
              <View style={{ height:20 }} />
              <PrimaryButton label={editingId?T('save'):T('createHabit')} onPress={saveHabit} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Status reason modal */}
      <Modal visible={!!statusModal} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24 }}>
            <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_BODY, marginBottom:12 }}>
              {statusModal?.ns==='paused' ? T('habitPauseReason') : T('habitAbandonReason')}
            </Text>
            <ThemedInput value={reason} onChangeText={setReason} placeholder={T('habitReasonPlaceholder')} multiline numberOfLines={3} style={{ marginBottom:16 }} />
            <View style={{ flexDirection:'row', gap:10 }}>
              <OutlineButton label={T('cancel')} onPress={() => setStatusModal(null)} style={{ flex:1 }} />
              <PrimaryButton label={T('confirm')} onPress={confirmStatus} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Action menu modal (long press) */}
      <Modal visible={!!actionMenuHabit} transparent animationType="fade" onRequestClose={() => setActionMenuHabit(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActionMenuHabit(null)}
          style={{ flex:1, backgroundColor:'rgba(0,0,0,.5)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:40, paddingTop:20 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:TH.border, alignSelf:'center', marginBottom:20 }} />
            {actionMenuHabit?.status==='notStarted' && (
              <TouchableOpacity onPress={() => { if(actionMenuHabit) changeStatus(actionMenuHabit.id,'inProgress'); setActionMenuHabit(null); }}
                style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:COLORS.GREEN, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitStartBtn')}</Text>
              </TouchableOpacity>
            )}
            {(actionMenuHabit?.status==='notStarted'||actionMenuHabit?.status==='inProgress') && (
              <TouchableOpacity onPress={() => { if(actionMenuHabit) openEdit(actionMenuHabit); setActionMenuHabit(null); }}
                style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:P, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitEdit')}</Text>
              </TouchableOpacity>
            )}
            {actionMenuHabit?.status==='inProgress' && (
              <TouchableOpacity onPress={() => { if(actionMenuHabit) changeStatus(actionMenuHabit.id,'paused'); setActionMenuHabit(null); }}
                style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(255,193,7,.15)', alignItems:'center' }}>
                <Text style={{ color:COLORS.YELLOW, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitPauseBtn')}</Text>
              </TouchableOpacity>
            )}
            {actionMenuHabit?.status==='paused' && (
              <TouchableOpacity onPress={() => { if(actionMenuHabit) changeStatus(actionMenuHabit.id,'inProgress'); setActionMenuHabit(null); }}
                style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:COLORS.GREEN, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitResumeBtn')}</Text>
              </TouchableOpacity>
            )}
            {(actionMenuHabit?.status==='inProgress'||actionMenuHabit?.status==='paused') && (
              <TouchableOpacity onPress={() => { if(actionMenuHabit) changeStatus(actionMenuHabit.id,'abandoned'); setActionMenuHabit(null); }}
                style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(239,68,68,.15)', alignItems:'center' }}>
                <Text style={{ color:COLORS.RED, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitAbandonBtn')}</Text>
              </TouchableOpacity>
            )}
            {(actionMenuHabit?.status==='notStarted'||actionMenuHabit?.status==='abandoned') && (
              <TouchableOpacity onPress={() => { setConfirmDelete(actionMenuHabit?.id ?? null); setActionMenuHabit(null); }}
                style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(239,68,68,.15)', alignItems:'center' }}>
                <Text style={{ color:COLORS.RED, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('habitDelete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Calendar modal */}
      <Modal visible={!!showCal} animationType="slide" transparent>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:'80%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, color:TH.text }}>{T('habitCalendar')}</Text>
              <TouchableOpacity onPress={() => setShowCal(null)}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>

            {/* Month nav */}
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <TouchableOpacity onPress={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}>
                <ChevronLeft size={22} color={P} />
              </TouchableOpacity>
              <Text style={{ fontWeight:'700', fontSize:FONT_BODY, color:TH.text }}>{calYear}年{calMonth+1}月</Text>
              <TouchableOpacity onPress={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}>
                <ChevronRight size={22} color={P} />
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={{ flexDirection:'row', marginBottom:8 }}>
              {['日','一','二','三','四','五','六'].map(d => (
                <View key={d} style={{ flex:1, alignItems:'center' }}>
                  <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`e${i}`} style={{ width:'14.28%', aspectRatio:1 }} />
              ))}
              {Array.from({ length: calDays }).map((_, i) => {
                const day = i + 1;
                const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const checked = calHabit?.checkedDates.includes(ds);
                const isToday = ds === dateStr();
                return (
                  <View key={day} style={{ width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center' }}>
                    <View style={{
                      width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center',
                      backgroundColor: checked ? P : isToday ? `${P}30` : 'transparent',
                    }}>
                      <Text style={{ color: checked ? '#fff' : isToday ? P : TH.text, fontSize:FONT_BODY, fontWeight: isToday ? '700' : '400' }}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Legend */}
            <View style={{ flexDirection:'row', justifyContent:'center', gap:20, marginTop:16 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <View style={{ width:12, height:12, borderRadius:6, backgroundColor:P }} />
                <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('habitChecked')}</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <View style={{ width:12, height:12, borderRadius:6, backgroundColor:`${P}30` }} />
                <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('habitToday')}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm delete modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Trash2 size={40} color={COLORS.RED} style={{ marginBottom:12 }} />
            <Text style={{ fontWeight:'700', fontSize:FONT_BODY, color:TH.text, marginBottom:8 }}>{T('habitConfirmDelete')}</Text>
            <Text style={{ color:TH.sub, fontSize:FONT_BODY, textAlign:'center', marginBottom:20 }}>{T('habitConfirmDeleteDesc')}</Text>
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <OutlineButton label={T('habitCancel')} onPress={() => setConfirmDelete(null)} style={{ flex:1 }} />
              <PrimaryButton label={T('habitConfirm')} onPress={() => { if(confirmDelete) store.deleteHabit(confirmDelete); setConfirmDelete(null); }} color={COLORS.RED} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
