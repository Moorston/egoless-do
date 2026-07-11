import { COLORS, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_TITLE, FONT_STAT_CARD, FONT_LABEL } from '@egoless-do/core';
import { Utensils, Pencil, X } from 'lucide-react-native';
import React, { useState, useMemo, memo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, StyleSheet,
} from 'react-native';

import AddFoodModal from '../../../components/AddFoodModal';
import { useTheme, useT, ProgressBar } from '../../../components/UI';



interface FoodItem {
  id: string;
  name: string;
  calories: number;
}

interface RecentFood {
  name: string;
  calories: number;
}

interface HomeFoodSectionProps {
  /** Food items for the current view date */
  foods: FoodItem[];
  /** Total calories for the view date */
  totalCal: number;
  /** Recent food entries for quick re-add */
  recentFoods: RecentFood[];
  /** Whether viewing today */
  isToday: boolean;
  /** Calorie goal */
  calGoal: number;
  /** Whether the section is read-only */
  isReadOnly: boolean;
  /** Delete a food entry */
  onDeleteFood: (id: string) => void;
  /** Add a food entry */
  onAddFood: (food: { name: string; calories: number; timestamp: number }) => void;
  /** Called after any food change so parent can re-save */
  onFoodChanged: () => void;
  /** Set calorie goal */
  onSetCalGoal: (goal: number) => void;
}

const HomeFoodSection = memo(function HomeFoodSection({
  foods, totalCal, recentFoods, isToday, calGoal, isReadOnly,
  onDeleteFood, onAddFood, onFoodChanged, onSetCalGoal,
}: HomeFoodSectionProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const [showFood, setShowFood] = useState(false);
  const [showCG, setShowCG] = useState(false);
  const [cgi, setCgi] = useState(String(calGoal));
  const [portionFood, setPortionFood] = useState<{ name: string; calories: number } | null>(null);
  const [portion, setPortion] = useState(1);

  const todayFoods = foods.slice(0, 3);
  const todayFoodTotal = foods.length;

  return (
    <>
      {/* ── Food card ── */}
      <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconLabelRow}>
            <Utensils size={16} color={P} />
            <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todayFood')}</Text>
          </View>
          <View style={styles.iconLabelRow}>
            {isToday ? (
              <>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                  <Text style={{ fontWeight: '600', color: P }}>{totalCal}</Text> / {calGoal} kcal
                </Text>
                <TouchableOpacity onPress={() => { setCgi(String(calGoal)); setShowCG(true); }}>
                  <Pencil size={14} color={TH.sub} />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                <Text style={{ fontWeight: '600', color: P }}>{totalCal}</Text> kcal
              </Text>
            )}
          </View>
        </View>
        <ProgressBar pct={calGoal > 0 ? Math.min(totalCal / calGoal * 100, 100) : 0} color={P} />

        {/* Recent Foods (today only) */}
        {isToday && recentFoods.length > 0 && (
          <View style={styles.sectionSpacing}>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('recentFoods')}</Text>
            <View style={styles.recentFoodRow}>
              {recentFoods.map(f => (
                <TouchableOpacity key={f.name} onPress={() => { setPortionFood(f); setPortion(1); }}
                  style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ color: TH.text, fontSize: FONT_SUB(), textAlign: 'center' }} numberOfLines={1}>{f.name}</Text>
                  <Text style={{ color: P, fontSize: FONT_SUB(), fontWeight: '600' }}>{f.calories}kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Food List */}
        {todayFoods.length > 0 && (
          <View style={styles.sectionSpacing}>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('todayFood')} ({todayFoodTotal})</Text>
            {todayFoods.map(f => (
              <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                <Text style={{ color: TH.text, fontSize: FONT_BODY(), flex: 1 }} numberOfLines={1}>{f.name}</Text>
                <Text style={{ color: P, fontSize: FONT_SUB(), fontWeight: '600', marginRight: 8 }}>{f.calories} kcal</Text>
                {isToday && (
                  <TouchableOpacity onPress={() => onDeleteFood(f.id)}>
                    <X size={16} color={TH.sub} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Add food button (today only) */}
        {isToday && (
          <TouchableOpacity onPress={() => setShowFood(true)}
            style={{ marginTop: 10, borderRadius: 10, padding: 11, alignItems: 'center', borderWidth: 1.5, borderColor: P }}>
            <Text style={{ color: P, fontWeight: '600', fontSize: FONT_BUTTON() }}>{T('addFoodBtn')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <AddFoodModal visible={showFood} onClose={() => setShowFood(false)} onFoodAdded={() => {
        onFoodChanged();
      }} />

      {/* Portion Selector Modal (for recent foods) */}
      <Modal visible={!!portionFood} transparent animationType="fade" onRequestClose={() => setPortionFood(null)}>
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), color: TH.text, marginBottom: 4 }}>{portionFood?.name}</Text>
            <Text style={{ color: TH.sub, fontSize: FONT_BODY(), marginBottom: 16 }}>{T('foodPerUnit')} {portionFood?.calories} kcal</Text>
            <View style={styles.portionButtonRow}>
              {[0.5, 1, 1.5, 2].map(p => (
                <TouchableOpacity key={p} onPress={() => setPortion(p)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: portion === p ? P : TH.card,
                    borderWidth: portion === p ? 0 : 1, borderColor: TH.border,
                  }}>
                  <Text style={{ color: portion === p ? '#fff' : TH.text, fontWeight: portion === p ? '700' : '400', fontSize: FONT_BODY() }}>
                    {p}份
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('foodTotalCal')}</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.ORANGE }}>
                {Math.round((portionFood?.calories ?? 0) * portion)} <Text style={{ fontSize: FONT_SUB(), fontWeight: '400', color: TH.sub }}>kcal</Text>
              </Text>
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity onPress={() => setPortionFood(null)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (portionFood) {
                  onAddFood({ name: portionFood.name, calories: Math.round(portionFood.calories * portion), timestamp: Date.now() });
                  setPortionFood(null);
                  onFoodChanged();
                }
              }}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY() }}>{T('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Goal Modal */}
      <Modal visible={showCG} transparent animationType="fade" onRequestClose={() => setShowCG(false)}>
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), marginBottom: 6, color: TH.text }}>{T('calGoalSetting')}</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, marginBottom: 16 }}>{T('calGoalHint')}</Text>
            <TextInput
              value={cgi} onChangeText={setCgi} keyboardType="numeric"
              style={{
                width: '100%', fontSize: FONT_STAT_CARD(), fontWeight: '700', textAlign: 'center',
                backgroundColor: TH.card, borderWidth: 2, borderColor: COLORS.BLUE,
                borderRadius: 12, padding: 14, color: TH.text, marginBottom: 20,
              }}
            />
            <View style={styles.calGoalButtonRow}>
              <TouchableOpacity onPress={() => setShowCG(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onSetCalGoal(Math.max(500, Math.min(10000, +cgi || 2000))); setShowCG(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionSpacing: {
    marginTop: 10,
  },
  recentFoodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.65)',
    justifyContent: 'center',
    padding: 24,
  },
  portionButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  calGoalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});

export default HomeFoodSection;
