import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, type ExerciseDef, type Theme } from '@egoless-do/core';
import { X, Plus, Minus } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';

interface ExerciseAdjustment {
  exerciseId: string;
  sets: number;
  reps: number;
  durationSec?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (adjustments: ExerciseAdjustment[]) => void;
  exercises: ExerciseDef[];
  TH: Theme;
  T: (key: string) => string;
}

export default function AdjustExerciseModal({ visible, onClose, onConfirm, exercises, TH, T }: Props) {
  const [adjustments, setAdjustments] = useState<ExerciseAdjustment[]>(() =>
    exercises.map(ex => ({
      exerciseId: ex.id,
      sets: ex.defaultSets ?? 3,
      reps: ex.defaultReps ?? 12,
      durationSec: ex.defaultDurationSec,
    }))
  );

  const updateAdjustment = (exerciseId: string, field: keyof ExerciseAdjustment, delta: number) => {
    setAdjustments(prev => prev.map(adj => {
      if (adj.exerciseId !== exerciseId) return adj;
      const current = adj[field] ?? 0;
      const next = Math.max(0, (current as number) + delta);
      return { ...adj, [field]: next };
    }));
  };

  const handleConfirm = () => {
    onConfirm(adjustments);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: TH.border }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyAdjustExercise')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 500, padding: 20 }}>
            {exercises.map((ex, idx) => {
              const adj = adjustments.find(a => a.exerciseId === ex.id);
              if (!adj) return null;

              return (
                <View key={ex.id} style={{ marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: TH.border + '30' }}>
                  {/* Exercise name */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 18 }}>{ex.icon}</Text>
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{ex.nameZh}</Text>
                  </View>

                  {/* Sets */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('bodySets')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => updateAdjustment(ex.id, 'sets', -1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: TH.border + '60', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={16} color={TH.text} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, minWidth: 24, textAlign: 'center' }}>{String(adj.sets)}</Text>
                      <TouchableOpacity onPress={() => updateAdjustment(ex.id, 'sets', 1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f59e0b20', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={16} color="#f59e0b" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Reps */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('bodyReps')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => updateAdjustment(ex.id, 'reps', -1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: TH.border + '60', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={16} color={TH.text} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, minWidth: 24, textAlign: 'center' }}>{String(adj.reps)}</Text>
                      <TouchableOpacity onPress={() => updateAdjustment(ex.id, 'reps', 1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f59e0b20', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={16} color="#f59e0b" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Duration (if applicable) */}
                  {adj.durationSec != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('bodyDuration')}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => updateAdjustment(ex.id, 'durationSec', -30)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: TH.border + '60', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={16} color={TH.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, minWidth: 36, textAlign: 'center' }}>{adj.durationSec}</Text>
                        <TouchableOpacity onPress={() => updateAdjustment(ex.id, 'durationSec', 30)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f59e0b20', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={16} color="#f59e0b" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Confirm button */}
          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity onPress={handleConfirm} style={{ backgroundColor: '#f59e0b', borderRadius: 14, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BUTTON(), fontWeight: '700', color: '#fff' }}>{T('bodyConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
