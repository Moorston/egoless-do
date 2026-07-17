import { COLORS, getTodayFoodLog, dateStr, FONT_TITLE, FONT_BODY, FONT_BUTTON, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BACK, FONT_EMPTY } from '@egoless-do/core';
import { ChevronDown, ChevronRight, X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddFoodModal from '../../../components/AddFoodModal';
import { Card, useTheme, useT, ScreenHeader } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


export default function FoodLogPage() {
  const nav   = useRootNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const { foodLog, calGoal, deleteFood } = useShallowStore(s => ({
    foodLog: s.foodLog,
    calGoal: s.calGoal,
    deleteFood: s.deleteFood,
  }));
  const [showAdd, setShowAdd]     = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const filteredFoodLog = useMemo(() => (foodLog ?? []).filter(f => !f.deleted), [foodLog]);
  const totalCal = useMemo(() => getTodayFoodLog(filteredFoodLog).reduce((a, f) => a + (f.calories ?? 0), 0), [filteredFoodLog]);

  const historyGroups = useMemo(() => {
    const today = dateStr();
    const past = filteredFoodLog.filter(f => dateStr(new Date(f.timestamp)) !== today);
    const groups: Record<string, typeof past> = {};
    for (const f of past) {
      const d = dateStr(new Date(f.timestamp));
      (groups[d] ??= []).push(f);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredFoodLog]);

  const totalHistoryCal = useMemo(() => historyGroups.reduce((sum, [, entries]) => sum + entries.reduce((a, f) => a + (f.calories ?? 0), 0), 0), [historyGroups]);
  const totalRecords = useMemo(() => historyGroups.reduce((sum, [, entries]) => sum + entries.length, 0), [historyGroups]);


  const confirmDelete = (id: string) => {
    Alert.alert('', T('foodDeleteConfirm'), [
      { text: T('commonCancel'), style: 'cancel' },
      { text: T('commonConfirm'), style: 'destructive', onPress: () => deleteFood(id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title={T('foodTitle')} onBack={() => nav.goBack()} />

        <Card style={styles.todayCard}>
          <Text style={{ color:TH.sub, fontSize:FONT_BODY(), marginBottom:8 }}>{T('foodTodayKcal')}</Text>
          <View style={styles.todayRow}>
            <Text style={{ fontSize:FONT_STAT_SECTION(), fontWeight:'800', color:P }}>{String(totalCal)}</Text>
            <Text style={{ fontSize:FONT_BACK(), color:TH.sub }}>/ {calGoal}</Text>
          </View>
          <Text style={[styles.remainingText, { color: totalCal > calGoal ? COLORS.RED : COLORS.GREEN, fontSize:FONT_BODY() }]}>{T('foodRemaining')}: {String(Math.max(0, calGoal - totalCal))} kcal</Text>
        </Card>

        <Card>
          {(() => {
            const todayLog = getTodayFoodLog(filteredFoodLog);
            return todayLog.length === 0 ? (
              <Text style={[styles.emptyText, { color:TH.sub, fontSize:FONT_EMPTY() }]}>{T('foodEmpty')}</Text>
            ) : (
              todayLog.map((f, idx) => (
                <View key={f.id} style={[styles.todayItem, idx < todayLog.length - 1 && { borderBottomWidth: 1, borderBottomColor: TH.border }]}>
                  <View style={styles.itemNameCol}>
                    <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>{f.name}</Text>
                    {f.note ? <Text style={{ fontSize:FONT_SUB(), color:TH.sub }}>{f.note}</Text> : null}
                  </View>
                  <Text style={[styles.boldText, { color:P }]}>{String(f.calories ?? 0)} kcal</Text>
                </View>
              ))
            );
          })()}
        </Card>

        <TouchableOpacity onPress={() => setShowAdd(true)}
          style={[styles.addButton, { backgroundColor:P }]}>
          <Text style={[styles.addButtonText, { fontSize:FONT_BUTTON() }]}>{T('foodAdd')}</Text>
        </TouchableOpacity>

        {/* ── History ── */}
        <View style={styles.historySection}>
          <TouchableOpacity onPress={() => setShowHistory(v => !v)}
            style={[styles.historyToggleButton, { marginBottom: showHistory ? 12 : 0 }]}>
            <View style={styles.historyToggleView}>
              <Text style={{ fontWeight:'700', fontSize:FONT_TITLE(), color:TH.text }}>{T('foodHistory')}</Text>
              {showHistory ? <ChevronDown size={18} color={TH.text} /> : <ChevronRight size={18} color={TH.text} />}
            </View>
          </TouchableOpacity>
          {showHistory && (
            <>
              {/* Summary stats */}
              {historyGroups.length > 0 && (
                <View style={[styles.historyStatsRow, { backgroundColor:TH.card, borderWidth:1, borderColor:TH.border }]}>
                  {[
                    { value: String(historyGroups.length), label: '天' },
                    { value: String(totalRecords), label: '条记录' },
                    { value: String(totalHistoryCal), label: 'kcal' },
                  ].map(st => (
                    <View key={st.label} style={styles.statItem}>
                      <Text style={{ fontSize:FONT_STAT_CARD(), fontWeight:'800', color:P }}>{String(st.value)}</Text>
                      <Text style={{ fontSize:FONT_SUB(), color:TH.sub, marginTop:2 }}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              {historyGroups.length === 0 ? (
                <Text style={[styles.emptyText, { color:TH.sub, fontSize:FONT_EMPTY() }]}>{T('foodNoHistory')}</Text>
              ) : (
                <View style={styles.timelineContainer}>
                  {/* Timeline vertical line */}
                  <View style={[styles.timelineLine, { backgroundColor:TH.border }]} />
                  {historyGroups.map(([date, entries]) => {
                    const dayCal = entries.reduce((a, f) => a + (f.calories ?? 0), 0);
                    return (
                      <View key={date} style={styles.timelineEntry}>
                        {/* Timeline dot */}
                        <View style={[styles.timelineDot, { backgroundColor:P, borderColor:TH.bg }]} />
                        {/* Card */}
                        <View style={[styles.historyCard, { backgroundColor:TH.card, borderWidth:1, borderColor:TH.border }]}>
                          <View style={[styles.historyHeader, { borderBottomColor:TH.border, backgroundColor:`${P}08` }]}>
                            <Text style={[styles.dateText, { fontSize:FONT_BODY(), color:TH.text }]}>{date}</Text>
                            <Text style={{ fontSize:FONT_BODY(), color:P, fontWeight:'700' }}>{dayCal} kcal</Text>
                          </View>
                          {entries.map((f, i) => (
                            <View key={f.id} style={[styles.historyEntryItem, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor:TH.border }]}>
                              <View style={styles.itemNameCol}>
                                <Text style={{ fontWeight:'600', fontSize:FONT_BODY(), color:TH.text }}>{f.name}</Text>
                                {f.note ? <Text style={{ fontSize:FONT_SUB(), color:TH.sub, marginLeft:8 }}>{f.note}</Text> : null}
                              </View>
                              <View style={styles.calorieRow}>
                                <Text style={{ fontWeight:'700', color:P, fontSize:FONT_BODY() }}>{String(f.calories ?? 0)} kcal</Text>
                                <TouchableOpacity onPress={() => confirmDelete(f.id)} style={styles.deleteButton}>
                                  <X size={18} color="rgba(255,255,255,.7)" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AddFoodModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  todayCard: { alignItems: 'center', paddingVertical: 20 },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  remainingText: { marginTop: 6 },
  emptyText: { textAlign: 'center', padding: 24 },
  todayItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12 },
  itemNameCol: { flex: 1 },
  boldText: { fontWeight: '700' },
  addButton: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  addButtonText: { color: '#fff', fontWeight: '700' },
  historySection: { marginTop: 24 },
  historyToggleButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyToggleView: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStatsRow: { flexDirection: 'row', borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  timelineContainer: { position: 'relative', paddingLeft: 20 },
  timelineLine: { position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, borderRadius: 1 },
  timelineEntry: { position: 'relative', marginBottom: 16 },
  timelineDot: { position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  historyCard: { borderRadius: 12, overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1 },
  dateText: { fontWeight: '600' },
  historyEntryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  calorieRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteButton: { paddingLeft: 8 },
});
