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
import { COLORS, tomorrow, dateStr, daysInMonth } from '@egoless-do/core';
import type { Habit, HabitStatus } from '@egoless-do/core';

const STATUS_LABELS: Record<HabitStatus, string> = {
  notStarted:'habitStatusNotStarted', inProgress:'habitStatusInProgress',
  paused:'habitStatusPaused', abandoned:'habitStatusAbandoned', completed:'habitStatusCompleted',
};
const STATUS_COLORS: Record<HabitStatus, string> = {
  notStarted:'#888', inProgress:COLORS.GREEN,
  paused:COLORS.YELLOW, abandoned:COLORS.RED, completed:'#7C3AED',
};

const ALL_FILTERS: [string, string][] = [
  ['all','habitStatusAll'],['notStarted','habitStatusNotStarted'],['inProgress','habitStatusInProgress'],
  ['paused','habitStatusPaused'],['abandoned','habitStatusAbandoned'],['completed','habitStatusCompleted'],
];

const emptyForm = { name:'', startDate:tomorrow(), targetDays:21, goal:'', insight:'', createTag:true };

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

  const filtered = filter==='all' ? (store.habits ?? []) : (store.habits ?? []).filter(h => h.status===filter);

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
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>+ {T('habitAdd')}</Text>
            </TouchableOpacity>
          }
        />

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:14 }}>
          {ALL_FILTERS.map(([v,l]) => (
            <TagPill key={v} label={T(l)} active={filter===v} onPress={() => setFilter(v)} color={P} />
          ))}
        </ScrollView>

        {/* Habit cards */}
        {filtered.map(h => (
          <Card key={h.id} style={{ padding:16 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <View style={{ flex:1, marginRight:10 }}>
                <Text style={{ color:TH.text, fontWeight:'700', fontSize:16 }}>{h.name}</Text>
                <Text style={{ color:TH.sub, fontSize:16, marginTop:3 }}>{T('habitStart')} {h.startDate} · {T('habitGoal')} {h.targetDays} {T('habitDays')}</Text>
                {h.goal ? <Text style={{ color:TH.sub, fontSize:16, marginTop:2 }}>🎯 {h.goal}</Text> : null}
                {h.insight ? <Text style={{ color:TH.sub, fontSize:16, marginTop:2, fontStyle:'italic' }}>"{h.insight}"</Text> : null}
                {h.createTag && (
                  <View style={{ marginTop:6, alignSelf:'flex-start', backgroundColor:`${P}30`, borderRadius:10, paddingHorizontal:10, paddingVertical:3 }}>
                    <Text style={{ color:P, fontSize:16 }}>#{h.name}</Text>
                  </View>
                )}
                {h.pauseReason ? <Text style={{ color:COLORS.YELLOW, fontSize:16, marginTop:4 }}>⏸ {h.pauseReason}</Text> : null}
                {h.abandonReason ? <Text style={{ color:COLORS.RED, fontSize:16, marginTop:4 }}>✕ {h.abandonReason}</Text> : null}
              </View>
              <View style={{ backgroundColor:`${STATUS_COLORS[h.status]}22`, borderRadius:8, paddingHorizontal:10, paddingVertical:4 }}>
                <Text style={{ color:STATUS_COLORS[h.status], fontSize:16, fontWeight:'600' }}>{T(STATUS_LABELS[h.status])}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={{ marginBottom:12 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{h.doneDays}/{h.targetDays} {T('habitDays')}</Text>
                <Text style={{ color:TH.sub, fontSize:16 }}>{Math.round(h.doneDays/Math.max(h.targetDays,1)*100)}%</Text>
              </View>
              <ProgressBar pct={h.doneDays/Math.max(h.targetDays,1)*100} color={P} />
            </View>

            {/* Stats */}
            <TouchableOpacity onPress={() => { setShowCal(h.id); setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }}>
              <View style={{ flexDirection:'row', gap:20, marginBottom:14 }}>
                {[
                  { v:h.doneDays, l:T('habitCumDays'), c:P },
                  { v:h.streak, l:T('habitStreakDays'), c:COLORS.ORANGE },
                  { v:h.interrupted, l:T('habitInterrupted'), c:COLORS.RED },
                  { v:Math.max(0,h.targetDays-h.doneDays), l:T('habitRemainDays'), c:COLORS.GREEN },
                ].map(({ v,l,c }) => (
                  <View key={l} style={{ alignItems:'center' }}>
                    <Text style={{ fontSize:20, fontWeight:'800', color:c }}>{v}</Text>
                    <Text style={{ fontSize:16, color:TH.sub, marginTop:2 }}>{l}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Actions */}
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
              {(h.status==='notStarted'||h.status==='inProgress') && (
                <TouchableOpacity onPress={() => openEdit(h)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:COLORS.BLUE }}>
                  <Text style={{ color:COLORS.BLUE, fontSize:16 }}>✏ {T('habitEdit')}</Text>
                </TouchableOpacity>
              )}
              {h.status==='notStarted' && (
                <>
                  <TouchableOpacity onPress={() => setConfirmDelete(h.id)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:COLORS.RED }}>
                    <Text style={{ color:COLORS.RED, fontSize:16 }}>🗑 {T('habitDelete')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => changeStatus(h.id,'inProgress')} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:COLORS.GREEN }}>
                    <Text style={{ color:COLORS.GREEN, fontSize:16 }}>{T('habitStartBtn')}</Text>
                  </TouchableOpacity>
                </>
              )}
              {h.status==='inProgress' && (
                <TouchableOpacity onPress={() => changeStatus(h.id,'paused')} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:COLORS.YELLOW }}>
                  <Text style={{ color:COLORS.YELLOW, fontSize:16 }}>{T('habitPauseBtn')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}

        {filtered.length===0 && (
          <Text style={{ color:TH.sub, textAlign:'center', marginTop:60, fontSize:16 }}>{T('habitEmpty')}</Text>
        )}
      </ScrollView>

      {/* Add/Edit modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'92%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:20 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:18 }}>{editingId ? T('habitEditTitle') : T('habitAddTitle')}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={{ color:TH.sub, fontSize:26 }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView>
              {[
                { label:T('habitName'), key:'name', ph:'例：每日冥想' },
                { label:T('habitGoal'), key:'goal', ph:'每天打坐5分钟' },
                { label:T('habitInsight'), key:'insight', ph:'每天进步一点点...' },
              ].map(({ label,key,ph }) => (
                <View key={key} style={{ marginBottom:14 }}>
                  <Text style={{ color:TH.sub, fontSize:16, marginBottom:6 }}>{label}</Text>
                  <ThemedInput value={(form as any)[key]} onChangeText={v => setForm(f => ({...f,[key]:v}))} placeholder={ph} />
                </View>
              ))}
              <View style={{ marginBottom:14 }}>
                <Text style={{ color:TH.sub, fontSize:16, marginBottom:6 }}>{T('habitTargetDays')}</Text>
                <ThemedInput value={String(form.targetDays)} onChangeText={v => setForm(f => ({...f,targetDays:+v||21}))} keyboardType="numeric" />
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
            <Text style={{ color:TH.text, fontWeight:'700', fontSize:16, marginBottom:12 }}>
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

      {/* Calendar modal */}
      <Modal visible={!!showCal} animationType="slide" transparent>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:'80%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <Text style={{ fontWeight:'700', fontSize:18, color:TH.text }}>{T('habitCalendar')}</Text>
              <TouchableOpacity onPress={() => setShowCal(null)}><Text style={{ color:TH.sub, fontSize:26 }}>×</Text></TouchableOpacity>
            </View>

            {/* Month nav */}
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <TouchableOpacity onPress={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}>
                <Text style={{ color:P, fontSize:20 }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight:'700', fontSize:16, color:TH.text }}>{calYear}年{calMonth+1}月</Text>
              <TouchableOpacity onPress={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}>
                <Text style={{ color:P, fontSize:20 }}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={{ flexDirection:'row', marginBottom:8 }}>
              {['日','一','二','三','四','五','六'].map(d => (
                <View key={d} style={{ flex:1, alignItems:'center' }}>
                  <Text style={{ color:TH.sub, fontSize:16 }}>{d}</Text>
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
                      <Text style={{ color: checked ? '#fff' : isToday ? P : TH.text, fontSize:16, fontWeight: isToday ? '700' : '400' }}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Legend */}
            <View style={{ flexDirection:'row', justifyContent:'center', gap:20, marginTop:16 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <View style={{ width:12, height:12, borderRadius:6, backgroundColor:P }} />
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('habitChecked')}</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <View style={{ width:12, height:12, borderRadius:6, backgroundColor:`${P}30` }} />
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('habitToday')}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm delete modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontSize:40, marginBottom:12 }}>🗑</Text>
            <Text style={{ fontWeight:'700', fontSize:16, color:TH.text, marginBottom:8 }}>{T('habitConfirmDelete')}</Text>
            <Text style={{ color:TH.sub, fontSize:16, textAlign:'center', marginBottom:20 }}>{T('habitConfirmDeleteDesc')}</Text>
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
